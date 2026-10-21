/**
 * Comprehensive Polymorphic Task Data Model & Checklist Hierarchy
 * Conforms to PROJECT.md, ORIGINAL_REQUEST.md, tests/harness/app_driver.cjs, and E2E test suites.
 */

// ==========================================
// 1. Core Enums & Primitive Value Types
// ==========================================

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type RepeatRuleType = 'none' | 'daily' | 'weekdays' | 'custom';

export type PersonaType = 'exam' | 'art' | 'security' | 'custom' | 'general';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'tags';

export type StorageSchemaVersion = 1 | 2;

// ==========================================
// 2. Checklist Subtask Hierarchy
// ==========================================

export interface ChecklistItem {
  id: string;
  text: string;            // Primary checklist item content
  title?: string;          // Compatibility alias for text
  completed: boolean;      // Primary completion status flag
  isCompleted?: boolean;   // Compatibility alias for completed
  order: number;           // Explicit 0-based ordering position
}

// Backwards-compatible alias for checklist item
export type TodoSubtask = ChecklistItem;

export interface SubtaskProgress {
  total: number;
  completed: number;
  ratio: number;
  percentText: string;
}

// ==========================================
// 3. Custom Field Values & Definitions
// ==========================================

export interface CustomFieldValue {
  id: string;
  fieldId?: string;
  key?: string;
  label?: string;
  name?: string;           // Compatibility alias for label / key
  type: CustomFieldType;
  value: string | number | boolean | string[] | null | any;
}

// Compatibility interface for legacy CustomField
export type CustomField = CustomFieldValue;

export interface CustomFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];      // For 'select' dropdown options
  defaultValue?: any;
  required?: boolean;
}

// ==========================================
// 3.1 Piecewise Cycle Function Specifications
// ==========================================

export interface PiecewiseStage {
  id: string;
  stageIndex: number;          // 阶段序号 1, 2, 3...
  stageName: string;           // 阶段名称 (如 "阶段一：基础适应期")
  startDay: number;            // 相对起始天数 (从第1天开始)
  endDay: number;              // 相对结束天数 (如第7天)
  frequency: 'daily' | 'weekly' | 'custom';
  frequencyText: string;       // 如 "每日1次", "每日2次", "每周3次"
  targetNote?: string;         // 阶段具体要求 (如 "背诵50个高频核心词汇")
  formula?: string;            // 数学公式化描述 (如 "f(t) = 1次/日, t∈[1,7]")
}

export interface PiecewiseConfig {
  enabled: boolean;
  templateType?: 'exam_stages' | 'ebbinghaus' | 'work_shift' | 'custom';
  baseDate: string;            // 起始基准日期 YYYY-MM-DD
  totalDays: number;           // 总执行天数
  stages: PiecewiseStage[];
}

// ==========================================
// 4. Task Recurrence Specification
// ==========================================

export interface TaskRecurrence {
  type: RepeatRuleType;
  interval?: number;       // e.g. every 1, 2, or 3 days/weeks
  daysOfWeek?: number[];   // [1, 2, 3, 4, 5] for Monday - Friday
  endDate?: string | null; // ISO date string or null for indefinite
}

// ==========================================
// 5. Persona-Specific Domain Models
// ==========================================

// --- Exam Persona (考研备考) ---
export interface ExamEbbinghausSchedule {
  round: number;
  nextDue: string;
  history: string[];
}

export interface ExamData {
  subject: string;                  // 'math' | 'english' | 'politics' | 'major1' | 'major2' | string
  moduleName?: string;              // e.g. '高等数学'
  chapter?: string;                 // e.g. '第七章 微分方程'
  questionType?: string;            // e.g. '解答题/计算题' | '全真模拟'
  ebbinghausTracking?: boolean;     // Flag indicating active Ebbinghaus repetition tracking
  ebbinghausRound?: number;         // Current review round (0-5)
  ebbinghaus?: ExamEbbinghausSchedule;
  focusTimeTotalMinutes?: number;   // Accumulated focus study minutes
  pomodoroCount?: number;           // Total completed 25m pomodoros
  timerSeconds?: number;            // Stopwatch / active countdown elapsed seconds
}

// --- Art Persona (绘画创作) ---
export type ArtStage = 
  | 'planning' 
  | 'draft' 
  | 'lineart' 
  | 'flat_color' 
  | 'color'          // Legacy alias for flat_color
  | 'detail' 
  | 'post_process' 
  | 'post'           // Legacy alias for post_process
  | 'delivery'
  | 'done';          // Legacy alias for delivery

export type ArtPipelineStage = ArtStage;

