import { describe, expect, it } from 'vitest';
import {
  addSubtask,
  createSubtask,
  createTask,
  patchTask,
  resolveEmergency,
  setCompleted,
  subtaskProgress,
  TaskValidationError,
  toggleSubtask,
  withSubtasks,
} from './task';

const at = (iso: string) => new Date(iso);

describe('createTask', () => {
  it('trims the title and rejects empty ones', () => {
    expect(createTask({ title: '  背单词  ' }).title).toBe('背单词');
    expect(() => createTask({ title: '   ' })).toThrow(TaskValidationError);
  });

  it('pins emergencies and makes them urgent', () => {
    const t = createTask({ title: '配电房告警', isEmergency: true, priority: 'low' });
    expect(t).toMatchObject({ isPinned: true, priority: 'urgent', emergencyLevel: 'urgent' });
  });
});

describe('setCompleted', () => {
  it('records the LOCAL date in history (07:00 in Shanghai is the previous UTC day)', () => {
    const now = at('2026-10-24T07:00:00+08:00');
    const done = setCompleted(createTask({ title: 'x' }, now), true, now);
    expect(done.historyDates).toEqual(['2026-10-24']);
    expect(setCompleted(done, false, now).historyDates).toEqual([]);
  });

  it('stamps the cycle key for recurring tasks and resolves emergencies', () => {
    const now = at('2026-10-24T09:00:00+08:00');
    expect(setCompleted(createTask({ title: 'x', period: 'weekly' }, now), true, now).lastCycleKey).toBe('2026-W43');
    const em = setCompleted(createTask({ title: 'x', isEmergency: true }, now), true, now);
    expect(em.resolvedAt).toBe(now.toISOString());
  });

  it('resolveEmergency also drops the pin', () => {
    const em = resolveEmergency(createTask({ title: 'x', isEmergency: true }));
    expect(em).toMatchObject({ completed: true, isPinned: false });
  });
});

describe('subtasks', () => {
  it('completes the parent when the last subtask is checked, and reopens it when one is unchecked', () => {
    let t = createTask({ title: 'x', subtasks: [createSubtask('a'), createSubtask('b')] });
    t = toggleSubtask(t, t.subtasks[0].id);
    expect(t.completed).toBe(false);
    t = toggleSubtask(t, t.subtasks[1].id);
    expect(t.completed).toBe(true);
    t = toggleSubtask(t, t.subtasks[0].id);
    expect(t.completed).toBe(false);
  });

  it('never auto-completes templates', () => {
    const tpl = createTask({ title: '【预设】入职', isTemplate: true, subtasks: [createSubtask('a')] });
    expect(withSubtasks(tpl, [{ ...tpl.subtasks[0], completed: true }]).completed).toBe(false);
  });

  it('checking a subtask of a daily task attributes the progress to today', () => {
    const now = at('2026-10-24T09:00:00+08:00');
    const t = createTask({ title: 'x', period: 'daily', subtasks: [createSubtask('a'), createSubtask('b')] }, now);
    expect(toggleSubtask(t, t.subtasks[0].id, now).lastCycleKey).toBe('2026-10-24');
  });

  it('addSubtask rejects blank text', () => {
    expect(() => addSubtask(createTask({ title: 'x' }), ' ')).toThrow(TaskValidationError);
  });

  it('subtaskProgress handles empty lists', () => {
    expect(subtaskProgress([])).toEqual({ total: 0, completed: 0, ratio: 0, percent: 0 });
  });
});

describe('patchTask', () => {
  it('keeps the edit and validates the title', () => {
    const t = createTask({ title: 'x' });
    expect(patchTask(t, { title: ' y ', description: 'd' })).toMatchObject({ title: 'y', description: 'd' });
    expect(() => patchTask(t, { title: '' })).toThrow(TaskValidationError);
  });

  it('editing fields and then the checklist keeps both (old updateTask dropped the edits)', () => {
    const t = createTask({ title: 'old', subtasks: [createSubtask('a')] });
    const edited = withSubtasks(patchTask(t, { title: 'new', description: 'note' }), [{ ...t.subtasks[0], completed: true }]);
    expect(edited).toMatchObject({ title: 'new', description: 'note', completed: true });
  });
});
