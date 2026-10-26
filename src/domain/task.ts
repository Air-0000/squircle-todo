/**
 * Task model (schema v3) and the pure state transitions applied to it.
 * Stores call these; nothing here touches React, storage or the native bridge.
 */
import { periodKey, toDateKey } from './dates';
import { uid } from './ids';
import { piecewiseCyclePeriod, type PiecewiseConfig } from './piecewise';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type CyclePeriod = 'daily' | 'weekly' | 'monthly';
export type EmergencyLevel = 'high' | 'urgent' | 'critical';
/** Workflow flavour a task was created with; drives a few labels and extra fields. */
export type TaskFlavor = 'exam' | 'art' | 'work' | 'general';

export const CYCLE_PERIODS: CyclePeriod[] = ['daily', 'weekly', 'monthly'];

export const CYCLE_LABELS: Record<CyclePeriod, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string[];
  subtasks: Subtask[];

  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Local dates (YYYY-MM-DD) on which the task was checked off. */
  historyDates: string[];

  /** Custom panel the task belongs to; null means it only lives in the inbox. */
  panelId: string | null;
  flavor: TaskFlavor;

  isPinned: boolean;
  /** Reusable checklist ("预设事项/预案") — never completed, only instantiated. */
  isTemplate: boolean;
  isEmergency: boolean;
  emergencyLevel: EmergencyLevel | null;
  resolvedAt: string | null;

  /** Auto-refresh cycle: the task un-completes itself when the cycle rolls over. */
  period: CyclePeriod | null;
  /** Cycle key (see cycles.ts) of the cycle the current progress belongs to. */
  lastCycleKey: string | null;
  /** Display-only frequency id: once | daily | weekly | monthly | custom | piecewise. */
  frequency: string;
  frequencyDetail: string;
  piecewise: PiecewiseConfig | null;

  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  alarmTime: string | null; // HH:mm

  // Flavour-specific extras
  clientName: string;
  submitDate: string | null;
  examSubject: string | null;
  /** Shown in the Ebbinghaus review module. */
  reviewTracking: boolean;
  reviewDueDate: string | null;
  focusMinutes: number;
  pomodoroCount: number;
}

export type TaskDraft = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & { title: string };

export class TaskValidationError extends Error {}

function cleanTitle(title: unknown): string {
  const value = typeof title === 'string' ? title.trim() : '';
  if (!value) throw new TaskValidationError('事项标题不能为空');
  return value;
}

export function createSubtask(text: string): Subtask {
  return { id: uid('sub'), text: text.trim(), completed: false };
}

/** Fresh, unchecked copies of a checklist (used when instantiating templates). */
export function cloneSubtasks(subtasks: Subtask[]): Subtask[] {
  return subtasks.map(s => createSubtask(s.text));
}

