import { create } from 'zustand';
import { TodoItem, ChecklistItem, SubtaskProgress, PersonaType, TaskPriority } from '../types';
import { loadLocalStorageSnapshot, saveLocalStorageSnapshot, clearLocalStorage } from '../utils/storage';
import { persistTasksToIndexedDB, clearIndexedDB } from '../utils/db';
import { 
  exportTasksToJSON, 
  importTasksFromJSON, 
  exportTasksToCSV, 
  performDataReset 
} from '../utils/backup';
import { normalizeTask, calculateSubtaskProgress, getCycleKeyForDate, evaluatePiecewiseTask } from '../types/task';
import { nativeBridge } from '../utils/bridge';
import { triggerConfetti } from '../components/common/ConfettiBurst';
import { useThemeStore } from './useThemeStore';

export interface TaskStoreState {
  tasks: TodoItem[];
  activePersona: PersonaType;
  searchQuery: string;
  filter: 'all' | 'active' | 'completed';
  selectedTaskId: string | null;

  // View state setters
  setActivePersona: (persona: PersonaType) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  setSelectedTaskId: (id: string | null) => void;

  // Task Mutations
  addTask: (taskInput: Partial<TodoItem> & Record<string, any>) => TodoItem;
  updateTask: (id: string, updates: Partial<TodoItem> & Record<string, any>) => TodoItem;
  deleteTask: (id: string) => boolean;
  toggleTask: (id: string) => TodoItem;
  getTask: (id: string) => TodoItem | undefined;
  getTasks: (options?: { 
    personaId?: PersonaType; 
    isCompleted?: boolean; 
    priority?: TaskPriority; 
    search?: string;
  }) => TodoItem[];
  reorderTasks: (orderedIds: string[]) => void;

  // Subtask / Checklist Operations
  addSubtask: (taskId: string, title: string) => ChecklistItem;
  toggleSubtask: (taskId: string, subtaskId: string) => ChecklistItem;
  deleteSubtask: (taskId: string, subtaskId: string) => boolean;
  getSubtaskProgress: (taskId: string) => SubtaskProgress;

  // Backup & Import/Export
  exportJSON: () => string;
  importJSON: (jsonString: string, mode?: 'merge' | 'overwrite') => { 
    success: boolean; 
    count: number; 
    total: number; 
    mode: string; 
  };
  exportCSV: () => string;
  resetAllData: (options?: { seedDefaults?: boolean }) => boolean;

  // Cycle Refresh & Emergency Operations
  checkAndRefreshCycles: () => { refreshedCount: number; refreshedTaskIds: string[] };
  forceRefreshCycle: (type?: 'daily' | 'weekly' | 'monthly' | 'all', persona?: string) => number;
  addEmergencyTask: (title: string, level?: 'high' | 'urgent' | 'critical', subtasks?: ChecklistItem[]) => TodoItem;
  resolveEmergencyTask: (id: string) => TodoItem;
  instantiateTemplateToEmergency: (templateId: string, level?: 'high' | 'urgent' | 'critical') => TodoItem;
  instantiateTemplateToWork: (templateId: string, period?: 'daily' | 'weekly' | 'monthly') => TodoItem;
}


// Helpers to classify task persona and period consistently across tabs and store operations
export function isTaskInPersona(task: TodoItem, persona?: string): boolean {
  if (!persona || persona === 'all') return true;
  const p = (task as any).personaId || task.persona;
  if (persona === 'exam') {
    return p === 'exam';
  }
  if (persona === 'art') {
    return p === 'art';
  }
  if (persona === 'work' || persona === 'security') {
    return p !== 'exam' && p !== 'art';
  }
  return p === persona;
}