export interface ArtData {
  stage?: ArtStage;
  pipelineMilestone?: ArtStage;     // Current active stage in 7-stage pipeline
  milestonesCompleted?: ArtStage[]; // All completed milestone stages
  canvasWidth?: number;             // Width in px or mm (default: 1920 or 3840)
  canvasHeight?: number;            // Height in px or mm (default: 1080 or 2160)
  canvasUnit?: 'px' | 'mm';
  dpi?: number;                     // 72, 300, 350, 600
  colorSpace?: 'RGB' | 'CMYK' | string;
  colorProfile?: string;            // Compatibility alias for colorSpace / profile
  software?: string;                // e.g. 'Clip Studio Paint', 'Photoshop 2024'
  estimatedHours?: number;          // Estimated project hours
  actualHours?: number;             // Logged actual hours
  inspirationTags?: string[];       // Reference / mood tags
}

export interface ArtHoursAuditResult {
  estimatedHours: number;
  actualHours: number;
  delta: number;
  isOvertime: boolean;
  badgeText: string;
}

// --- Security Persona (安保文员) ---
export type SecurityShiftType = 'morning' | 'afternoon' | 'night';

export interface VisitorRecord {
  id: string;
  visitorName?: string;             // Primary visitor name
  name?: string;                    // Compatibility alias for visitorName
  phone?: string;                   // Contact phone
  contact?: string;                 // Compatibility alias for phone
  idNumber?: string;                // Government ID or badge number
  plateNumber?: string;             // Vehicle plate license
  licensePlate?: string;            // Compatibility alias for plateNumber
  itemDesc?: string;                // Luggage or equipment description
  purpose: string;                  // Visit purpose
  inTime?: string;                  // ISO entry timestamp
  entryTime?: string;               // Compatibility alias for inTime
  outTime?: string | null;          // ISO exit timestamp or null
  exitTime?: string;                // Compatibility alias for outTime
  status?: 'on_site' | 'departed' | string;
}

export interface SecurityData {
  shift?: SecurityShiftType;        // Morning, afternoon, night
  shiftType?: SecurityShiftType;    // Compatibility alias for shift
  dutyPersonnel?: string;           // Primary duty officer
  relievingPersonnel?: string;      // Relieving duty officer
  handoverStatus?: 'in_progress' | 'completed' | 'pending' | string;
  notes?: string;                   // Handover notes / log
  patrolItems?: ChecklistItem[];     // Security patrol inspection checklist
  visitorLogs?: VisitorRecord[];     // Historical visitor log array
  visitorLog?: VisitorRecord;        // Single / latest visitor record
  isEmergency?: boolean;             // Emergency incident flag
}

// Unified dynamic persona data bag for app_driver and custom workflows
export type PersonaData = Partial<ExamData & ArtData & SecurityData> & Record<string, any>;

// ==========================================
// 6. Comprehensive Polymorphic Task Data Model
// ==========================================

export interface TodoItem {
  // Universal Identifiers & Metadata
  id: string;
  title: string;
  description?: string;
  notes?: string;                   // Compatibility alias for description

  // Status & Timing
  completed: boolean;               // Primary completion flag
  isCompleted?: boolean;            // Compatibility alias for completed (app_driver)
  completedAt?: string | null;      // ISO completion timestamp or null
  createdAt: string;                // ISO creation timestamp
  updatedAt: string;                // ISO last modification timestamp
  dueDate?: string | null;          // ISO due date/time string or null
  reminderTime?: string | null;     // ISO reminder date/time string or null

  // Priority & Scheduling
  priority: TaskPriority;           // 'urgent' | 'high' | 'medium' | 'low'
  repeatRule?: RepeatRuleType;      // 'none' | 'daily' | 'weekdays' | 'custom'
  recurrence?: TaskRecurrence;      // Detailed recurrence object (app_driver)
  isPinned?: boolean;               // Top-pin flag (emergency or user pinned)

  // Classification & Categorization
  category?: string;                // Category / template ID or label
  tags: string[];                   // Tag string array

  // Checklist Subtask Hierarchy
  subtasks?: ChecklistItem[];        // Primary subtasks array (app_driver & M3)
  checklists?: ChecklistItem[];     // Compatibility alias for subtasks (App.tsx & v1)

  // Multi-Dimensional Custom Fields
  customFields?: CustomFieldValue[] | Record<string, any>;

