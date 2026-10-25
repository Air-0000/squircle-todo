/**
 * Backup file format (JSON), import merge rules and the Excel-friendly CSV export.
 */
import { migrateTaskPayload, TASK_SCHEMA_VERSION } from './migration';
import { normalizePanels, type Panel } from './panels';
import type { Task } from './task';
import type { FocusRecord } from './focus';

export const BACKUP_APP_ID = 'SquircleTodo';

export interface ThemeSnapshot {
  theme: string;
  autoSwitch: boolean;
  toneLock: string;
}

export interface BackupFile {
  app: string;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  tasks: Task[];
  panels?: Panel[];
  focusHistory?: FocusRecord[];
  themeState?: ThemeSnapshot;
}

export interface BackupContents {
  tasks: Task[];
  panels: Panel[] | null;
  focusHistory: FocusRecord[] | null;
  themeState: ThemeSnapshot | null;
}

export type ImportMode = 'merge' | 'overwrite';

export class BackupFormatError extends Error {}

export function serializeBackup(contents: Omit<BackupContents, 'themeState'> & { themeState?: ThemeSnapshot }, appVersion: string): string {
  const file: BackupFile = {
    app: BACKUP_APP_ID,
    schemaVersion: TASK_SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    tasks: contents.tasks,
    panels: contents.panels ?? undefined,
    focusHistory: contents.focusHistory ?? undefined,
    themeState: contents.themeState,
  };
  return JSON.stringify(file, null, 2);
}

/** Parses a backup of any schema version. Throws BackupFormatError on bad input. */
export function parseBackup(text: string): BackupContents {
  if (!text.trim()) throw new BackupFormatError('备份内容为空');
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupFormatError('JSON 格式错误，无法解析备份文件');
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tasks)) {
    throw new BackupFormatError('备份文件缺少 tasks 数组');
  }
  const theme = raw.themeState;
  return {
    tasks: migrateTaskPayload(raw).tasks,
    panels: Array.isArray(raw.panels) ? normalizePanels(raw.panels) : null,
    focusHistory: Array.isArray(raw.focusHistory) ? raw.focusHistory.filter(isFocusRecord) : null,
    themeState: theme && typeof theme === 'object' && typeof theme.theme === 'string' ? theme : null,
  };
}

function isFocusRecord(r: unknown): r is FocusRecord {
  const v = r as FocusRecord;
  return typeof v === 'object' && v !== null && typeof v.id === 'string' && typeof v.date === 'string' && typeof v.durationMinutes === 'number';
}

export interface MergeResult<T> {
  items: T[];
  added: number;
  updated: number;
}

/** Overwrite replaces everything; merge upserts by id (incoming wins). */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[], mode: ImportMode): MergeResult<T> {
  if (mode === 'overwrite') return { items: [...incoming], added: incoming.length, updated: 0 };
  const index = new Map(existing.map((item, i) => [item.id, i]));
  const items = [...existing];
  let added = 0;
  let updated = 0;
  for (const item of incoming) {
    const i = index.get(item.id);
    if (i === undefined) {
      index.set(item.id, items.length);
      items.push(item);
      added++;
    } else {
      items[i] = { ...items[i], ...item };
      updated++;
    }
  }
  return { items, added, updated };
}

/** RFC 4180 field escaping. */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADERS = ['ID', 'Persona', 'Title', 'Priority', 'IsCompleted', 'DueDate', 'Tags', 'CreatedAt', 'CompletedAt', 'Notes'];

/** CSV with a UTF-8 BOM so Excel / WPS open Chinese text correctly. */
export function tasksToCsv(tasks: Task[]): string {
  const rows = tasks.map(t =>
    [t.id, t.flavor, t.title, t.priority, String(t.completed), t.dueDate ?? '', t.tags.join(';'), t.createdAt, t.completedAt ?? '', t.description]
      .map(escapeCsvField)
      .join(','),
  );
  return '﻿' + [CSV_HEADERS.join(','), ...rows].join('\r\n');
}
