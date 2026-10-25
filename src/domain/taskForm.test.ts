import { describe, expect, it } from 'vitest';
import { createPanel } from './panels';
import { buildTaskDraft, resolveAddTarget, type AddTaskForm } from './taskForm';

const form = (patch: Partial<AddTaskForm> = {}): AddTaskForm => ({
  title: '任务',
  subtasks: [],
  routine: 'daily',
  period: 'daily',
  emergencyLevel: 'urgent',
  usePeriodRange: false,
  startDate: '2026-10-24',
  endDate: '2026-11-23',
  frequency: 'daily',
  customFrequency: '',
  useAlarm: false,
  alarmTime: '',
  usePiecewise: false,
  piecewiseTemplate: 'exam_stages',
  examSubject: 'math',
  clientName: '',
  submitDate: '2026-11-23',
  ...patch,
});

describe('resolveAddTarget', () => {
  const exam = createPanel('exam');
  it('resolves panels, emergencies, flavours and falls back to the inbox', () => {
    expect(resolveAddTarget(exam.id, [exam])).toMatchObject({ kind: 'panel', flavor: 'exam' });
    expect(resolveAddTarget('emergency', [])).toEqual({ kind: 'emergency' });
    expect(resolveAddTarget('art', [])).toEqual({ kind: 'flavor', flavor: 'art' });
    expect(resolveAddTarget('missing-panel', [])).toEqual({ kind: 'inbox' });
  });
});

describe('buildTaskDraft', () => {
  it('files tasks added to a panel into that panel (v2 lost the link)', () => {
    const panel = createPanel('exam');
    const { draft, navigateTo } = buildTaskDraft(form(), resolveAddTarget(panel.id, [panel]));
    expect(draft).toMatchObject({ panelId: panel.id, flavor: 'exam', reviewTracking: true, examSubject: 'math', period: 'daily' });
    expect(navigateTo).toBe(panel.id);
  });

  it('builds emergencies without a cycle', () => {
    const { draft, navigateTo } = buildTaskDraft(form({ emergencyLevel: 'critical' }), { kind: 'emergency' });
    expect(draft).toMatchObject({ isEmergency: true, emergencyLevel: 'critical', period: null, frequency: 'once' });
    expect(navigateTo).toBe('tasks');
  });

  it('uses the chosen period for inbox tasks', () => {
    const { draft, destination } = buildTaskDraft(form({ period: 'weekly', frequency: 'weekly' }), { kind: 'inbox' });
    expect(draft).toMatchObject({ panelId: null, period: 'weekly', frequencyDetail: '每周刷新' });
    expect(destination).toBe('待办·本周重点');
  });

  it('derives the period from the frequency for long-running exam/art items', () => {
    const art = buildTaskDraft(form({ routine: 'project', frequency: 'monthly', clientName: ' 王 ' }), { kind: 'flavor', flavor: 'art' });
    expect(art.draft).toMatchObject({ period: 'monthly', clientName: '王', submitDate: '2026-11-23' });
    const once = buildTaskDraft(form({ routine: 'project', frequency: 'once' }), { kind: 'flavor', flavor: 'exam' });
    expect(once.draft.period).toBeNull();
  });

  it('attaches a piecewise schedule starting on the start date', () => {
    const { draft } = buildTaskDraft(form({ usePiecewise: true, piecewiseTemplate: 'ebbinghaus', period: 'monthly', frequency: 'once' }), { kind: 'inbox' });
    expect(draft.piecewise).toMatchObject({ templateType: 'ebbinghaus', baseDate: '2026-10-24', totalDays: 15 });
  });
});