export function createTask(draft: TaskDraft, now: Date = new Date()): Task {
  const ts = now.toISOString();
  const isEmergency = Boolean(draft.isEmergency);
  return {
    description: '',
    priority: 'medium',
    tags: [],
    subtasks: [],
    completed: false,
    completedAt: null,
    historyDates: [],
    panelId: null,
    flavor: 'general',
    isPinned: false,
    isTemplate: false,
    emergencyLevel: null,
    resolvedAt: null,
    period: null,
    lastCycleKey: null,
    frequency: 'once',
    frequencyDetail: '',
    piecewise: null,
    startDate: null,
    endDate: null,
    dueDate: null,
    alarmTime: null,
    clientName: '',
    submitDate: null,
    examSubject: null,
    reviewTracking: false,
    reviewDueDate: null,
    focusMinutes: 0,
    pomodoroCount: 0,
    ...draft,
    id: uid('task'),
    title: cleanTitle(draft.title),
    isEmergency,
    // Emergencies are always pinned to the top.
    ...(isEmergency ? { isPinned: true, priority: 'urgent' as const, emergencyLevel: draft.emergencyLevel ?? 'urgent' } : {}),
    createdAt: ts,
    updatedAt: ts,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface SubtaskProgress {
  total: number;
  completed: number;
  ratio: number;
  percent: number;
}

export function subtaskProgress(subtasks: Subtask[]): SubtaskProgress {
  const total = subtasks.length;
  const completed = subtasks.filter(s => s.completed).length;
  const ratio = total === 0 ? 0 : completed / total;
  return { total, completed, ratio, percent: Math.round(ratio * 100) };
}

export const isActiveEmergency = (t: Task) => t.isEmergency && !t.isTemplate && !t.completed;

/** Tasks that show up in regular lists (templates are managed separately). */
export const isListable = (t: Task) => !t.isTemplate;

export function hasProgress(t: Task): boolean {
  return t.completed || t.subtasks.some(s => s.completed);
}

/** Pinned, urgent and emergency tasks first, then newest first. */
export function compareByUrgencyThenNewest(a: Task, b: Task): number {
  const ua = a.isEmergency || a.isPinned || a.priority === 'urgent';
  const ub = b.isEmergency || b.isPinned || b.priority === 'urgent';
  if (ua !== ub) return ua ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export function matchesSearch(t: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    t.title.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  );
}

/** Strips the 【预设】/【参考】 prefix legacy templates carry in their titles. */
export function templateBaseTitle(t: Task): string {
  return t.title.replace(/^【(预设|参考)】\s*/, '').trim();
}

// ---------------------------------------------------------------------------
// Transitions — each returns a new Task
// ---------------------------------------------------------------------------

/** Cycle a task's progress resets on, or null for one-off tasks. */
export function effectiveCyclePeriod(t: Task, now: Date = new Date()): CyclePeriod | null {
  if (t.isEmergency || t.isTemplate) return null;
  if (t.period) return t.period;
  if (t.piecewise) return piecewiseCyclePeriod(t.piecewise, now);
  return null;
}

/** The cycle key progress made "now" should be attributed to. */
function progressCycleKey(t: Task, now: Date): string | null {
  const period = effectiveCyclePeriod(t, now);
  return period ? periodKey(now, period) : t.lastCycleKey;
}

export function setCompleted(t: Task, completed: boolean, now: Date = new Date()): Task {
  if (t.completed === completed) return t;
  const ts = now.toISOString();
  const today = toDateKey(now);
  return {
    ...t,
    completed,
    completedAt: completed ? ts : null,
    resolvedAt: t.isEmergency ? (completed ? ts : null) : t.resolvedAt,
    historyDates: completed
      ? t.historyDates.includes(today) ? t.historyDates : [...t.historyDates, today]
      : t.historyDates.filter(d => d !== today),
    lastCycleKey: completed ? progressCycleKey(t, now) : t.lastCycleKey,
    updatedAt: ts,
  };
}

/** Resolving an emergency completes it and drops its pin. */
export function resolveEmergency(t: Task, now: Date = new Date()): Task {
  return { ...setCompleted(t, true, now), isPinned: false };
}

/**
 * Replaces the checklist and keeps the parent's completion in sync with it:
 * all subtasks done ⇒ completed, any undone ⇒ not completed. Templates are
 * never auto-completed.
 */
export function withSubtasks(t: Task, subtasks: Subtask[], now: Date = new Date()): Task {
  let next: Task = { ...t, subtasks, updatedAt: now.toISOString() };
  if (subtasks.some(s => s.completed)) {
    next.lastCycleKey = progressCycleKey(next, now);
  }
  if (!t.isTemplate && subtasks.length > 0) {
    next = setCompleted(next, subtasks.every(s => s.completed), now);
  }
  return next;
}

export function toggleSubtask(t: Task, subtaskId: string, now: Date = new Date()): Task {
  return withSubtasks(
    t,
    t.subtasks.map(s => (s.id === subtaskId ? { ...s, completed: !s.completed } : s)),
    now,
  );
}

export function addSubtask(t: Task, text: string, now: Date = new Date()): Task {
  if (!text.trim()) throw new TaskValidationError('子任务内容不能为空');
  return withSubtasks(t, [...t.subtasks, createSubtask(text)], now);
}

export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'completedAt' | 'subtasks'>>;

/** Field edits. Completion and checklist changes go through the dedicated transitions. */
export function patchTask(t: Task, patch: TaskPatch, now: Date = new Date()): Task {
  const next: Task = { ...t, ...patch, updatedAt: now.toISOString() };
  if (patch.title !== undefined) next.title = cleanTitle(patch.title);
  return next;
}

/** Clears progress for a new cycle and stamps it with that cycle's key. */
export function resetForCycle(t: Task, cycleKey: string, now: Date = new Date()): Task {
  return {
    ...t,
    completed: false,
    completedAt: null,
    subtasks: t.subtasks.map(s => (s.completed ? { ...s, completed: false } : s)),
    lastCycleKey: cycleKey,
    updatedAt: now.toISOString(),
  };
}