export function isTaskInPeriod(task: TodoItem, period: 'daily' | 'weekly' | 'monthly'): boolean {
  if (task.isEmergency || task.periodType === 'emergency' || task.category === 'emergency') {
    return false;
  }
  if (task.isTemplate || task.category === 'template' || task.tags?.includes('预设事项')) {
    return false;
  }

  const pType = task.periodType;
  const cat = task.category;
  const freq = task.frequency;
  const tags = task.tags || [];
  const p = (task as any).personaId || task.persona;
  const isWork = p !== 'exam' && p !== 'art';

  if (period === 'daily') {
    if (pType === 'daily' || cat === 'daily' || freq === 'daily') return true;
    if (tags.some(t => t.includes('日常') || t.includes('每日') || t.includes('打卡'))) return true;
    // For work persona, tasks without explicit period/category default to daily tasks in WorkTab
    if (isWork && !pType && !cat && freq !== 'weekly' && freq !== 'monthly') {
      return true;
    }
    return false;
  }

  if (period === 'weekly') {
    if (pType === 'weekly' || cat === 'weekly' || freq === 'weekly') return true;
    if (tags.some(t => t.includes('周常') || t.includes('每周'))) return true;
    return false;
  }

  if (period === 'monthly') {
    if (pType === 'monthly' || cat === 'monthly' || freq === 'monthly') return true;
    if (tags.some(t => t.includes('月常') || t.includes('每月'))) return true;
    return false;
  }

  return false;
}

