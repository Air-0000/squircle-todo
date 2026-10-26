import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AndroidBridgeInterface, NativeUpdateInfo } from '../types/bridge';

const bridge = {
  checkForUpdate: vi.fn(),
  downloadUpdate: vi.fn(),
  cancelUpdateDownload: vi.fn(),
} as unknown as AndroidBridgeInterface;
vi.stubGlobal('window', { AndroidBridge: bridge });

const { useUpdateStore } = await import('./useUpdateStore');
const { useUIStore } = await import('./useUIStore');

const CURRENT = { versionCode: 14, versionName: '1.4.0' };
const UPDATE: NativeUpdateInfo = { versionCode: 15, versionName: '1.4.1', apkSize: '3.4MB', updateLog: '1. 修复', forceUpdate: false };

describe('useUpdateStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateStore.setState({ phase: 'idle', update: null, currentVersionName: null, downloaded: 0, total: -1, message: '', silent: false });
    useUIStore.setState({ updateOpen: false });
  });

  it('registers the native event callback', () => {
    window.__onUpdateEvent?.({ type: 'checked', status: 'latest', current: CURRENT });
    expect(useUpdateStore.getState().currentVersionName).toBe('1.4.0');
  });

  it('a manual check shows progress, then the result', () => {
    useUpdateStore.getState().check();
    expect(bridge.checkForUpdate).toHaveBeenCalledOnce();
    expect(useUpdateStore.getState().phase).toBe('checking');

    useUpdateStore.getState().handleEvent({ type: 'checked', status: 'failed', current: CURRENT, message: 'timeout' });
    expect(useUpdateStore.getState()).toMatchObject({ phase: 'failed', message: 'timeout' });
    expect(useUIStore.getState().updateOpen).toBe(false);
  });

  it('a silent check stays invisible unless it finds an update', () => {
    useUpdateStore.getState().check(true);
    expect(useUpdateStore.getState().phase).toBe('idle');
    useUpdateStore.getState().handleEvent({ type: 'checked', status: 'failed', current: CURRENT, message: 'offline' });
    expect(useUpdateStore.getState().phase).toBe('idle');

    useUpdateStore.getState().check(true);
    useUpdateStore.getState().handleEvent({ type: 'checked', status: 'available', current: CURRENT, update: UPDATE });
    expect(useUpdateStore.getState()).toMatchObject({ phase: 'available', update: UPDATE });
    expect(useUIStore.getState().updateOpen).toBe(true);
  });

  it('does not start a second check or download while one is running', () => {
    useUpdateStore.getState().check();
    useUpdateStore.getState().check();
    expect(bridge.checkForUpdate).toHaveBeenCalledOnce();

    useUpdateStore.setState({ phase: 'available', update: UPDATE });
    useUpdateStore.getState().download();
    useUpdateStore.getState().download();
    expect(bridge.downloadUpdate).toHaveBeenCalledOnce();
  });

  it('follows a download through progress, permission and install', () => {
    useUpdateStore.setState({ phase: 'available', update: UPDATE });
    useUpdateStore.getState().download();
    const { handleEvent } = useUpdateStore.getState();

    handleEvent({ type: 'progress', downloaded: 1024, total: 4096 });
    expect(useUpdateStore.getState()).toMatchObject({ phase: 'downloading', downloaded: 1024, total: 4096 });

    handleEvent({ type: 'needs_permission' });
    expect(useUpdateStore.getState().phase).toBe('needsPermission');

    useUpdateStore.getState().download(); // back from system settings: installs the finished download
    handleEvent({ type: 'installing' });
    expect(useUpdateStore.getState().phase).toBe('installing');
    expect(bridge.downloadUpdate).toHaveBeenCalledTimes(2);
  });

  it('a cancelled download can be started again', () => {
    useUpdateStore.setState({ phase: 'downloading', update: UPDATE, downloaded: 10, total: 20 });
    useUpdateStore.getState().cancel();
    expect(bridge.cancelUpdateDownload).toHaveBeenCalledOnce();
    useUpdateStore.getState().handleEvent({ type: 'cancelled' });
    expect(useUpdateStore.getState()).toMatchObject({ phase: 'available', downloaded: 0 });
  });

  it('download needs a known update', () => {
    useUpdateStore.getState().download();
    expect(bridge.downloadUpdate).not.toHaveBeenCalled();
  });
});
