/**
 * Periodic auto-refresh: daily tasks reset at local midnight, weekly ones on
 * Monday (ISO week), monthly ones on the 1st. A task is reset when it carries
 * progress that belongs to an earlier cycle than the current one.
 */
import { periodKey } from './dates';
import { effectiveCyclePeriod, hasProgress, resetForCycle, type CyclePeriod, type Task } from './task';

export interface CycleRefreshResult {
  tasks: Task[];
  refreshedIds: string[];
}

type Refresh = { task: Task; reset: boolean };

function refreshOne(t: Task, now: Date): Refresh {
  const period = effectiveCyclePeriod(t, now);
  if (!period || !hasProgress(t)) return { task: t, reset: false };

  const currentKey = periodKey(now, period);
  // Legacy rows may lack a key; fall back to when they were completed.
  const progressKey = t.lastCycleKey ?? (t.completedAt ? periodKey(new Date(t.completedAt), period) : null);

  if (progressKey === null) {
    // Progress of unknown age: attribute it to the current cycle rather than wiping it.
    return { task: { ...t, lastCycleKey: currentKey }, reset: false };
  }
  if (progressKey === currentKey) return { task: t, reset: false };
  return { task: resetForCycle(t, currentKey, now), reset: true };
}

/** Resets every task whose progress belongs to a past cycle. */
export function refreshCycles(tasks: Task[], now: Date = new Date()): CycleRefreshResult {
  const refreshedIds: string[] = [];
  let changed = false;
  const next = tasks.map(t => {
    const { task, reset } = refreshOne(t, now);
    if (task !== t) changed = true;
    if (reset) refreshedIds.push(t.id);
    return task;
  });
  return { tasks: changed ? next : tasks, refreshedIds };
}

/** Manual "reset this cycle now" for one panel's tasks of a given period. */
export function resetCycleNow(
  tasks: Task[],
  period: CyclePeriod,
  panelId: string | null,
  now: Date = new Date(),
): CycleRefreshResult {
  const key = periodKey(now, period);
  const refreshedIds: string[] = [];
  const next = tasks.map(t => {
    if (t.period !== period || t.isEmergency || t.isTemplate) return t;
    if (panelId !== null && t.panelId !== panelId) return t;
    if (!hasProgress(t)) return t;
    refreshedIds.push(t.id);
    return resetForCycle(t, key, now);
  });
  return { tasks: refreshedIds.length ? next : tasks, refreshedIds };
}