// 0ms synchronous snapshot read from LocalStorage
const initialSnapshot = loadLocalStorageSnapshot();
// Start with stored tasks; never inject pre-stored seed tasks when empty
const initialTasks = initialSnapshot.tasks;

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: initialTasks,
  activePersona: 'exam',
  searchQuery: '',
  filter: 'all',
  selectedTaskId: null,

  setActivePersona: (activePersona) => set({ activePersona }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilter: (filter) => set({ filter }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),

  addTask: (taskInput) => {
    if (!taskInput || typeof taskInput.title !== 'string' || taskInput.title.trim() === '') {
      throw new Error('Task title cannot be empty');
    }

    const newTask = normalizeTask({
      ...taskInput,
      persona: taskInput.persona || taskInput.personaId || get().activePersona || 'exam',
    });

    // Emergency check: auto-pin and set urgent priority
    if (newTask.personaData?.isEmergency || newTask.securityData?.isEmergency) {
      newTask.isPinned = true;
      newTask.priority = 'urgent';
    }

    const updatedTasks = [newTask, ...get().tasks];
    set({ tasks: updatedTasks });

    // Synchronous L1 snapshot + Asynchronous L2 persistence
    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
    persistTasksToIndexedDB(updatedTasks);

    return JSON.parse(JSON.stringify(newTask));
  },

  updateTask: (id, updates) => {
    const currentTasks = get().tasks;
    const taskIndex = currentTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${id}`);
    }

    const task = { ...currentTasks[taskIndex] };

    if (updates.title !== undefined) {
      if (typeof updates.title !== 'string' || updates.title.trim() === '') {
        throw new Error('Task title cannot be empty');
      }
      task.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      task.description = updates.description;
      task.notes = updates.description;
    }
    if (updates.notes !== undefined) {
      task.notes = updates.notes;
      if (!updates.description) task.description = updates.notes;
    }

    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.reminderTime !== undefined) task.reminderTime = updates.reminderTime;
    if (updates.tags !== undefined) task.tags = [...updates.tags];
    if (updates.isPinned !== undefined) task.isPinned = Boolean(updates.isPinned);

    if (updates.subtasks !== undefined) {
      task.subtasks = updates.subtasks.map((s: any, idx: number) => ({
        id: s.id || `sub-${idx + 1}`,
        text: s.text || s.title || '',
        title: s.text || s.title || '',
        completed: Boolean(s.completed !== undefined ? s.completed : s.isCompleted),
        isCompleted: Boolean(s.completed !== undefined ? s.completed : s.isCompleted),
        order: s.order !== undefined ? s.order : idx,
      }));
      task.checklists = task.subtasks;
    }

    if (updates.customFields !== undefined) {
      task.customFields = Array.isArray(updates.customFields)
        ? [...updates.customFields]
        : { ...updates.customFields };
    }

    if (updates.personaData !== undefined) {
      task.personaData = { ...task.personaData, ...updates.personaData };
      if (task.personaData?.isEmergency) {
        task.isPinned = true;
        task.priority = 'urgent';
      }
    }

    if (updates.examData !== undefined) task.examData = { ...task.examData, ...updates.examData };
    if (updates.artData !== undefined) task.artData = { ...task.artData, ...updates.artData };
    if (updates.securityData !== undefined) {
      task.securityData = { ...task.securityData, ...updates.securityData };
      if (task.securityData?.isEmergency) {
        task.isPinned = true;
        task.priority = 'urgent';
      }
    }

    // Toggle completion if explicitly specified differently
    const newCompleted = updates.completed !== undefined ? updates.completed : updates.isCompleted;
    if (newCompleted !== undefined && newCompleted !== task.completed) {
      return get().toggleTask(id);
    }

    task.updatedAt = new Date().toISOString();
    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = task;
    set({ tasks: updatedTasks });

    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
    persistTasksToIndexedDB(updatedTasks);

    return JSON.parse(JSON.stringify(task));
  },

  deleteTask: (id) => {
    const currentTasks = get().tasks;
    const exists = currentTasks.some(t => t.id === id);
    if (!exists) {
      throw new Error(`Task not found: ${id}`);
    }

    const updatedTasks = currentTasks.filter(t => t.id !== id);
    set({ tasks: updatedTasks });

    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
    persistTasksToIndexedDB(updatedTasks);
    return true;
  },

  toggleTask: (id) => {
    const currentTasks = get().tasks;
    const taskIndex = currentTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${id}`);
    }

    const task = { ...currentTasks[taskIndex] };
    const nowCompleted = !(task.completed || task.isCompleted);

    task.completed = nowCompleted;
    task.isCompleted = nowCompleted;
    task.updatedAt = new Date().toISOString();

    const todayStr = new Date().toISOString().slice(0, 10);
    const existingHistory = Array.isArray(task.historyDates) ? [...task.historyDates] : [];

    if (nowCompleted) {
      task.completedAt = task.updatedAt;
      if (!existingHistory.includes(todayStr)) {
        existingHistory.push(todayStr);
      }
      task.historyDates = existingHistory;

      // Assign cycle key for periodic auto-refresh
      const nowDate = new Date();
      if (task.periodType === 'daily' || task.frequency === 'daily') {
        task.lastCycleKey = getCycleKeyForDate(nowDate, 'daily');
      } else if (task.periodType === 'weekly' || task.frequency === 'weekly') {
        task.lastCycleKey = getCycleKeyForDate(nowDate, 'weekly');
      } else if (task.periodType === 'monthly' || task.frequency === 'monthly') {
        task.lastCycleKey = getCycleKeyForDate(nowDate, 'monthly');
      } else if (task.isPiecewise) {
        task.lastCycleKey = getCycleKeyForDate(nowDate, 'daily');
      }

      if (task.isEmergency) {
        task.resolvedAt = task.updatedAt;
      }

      triggerConfetti();
      nativeBridge.performHapticFeedback('success');
    } else {
      task.completedAt = null;
      task.historyDates = existingHistory.filter(d => d !== todayStr);
      if (task.isEmergency) {
        task.resolvedAt = null;
      }
      nativeBridge.performHapticFeedback('light');
    }

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = task;
    set({ tasks: updatedTasks });

    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
    persistTasksToIndexedDB(updatedTasks);

    return JSON.parse(JSON.stringify(task));
  },

  getTask: (id) => {
    const task = get().tasks.find(t => t.id === id);
    return task ? JSON.parse(JSON.stringify(task)) : undefined;
  },

  getTasks: (options = {}) => {
    let result = [...get().tasks];

    if (options.personaId) {
      result = result.filter(t => (t.personaId || t.persona) === options.personaId);
    }
    if (options.isCompleted !== undefined) {
      result = result.filter(t => Boolean(t.isCompleted !== undefined ? t.isCompleted : t.completed) === options.isCompleted);
    }
    if (options.priority) {
      result = result.filter(t => t.priority === options.priority);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        ((t.description || t.notes || '').toLowerCase().includes(q))
      );
    }

    // Sort: pinned first, then by createdAt descending
    result.sort((a, b) => {
      const aPinned = Boolean(a.isPinned);
      const bPinned = Boolean(b.isPinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return JSON.parse(JSON.stringify(result));
  },

  reorderTasks: (orderedIds) => {
    const tasksMap = new Map(get().tasks.map(t => [t.id, t]));
    const reordered: TodoItem[] = [];

    orderedIds.forEach(id => {
      const t = tasksMap.get(id);
      if (t) {
        reordered.push(t);
        tasksMap.delete(id);
      }
    });

    // Append any remaining
    tasksMap.forEach(t => reordered.push(t));

    set({ tasks: reordered });
    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: reordered });
    persistTasksToIndexedDB(reordered);
  },

  addSubtask: (taskId, title) => {
    const currentTasks = get().tasks;
    const taskIndex = currentTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }
    if (!title || title.trim() === '') {
      throw new Error('Subtask title cannot be empty');
    }

    const task = { ...currentTasks[taskIndex] };
    const currentSubtasks = [...(task.subtasks || task.checklists || [])];

    const newSubtask: ChecklistItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: title.trim(),
      title: title.trim(),
      completed: false,
      isCompleted: false,
      order: currentSubtasks.length,
    };

    const updatedSubtasks = [...currentSubtasks, newSubtask];
    task.subtasks = updatedSubtasks;
    task.checklists = updatedSubtasks;
    task.updatedAt = new Date().toISOString();

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = task;
    set({ tasks: updatedTasks });

    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
    persistTasksToIndexedDB(updatedTasks);

    return newSubtask;
  },

  toggleSubtask: (taskId, subtaskId) => {
    const currentTasks = get().tasks;
    const taskIndex = currentTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = { ...currentTasks[taskIndex] };
    const currentSubtasks = [...(task.subtasks || task.checklists || [])];
    const subIndex = currentSubtasks.findIndex(s => s.id === subtaskId);
    if (subIndex === -1) {
      throw new Error(`Subtask not found: ${subtaskId}`);
    }

    const sub = { ...currentSubtasks[subIndex] };
    const nowCompleted = !(sub.completed || sub.isCompleted);
    sub.completed = nowCompleted;
    sub.isCompleted = nowCompleted;

    if (nowCompleted) {
      triggerConfetti();
      nativeBridge.performHapticFeedback('success');
    } else {
      nativeBridge.performHapticFeedback('light');
    }

    currentSubtasks[subIndex] = sub;
    task.subtasks = currentSubtasks;
    task.checklists = currentSubtasks;
    task.updatedAt = new Date().toISOString();

    // Auto complete & refresh when all subtasks are finished
    const allCompleted = currentSubtasks.length > 0 && currentSubtasks.every(s => s.completed || s.isCompleted);
    if (allCompleted && !task.isTemplate) {
      task.completed = true;
      task.isCompleted = true;
      task.completedAt = task.updatedAt;
      if (task.isEmergency) {
        task.resolvedAt = task.updatedAt;
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      const hist = Array.isArray(task.historyDates) ? [...task.historyDates] : [];
      if (!hist.includes(todayStr)) hist.push(todayStr);
      task.historyDates = hist;
      triggerConfetti();
      nativeBridge.performHapticFeedback('success');
    } else if (!allCompleted && (task.completed || task.isCompleted) && !task.isTemplate) {
      task.completed = false;
      task.isCompleted = false;
      task.completedAt = null;
      if (task.isEmergency) {
        task.resolvedAt = null;
      }
    }

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = task;
    set({ tasks: updatedTasks });

    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
    persistTasksToIndexedDB(updatedTasks);

    return sub;
  },


  deleteSubtask: (taskId, subtaskId) => {
    const currentTasks = get().tasks;
    const taskIndex = currentTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = { ...currentTasks[taskIndex] };
    const currentSubtasks = (task.subtasks || task.checklists || []).filter(s => s.id !== subtaskId);

    task.subtasks = currentSubtasks;
    task.checklists = currentSubtasks;
    task.updatedAt = new Date().toISOString();

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = task;
    set({ tasks: updatedTasks });

    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
    persistTasksToIndexedDB(updatedTasks);

    return true;
  },

  getSubtaskProgress: (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return calculateSubtaskProgress(task.subtasks || task.checklists);
  },

  exportJSON: () => {
    const themeState = useThemeStore.getState();
    return exportTasksToJSON(get().tasks, {
      theme: themeState.theme,
      autoSwitch: themeState.autoSwitch,
      toneLock: themeState.toneLock,
    });
  },

  importJSON: (jsonString, mode = 'merge') => {
    const { tasks: importedTasks, result } = importTasksFromJSON(get().tasks, jsonString, mode);
    set({ tasks: importedTasks });

    if (result.themeState) {
      const themeStore = useThemeStore.getState();
      if (result.themeState.theme) themeStore.setTheme(result.themeState.theme);
      if (result.themeState.autoSwitch !== undefined) themeStore.setAutoSwitch(result.themeState.autoSwitch);
      if (result.themeState.toneLock) themeStore.setToneLock(result.themeState.toneLock);
    }

    saveLocalStorageSnapshot({ schemaVersion: 2, tasks: importedTasks, themeState: result.themeState });
    persistTasksToIndexedDB(importedTasks, result.themeState);

    return {
      success: true,
      count: result.count,
      total: result.total,
      mode,
    };
  },

  exportCSV: () => {
    return exportTasksToCSV(get().tasks);
  },

  resetAllData: (options = {}) => {
    const { seedDefaults = false } = options;
    const reset = performDataReset({ seedDefaults });

    set({ 
      tasks: reset.tasks,
      selectedTaskId: null,
      searchQuery: '',
      filter: 'all'
    });

    if (!seedDefaults) {
      clearLocalStorage();
      clearIndexedDB();
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('squircle_focus_data_v1');
        }
      } catch {}
      saveLocalStorageSnapshot({ schemaVersion: 2, tasks: [] });
    } else {
      saveLocalStorageSnapshot({ schemaVersion: 2, tasks: reset.tasks, themeState: reset.themeState });
      persistTasksToIndexedDB(reset.tasks, reset.themeState);
    }

    nativeBridge.performHapticFeedback('light');
    return true;
  },

  checkAndRefreshCycles: () => {
    const now = new Date();
    const dailyKey = getCycleKeyForDate(now, 'daily');
    const weeklyKey = getCycleKeyForDate(now, 'weekly');
    const monthlyKey = getCycleKeyForDate(now, 'monthly');

    const currentTasks = get().tasks;
    let hasChanges = false;
    const refreshedIds: string[] = [];

    const updatedTasks = currentTasks.map(t => {
      // Emergency tasks are permanent until resolved
      if (t.isEmergency || t.periodType === 'emergency' || t.category === 'emergency') {
        return t;
      }
      if (t.isTemplate || t.category === 'template' || t.tags?.includes('预设事项')) {
        return t;
      }

      const isCompleted = Boolean(t.completed || t.isCompleted);
      const hasCompletedSubtasks = Boolean(
        (t.subtasks && t.subtasks.some(s => s.completed || s.isCompleted)) ||
        (t.checklists && t.checklists.some(c => c.completed || c.isCompleted))
      );

      if (!isCompleted && !hasCompletedSubtasks) return t;

      let shouldReset = false;
      let targetCycleKey = '';

      let period: 'daily' | 'weekly' | 'monthly' | null = null;
      if (isTaskInPeriod(t, 'daily')) period = 'daily';
      else if (isTaskInPeriod(t, 'weekly')) period = 'weekly';
      else if (isTaskInPeriod(t, 'monthly')) period = 'monthly';

      if (period === 'daily') {
        targetCycleKey = dailyKey;
        if (t.lastCycleKey && t.lastCycleKey !== dailyKey) {
          shouldReset = true;
        } else if (!t.lastCycleKey && t.completedAt && t.completedAt.slice(0, 10) !== dailyKey) {
          shouldReset = true;
        } else if (!t.lastCycleKey && !t.completedAt) {
          shouldReset = true;
        }
      } else if (period === 'weekly') {
        targetCycleKey = weeklyKey;
        if (t.lastCycleKey && t.lastCycleKey !== weeklyKey) {
          shouldReset = true;
        } else if (!t.lastCycleKey && t.completedAt) {
          const compDate = new Date(t.completedAt);
          if (getCycleKeyForDate(compDate, 'weekly') !== weeklyKey) {
            shouldReset = true;
          }
        } else if (!t.lastCycleKey && !t.completedAt) {
          shouldReset = true;
        }
      } else if (period === 'monthly') {
        targetCycleKey = monthlyKey;
        if (t.lastCycleKey && t.lastCycleKey !== monthlyKey) {
          shouldReset = true;
        } else if (!t.lastCycleKey && t.completedAt && t.completedAt.slice(0, 7) !== monthlyKey) {
          shouldReset = true;
        } else if (!t.lastCycleKey && !t.completedAt) {
          shouldReset = true;
        }
      } else if (t.isPiecewise && t.piecewiseConfig) {
        const { currentStage } = evaluatePiecewiseTask(t, now);
        const stageFreq = currentStage?.frequency || 'daily';
        targetCycleKey = stageFreq === 'weekly' ? weeklyKey : dailyKey;
        if (t.lastCycleKey && t.lastCycleKey !== targetCycleKey) {
          shouldReset = true;
        }
      }

      if (shouldReset) {
        hasChanges = true;
        refreshedIds.push(t.id);
        const resetSubtasks = (t.subtasks || []).map(s => ({
          ...s,
          completed: false,
          isCompleted: false,
          completedAt: null,
        }));
        const resetChecklists = (t.checklists || []).map(c => ({
          ...c,
          completed: false,
          isCompleted: false,
          completedAt: null,
        }));

        return {
          ...t,
          completed: false,
          isCompleted: false,
          completedAt: null,
          subtasks: resetSubtasks,
          checklists: resetChecklists,
          lastCycleKey: targetCycleKey,
          updatedAt: now.toISOString(),
        };
      }

      return t;
    });

    if (hasChanges) {
      set({ tasks: updatedTasks });
      saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
      persistTasksToIndexedDB(updatedTasks);
    }

    return { refreshedCount: refreshedIds.length, refreshedTaskIds: refreshedIds };
  },

  forceRefreshCycle: (type = 'all', persona?: string) => {
    const now = new Date();
    const currentTasks = get().tasks;
    let resetCount = 0;

    const updatedTasks = currentTasks.map(t => {
      if (t.isEmergency || t.periodType === 'emergency' || t.category === 'emergency') return t;
      if (t.isTemplate || t.category === 'template' || t.tags?.includes('预设事项')) return t;

      if (!isTaskInPersona(t, persona)) return t;

      const matches = 
        type === 'all' ||
        isTaskInPeriod(t, type);

      if (!matches) return t;

      const isDone = Boolean(t.completed || t.isCompleted);
      const hasCompletedSubtasks = Boolean(
        (t.subtasks && t.subtasks.some(s => s.completed || s.isCompleted)) ||
        (t.checklists && t.checklists.some(c => c.completed || c.isCompleted))
      );

      if (isDone || hasCompletedSubtasks) {
        resetCount++;
        const resetSubtasks = (t.subtasks || []).map(s => ({
          ...s,
          completed: false,
          isCompleted: false,
          completedAt: null,
        }));
        const resetChecklists = (t.checklists || []).map(c => ({
          ...c,
          completed: false,
          isCompleted: false,
          completedAt: null,
        }));

        const determinedPeriod =
          type !== 'all'
            ? type
            : isTaskInPeriod(t, 'monthly')
            ? 'monthly'
            : isTaskInPeriod(t, 'weekly')
            ? 'weekly'
            : 'daily';

        return {
          ...t,
          completed: false,
          isCompleted: false,
          completedAt: null,
          subtasks: resetSubtasks,
          checklists: resetChecklists,
          lastCycleKey: getCycleKeyForDate(now, determinedPeriod),
          updatedAt: now.toISOString(),
        };
      }
      return t;
    });

    if (resetCount > 0) {
      set({ tasks: updatedTasks });
      saveLocalStorageSnapshot({ schemaVersion: 2, tasks: updatedTasks });
      persistTasksToIndexedDB(updatedTasks);
      nativeBridge.performHapticFeedback('medium');
    }
    return resetCount;
  },

  addEmergencyTask: (title, level = 'urgent', subtasks) => {
    return get().addTask({
      title,
      isEmergency: true,
      emergencyLevel: level,
      priority: level === 'critical' ? 'urgent' : 'high',
      isPinned: true,
      periodType: 'emergency',
      category: 'emergency',
      persona: 'security',
      subtasks: subtasks || [],
      checklists: subtasks || [],
      tags: ['突发事件', level === 'critical' ? '特急' : '紧急'],
    });
  },

  resolveEmergencyTask: (id) => {
    const task = get().getTask(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    const resolved = get().updateTask(id, {
      completed: true,
      isCompleted: true,
      resolvedAt: new Date().toISOString(),
      isPinned: false,
    });
    return resolved;
  },

  instantiateTemplateToEmergency: (templateId, level = 'urgent') => {
    const template = get().getTask(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const cleanTitle = template.title.replace(/^【(预设|参考)】\s*/, '').trim();
    const clonedSubtasks = (template.subtasks || template.checklists || []).map((s, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      text: s.text || s.title || '',
      title: s.text || s.title || '',
      completed: false,
      isCompleted: false,
      order: idx,
    }));

    return get().addTask({
      title: `🚨 突发: ${cleanTitle}`,
      isEmergency: true,
      emergencyLevel: level,
      priority: level === 'critical' ? 'urgent' : 'high',
      isPinned: true,
      periodType: 'emergency',
      category: 'emergency',
      persona: 'security',
      subtasks: clonedSubtasks,
      checklists: clonedSubtasks,
      tags: ['突发事件', level === 'critical' ? '特急' : '紧急', '预案调用'],
    });
  },

  instantiateTemplateToWork: (templateId, period = 'daily') => {
    const template = get().getTask(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const cleanTitle = template.title.replace(/^【(预设|参考)】\s*/, '').trim();
    const clonedSubtasks = (template.subtasks || template.checklists || []).map((s, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      text: s.text || s.title || '',
      title: s.text || s.title || '',
      completed: false,
      isCompleted: false,
      order: idx,
    }));

    return get().addTask({
      title: cleanTitle,
      periodType: period,
      category: period,
      persona: 'security',
      subtasks: clonedSubtasks,
      checklists: clonedSubtasks,
      tags: ['预案调用', period === 'daily' ? '日常' : period === 'weekly' ? '周常' : '月常'],
    });
  },
}));

