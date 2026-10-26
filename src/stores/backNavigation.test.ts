import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pushBackHandler } from '../utils/backStack';
import { EXIT_WINDOW_MS, handleBackPress } from './backNavigation';
import { useToastStore } from './useToastStore';
import { BASE_TABS, useUIStore } from './useUIStore';

describe('handleBackPress', () => {
  beforeEach(() => {
    useUIStore.setState({ activeTab: BASE_TABS.tasks });
    useToastStore.setState({ toasts: [] });
    handleBackPress(0); // arm, then disarm the exit window so each test starts clean
    handleBackPress(1);
  });

  it('closes the overlay opened last, one per press', () => {
    const list = vi.fn();
    const detail = vi.fn();
    const removeList = pushBackHandler({ current: list });
    const removeDetail = pushBackHandler({ current: detail });

    expect(handleBackPress()).toBe(true);
    expect(detail).toHaveBeenCalledOnce();
    expect(list).not.toHaveBeenCalled();

    removeDetail(); // the sheet closed, its effect unregistered it
    expect(handleBackPress()).toBe(true);
    expect(list).toHaveBeenCalledOnce();
    removeList();
  });

  it('returns from any other tab to 待办 before exiting', () => {
    useUIStore.setState({ activeTab: 'settings' });
    expect(handleBackPress(10_000)).toBe(true);
    expect(useUIStore.getState().activeTab).toBe(BASE_TABS.tasks);
  });

  it('exits only on a second press within the window', () => {
    expect(handleBackPress(10_000)).toBe(true);
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('再按一次退出');
    expect(handleBackPress(10_000 + EXIT_WINDOW_MS - 1)).toBe(false);
  });

  it('a late second press asks again instead of exiting', () => {
    expect(handleBackPress(10_000)).toBe(true);
    expect(handleBackPress(10_000 + EXIT_WINDOW_MS + 1)).toBe(true);
  });
});