  // Execution Period & Frequency (User Requested Workflow)
  startDate?: string | null;        // 开始日期 (如 "2026-10-01")
  endDate?: string | null;          // 结束日期 (如 "2026-10-30")
  frequency?: string;               // 频次 (如 "once" | "daily" | "weekly" | "monthly" | "custom")
  frequencyDetail?: string;         // 频次详细说明 (如 "每周一次", "每周一")
  periodType?: 'daily' | 'weekly' | 'monthly' | 'emergency'; // 工作栏目: 日常 | 周常 | 月常 | 突发事件
  lastCycleKey?: string | null;     // 记录当前已刷新周期的Key (如 "2026-10-14" 或 "2026-W42")
  isEmergency?: boolean;            // 突发紧急事件标记
  emergencyLevel?: 'high' | 'urgent' | 'critical'; // 突发紧急等级
  resolvedAt?: string | null;       // 突发事件处置完毕时间
  isPiecewise?: boolean;            // 是否为分段函数周期任务
  piecewiseConfig?: PiecewiseConfig; // 分段函数详细配置
  isTemplate?: boolean;             // 预设事项/预案模板标记 (预先建好子任务清单，需要时直接一键调用)
  clientName?: string;              // 绘画: 单名 / 车主 / 甲方名字
  submitDate?: string | null;       // 绘画: 提交时间 / 交付期限
  alarmTime?: string | null;        // 闹钟提醒时间 (HH:mm)
  referenceNotes?: string;          // 参考文件与备忘笔记
  historyDates?: string[];          // 完成打卡日期序列 (用于日历标注)

  // Persona Categorization & Specialized Hooks
  persona: PersonaType;             // Primary persona ('exam' | 'art' | 'security' | 'custom' | 'general')
  personaId?: PersonaType;          // Compatibility alias for persona (app_driver)

  // Persona Specific Data Hooks
  examData?: ExamData;              // Postgraduate exam specific hook
  artData?: ArtData;                // Digital art pipeline hook
  securityData?: SecurityData;      // Security clerk shift hook
  personaData?: PersonaData | null; // Unified property bag for app_driver & E2E tests
}

export type Task = TodoItem;

// ==========================================
// 7. Normalization & Compatibility Helpers
// ==========================================

/**
 * Normalizes any partial task input into a complete, robust TodoItem
 * ensuring 100% contract compatibility across App.tsx, app_driver.cjs, and E2E suites.
 */
export function normalizeTask(input: Partial<TodoItem> & Record<string, any>): TodoItem {
  const now = new Date().toISOString();
  const id = input.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);
  const title = (input.title || '').trim();

  const isCompleted = Boolean(input.completed ?? input.isCompleted ?? false);
  const completedAt = isCompleted ? (input.completedAt || input.updatedAt || now) : null;

  const rawSubtasks = Array.isArray(input.subtasks) 
    ? input.subtasks 
    : Array.isArray(input.checklists) 
    ? input.checklists 
    : [];

  const subtasks: ChecklistItem[] = rawSubtasks.map((s: any, idx: number) => normalizeChecklistItem(s, idx));

  const persona: PersonaType = input.persona || input.personaId || 'exam';
  const repeatRule: RepeatRuleType = input.repeatRule || input.recurrence?.type || 'none';

  // Persona Data reconciliation
  const personaData = input.personaData 
    ? { ...input.personaData } 
    : input.examData || input.artData || input.securityData 
    ? { ...(input.examData || {}), ...(input.artData || {}), ...(input.securityData || {}) } 
    : null;

  const isEmergency = Boolean(input.isPinned || personaData?.isEmergency || input.securityData?.isEmergency);

  const task: TodoItem = {
    id,
    title,
    description: input.description || input.notes || '',
    notes: input.description || input.notes || '',
    completed: isCompleted,
    isCompleted,
    completedAt,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    priority: isEmergency ? 'urgent' : (input.priority || 'medium'),
    dueDate: input.dueDate || null,
    reminderTime: input.reminderTime || null,
    repeatRule,
    recurrence: input.recurrence || { type: repeatRule },
    isPinned: isEmergency,
    category: input.category || 'general',
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
    subtasks,
    checklists: subtasks,
    customFields: input.customFields ? (Array.isArray(input.customFields) ? [...input.customFields] : { ...input.customFields }) : {},
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    frequency: input.frequency || 'once',
    frequencyDetail: input.frequencyDetail || '',
    periodType: input.periodType || (input.category === 'emergency' ? 'emergency' : input.category === 'daily' ? 'daily' : input.category === 'weekly' ? 'weekly' : input.category === 'monthly' ? 'monthly' : undefined),
    lastCycleKey: input.lastCycleKey || null,
    isEmergency: Boolean(input.isEmergency || isEmergency || input.periodType === 'emergency' || input.category === 'emergency'),
    emergencyLevel: input.emergencyLevel || (isEmergency ? 'urgent' : undefined),
    resolvedAt: input.resolvedAt || null,
    isPiecewise: Boolean(input.isPiecewise || input.piecewiseConfig?.enabled),
    piecewiseConfig: input.piecewiseConfig || undefined,
    isTemplate: Boolean(
      input.isTemplate || 
      input.category === 'template' || 
      input.tags?.includes('预设事项') || 
      input.tags?.includes('文件参考') || 
      input.title?.startsWith('【预设】') || 
      input.title?.startsWith('【参考】')
    ),
    clientName: input.clientName || '',
    submitDate: input.submitDate || null,
    alarmTime: input.alarmTime || null,
    referenceNotes: input.referenceNotes || '',
    historyDates: Array.isArray(input.historyDates) ? [...input.historyDates] : [],

    persona,
    personaId: persona,
    examData: input.examData || (persona === 'exam' && personaData ? (personaData as ExamData) : undefined),
    artData: input.artData || (persona === 'art' && personaData ? (personaData as ArtData) : undefined),
    securityData: input.securityData || (persona === 'security' && personaData ? (personaData as SecurityData) : undefined),
    personaData
  };

  return task;
}

