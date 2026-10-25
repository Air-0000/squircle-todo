import { describe, expect, it } from 'vitest';
import { daysBetween, parseDateKey, periodKey, toDateKey, toIsoWeekKey } from './dates';
import { evaluatePiecewise, createPiecewiseConfig, piecewiseCyclePeriod } from './piecewise';

describe('dates', () => {
  it('uses the local calendar day', () => {
    expect(toDateKey(new Date('2026-10-23T23:30:00Z'))).toBe('2026-10-24'); // 07:30 in Shanghai
  });

  it('computes ISO weeks across year boundaries', () => {
    expect(toIsoWeekKey(new Date(2024, 11, 30))).toBe('2025-W01');
    expect(toIsoWeekKey(new Date(2021, 0, 3))).toBe('2020-W53');
    expect(toIsoWeekKey(new Date(2026, 9, 19))).toBe('2026-W43');
  });

  it('builds period keys', () => {
    const d = new Date(2026, 9, 24);
    expect([periodKey(d, 'daily'), periodKey(d, 'weekly'), periodKey(d, 'monthly')]).toEqual(['2026-10-24', '2026-W43', '2026-10']);
  });

  it('counts calendar days', () => {
    expect(daysBetween(new Date(2026, 9, 24, 23), parseDateKey('2026-12-26'))).toBe(63);
  });
});

describe('piecewise', () => {
  const config = createPiecewiseConfig('exam_stages', '2026-10-01');

  it('finds the current stage by day number', () => {
    const r = evaluatePiecewise(config, new Date(2026, 9, 10)); // day 10
    expect(r).toMatchObject({ elapsedDays: 10, daysToNextStage: 12 });
    expect(r.currentStage?.stageIndex).toBe(2);
    expect(r.nextStage?.stageIndex).toBe(3);
  });

  it('clamps to the last stage once finished', () => {
    const r = evaluatePiecewise(config, new Date(2026, 11, 1));
    expect(r.currentStage?.stageIndex).toBe(3);
    expect(r.nextStage).toBeNull();
    expect(r.progressPercent).toBe(100);
  });

  it('reports the cycle period of the current stage', () => {
    const ebb = createPiecewiseConfig('ebbinghaus', '2026-10-01');
    expect(piecewiseCyclePeriod(ebb, new Date(2026, 9, 2))).toBe('daily');
    expect(piecewiseCyclePeriod(ebb, new Date(2026, 9, 10))).toBe('weekly');
  });
});
