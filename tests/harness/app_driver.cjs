/**
 * Opaque-Box Specification Driver / Reference Engine
 * Conforms to PROJECT.md and ORIGINAL_REQUEST.md Interface Contracts.
 */

const { setupMockEnvironment } = require('./mock_env.cjs');

// Theme Matrix Definitions
const THEMES = {
  'warm-morning': {
    id: 'warm-morning',
    name: '晨曦暖阳',
    tone: 'warm',
    timeOfDay: 'morning',
    appBg: '#FAF7F2',
    cardSurface: '#FFFFFF',
    cardBorder: '#F0EAE1',
    primaryAccent: '#F97316',
    secondaryAccent: '#D97706',
    textPrimary: '#292524',
    textMuted: '#78716C',
    tagPillBg: '#FFEDD5',
    tagPillText: '#C2410C',
    isDark: false
  },
  'cool-morning': {
    id: 'cool-morning',
    name: '冰川清晨',
    tone: 'cool',
    timeOfDay: 'morning',
    appBg: '#F0FDF9',
    cardSurface: '#FFFFFF',
    cardBorder: '#CCFBF1',
    primaryAccent: '#0D9488',
    secondaryAccent: '#0284C7',
    textPrimary: '#0F172A',
    textMuted: '#64748B',
    tagPillBg: '#E6FFFA',
    tagPillText: '#0F766E',
    isDark: false
  },
  'warm-evening': {
    id: 'warm-evening',
    name: '暮色暗金',
    tone: 'warm',
    timeOfDay: 'evening',
    appBg: '#1C1917',
    cardSurface: '#262320',
    cardBorder: '#3D3833',
    primaryAccent: '#F59E0B',
    secondaryAccent: '#EA580C',
    textPrimary: '#F5F5F4',
    textMuted: '#A8A29E',
    tagPillBg: '#451A03',
    tagPillText: '#FBBF24',
    isDark: true
  },
  'cool-evening': {
    id: 'cool-evening',
    name: '深海极夜',
    tone: 'cool',
    timeOfDay: 'evening',
    appBg: '#0B0F19',
    cardSurface: '#131C2E',
    cardBorder: '#1E293B',
    primaryAccent: '#06B6D4',
    secondaryAccent: '#3B82F6',
    textPrimary: '#F1F5F9',
    textMuted: '#94A3B8',
    tagPillBg: '#083344',
    tagPillText: '#22D3EE',
    isDark: true
  }
};

const SPRING_PHYSICS = {
  defaultCard: { stiffness: 300, damping: 25 },
  quickCheckbox: { stiffness: 450, damping: 20 },
  bottomSheet: { stiffness: 220, damping: 28 }
};

const SQUIRCLE_TOKENS = {
  cardRadius: '20px',
  cardRadiusRange: { min: 16, max: 24 },
  pillRadius: '9999px',
  fabRadius: '22px'
};

const ART_PIPELINE_STAGES = [
  'planning',
  'draft',
  'lineart',
  'flat_color',
  'detail',
  'post_process',
  'delivery'
];

const cryptoModule = require('crypto');

class TodoAppDriver {
  constructor(options = {}) {
    this.env = options.env || setupMockEnvironment();
    this.storageKey = options.storageKey || 'squircle_todo_data_v2';
    this.dbName = options.dbName || 'SquircleTodoDB';
    this.schemaVersion = 2;

    // Theme state
    this.themeState = {
      theme: 'warm-morning',
      autoSwitch: true,
      toneLock: 'warm' // 'warm' | 'cool' | 'auto'
    };

    // Task & Persona state
    this.tasks = [];
    this.activePersona = 'exam';
    this.confettiBursts = [];

    // Initialize or load from storage
    this._loadInitialState();
  }