/**
 * Normalizes a checklist item preserving dual property access (text/title and completed/isCompleted).
 */
export function normalizeChecklistItem(input: Partial<ChecklistItem> & Record<string, any>, index: number = 0): ChecklistItem {
  const text = (input.text || input.title || '').trim();
  const completed = Boolean(input.completed ?? input.isCompleted ?? false);
  const order = input.order !== undefined ? input.order : index;
  const id = input.id || `sub-${index + 1}`;

  return {
    id,
    text,
    title: text,
    completed,
    isCompleted: completed,
    order
  };
}

/**
 * Calculates subtask progress metrics safely without division-by-zero errors.
 */
export function calculateSubtaskProgress(subtasks?: ChecklistItem[]): SubtaskProgress {
  if (!subtasks || subtasks.length === 0) {
    return { total: 0, completed: 0, ratio: 0, percentText: '0%' };
  }
  const completed = subtasks.filter(s => Boolean(s.completed ?? s.isCompleted)).length;
  const total = subtasks.length;
  const ratio = completed / total;
  return {
    total,
    completed,
    ratio,
    percentText: `${Math.round(ratio * 100)}%`
  };
}

/**
 * Generates standard cycle keys for a given date.
 * daily: "YYYY-MM-DD"
 * weekly: "YYYY-Www"
 * monthly: "YYYY-MM"
 */
export function getCycleKeyForDate(date: Date, type: 'daily' | 'weekly' | 'monthly'): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (type === 'daily') return `${y}-${m}-${d}`;
  if (type === 'monthly') return `${y}-${m}`;

  // ISO 8601 week calculation
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${y}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Evaluates piecewise function stage, calculating current stage, next stage, and progress.
 */
export function evaluatePiecewiseTask(task: TodoItem, currentDate: Date = new Date()): {
  currentStage: PiecewiseStage | null;
  nextStage: PiecewiseStage | null;
  elapsedDays: number;
  daysToNextStage: number;
  progressPercent: number;
} {
  if (!task.piecewiseConfig || !task.piecewiseConfig.stages || task.piecewiseConfig.stages.length === 0) {
    return { currentStage: null, nextStage: null, elapsedDays: 1, daysToNextStage: 0, progressPercent: 0 };
  }
  const baseDateStr = task.piecewiseConfig.baseDate || task.startDate || task.createdAt;
  const baseDate = new Date(baseDateStr);
  const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diffTime = current.getTime() - base.getTime();
  const elapsedDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const stages = task.piecewiseConfig.stages;
  let currentStage: PiecewiseStage | null = null;
  let nextStage: PiecewiseStage | null = null;

  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (elapsedDays >= s.startDay && elapsedDays <= s.endDay) {
      currentStage = s;
      if (i + 1 < stages.length) nextStage = stages[i + 1];
      break;
    }
  }

  if (!currentStage && stages.length > 0) {
    if (elapsedDays > stages[stages.length - 1].endDay) {
      currentStage = stages[stages.length - 1];
    } else {
      currentStage = stages[0];
      if (stages.length > 1) nextStage = stages[1];
    }
  }

  const daysToNextStage = currentStage ? Math.max(0, currentStage.endDay - elapsedDays + 1) : 0;
  const totalDays = task.piecewiseConfig.totalDays || (stages[stages.length - 1]?.endDay || 30);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return { currentStage, nextStage, elapsedDays, daysToNextStage, progressPercent };
}
