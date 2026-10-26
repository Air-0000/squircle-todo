/**
 * Secondary copy of the task list in IndexedDB. localStorage is the primary
 * store (read synchronously at startup); this mirror is used to recover the
 * tasks when the localStorage entry is missing or unreadable.
 */
import type { Task } from '../domain/task';

const DB_NAME = 'SquircleTodoDB';
const DB_VERSION = 3;
const TASKS = 'todos';
const MIRROR_DELAY_MS = 300;

let dbPromise: Promise<IDBDatabase> | null = null;

const available = () => typeof indexedDB !== 'undefined';

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // v2 created stores and indexes that were never read; drop them.
      for (const name of ['settings', 'personas', 'customFieldDefs']) {
        if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
      }
      if (db.objectStoreNames.contains(TASKS)) {
        const store = req.transaction!.objectStore(TASKS);
        for (const index of Array.from(store.indexNames)) store.deleteIndex(index);
      } else {
        db.createObjectStore(TASKS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function writeAll(tasks: Task[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(TASKS, 'readwrite');
  const store = tx.objectStore(TASKS);
  store.clear();
  tasks.forEach(t => store.put(t));
  await done(tx);
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: Task[] | null = null;

/** Debounced full rewrite of the mirror. */
export function mirrorTasks(tasks: Task[]): void {
  if (!available()) return;
  pending = tasks;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const toWrite = pending;
    pending = null;
    timer = null;
    if (toWrite) writeAll(toWrite).catch(err => console.warn('[idb] mirror write failed', err));
  }, MIRROR_DELAY_MS);
}

export async function readMirroredTasks(): Promise<unknown[]> {
  if (!available()) return [];
  try {
    const db = await openDb();
    const req = db.transaction(TASKS, 'readonly').objectStore(TASKS).getAll();
    return await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[idb] mirror read failed', err);
    return [];
  }
}

export function clearMirror(): void {
  if (!available()) return;
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
  writeAll([]).catch(() => {});
}
