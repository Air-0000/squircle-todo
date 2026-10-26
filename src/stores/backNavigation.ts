/**
 * The Android back key, called by MainActivity through window.__onNativeBack:
 * close the top overlay, else leave a tab for 待办, else exit on a second
 * press within EXIT_WINDOW_MS. Returns false only when the app should exit.
 */
import { closeTopOverlay } from '../utils/backStack';
import { toast } from './useToastStore';
import { BASE_TABS, useUIStore } from './useUIStore';

export const EXIT_WINDOW_MS = 2000;

let lastPressAtHome = -Infinity;

export function handleBackPress(now = Date.now()): boolean {
  if (closeTopOverlay()) return true;

  const ui = useUIStore.getState();
  if (ui.activeTab !== BASE_TABS.tasks) {
    ui.setActiveTab(BASE_TABS.tasks);
    return true;
  }

  if (now - lastPressAtHome < EXIT_WINDOW_MS) {
    lastPressAtHome = -Infinity;
    return false;
  }
  lastPressAtHome = now;
  toast.info('再按一次退出', EXIT_WINDOW_MS);
  return true;
}
