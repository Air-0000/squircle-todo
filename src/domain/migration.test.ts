import { describe, expect, it } from 'vitest';
import { migrateTaskPayload, normalizeTask, TASK_SCHEMA_VERSION } from './migration';
import { createTask } from './task';

/** A row as v1.3.x stored it, aliases and all. */
const v2Row = {
  id: 'task-1',
  title: ' 背单词 ',
  notes: '每天 50 个',
  completed: false,
  isCompleted: true,
  completedAt: '2026-10-20T01:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-20T01:00:00.000Z',
  priority: 'high',
  persona: 'exam-lx9k2',
  personaId: 'exam-lx9k2',
  category: 'general',
  tags: ['考研', '每日打卡'],
  checklists: [
    { id: 's1', title: 'List 1', isCompleted: true, order: 0 },
    { id: 's2', text: '', completed: false, order: 1 },
  ],
  examData: { subject: 'english', ebbinghausTracking: true, ebbinghaus: { round: 1, nextDue: '2026-10-21', history: [] } },
  personaData: { focusTimeTotalMinutes: 50, pomodoroCount: 2 },
};

describe('normalizeTask (v2 → v3)', () => {
  it('collapses alias fields', () => {
    const t = normalizeTask(v2Row)!;
    expect(t).toMatchObject({
      id: 'task-1',
      title: '背单词',
      description: '每天 50 个',
      completed: true,
      priority: 'high',
      subtasks: [{ id: 's1', text: 'List 1', completed: true }],
    });
    expect(t).not.toHaveProperty('isCompleted');
    expect(t).not.toHaveProperty('checklists');
  });

  it('turns a panel id stored in `persona` into panelId + flavour', () => {
    expect(normalizeTask(v2Row)).toMatchObject({ panelId: 'exam-lx9k2', flavor: 'exam' });
    expect(normalizeTask({ title: 'x', persona: 'security' })).toMatchObject({ panelId: null, flavor: 'work' });
  });

  it('derives the cycle period from periodType / category / frequency / tags', () => {
    expect(normalizeTask(v2Row)!.period).toBe('daily');
    expect(normalizeTask({ title: 'x', periodType: 'weekly' })!.period).toBe('weekly');
    expect(normalizeTask({ title: 'x', frequency: 'monthly' })!.period).toBe('monthly');
    expect(normalizeTask({ title: 'x', category: 'general' })!.period).toBeNull();
  });

  it('keeps exam extras', () => {
    expect(normalizeTask(v2Row)).toMatchObject({
      examSubject: 'english',
      reviewTracking: true,
      reviewDueDate: '2026-10-21',
      focusMinutes: 50,
      pomodoroCount: 2,
    });
  });

  it('detects templates and emergencies, which never recur', () => {
    expect(normalizeTask({ title: '【预设】入职流程', tags: ['每日'] })).toMatchObject({ isTemplate: true, period: null });
    expect(normalizeTask({ title: 'x', category: 'emergency', frequency: 'daily' })).toMatchObject({
      isEmergency: true,
      isPinned: true,
      priority: 'urgent',
      period: null,
    });
  });

  it('drops unusable rows', () => {
    expect(normalizeTask(null)).toBeNull();
    expect(normalizeTask({ title: '   ' })).toBeNull();
  });

  it('is idempotent on v3 rows', () => {
    const t = createTask({ title: 'x', period: 'weekly', panelId: 'custom-1', flavor: 'general' });
    expect(normalizeTask(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});

describe('migrateTaskPayload', () => {
  it('flags old payloads for rewrite', () => {
    expect(migrateTaskPayload({ schemaVersion: 2, tasks: [v2Row] })).toMatchObject({ migrated: true });
    expect(migrateTaskPayload({ schemaVersion: TASK_SCHEMA_VERSION, tasks: [] })).toMatchObject({ migrated: false });
    expect(migrateTaskPayload(undefined)).toEqual({ tasks: [], migrated: false });
  });
});
