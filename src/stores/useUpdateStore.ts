/**
 * In-app update state, driven by the events the Android shell sends to
 * window.__onUpdateEvent (android/.../AppUpdater.java). In a plain browser
 * there is no updater: nativeBridge.canSelfUpdate() is false and nothing here runs.
 */
import { create } from 'zustand';
import type { NativeUpdateEvent, NativeUpdateInfo } from '../types/bridge';
import { nativeBridge } from '../utils/bridge';
import { useUIStore } from './useUIStore';

export type UpdatePhase =
  | 'idle' // not checked yet, or a silent check found nothing
  | 'checking'
  | 'latest'
  | 'failed' // no update source answered
  | 'available'
  | 'downloading'
  | 'needsPermission' // the system asked for "install unknown apps"
  | 'installing' // the system installer is open
  | 'error'; // download or install failed

interface UpdateState {
  phase: UpdatePhase;
  /** The newer version, once a check found one. */
  update: NativeUpdateInfo | null;
  /** Installed version as reported by Android. */
  currentVersionName: string | null;
  downloaded: number;
  /** Bytes; -1 when the server sent no length. */
  total: number;
  message: string;
  /** A silent check only surfaces (opens the update sheet) when it finds an update. */
  silent: boolean;

  check: (silent?: boolean) => void;
  /** Downloads and installs; after granting the install permission it installs the finished download. */
  download: () => void;
  cancel: () => void;
  handleEvent: (event: NativeUpdateEvent) => void;
}

const BUSY: UpdatePhase[] = ['checking', 'downloading'];

export const useUpdateStore = create<UpdateState>((set, get) => ({
  phase: 'idle',
  update: null,
  currentVersionName: null,
  downloaded: 0,
  total: -1,
  message: '',
  silent: false,

  check: (silent = false) => {
    if (BUSY.includes(get().phase)) return;
    // A silent check leaves the visible state alone until it has something to show.
    set(silent ? { silent } : { silent, phase: 'checking', message: '' });
    nativeBridge.checkForUpdate();
  },

  download: () => {
    if (!get().update || get().phase === 'downloading') return;
    set({ phase: 'downloading', downloaded: 0, total: -1, message: '' });
    nativeBridge.downloadUpdate();
  },

  cancel: () => nativeBridge.cancelUpdateDownload(),

  handleEvent: event => {
    switch (event.type) {
      case 'checked': {
        const currentVersionName = event.current.versionName || null;
        if (event.status === 'available') {
          set({ phase: 'available', update: event.update, currentVersionName });
          if (get().silent) useUIStore.getState().open('updateOpen');
        } else if (event.status === 'latest') {
          set({ phase: get().silent ? 'idle' : 'latest', update: null, currentVersionName });
        } else {
          set({ phase: get().silent ? 'idle' : 'failed', message: event.message, currentVersionName });
        }
        return;
      }
      case 'progress':
        set({ phase: 'downloading', downloaded: event.downloaded, total: event.total });
        return;
      case 'installing':
        set({ phase: 'installing' });
        return;
      case 'needs_permission':
        set({ phase: 'needsPermission' });
        return;
      case 'cancelled':
        set({ phase: 'available', downloaded: 0, total: -1 });
        return;
      case 'error':
        set({ phase: 'error', message: event.message });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.__onUpdateEvent = event => useUpdateStore.getState().handleEvent(event);
}
