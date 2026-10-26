import { create } from 'zustand';
import { computeThemeFromClock, THEME_IDS, THEMES, type ThemeMode, type ToneLock } from '../constants/themes';
import { nativeBridge } from '../utils/bridge';
import { persistSlice, readJSON, STORAGE_KEYS } from '../utils/storage';

interface ThemeState {
  theme: ThemeMode;
  autoSwitch: boolean;
  toneLock: ToneLock;

  /** Picking a theme by hand turns auto-switching off. */
  setTheme: (theme: ThemeMode) => void;
  setAutoSwitch: (enabled: boolean) => void;
  setToneLock: (lock: ToneLock) => void;
  /** Re-evaluates the auto theme against the clock. */
  syncWithClock: () => void;
}

type ThemeSettings = Pick<ThemeState, 'theme' | 'autoSwitch' | 'toneLock'>;

function loadSettings(): ThemeSettings {
  const stored = readJSON<Partial<ThemeSettings>>(STORAGE_KEYS.theme) ?? {};
  const toneLock: ToneLock = stored.toneLock === 'cool' || stored.toneLock === 'auto' ? stored.toneLock : 'warm';
  const autoSwitch = stored.autoSwitch ?? true;
  const theme =
    !autoSwitch && stored.theme && THEME_IDS.includes(stored.theme) ? stored.theme : computeThemeFromClock(new Date(), toneLock);
  return { theme, autoSwitch, toneLock };
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...loadSettings(),

  setTheme: theme => set({ theme, autoSwitch: false }),
  setAutoSwitch: autoSwitch => {
    set({ autoSwitch });
    if (autoSwitch) get().syncWithClock();
  },
  setToneLock: toneLock => {
    set({ toneLock });
    if (get().autoSwitch) get().syncWithClock();
  },
  syncWithClock: () => {
    const { autoSwitch, toneLock, theme } = get();
    if (!autoSwitch) return;
    const next = computeThemeFromClock(new Date(), toneLock);
    if (next !== theme) set({ theme: next });
  },
}));

/** Pushes the current theme to <html> and the Android status bar. */
export function applyTheme(theme: ThemeMode = useThemeStore.getState().theme): void {
  const def = THEMES[theme];
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', def.isDark);
  nativeBridge.setStatusBarTheme(def.isDark, def.appBg);
}

if (typeof document !== 'undefined') applyTheme();
useThemeStore.subscribe((state, prev) => {
  if (state.theme !== prev.theme) applyTheme(state.theme);
});
persistSlice(
  useThemeStore,
  STORAGE_KEYS.theme,
  s => s,
  ({ theme, autoSwitch, toneLock }): ThemeSettings => ({ theme, autoSwitch, toneLock }),
);

export const useThemeDefinition = () => THEMES[useThemeStore(s => s.theme)];
