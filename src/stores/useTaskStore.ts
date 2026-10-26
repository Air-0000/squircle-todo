import { create } from 'zustand';
import {
  addSubtask as addSubtaskTo,
  createTask,
  patchTask,
  resolveEmergency,
  setCompleted,
  toggleSubtask as toggleSubtaskOf,
  withSubtasks,
  type Subtask,
  type Task,
  type TaskDraft,
  type TaskPatch,
} from '../domain/task';
import { refreshCycles, resetCycleNow } from '../domain/cycles';
import { mergeById, type ImportMode, type MergeResult } from '../domain/backup';
import { migrateTaskPayload, normalizeTasks, TASK_SCHEMA_VERSION } from '../domain/migration';
import type { CyclePeriod } from '../domain/task';
import { persistSlice, readJSON, STORAGE_KEYS, writeJSON } from '../utils/storage';
import { clearMirror, mirrorTasks, readMirroredTasks } from '../utils/idbMirror';

interface TaskState {
  tasks: Task[];

  addTask: (draft: TaskDraft) => Task;
  /** Field edits; use the dedicated actions for completion and subtasks. */
  updateTask: (id: string, patch: TaskPatch) => void;
  deleteTask: (id: string) => void;
  setCompleted: (id: string, completed: boolean) => void;
  toggleTask: (id: string) => void;
  resolveEmergency: (id: string) => void;
  setSubtasks: (id: string, subtasks: Subtask[]) => void;
  addSubtask: (id: string, text: string) => void;
  toggleSubtask: (id: string, subtaskId: string) => void;
  addFocusMinutes: (id: string, minutes: number) => void;

  /** Resets tasks whose progress belongs to a past cycle; returns how many. */
  refreshCycles: () => number;
  /** Manual reset of one panel's (or all, for null) tasks in a period. */
  resetCycleNow: (period: CyclePeriod, panelId: string | null) => number;

  importTasks: (tasks: Task[], mode: ImportMode) => MergeResult<Task>;
  clearAll: () => void;
}

function loadInitialTasks(): Task[] {
  const { tasks, migrated } = migrateTaskPayload(readJSON(STORAGE_KEYS.tasks));
  if (migrated && tasks.length > 0) writeJSON(STORAGE_KEYS.tasks, { schemaVersion: TASK_SCHEMA_VERSION, tasks });
  return tasks;
}

export const useTaskStore = create<TaskState>((set, get) => {
  /** Applies `fn` to one task; a no-op if the id is unknown. */
  const update = (id: string, fn: (t: Task) => Task) =>
    set(state => ({ tasks: state.tasks.map(t => (t.id === id ? fn(t) : t)) }));

  return {
    tasks: loadInitialTasks(),

    addTask: draft => {
      const task = createTask(draft);
      set(state => ({ tasks: [task, ...state.tasks] }));
      return task;
    },
    updateTask: (id, patch) => update(id, t => patchTask(t, patch)),
    deleteTask: id => set(state => ({ tasks: state.tasks.filter(t => t.id !== id) })),
    setCompleted: (id, completed) => update(id, t => setCompleted(t, completed)),
    toggleTask: id => update(id, t => setCompleted(t, !t.completed)),
    resolveEmergency: id => update(id, t => resolveEmergency(t)),
    setSubtasks: (id, subtasks) => update(id, t => withSubtasks(t, subtasks)),
    addSubtask: (id, text) => update(id, t => addSubtaskTo(t, text)),
    toggleSubtask: (id, subtaskId) => update(id, t => toggleSubtaskOf(t, subtaskId)),
    addFocusMinutes: (id, minutes) =>
      update(id, t => patchTask(t, { focusMinutes: t.focusMinutes + minutes, pomodoroCount: t.pomodoroCount + 1 })),

    refreshCycles: () => {
      const { tasks, refreshedIds } = refreshCycles(get().tasks);
      if (tasks !== get().tasks) set({ tasks });
      return refreshedIds.length;
    },
    resetCycleNow: (period, panelId) => {
      const { tasks, refreshedIds } = resetCycleNow(get().tasks, period, panelId);
      if (refreshedIds.length) set({ tasks });
      return refreshedIds.length;
    },

    importTasks: (incoming, mode) => {
      const result = mergeById(get().tasks, incoming, mode);
      set({ tasks: result.items });
      return result;
    },
    clearAll: () => {
      set({ tasks: [] });
      clearMirror();
    },
  };
});

persistSlice(useTaskStore, STORAGE_KEYS.tasks, s => s.tasks, tasks => ({
  schemaVersion: TASK_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  tasks,
}));
useTaskStore.subscribe((state, prev) => {
  if (state.tasks !== prev.tasks) mirrorTasks(state.tasks);
});

// localStorage had nothing (cleared by the OS, or unreadable): try the IndexedDB copy.
if (useTaskStore.getState().tasks.length === 0 && readJSON(STORAGE_KEYS.tasks) === undefined) {
  readMirroredTasks().then(rows => {
    const recovered = normalizeTasks(rows);
    if (recovered.length > 0 && useTaskStore.getState().tasks.length === 0) {
      useTaskStore.setState({ tasks: recovered });
    }
  });
}

/** Non-reactive lookup for event handlers. */
export const getTask = (id: string) => useTaskStore.getState().tasks.find(t => t.id === id);
