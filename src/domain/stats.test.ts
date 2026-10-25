import { describe, expect, it } from 'vitest';
import { buildActivityMap, computeBadges, currentStreak, heatLevel, heatmapRows, longestStreak, priorityMix } from './stats';
import { createTask, setCompleted } from './task';

const at = (iso: string) => new Date(iso);

describe('buildActivityMap', () => {
  it('counts a task completed today once, not once per field', () => {
    const now = at('2026-10-24T10:00:00+08:00');
    const t = setCompleted(createTask({ title: 'x' }, now), true, now);
    const map = buildActivityMap([t], []);
    expect(map['2026-10-24']).toEqual({ taskCount: 1, focusMinutes: 0, titles: ['x'] });
  });

  it('adds focus minutes per day', () => {
    const map = buildActivityMap([], [
      { id: '1', date: '2026-10-24', timestamp: '', durationMinutes: 25, taskTitle: 'x' },
      { id: '2', date: '2026-10-24', timestamp: '', durationMinutes: 5 },
    ]);
    expect(map['2026-10-24'].focusMinutes).toBe(30);
  });
});

describe('streaks', () => {
  const active = { taskCount: 1, focusMinutes: 0, titles: [] };
  const map = { '2026-10-20': active, '2026-10-21': active, '2026-10-22': active, '2026-10-24': active };

  it('counts back from today, or from yesterday when today is still empty', () => {
    expect(currentStreak(map, at('2026-10-24T12:00:00+08:00'))).toBe(1);
    expect(currentStreak(map, at('2026-10-23T12:00:00+08:00'))).toBe(3);
    expect(currentStreak(map, at('2026-10-26T12:00:00+08:00'))).toBe(0);
  });

  it('finds the longest run anywhere in history', () => {
    expect(longestStreak(map)).toBe(3);
    expect(longestStreak({})).toBe(0);
  });
});

describe('heatmap', () => {
  it('maps activity to levels', () => {
    expect(heatLevel(undefined)).toBe(0);
    expect(heatLevel({ taskCount: 0, focusMinutes: 10, titles: [] })).toBe(1);
    expect(heatLevel({ taskCount: 3, focusMinutes: 0, titles: [] })).toBe(4);
  });

  it('lays out Monday..Sunday rows ending with the current week', () => {
    const rows = heatmapRows({}, 2, at('2026-10-24T12:00:00+08:00')); // a Saturday
    expect(rows).toHaveLength(7);
    expect(rows.every(r => r.length === 2)).toBe(true);
    expect(rows[0][1].dateKey).toBe('2026-10-19'); // Monday
    expect(rows[6][1].dateKey).toBe('2026-10-25'); // Sunday
  });
});

describe('priorityMix & badges', () => {
  it('splits completed tasks into urgent / high / routine', () => {
    const done = (p: 'urgent' | 'high' | 'low', emergency = false) =>
      setCompleted(createTask({ title: 'x', priority: p, isEmergency: emergency }), true);
    const mix = priorityMix([done('high', true), done('high'), done('low'), createTask({ title: 'open' })]);
    expect(mix).toMatchObject({ urgent: 1, high: 1, routine: 1, total: 3, urgentPct: 33, highPct: 33, routinePct: 34 });
  });

  it('unlocks badges by thresholds', () => {
    const badges = computeBadges({ completedCount: 10, streak: 3, focusMinutes: 59 });
    const unlocked = badges.filter(b => b.unlocked).map(b => b.id);
    expect(unlocked).toEqual(['first_step', 'three_days', 'tasks_10']);
    expect(badges.find(b => b.id === 'deep_flow_1h')?.progressText).toBe('59/60 分钟');
  });
});
