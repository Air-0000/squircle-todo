/**
 * Native IndexedDB Asynchronous Long-Term Persistence Engine
 * Manages reliable offline IndexedDB object stores (todos, settings, personas, customFieldDefs).
 */

import { TodoItem } from '../types';

export const DB_NAME = 'SquircleTodoDB';
export const DB_VERSION = 2;

let dbInstance: IDBDatabase | null = null;

export function openTodoDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. todos store (keyed by 'id')
      if (!db.objectStoreNames.contains('todos')) {
        const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
        todoStore.createIndex('personaId', 'personaId', { unique: false });
        todoStore.createIndex('priority', 'priority', { unique: false });
        todoStore.createIndex('isCompleted', 'isCompleted', { unique: false });
      }

      // 2. settings store (keyed by key name)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }

      // 3. personas store
      if (!db.objectStoreNames.contains('personas')) {
        db.createObjectStore('personas', { keyPath: 'id' });
      }

      // 4. customFieldDefs store
      if (!db.objectStoreNames.contains('customFieldDefs')) {
        db.createObjectStore('customFieldDefs', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

let persistDebounceTimer: any = null;
let latestPendingTasks: TodoItem[] | null = null;
let latestPendingThemeState: any = null;

async function doPersistTasksToIndexedDB(tasks: TodoItem[], themeState?: any): Promise<void> {
  try {
    const db = await openTodoDatabase();
    const tx = db.transaction(['todos', 'settings'], 'readwrite');
    const todoStore = tx.objectStore('todos');
    const settingsStore = tx.objectStore('settings');

    // Clear and batch re-insert todos
    todoStore.clear();
    for (const task of tasks) {
      todoStore.put(task);
    }

    if (themeState) {
      settingsStore.put(themeState, 'themeState');
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to persist tasks asynchronously:', err);
  }
}

export function persistTasksToIndexedDB(tasks: TodoItem[], themeState?: any): Promise<void> {
  latestPendingTasks = tasks;
  if (themeState) latestPendingThemeState = themeState;

  return new Promise((resolve) => {
    if (persistDebounceTimer) clearTimeout(persistDebounceTimer);
    persistDebounceTimer = setTimeout(async () => {
      if (latestPendingTasks) {
        const toSave = latestPendingTasks;
        const themeToSave = latestPendingThemeState;
        latestPendingTasks = null;
        latestPendingThemeState = null;
        await doPersistTasksToIndexedDB(toSave, themeToSave);
      }
      resolve();
    }, 300);
  });
}

export async function getTasksFromIndexedDB(): Promise<TodoItem[]> {
  try {
    const db = await openTodoDatabase();
    const tx = db.transaction('todos', 'readonly');
    const todoStore = tx.objectStore('todos');
    const request = todoStore.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get tasks from IndexedDB:', err);
    return [];
  }
}

export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openTodoDatabase();
    const tx = db.transaction(['todos', 'settings'], 'readwrite');
    tx.objectStore('todos').clear();
    tx.objectStore('settings').clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Clear failed:', err);
  }
}
