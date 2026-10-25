/**
 * Activity statistics for the achievements tab: per-day activity, streaks,
 * contribution heatmap, priority mix and badges.
 */
import { addDays, toDateKey } from './dates';
import type { FocusRecord } from './focus';
import type { Task } from './task';

export interface DayActivity {
  taskCount: number;
  focusMinutes: number;
  titles: string[];
}

export type ActivityMap = Record<string, DayActivity>;

/**
 * One entry per (task, day) the task was checked off, plus focus minutes.
 * A task completed today appears in both `completedAt` and `historyDates`;
 * it is counted once.
 */
export function buildActivityMap(tasks: Task[], focusHistory: FocusRecord[]): ActivityMap {
  const map: ActivityMap = {};
  const day = (key: string) => (map[key] ??= { taskCount: 0, focusMinutes: 0, titles: [] });

  for (const t of tasks) {
    const days = new Set(t.historyDates);
    if (t.completed && t.completedAt) days.add(toDateKey(new Date(t.completedAt)));
    for (const key of days) {
      const d = day(key);
      d.taskCount += 1;
      if (!d.titles.includes(t.title)) d.titles.push(t.title);
    }
  }
  for (const r of focusHistory) {
    const d = day(r.date);
    d.focusMinutes += r.durationMinutes;
    if (r.taskTitle) d.titles.push(`[专注 ${r.durationMinutes}m] ${r.taskTitle}`);
  }
  return map;
}

const isActive = (a?: DayActivity) => Boolean(a && (a.taskCount > 0 || a.focusMinutes > 0));

/** Consecutive active days ending today (or yesterday, if today has no activity yet). */
export function currentStreak(map: ActivityMap, today: Date = new Date()): number {
  let cursor = isActive(map[toDateKey(today)]) ? today : addDays(today, -1);
  let streak = 0;
  while (isActive(map[toDateKey(cursor)])) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(map: ActivityMap): number {
  const days = Object.keys(map).filter(k => isActive(map[k])).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    run = prev !== null && toDateKey(addDays(new Date(`${prev}T00:00:00`), 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  dateKey: string;
  taskCount: number;
  focusMinutes: number;
  level: HeatLevel;
}

export function heatLevel(a: DayActivity | undefined): HeatLevel {
  if (!a) return 0;
  const score = a.taskCount * 2 + a.focusMinutes / 20;
  if (score >= 6) return 4;
  if (score >= 4) return 3;
  if (score >= 2) return 2;
  return score > 0 ? 1 : 0;
}

/** Seven rows (Mon..Sun) × `weeks` columns, ending with the week that contains `today`. */
export function heatmapRows(map: ActivityMap, weeks: number, today: Date = new Date()): HeatCell[][] {
  const end = addDays(today, (7 - today.getDay()) % 7); // upcoming Sunday
  const rows: HeatCell[][] = Array.from({ length: 7 }, () => []);
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const dateKey = toDateKey(date);
    const a = map[dateKey];
    rows[(date.getDay() + 6) % 7].push({
      dateKey,
      taskCount: a?.taskCount ?? 0,
      focusMinutes: a?.focusMinutes ?? 0,
      level: heatLevel(a),
    });
  }
  return rows;
}

export interface PriorityMix {
  urgent: number;
  high: number;
  routine: number;
  total: number;
  urgentPct: number;
  highPct: number;
  routinePct: number;
}

export function priorityMix(tasks: Task[]): PriorityMix {
  const done = tasks.filter(t => t.completed);
  const urgent = done.filter(t => t.isEmergency || t.priority === 'urgent').length;
  const high = done.filter(t => !t.isEmergency && t.priority === 'high').length;
  const routine = done.length - urgent - high;
  const total = done.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const urgentPct = pct(urgent);
  const highPct = pct(high);
  return { urgent, high, routine, total, urgentPct, highPct, routinePct: total > 0 ? Math.max(0, 100 - urgentPct - highPct) : 0 };
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  desc: string;
  unlocked: boolean;
  progressText: string;
  unlockedAt: string;
}

interface BadgeInput {
  completedCount: number;
  streak: number;
  focusMinutes: number;
}

const BADGE_RULES: { id: string; title: string; icon: string; desc: string; unlockedAt: string; metric: keyof BadgeInput; goal: number; unit: string }[] = [
  { id: 'first_step', title: '初露锋芒', icon: '🌟', desc: '顺利完成人生待办清单中的第 1 项任务', unlockedAt: '初始里程碑', metric: 'completedCount', goal: 1, unit: '项' },
  { id: 'three_days', title: '习惯萌芽', icon: '🌱', desc: '连续 3 天不间断保持任务打卡或专注', unlockedAt: '习惯养成初阶', metric: 'streak', goal: 3, unit: '天' },
  { id: 'seven_days', title: '七日流光', icon: '🔥', desc: '连续 7 天不间断保持任务打卡或专注', unlockedAt: '连续打卡卓越', metric: 'streak', goal: 7, unit: '天' },
  { id: 'thirty_days', title: '坚毅恒心', icon: '💎', desc: '连续打卡达到 30 天，自律成为本能', unlockedAt: '自律大师荣耀', metric: 'streak', goal: 30, unit: '天' },
  { id: 'deep_flow_1h', title: '心流探索者', icon: '⏳', desc: '累计深度番茄钟专注时长超过 60 分钟', unlockedAt: '专注达人认证', metric: 'focusMinutes', goal: 60, unit: '分钟' },
  { id: 'deep_flow_5h', title: '深度专注大师', icon: '⚡', desc: '累计深度番茄钟专注时长超过 300 分钟 (5小时)', unlockedAt: '心流大师认证', metric: 'focusMinutes', goal: 300, unit: '分钟' },
  { id: 'tasks_10', title: '执行先锋', icon: '🎯', desc: '累计完成超过 10 项待办事项', unlockedAt: '行动力先锋', metric: 'completedCount', goal: 10, unit: '项' },
  { id: 'tasks_50', title: '百炼成钢', icon: '🏆', desc: '累计完成超过 50 项待办事项', unlockedAt: '高效能楷模', metric: 'completedCount', goal: 50, unit: '项' },
];

export function computeBadges(input: BadgeInput): Badge[] {
  return BADGE_RULES.map(({ metric, goal, unit, ...rest }) => {
    const value = input[metric];
    const unlocked = value >= goal;
    return { ...rest, unlocked, progressText: unlocked ? '已达成' : `${value}/${goal} ${unit}` };
  });
}
