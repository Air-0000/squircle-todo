/**
 * Reads tasks written by any app version into the v3 model.
 *
 * v1/v2 rows carried duplicated alias fields (completed/isCompleted,
 * subtasks/checklists, persona/personaId, notes/description, examData/
 * personaData, ...) and encoded panel membership, cycle period and template
 * status in several overlapping ways. Each is resolved once, here.
 */
import { uid } from './ids';
import { toDateKey } from './dates';
import type { PiecewiseConfig } from './piecewise';
import {
  CYCLE_PERIODS,
  type CyclePeriod,
  type EmergencyLevel,
  type Subtask,
  type Task,
  type TaskFlavor,
  type TaskPriority,
} from './task';

export const TASK_SCHEMA_VERSION = 3;

type Raw = Record<string, any>;

const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
const EMERGENCY_LEVELS: EmergencyLevel[] = ['high', 'urgent', 'critical'];
const LEGACY_PERSONAS = ['exam', 'art', 'security', 'custom', 'general'];

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPeriod = (v: unknown): v is CyclePeriod => CYCLE_PERIODS.includes(v as CyclePeriod);

function normalizeSubtasks(raw: Raw): Subtask[] {
  const list = Array.isArray(raw.subtasks) ? raw.subtasks : Array.isArray(raw.checklists) ? raw.checklists : [];
  return list
    .filter(isObj)
    .map((s: Raw) => ({
      id: str(s.id) || uid('sub'),
      text: str(s.text || s.title).trim(),
      completed: Boolean(s.completed ?? s.isCompleted),
    }))
    .filter((s: Subtask) => s.text);
}

/** Panel ids are `<templateId>-<suffix>`; legacy rows stored them in `persona`. */
function resolvePanelAndFlavor(raw: Raw): { panelId: string | null; flavor: TaskFlavor } {
  if ('panelId' in raw || 'flavor' in raw) {
    const flavor = (['exam', 'art', 'work', 'general'] as TaskFlavor[]).includes(raw.flavor) ? raw.flavor : 'general';
    return { panelId: strOrNull(raw.panelId), flavor };
  }
  const persona = str(raw.persona || raw.personaId);
  if (persona && !LEGACY_PERSONAS.includes(persona)) {
    const prefix = persona.split('-')[0];
    const flavor: TaskFlavor = prefix === 'exam' || prefix === 'art' || prefix === 'work' ? prefix : 'general';
    return { panelId: persona, flavor };
  }
  const flavor: TaskFlavor =
    persona === 'exam' ? 'exam' : persona === 'art' ? 'art' : persona === 'security' ? 'work' : 'general';
  return { panelId: null, flavor };
}

function legacyIsTemplate(raw: Raw, tags: string[], title: string): boolean {
  return Boolean(
    raw.isTemplate ||
      raw.category === 'template' ||
      tags.includes('预设事项') ||
      tags.includes('文件参考') ||
      title.startsWith('【预设】') ||
      title.startsWith('【参考】'),
  );
}

function legacyIsEmergency(raw: Raw): boolean {
  return Boolean(
    raw.isEmergency ||
      raw.periodType === 'emergency' ||
      raw.category === 'emergency' ||
      raw.personaData?.isEmergency ||
      raw.securityData?.isEmergency,
  );
}

/** Mirrors the v2 `isTaskInPeriod` heuristics, checked daily → weekly → monthly. */
function legacyPeriod(raw: Raw, tags: string[]): CyclePeriod | null {
  const signals = [raw.periodType, raw.category, raw.frequency];
  const tagHints: Record<CyclePeriod, string[]> = {
    daily: ['日常', '每日', '打卡'],
    weekly: ['周常', '每周'],
    monthly: ['月常', '每月'],
  };
  for (const period of CYCLE_PERIODS) {
    if (signals.includes(period)) return period;
    if (tags.some(tag => tagHints[period].some(h => tag.includes(h)))) return period;
  }
  return null;
}

