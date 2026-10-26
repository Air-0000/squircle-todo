/**
 * Operations that span several stores: backup export/import and data reset.
 */
import { mergeById, parseBackup, serializeBackup, tasksToCsv, type ImportMode } from '../domain/backup';
import { createSeedTasks } from '../domain/seed';
import { THEME_IDS, type ThemeMode, type ToneLock } from '../constants/themes';
import { CURRENT_APP_VERSION } from '../constants/version';
import { nativeBridge } from '../utils/bridge';
import { useTaskStore } from './useTaskStore';
import { usePanelStore } from './usePanelStore';
import { useFocusStore } from './useFocusStore';
import { useThemeStore } from './useThemeStore';

export function exportBackup(): { taskCount: number } {
  const { tasks } = useTaskStore.getState();
  const { theme, autoSwitch, toneLock } = useThemeStore.getState();
  const json = serializeBackup(
    {
      tasks,
      panels: usePanelStore.getState().panels,
      focusHistory: useFocusStore.getState().history,
      themeState: { theme, autoSwitch, toneLock },
    },
    CURRENT_APP_VERSION.versionName,
  );
  nativeBridge.shareFile('squircle_todo_backup.json', 'application/json', json);
  return { taskCount: tasks.length };
}

export function exportCsv(): { taskCount: number } {
  const { tasks } = useTaskStore.getState();
  nativeBridge.shareFile('squircle_todo_export.csv', 'text/csv', tasksToCsv(tasks));
  return { taskCount: tasks.length };
}

export interface ImportSummary {
  added: number;
  updated: number;
  total: number;
}

/** Restores a backup file. Throws BackupFormatError without touching state on bad input. */
export function importBackup(text: string, mode: ImportMode): ImportSummary {
  const backup = parseBackup(text);

  const result = useTaskStore.getState().importTasks(backup.tasks, mode);
  if (backup.panels) {
    const panels = usePanelStore.getState();
    panels.replacePanels(mergeById(panels.panels, backup.panels, mode).items);
  }
  if (backup.focusHistory) {
    const focus = useFocusStore.getState();
    focus.replaceHistory(mergeById(focus.history, backup.focusHistory, mode).items);
  }
  if (backup.themeState) {
    const { theme, autoSwitch, toneLock } = backup.themeState;
    const themeStore = useThemeStore.getState();
    if (toneLock === 'warm' || toneLock === 'cool' || toneLock === 'auto') themeStore.setToneLock(toneLock as ToneLock);
    if (autoSwitch) themeStore.setAutoSwitch(true);
    else if (THEME_IDS.includes(theme as ThemeMode)) themeStore.setTheme(theme as ThemeMode);
  }

  return { added: result.added, updated: result.updated, total: result.items.length };
}

/** Clears tasks and focus history (panels, theme and announcements stay). */
export function clearAllData(): void {
  useTaskStore.getState().clearAll();
  useFocusStore.getState().clearHistory();
}

export function restoreSeedData(): void {
  useTaskStore.getState().importTasks(createSeedTasks(), 'overwrite');
}
