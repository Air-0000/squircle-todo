import { describe, expect, it } from 'vitest';
import { refreshCycles, resetCycleNow } from './cycles';
import { toIsoWeekKey } from './dates';
import { createPiecewiseConfig } from './piecewise';
import { createSubtask, createTask, setCompleted, toggleSubtask, type Task } from './task';

const at = (iso: string) => new Date(iso);
const mon = at('2026-10-19T09:00:00+08:00');
const tue = at('2026-10-20T09:00:00+08:00');
const nextMon = at('2026-10-26T00:30:00+08:00');

const doneOn = (task: Task, when: Date) => setCompleted(task, true, when);

describe('refreshCycles', () => {
  it('resets a daily task the next day but not the same day', () => {
    const t = doneOn(createTask({ title: 'x', period: 'daily' }, mon), mon);
    expect(refreshCycles([t], at('2026-10-19T23:59:00+08:00')).refreshedIds).toEqual([]);
    const { tasks, refreshedIds } = refreshCycles([t], tue);
    expect(refreshedIds).toEqual([t.id]);
    expect(tasks[0]).toMatchObject({ completed: false, lastCycleKey: '2026-10-20' });
  });

  it('resets weekly tasks on Monday only', () => {
    const t = doneOn(createTask({ title: 'x', period: 'weekly' }, mon), mon);
    expect(refreshCycles([t], at('2026-10-25T23:00:00+08:00')).refreshedIds).toEqual([]);
    expect(refreshCycles([t], nextMon).refreshedIds).toEqual([t.id]);
  });

  it('leaves one-off, emergency and template tasks alone', () => {
    const tasks = [
      doneOn(createTask({ title: 'once' }, mon), mon),
      doneOn(createTask({ title: 'em', isEmergency: true, period: 'daily' }, mon), mon),
      doneOn(createTask({ title: 'tpl', isTemplate: true, period: 'daily' }, mon), mon),
    ];
    expect(refreshCycles(tasks, nextMon).tasks).toBe(tasks);
  });

  it('falls back to completedAt for legacy rows without a cycle key', () => {
    const legacy = { ...doneOn(createTask({ title: 'x', period: 'daily' }, mon), mon), lastCycleKey: null };
    expect(refreshCycles([legacy], tue).refreshedIds).toEqual([legacy.id]);
  });

  it('does not wipe partial subtask progress of unknown age (v2 reset it every minute)', () => {
    const base = createTask({ title: 'x', period: 'daily', subtasks: [createSubtask('a'), createSubtask('b')] }, mon);
    const partial = { ...base, subtasks: [{ ...base.subtasks[0], completed: true }, base.subtasks[1]], lastCycleKey: null };
    const { tasks, refreshedIds } = refreshCycles([partial], mon);
    expect(refreshedIds).toEqual([]);
    expect(tasks[0].subtasks[0].completed).toBe(true);
    expect(tasks[0].lastCycleKey).toBe('2026-10-19');
  });

  it('resets partial subtask progress from a previous day', () => {
    const t = createTask({ title: 'x', period: 'daily', subtasks: [createSubtask('a'), createSubtask('b')] }, mon);
    const partial = toggleSubtask(t, t.subtasks[0].id, mon);
    const { tasks } = refreshCycles([partial], tue);
    expect(tasks[0].subtasks.every(s => !s.completed)).toBe(true);
  });

  it('does not immediately reset a piecewise task completed during a weekly stage', () => {
    // Ebbinghaus template: days 8–15 are weekly.
    const base = createTask({ title: 'x', piecewise: createPiecewiseConfig('ebbinghaus', '2026-10-10') }, tue);
    const done = doneOn(base, tue);
    expect(done.lastCycleKey).toBe(toIsoWeekKey(tue));
    expect(refreshCycles([done], at('2026-10-21T09:00:00+08:00')).refreshedIds).toEqual([]);
  });
});

describe('resetCycleNow', () => {
  it('only touches the given panel and period', () => {
    const a = doneOn(createTask({ title: 'a', period: 'daily', panelId: 'p1' }, mon), mon);
    const b = doneOn(createTask({ title: 'b', period: 'daily', panelId: 'p2' }, mon), mon);
    const c = doneOn(createTask({ title: 'c', period: 'weekly', panelId: 'p1' }, mon), mon);
    const { tasks, refreshedIds } = resetCycleNow([a, b, c], 'daily', 'p1', mon);
    expect(refreshedIds).toEqual([a.id]);
    expect(tasks.map(t => t.completed)).toEqual([false, true, true]);
  });
});
