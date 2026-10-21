/**
 * Schema Migration Engine for Android Squircle To-Do
 * Manages versioned schema upgrades (v1 -> v2) ensuring zero data loss and backwards compatibility.
 */

import { TodoItem, StoragePayload } from '../types';

export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Normalizes an individual task object to Schema V2 standards.
 * Guarantees priority, isPinned, tags, subtasks, completed/isCompleted, persona/personaId.
 */
export function normalizeTaskV2(t: any): TodoItem {
  const now = new Date().toISOString();
  const isCompleted = Boolean(t.isCompleted !== undefined ? t.isCompleted : t.completed);
  const personaId = t.personaId || t.persona || 'exam';

  let rawSubtasks = Array.isArray(t.subtasks)
    ? t.subtasks
    : Array.isArray(t.checklists)
    ? t.checklists
    : [];

  const subtasks = rawSubtasks.map((s: any, idx: number) => {
    const text = (s.text || s.title || '').trim();
    const completed = Boolean(s.completed !== undefined ? s.completed : s.isCompleted);
    return {
      id: s.id || `sub-${idx + 1}`,
      text,
      title: text,
      completed,
      isCompleted: completed,
      order: s.order !== undefined ? s.order : idx,
    };
  });

  const task: TodoItem = {
    id: t.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title: typeof t.title === 'string' ? t.title.trim() : '',
    description: t.description || t.notes || '',
    notes: t.description || t.notes || '',
    isCompleted,
    completed: isCompleted,
    completedAt: isCompleted ? (t.completedAt || t.updatedAt || now) : null,
    createdAt: t.createdAt || now,
    updatedAt: t.updatedAt || now,
    priority: t.priority || 'medium',
    personaId,
    persona: personaId,
    tags: Array.isArray(t.tags) ? [...t.tags] : [],
    isPinned: Boolean(t.isPinned),
    dueDate: t.dueDate || null,
    reminderTime: t.reminderTime || null,
    repeatRule: t.repeatRule || t.recurrence?.type || 'none',
    recurrence: t.recurrence || { type: t.repeatRule || 'none' },
    category: t.category || 'general',
    subtasks,
    checklists: subtasks,
    customFields: t.customFields ? (Array.isArray(t.customFields) ? [...t.customFields] : { ...t.customFields }) : {},
    personaData: t.personaData ? JSON.parse(JSON.stringify(t.personaData)) : null,
    examData: t.examData ? { ...t.examData } : undefined,
    artData: t.artData ? { ...t.artData } : undefined,
    securityData: t.securityData ? { ...t.securityData } : undefined,
  };

  // If marked emergency, top-pin and set urgent priority
  if (task.personaData?.isEmergency || task.securityData?.isEmergency) {
    task.isPinned = true;
    task.priority = 'urgent';
  }

  return task;
}

/**
 * Migration step: V1 -> V2
 */
export function migrateV1ToV2(tasks: any[]): TodoItem[] {
  return (Array.isArray(tasks) ? tasks : []).map(t => normalizeTaskV2(t));
}

/**
 * Migrates a raw storage payload to CURRENT_SCHEMA_VERSION sequentially.
 */
export function migrateStoragePayload(raw: any): { payload: StoragePayload; migrated: boolean } {
  if (!raw || typeof raw !== 'object') {
    return {
      payload: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        tasks: [],
      },
      migrated: false,
    };
  }

  let version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  let rawTasks: any[] = Array.isArray(raw.tasks) ? raw.tasks : [];
  let migrated = false;

  // Migration V1 -> V2
  if (version < 2) {
    rawTasks = migrateV1ToV2(rawTasks);
    version = 2;
    migrated = true;
  } else {
    rawTasks = rawTasks.map(t => normalizeTaskV2(t));
  }

  return {
    payload: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      tasks: rawTasks,
      themeState: raw.themeState,
    },
    migrated,
  };
}
