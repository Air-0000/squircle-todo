/**
 * Synchronous LocalStorage Persistence Snapshot Engine
 * Provides instant 0ms cold start data access without UI flash or layout shift.
 */

import { StoragePayload, TodoItem } from '../types';
import { migrateStoragePayload, CURRENT_SCHEMA_VERSION } from './migration';

export const STORAGE_KEY = 'squircle_todo_data_v2';

export function loadLocalStorageSnapshot(): StoragePayload {
  const fallback: StoragePayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    tasks: [],
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const { payload, migrated } = migrateStoragePayload(parsed);

    if (migrated) {
      saveLocalStorageSnapshot(payload);
    }
    return payload;
  } catch (err) {
    console.warn('[Storage] Failed to read or parse LocalStorage snapshot:', err);
    return fallback;
  }
}

export function saveLocalStorageSnapshot(payload: {
  schemaVersion?: number;
  updatedAt?: string;
  tasks: TodoItem[];
  themeState?: any;
}): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const serialized = JSON.stringify({
      schemaVersion: payload.schemaVersion || CURRENT_SCHEMA_VERSION,
      updatedAt: payload.updatedAt || new Date().toISOString(),
      tasks: payload.tasks,
      themeState: payload.themeState,
    });
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[Storage] LocalStorage quota exceeded or write failed:', err);
  }
}

export function clearLocalStorage(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[Storage] Failed to remove LocalStorage key:', err);
    }
  }
}