  _loadInitialState() {
    const rawData = this.env.localStorage.getItem(this.storageKey);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed.schemaVersion && parsed.schemaVersion < this.schemaVersion) {
          this._migrateSchema(parsed);
        } else {
          this.tasks = parsed.tasks || [];
          if (parsed.themeState) {
            this.themeState = { ...this.themeState, ...parsed.themeState };
          }
        }
      } catch (e) {
        this.tasks = [];
      }
    }
    this._syncThemeWithClock();
  }

  _migrateSchema(oldData) {
    // Migration engine from v1 to v2
    const migratedTasks = (oldData.tasks || []).map(t => {
      const task = { ...t };
      if (!task.priority) task.priority = 'medium';
      if (!task.tags) task.tags = [];
      if (!task.subtasks) task.subtasks = [];
      if (task.isPinned === undefined) task.isPinned = false;
      return task;
    });
    this.tasks = migratedTasks;
    this._persist();
  }

  _persist() {
    const payload = {
      schemaVersion: this.schemaVersion,
      updatedAt: new Date().toISOString(),
      tasks: this.tasks,
      themeState: this.themeState
    };
    this.env.localStorage.setItem(this.storageKey, JSON.stringify(payload));
    
    // Also persist to mock IndexedDB
    const db = this.env.indexedDB.open(this.dbName, this.schemaVersion);
    const todoStore = db.getStore('todos');
    const settingsStore = db.getStore('settings');
    settingsStore.put('themeState', this.themeState);
    todoStore.data.clear();
    this.tasks.forEach(t => todoStore.put(t.id, t));
  }

  // --- Theme Management ---
  setTheme(themeId) {
    if (!THEMES[themeId]) {
      throw new Error(`Invalid theme ID: ${themeId}`);
    }
    this.themeState.theme = themeId;
    this.themeState.autoSwitch = false; // Manual selection locks theme
    const theme = THEMES[themeId];
    this.env.androidBridge.setStatusBarTheme(theme.isDark, theme.appBg);
    this._persist();
    return THEMES[this.themeState.theme];
  }

  setAutoSwitch(enabled) {
    this.themeState.autoSwitch = Boolean(enabled);
    this._syncThemeWithClock();
    this._persist();
  }

  setToneLock(tone) {
    if (!['warm', 'cool', 'auto'].includes(tone)) {
      throw new Error(`Invalid tone lock: ${tone}`);
    }
    this.themeState.toneLock = tone;
    this._syncThemeWithClock();
    this._persist();
  }

  _syncThemeWithClock() {
    if (!this.themeState.autoSwitch) return;

    const hour = new Date().getHours();
    const isMorning = hour >= 6 && hour < 18;
    const tone = this.themeState.toneLock === 'auto' ? 'warm' : this.themeState.toneLock;

    let targetTheme;
    if (tone === 'warm') {
      targetTheme = isMorning ? 'warm-morning' : 'warm-evening';
    } else {
      targetTheme = isMorning ? 'cool-morning' : 'cool-evening';
    }

    this.themeState.theme = targetTheme;
    const theme = THEMES[targetTheme];
    this.env.androidBridge.setStatusBarTheme(theme.isDark, theme.appBg);
  }

  getEffectiveTheme() {
    this._syncThemeWithClock();
    return THEMES[this.themeState.theme];
  }

  getThemeTokens() {
    return THEMES;
  }

  getSpringPhysics() {
    return SPRING_PHYSICS;
  }

  getSquircleTokens() {
    return SQUIRCLE_TOKENS;
  }

  // --- Persona Navigation ---
  setActivePersona(personaId) {
    this.activePersona = personaId;
  }

  getActivePersona() {
    return this.activePersona;
  }

  // --- Task Management ---
  addTask(taskInput) {
    if (!taskInput || typeof taskInput.title !== 'string' || taskInput.title.trim() === '') {
      throw new Error('Task title cannot be empty');
    }

    const now = new Date().toISOString();
    const id = taskInput.id || (this.env && this.env.crypto && this.env.crypto.randomUUID ? this.env.crypto.randomUUID() : cryptoModule.randomUUID());

    const newTask = {
      id,
      personaId: taskInput.personaId || this.activePersona || 'exam',
      title: taskInput.title.trim(),
      description: taskInput.description || '',
      isCompleted: Boolean(taskInput.isCompleted),
      completedAt: taskInput.isCompleted ? (taskInput.completedAt || now) : null,
      createdAt: taskInput.createdAt || now,
      updatedAt: now,
      priority: taskInput.priority || 'medium',
      dueDate: taskInput.dueDate || null,
      reminderTime: taskInput.reminderTime || null,
      recurrence: taskInput.recurrence || { type: 'none' },
      tags: Array.isArray(taskInput.tags) ? [...taskInput.tags] : [],
      isPinned: Boolean(taskInput.isPinned),
      subtasks: Array.isArray(taskInput.subtasks)
        ? taskInput.subtasks.map((s, idx) => ({
            id: s.id || `sub-${idx + 1}`,
            title: s.title || '',
            isCompleted: Boolean(s.isCompleted),
            order: s.order !== undefined ? s.order : idx
          }))
        : [],
      customFields: taskInput.customFields ? { ...taskInput.customFields } : {},
      personaData: taskInput.personaData ? JSON.parse(JSON.stringify(taskInput.personaData)) : null
    };

    // If marked emergency, top-pin and set urgent priority
    if (newTask.personaData && newTask.personaData.isEmergency) {
      newTask.isPinned = true;
      newTask.priority = 'urgent';
    }

    this.tasks.push(newTask);
    this._persist();
    return JSON.parse(JSON.stringify(newTask));
  }

  updateTask(id, updates) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (updates.title !== undefined) {
      if (typeof updates.title !== 'string' || updates.title.trim() === '') {
        throw new Error('Task title cannot be empty');
      }
      task.title = updates.title.trim();
    }

    if (updates.description !== undefined) task.description = updates.description;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.reminderTime !== undefined) task.reminderTime = updates.reminderTime;
    if (updates.tags !== undefined) task.tags = [...updates.tags];
    if (updates.isPinned !== undefined) task.isPinned = Boolean(updates.isPinned);
    if (updates.subtasks !== undefined) task.subtasks = [...updates.subtasks];
    if (updates.customFields !== undefined) task.customFields = { ...updates.customFields };

    if (updates.personaData !== undefined) {
      task.personaData = { ...task.personaData, ...updates.personaData };
      if (task.personaData.isEmergency) {
        task.isPinned = true;
        task.priority = 'urgent';
      }
    }

    if (updates.isCompleted !== undefined && updates.isCompleted !== task.isCompleted) {
      this.toggleTask(id);
      return this.getTask(id);
    }

    task.updatedAt = new Date().toISOString();
    this._persist();
    return JSON.parse(JSON.stringify(task));
  }

  deleteTask(id) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Task not found: ${id}`);
    }
    this.tasks.splice(index, 1);
    this._persist();
    return true;
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.isCompleted = !task.isCompleted;
    task.updatedAt = new Date().toISOString();

    if (task.isCompleted) {
      task.completedAt = task.updatedAt;
      // Trigger confetti burst & haptic feedback
      this.confettiBursts.push({ taskId: id, timestamp: Date.now() });
      this.env.androidBridge.performHapticFeedback('success');
    } else {
      task.completedAt = null;
      this.env.androidBridge.performHapticFeedback('light');
    }

    this._persist();
    return JSON.parse(JSON.stringify(task));
  }

  getTask(id) {
    const task = this.tasks.find(t => t.id === id);
    return task ? JSON.parse(JSON.stringify(task)) : null;
  }

  getTasks(options = {}) {
    let result = [...this.tasks];

    if (options.personaId) {
      result = result.filter(t => t.personaId === options.personaId);
    }

    if (options.isCompleted !== undefined) {
      result = result.filter(t => t.isCompleted === options.isCompleted);
    }

    if (options.priority) {
      result = result.filter(t => t.priority === options.priority);
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }

    // Sort: pinned tasks always first, then by priority/createdAt
    result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return JSON.parse(JSON.stringify(result));
  }

  // --- Subtask / Checklist Operations ---
  addSubtask(taskId, subtaskTitle) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (!subtaskTitle || subtaskTitle.trim() === '') throw new Error('Subtask title cannot be empty');

    const subId = (this.env && this.env.crypto && this.env.crypto.randomUUID ? this.env.crypto.randomUUID() : cryptoModule.randomUUID());
    const subtask = {
      id: `sub-${subId}`,
      title: subtaskTitle.trim(),
      isCompleted: false,
      order: task.subtasks.length
    };
    task.subtasks.push(subtask);
    task.updatedAt = new Date().toISOString();
    this._persist();
    return subtask;
  }

  toggleSubtask(taskId, subtaskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) throw new Error(`Subtask not found: ${subtaskId}`);

    subtask.isCompleted = !subtask.isCompleted;
    task.updatedAt = new Date().toISOString();
    this._persist();
    return subtask;
  }

  getSubtaskProgress(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (!task.subtasks || task.subtasks.length === 0) {
      return { total: 0, completed: 0, ratio: 0, percentText: '0%' };
    }
    const completed = task.subtasks.filter(s => s.isCompleted).length;
    const total = task.subtasks.length;
    const ratio = completed / total;
    return {
      total,
      completed,
      ratio,
      percentText: `${Math.round(ratio * 100)}%`
    };
  }

  // --- Exam Persona Domain Logic ---
  calculateExamCountdown(targetDateStr) {
    const now = new Date();
    const target = new Date(targetDateStr);
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { daysRemaining: 0, isExpired: true, label: '已结束' };
    }
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { daysRemaining: days, isExpired: false, label: `倒计时 ${days} 天` };
  }

  computeEbbinghausSchedule(startDateStr) {
    const base = new Date(startDateStr);
    const intervals = [1, 2, 4, 7, 15];
    const schedule = {};

    intervals.forEach((days, idx) => {
      const dueDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      schedule[`round${idx + 1}`] = dueDate.toISOString().slice(0, 10);
    });

    return schedule;
  }

  evaluateEbbinghausStatus(currentDateStr, scheduleDates, currentRound = 0) {
    if (currentRound >= 5) {
      return { status: 'mastered', round: currentRound, badge: '已完成 (5/5 轮)' };
    }

    const nextRound = currentRound + 1;
    const dueDateStr = scheduleDates[`round${nextRound}`];
    if (!dueDateStr) {
      return { status: 'unknown', round: currentRound, badge: '未排期' };
    }

    const currentDay = new Date(currentDateStr).toISOString().slice(0, 10);
    if (currentDay < dueDateStr) {
      return { status: 'upcoming', round: nextRound, dueDate: dueDateStr, badge: `未到期 (第${nextRound}轮: ${dueDateStr})` };
    } else if (currentDay === dueDateStr) {
      return { status: 'due_today', round: nextRound, dueDate: dueDateStr, badge: `今日待打卡 (第${nextRound}轮)` };
    } else {
      return { status: 'overdue', round: nextRound, dueDate: dueDateStr, badge: `逾期未打卡 (第${nextRound}轮)` };
    }
  }

  recordExamPomodoro(taskId, durationMinutes) {
    if (durationMinutes <= 0) throw new Error('Duration must be positive');
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    if (!task.personaData) task.personaData = {};
    task.personaData.focusTimeTotalMinutes = (task.personaData.focusTimeTotalMinutes || 0) + durationMinutes;
    task.personaData.pomodoroCount = (task.personaData.pomodoroCount || 0) + 1;
    task.updatedAt = new Date().toISOString();
    this._persist();
    return task.personaData;
  }

  // --- Art Persona Domain Logic ---
  validateCanvasSpecs(specs) {
    const width = Number(specs.width) > 0 ? Number(specs.width) : 1920;
    const height = Number(specs.height) > 0 ? Number(specs.height) : 1080;
    const allowedDpi = [72, 300, 350, 600];
    const dpi = allowedDpi.includes(Number(specs.dpi)) ? Number(specs.dpi) : 300;
    const colorSpace = ['RGB', 'CMYK'].includes(specs.colorSpace) ? specs.colorSpace : 'RGB';
    const software = specs.software ? String(specs.software) : 'Clip Studio Paint';

    return {
      width,
      height,
      unit: specs.unit === 'mm' ? 'mm' : 'px',
      dpi,
      colorSpace,
      software
    };
  }

  advanceArtStage(taskId, targetStage) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (!ART_PIPELINE_STAGES.includes(targetStage)) {
      throw new Error(`Invalid stage: ${targetStage}`);
    }

    if (!task.personaData) task.personaData = {};
    if (!Array.isArray(task.personaData.milestonesCompleted)) {
      task.personaData.milestonesCompleted = [];
    }

    task.personaData.pipelineMilestone = targetStage;
    if (!task.personaData.milestonesCompleted.includes(targetStage)) {
      task.personaData.milestonesCompleted.push(targetStage);
    }

    task.updatedAt = new Date().toISOString();
    this._persist();
    return this.calculateArtStageProgress(task);
  }

  calculateArtStageProgress(task) {
    const completed = (task.personaData && task.personaData.milestonesCompleted) || [];
    const count = completed.length;
    const total = ART_PIPELINE_STAGES.length;
    const ratio = Math.min(1.0, count / total);
    return {
      count,
      total,
      percentage: Math.round(ratio * 100),
      isDelivered: completed.includes('delivery')
    };
  }

  auditArtHours(estimatedHours, actualHours) {
    const est = Math.max(0, Number(estimatedHours) || 0);
    const act = Math.max(0, Number(actualHours) || 0);
    const delta = act - est;
    const isOvertime = delta > 0;
    return {
      estimatedHours: est,
      actualHours: act,
      delta: Number(delta.toFixed(2)),
      isOvertime,
      badgeText: isOvertime ? `+${delta.toFixed(1)}h 超时` : `-${Math.abs(delta).toFixed(1)}h 结余`
    };
  }

  // --- Security Persona Domain Logic ---
  recordSecurityShiftHandover(taskId, handoverInfo) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    if (!handoverInfo.dutyPersonnel || handoverInfo.dutyPersonnel.trim() === '') {
      throw new Error('Duty personnel is required for shift handover');
    }

    if (!task.personaData) task.personaData = {};
    task.personaData.shiftType = handoverInfo.shiftType || 'morning';
    task.personaData.dutyPersonnel = handoverInfo.dutyPersonnel.trim();
    task.personaData.relievingPersonnel = (handoverInfo.relievingPersonnel || '').trim();
    task.personaData.handoverStatus = handoverInfo.handoverStatus || 'completed';
    task.personaData.notes = handoverInfo.notes || '';
    task.updatedAt = new Date().toISOString();
    this._persist();
    return task.personaData;
  }

  logSecurityVisitor(taskId, visitorData) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    if (!task.personaData) task.personaData = {};
    const visitorRecord = {
      id: `vis-${Date.now()}`,
      visitorName: visitorData.visitorName || '',
      phone: visitorData.phone || '',
      purpose: visitorData.purpose || '',
      plateNumber: visitorData.plateNumber || '',
      itemDesc: visitorData.itemDesc || '',
      inTime: visitorData.inTime || new Date().toISOString(),
      outTime: visitorData.outTime || null,
      status: visitorData.status || (visitorData.outTime ? 'departed' : 'on_site')
    };

    task.personaData.visitorLog = visitorRecord;
    task.updatedAt = new Date().toISOString();
    this._persist();
    return visitorRecord;
  }

  // --- Backup, Export, Restore & Reset ---
  exportJSON() {
    const backup = {
      app: 'SquircleTodo',
      schemaVersion: this.schemaVersion,
      exportedAt: new Date().toISOString(),
      themeState: this.themeState,
      tasks: this.tasks
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    this.env.androidBridge.shareBackupFile('squircle_todo_backup.json', 'application/json', jsonStr);
    return jsonStr;
  }

  importJSON(jsonString, mode = 'merge') {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid JSON string');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid JSON syntax: Malformed backup file');
    }

    if (!parsed || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid backup schema: Missing tasks array');
    }

    if (mode === 'overwrite') {
      this.tasks = parsed.tasks;
      if (parsed.themeState) {
        this.themeState = { ...this.themeState, ...parsed.themeState };
      }
      this._persist();
      return { success: true, count: this.tasks.length, mode: 'overwrite' };
    }

    // Merge mode: Add or update tasks
    let importedCount = 0;
    parsed.tasks.forEach(incomingTask => {
      const existingIndex = this.tasks.findIndex(t => t.id === incomingTask.id);
      if (existingIndex !== -1) {
        // Merge updates
        this.tasks[existingIndex] = { ...this.tasks[existingIndex], ...incomingTask };
      } else {
        this.tasks.push(incomingTask);
        importedCount++;
      }
    });

    this._persist();
    return { success: true, count: importedCount, total: this.tasks.length, mode: 'merge' };
  }

  exportCSV() {
    const UTF8_BOM = '\uFEFF';
    const headers = ['ID', 'Persona', 'Title', 'Priority', 'IsCompleted', 'DueDate', 'Tags', 'CreatedAt', 'CompletedAt', 'Notes'];

    const escapeField = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = this.tasks.map(t => [
      t.id,
      t.personaId,
      t.title,
      t.priority,
      t.isCompleted ? 'true' : 'false',
      t.dueDate || '',
      t.tags.join(';'),
      t.createdAt,
      t.completedAt || '',
      t.description || ''
    ].map(escapeField).join(','));

    const csvContent = UTF8_BOM + [headers.join(','), ...rows].join('\r\n');
    this.env.androidBridge.shareBackupFile('squircle_todo_export.csv', 'text/csv', csvContent);
    return csvContent;
  }

  resetAllData() {
    this.tasks = [];
    this.themeState = {
      theme: 'warm-morning',
      autoSwitch: true,
      toneLock: 'warm'
    };
    this.confettiBursts = [];
    this.env.localStorage.removeItem(this.storageKey);
    const db = this.env.indexedDB.open(this.dbName, this.schemaVersion);
    db.getStore('todos').clear();
    db.getStore('settings').clear();
    return true;
  }
}

module.exports = {
  TodoAppDriver,
  THEMES,
  SPRING_PHYSICS,
  SQUIRCLE_TOKENS,
  ART_PIPELINE_STAGES
};
