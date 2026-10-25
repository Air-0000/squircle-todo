import { toDateKey } from './dates';
import { uid } from './ids';
import type { Task, TaskFlavor } from './task';

export type FocusMode = 'clock' | 'pomodoro' | 'stopwatch';

export interface FocusRecord {
  id: string;
  date: string; // local YYYY-MM-DD
  timestamp: string; // ISO
  durationMinutes: number;
  taskId?: string;
  taskTitle?: string;
  persona?: TaskFlavor;
}

export function createFocusRecord(minutes: number, task: Task | null, now: Date = new Date()): FocusRecord {
  return {
    id: uid('focus'),
    date: toDateKey(now),
    timestamp: now.toISOString(),
    durationMinutes: minutes,
    taskId: task?.id,
    taskTitle: task?.title,
    persona: task?.flavor ?? 'general',
  };
}

export function minutesOnDate(history: FocusRecord[], dateKey: string): number {
  return history.reduce((sum, r) => (r.date === dateKey ? sum + r.durationMinutes : sum), 0);
}

export const POMODORO_PRESETS = [15, 25, 45, 60];

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
