/**
 * localStorage access for the stores. Every key the app writes is listed in
 * STORAGE_KEYS so "clear all data" can't miss one.
 */
import type { StoreApi } from 'zustand';

export const STORAGE_KEYS = {
  tasks: 'squircle_todo_data_v2',
  theme: 'squircle_theme_state_v1',
  panels: 'squircle_custom_panels_v2',
  focus: 'squircle_focus_data_v1',
  bulletinsRead: 'squircle_read_bulletins_v1',
  bulletinsCache: 'squircle_bulletins_cache_v1',
  feedback: 'squircle_user_feedbacks_v1',
} as const;

/** Written by v1.x builds only; removed on reset. */
const LEGACY_KEYS = ['squircle_user_settings_v1'];

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJSON<T = unknown>(key: string): T | undefined {
  const raw = storage()?.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[storage] Ignoring unreadable value for "${key}"`, err);
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] Failed to write "${key}" (quota?)`, err);
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearAllAppData(): void {
  [...Object.values(STORAGE_KEYS), ...LEGACY_KEYS].forEach(removeKey);
}

/**
 * Writes `serialize(state)` to `key` whenever the selected slice changes
 * (compared by reference), so actions never have to remember to save.
 */
export function persistSlice<S, T>(
  store: StoreApi<S>,
  key: string,
  select: (state: S) => T,
  serialize: (slice: T) => unknown = slice => slice,
): void {
  let previous = select(store.getState());
  store.subscribe(state => {
    const next = select(state);
    if (next === previous) return;
    previous = next;
    writeJSON(key, serialize(next));
  });
}
