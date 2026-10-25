/**
 * Turns the add-task form into a TaskDraft: decides which panel the task
 * lands in, its cycle period, labels and flavour-specific fields.
 */
import { flavorForTemplate, type Panel } from './panels';
import { createPiecewiseConfig, type PiecewiseTemplateId } from './piecewise';
import { CYCLE_PERIODS, type CyclePeriod, type EmergencyLevel, type Subtask, type TaskDraft, type TaskFlavor } from './task';

export const FREQUENCY_OPTIONS = [
  { id: 'daily', label: '每日 (日常)', detail: '每日刷新' },
  { id: 'weekly', label: '每周一次 (周常)', detail: '每周刷新' },
  { id: 'monthly', label: '每月一次 (月常)', detail: '每月刷新' },
  { id: 'once', label: '仅此一次', detail: '单次任务' },
  { id: 'custom', label: '自定义频次', detail: '自定义' },
] as const;

export type FrequencyId = (typeof FREQUENCY_OPTIONS)[number]['id'];

const PERIOD_NAMES: Record<CyclePeriod, string> = { daily: '每日打卡', weekly: '本周重点', monthly: '本月规划' };

/** Where a new task goes: the inbox, an emergency, a panel, or a panel-less exam/art flavour. */
export type AddTarget =
  | { kind: 'inbox' }
  | { kind: 'emergency' }
  | { kind: 'panel'; panel: Panel; flavor: TaskFlavor }
  | { kind: 'flavor'; flavor: 'exam' | 'art' };

export function resolveAddTarget(target: string, panels: Panel[]): AddTarget {
  if (target === 'emergency') return { kind: 'emergency' };
  if (target === 'exam' || target === 'art') return { kind: 'flavor', flavor: target };
  const panel = panels.find(p => p.id === target);
  if (panel) return { kind: 'panel', panel, flavor: flavorForTemplate(panel.templateId) };
  return { kind: 'inbox' };
}

export const targetFlavor = (t: AddTarget): TaskFlavor =>
  t.kind === 'panel' || t.kind === 'flavor' ? t.flavor : t.kind === 'emergency' ? 'work' : 'general';

export interface AddTaskForm {
  title: string;
  subtasks: Subtask[];
  /** exam/art: 'daily' check-in vs. long-running item. */
  routine: 'daily' | 'project';
  /** Period for general / work targets. */
  period: CyclePeriod;
  emergencyLevel: Extract<EmergencyLevel, 'urgent' | 'critical'>;
  usePeriodRange: boolean;
  startDate: string;
  endDate: string;
  frequency: FrequencyId;
  customFrequency: string;
  useAlarm: boolean;
  alarmTime: string;
  usePiecewise: boolean;
  piecewiseTemplate: PiecewiseTemplateId;
  examSubject: string;
  clientName: string;
  submitDate: string;
}

export interface TaskFormResult {
  draft: TaskDraft;
  /** Human-readable destination for the confirmation toast. */
  destination: string;
  /** Tab to show afterwards. */
  navigateTo: string;
}

export function buildTaskDraft(form: AddTaskForm, target: AddTarget): TaskFormResult {
  const flavor = targetFlavor(target);
  const panel = target.kind === 'panel' ? target.panel : null;
  const isEmergency = target.kind === 'emergency';
  const isExam = flavor === 'exam';
  const isArt = flavor === 'art';

  // Explicit period chosen in the form; falls back to the frequency picker.
  let period: CyclePeriod | null;
  let destination: string;
  if (isEmergency) {
    period = null;
    destination = '待办·突发事件';
  } else if (isExam || isArt) {
    period = form.routine === 'daily' ? 'daily' : null;
    const label = isExam ? '考研' : '绘画';
    const routineName = form.routine === 'daily' ? '每日打卡' : isExam ? '备考科目' : '商单排单';
    destination = `${label}·${routineName}`;
  } else {
    period = form.period;
    destination = panel ? panel.name : `待办·${PERIOD_NAMES[form.period]}`;
  }

  const frequency = isEmergency
    ? 'once'
    : period === 'daily' || form.frequency === 'daily'
      ? 'daily'
      : form.usePiecewise
        ? 'piecewise'
        : form.frequency;
  if (!isEmergency && period === null && CYCLE_PERIODS.includes(frequency as CyclePeriod)) {
    period = frequency as CyclePeriod;
  }

  const frequencyDetail = isEmergency
    ? ''
    : form.usePiecewise
      ? '分段函数变化'
      : frequency === 'daily'
        ? '每日刷新'
        : frequency === 'custom'
          ? form.customFrequency.trim()
          : (FREQUENCY_OPTIONS.find(f => f.id === frequency)?.detail ?? '单次');

  const targetTag = isEmergency
    ? '🚨突发事件'
    : isExam
      ? form.routine === 'daily' ? '考研日常' : '考研'
      : isArt
        ? form.routine === 'daily' ? '绘画日常' : '绘画'
        : panel?.name ?? '待办';
  const cycleTag =
    frequency === 'daily' ? '每日打卡' : form.usePiecewise ? 'f(t)分段变化' : period === 'weekly' ? '周常' : period === 'monthly' ? '月常' : '自填';

  const commission = isArt && form.routine === 'project';

  const draft: TaskDraft = {
    title: form.title,
    panelId: panel?.id ?? null,
    flavor,
    priority: 'high',
    isEmergency,
    emergencyLevel: isEmergency ? form.emergencyLevel : null,
    period,
    frequency,
    frequencyDetail,
    piecewise: form.usePiecewise && !isEmergency ? createPiecewiseConfig(form.piecewiseTemplate, form.startDate) : null,
    startDate: form.usePeriodRange ? form.startDate : null,
    endDate: form.usePeriodRange ? form.endDate : null,
    alarmTime: form.useAlarm && form.alarmTime ? form.alarmTime : null,
    subtasks: form.subtasks,
    tags: isEmergency ? [targetTag] : [targetTag, cycleTag],
    clientName: commission ? form.clientName.trim() : '',
    submitDate: commission ? form.submitDate : null,
    examSubject: isExam ? form.examSubject : null,
    reviewTracking: isExam,
  };

  return { draft, destination, navigateTo: panel?.id ?? 'tasks' };
}