function normalizePiecewise(raw: Raw): PiecewiseConfig | null {
  const cfg = raw.piecewise ?? raw.piecewiseConfig;
  if (!isObj(cfg) || !Array.isArray(cfg.stages) || cfg.stages.length === 0) return null;
  if (cfg.enabled === false && !raw.isPiecewise) return null;
  return {
    templateType: cfg.templateType,
    baseDate: str(cfg.baseDate) || str(raw.startDate) || toDateKey(new Date(str(raw.createdAt) || Date.now())),
    totalDays: num(cfg.totalDays),
    stages: cfg.stages,
  };
}

/** Normalizes one stored/imported row; returns null for unusable rows. */
export function normalizeTask(input: unknown): Task | null {
  if (!isObj(input)) return null;
  const raw = input;
  const title = str(raw.title).trim();
  if (!title) return null;

  const now = new Date().toISOString();
  const tags: string[] = Array.isArray(raw.tags) ? raw.tags.filter((t: unknown) => typeof t === 'string') : [];
  // v2's loader let `isCompleted` win when the two aliases disagreed.
  const completed = Boolean(raw.isCompleted ?? raw.completed);
  const isTemplate = legacyIsTemplate(raw, tags, title);
  const isEmergency = !isTemplate && legacyIsEmergency(raw);
  const piecewise = normalizePiecewise(raw);
  const exam: Raw = { ...(isObj(raw.personaData) ? raw.personaData : {}), ...(isObj(raw.examData) ? raw.examData : {}) };

  const period: CyclePeriod | null =
    isTemplate || isEmergency ? null : 'period' in raw ? (isPeriod(raw.period) ? raw.period : null) : legacyPeriod(raw, tags);

  const reviewTracking =
    'reviewTracking' in raw
      ? Boolean(raw.reviewTracking)
      : Boolean(
          piecewise?.templateType === 'ebbinghaus' || exam.ebbinghausTracking || tags.includes('艾宾浩斯') || tags.includes('复习'),
        );

  return {
    id: str(raw.id) || uid('task'),
    title,
    description: str(raw.description || raw.notes),
    priority: isEmergency ? 'urgent' : PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
    tags,
    subtasks: normalizeSubtasks(raw),

    completed,
    completedAt: completed ? strOrNull(raw.completedAt) ?? strOrNull(raw.updatedAt) ?? now : null,
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now,
    historyDates: Array.isArray(raw.historyDates) ? raw.historyDates.filter((d: unknown) => typeof d === 'string') : [],

    ...resolvePanelAndFlavor(raw),

    isPinned: isEmergency || Boolean(raw.isPinned),
    isTemplate,
    isEmergency,
    emergencyLevel: isEmergency ? (EMERGENCY_LEVELS.includes(raw.emergencyLevel) ? raw.emergencyLevel : 'urgent') : null,
    resolvedAt: strOrNull(raw.resolvedAt),

    period,
    lastCycleKey: strOrNull(raw.lastCycleKey),
    frequency: str(raw.frequency) || (period ?? 'once'),
    frequencyDetail: str(raw.frequencyDetail),
    piecewise,

    startDate: strOrNull(raw.startDate),
    endDate: strOrNull(raw.endDate),
    dueDate: strOrNull(raw.dueDate),
    alarmTime: strOrNull(raw.alarmTime),

    clientName: str(raw.clientName),
    submitDate: strOrNull(raw.submitDate),
    examSubject: strOrNull(raw.examSubject) ?? strOrNull(exam.subject),
    reviewTracking,
    reviewDueDate: strOrNull(raw.reviewDueDate) ?? strOrNull(exam.ebbinghaus?.nextDue),
    focusMinutes: num(raw.focusMinutes) || num(exam.focusTimeTotalMinutes),
    pomodoroCount: num(raw.pomodoroCount) || num(exam.pomodoroCount),
  };
}

export function normalizeTasks(list: unknown): Task[] {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTask).filter((t): t is Task => t !== null);
}

/** Accepts a stored payload of any version: `{ schemaVersion, tasks }` or a bare array. */
export function migrateTaskPayload(raw: unknown): { tasks: Task[]; migrated: boolean } {
  if (Array.isArray(raw)) return { tasks: normalizeTasks(raw), migrated: true };
  if (!isObj(raw)) return { tasks: [], migrated: false };
  return {
    tasks: normalizeTasks(raw.tasks),
    migrated: raw.schemaVersion !== TASK_SCHEMA_VERSION,
  };
}
