import { describe, expect, it } from 'vitest';
import { BackupFormatError, escapeCsvField, mergeById, parseBackup, serializeBackup, tasksToCsv } from './backup';
import { createPanel } from './panels';
import { createTask } from './task';

describe('backup JSON', () => {
  it('round-trips tasks, panels and focus history', () => {
    const tasks = [createTask({ title: 'a' })];
    const panels = [createPanel('exam')];
    const focusHistory = [{ id: 'f1', date: '2026-10-24', timestamp: '2026-10-24T01:00:00Z', durationMinutes: 25 }];
    const text = serializeBackup({ tasks, panels, focusHistory, themeState: { theme: 'cool-evening', autoSwitch: false, toneLock: 'cool' } }, '9.9.9');
    const parsed = parseBackup(text);
    expect(parsed.tasks).toEqual(tasks);
    expect(parsed.panels).toEqual(panels);
    expect(parsed.focusHistory).toEqual(focusHistory);
    expect(parsed.themeState?.theme).toBe('cool-evening');
  });

  it('accepts v2 backups without panels or history', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'SquircleTodo', schemaVersion: 2, tasks: [{ title: 'old', isCompleted: true }] }));
    expect(parsed.tasks[0]).toMatchObject({ title: 'old', completed: true });
    expect(parsed.panels).toBeNull();
    expect(parsed.focusHistory).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(() => parseBackup('')).toThrow(BackupFormatError);
    expect(() => parseBackup('{not json')).toThrow(BackupFormatError);
    expect(() => parseBackup('{"tasks": 3}')).toThrow(BackupFormatError);
  });
});

describe('mergeById', () => {
  const existing = [
    { id: 'a', v: 1 },
    { id: 'b', v: 1 },
  ];
  it('upserts in merge mode', () => {
    expect(mergeById(existing, [{ id: 'b', v: 2 }, { id: 'c', v: 2 }], 'merge')).toEqual({
      items: [
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
        { id: 'c', v: 2 },
      ],
      added: 1,
      updated: 1,
    });
  });
  it('replaces in overwrite mode', () => {
    expect(mergeById(existing, [{ id: 'z', v: 0 }], 'overwrite').items).toEqual([{ id: 'z', v: 0 }]);
  });
});

describe('CSV export', () => {
  it('escapes per RFC 4180', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line\nbreak')).toBe('"line\nbreak"');
    expect(escapeCsvField(null)).toBe('');
  });

  it('starts with a UTF-8 BOM and uses CRLF rows', () => {
    const csv = tasksToCsv([createTask({ title: '中文, 标题', tags: ['a', 'b'] })]);
    expect(csv.startsWith('﻿ID,Persona,Title')).toBe(true);
    const [, row] = csv.split('\r\n');
    expect(row).toContain('"中文, 标题"');
    expect(row).toContain('a;b');
  });
});
