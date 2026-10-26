/**
 * Date helpers. All "day" values are LOCAL calendar dates (YYYY-MM-DD) —
 * `toISOString().slice(0, 10)` gives the UTC date, which is the previous day
 * before 08:00 in China and broke streaks / cycle resets.
 */

import type { CyclePeriod } from './task';

const pad = (n: number) => String(n).padStart(2, '0');

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local calendar month as YYYY-MM. */
export function toMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** ISO-8601 week as YYYY-Www (week-numbering year, Monday-based). */
export function toIsoWeekKey(date: Date = new Date()): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3); // Thursday of this week
  const weekYear = target.getFullYear();
  const firstThursday = new Date(weekYear, 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${weekYear}-W${pad(week)}`;
}

/** "YYYY-MM-DD HH:mm" in local time, used for human-facing timestamps. */
export function toDisplayDateTime(date: Date = new Date()): string {
  return `${toDateKey(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses YYYY-MM-DD (or a full ISO string) into a local midnight Date. */
export function parseDateKey(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Key identifying the daily / weekly / monthly cycle `date` falls in. */
export function periodKey(date: Date, period: CyclePeriod): string {
  if (period === 'daily') return toDateKey(date);
  if (period === 'weekly') return toIsoWeekKey(date);
  return toMonthKey(date);
}
