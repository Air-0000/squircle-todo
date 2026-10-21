import { create } from 'zustand';
import { ThemeMode, ToneLock } from '../types';
import { THEMES, computeThemeFromClock, ThemeDefinition } from '../constants/themes';
import { nativeBridge } from '../utils/bridge';

const THEME_STORAGE_KEY = 'squircle_theme_state_v1';

export interface ThemeState {
  theme: ThemeMode;
  autoSwitch: boolean;
  toneLock: ToneLock;

  setTheme: (theme: ThemeMode) => void;
  setAutoSwitch: (enabled: boolean) => void;
  setToneLock: (lock: ToneLock) => void;
  syncWithClock: () => void;
  applyTheme: () => void;
  getEffectiveTheme: () => ThemeDefinition;
}

function getStoredOrInitialState(): { theme: ThemeMode; autoSwitch: boolean; toneLock: ToneLock } {
  const defaultTone: ToneLock = 'warm';
  const defaultTheme = computeThemeFromClock(new Date(), defaultTone);
  const fallback = {
    theme: defaultTheme,
    autoSwitch: true,
    toneLock: defaultTone,
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme && THEMES[parsed.theme as ThemeMode] ? (parsed.theme as ThemeMode) : fallback.theme,
        autoSwitch: parsed.autoSwitch !== undefined ? Boolean(parsed.autoSwitch) : fallback.autoSwitch,
        toneLock: ['warm', 'cool', 'auto'].includes(parsed.toneLock) ? (parsed.toneLock as ToneLock) : fallback.toneLock,
      };
    }
  } catch (e) {
    // Ignore parse error and return fallback
  }
  return fallback;
}

function persistThemeState(state: { theme: ThemeMode; autoSwitch: boolean; toneLock: ToneLock }) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore storage quota errors
    }
  }
}

const initial = getStoredOrInitialState();

if (typeof document !== 'undefined') {
  const initialThemeDef = THEMES[initial.theme] || THEMES['warm-morning'];
  document.documentElement.setAttribute('data-theme', initial.theme);
  document.documentElement.classList.toggle('dark', initialThemeDef.isDark);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial.theme,
  autoSwitch: initial.autoSwitch,
  toneLock: initial.toneLock,

  setTheme: (theme) => {
    if (!THEMES[theme]) {
      throw new Error(`Invalid theme ID: ${theme}`);
    }
    // Manual selection locks theme and disables autoSwitch (Contract T3-PAIR-04)
    set({ theme, autoSwitch: false });
    get().applyTheme();
    persistThemeState({ theme, autoSwitch: false, toneLock: get().toneLock });
  },

  setAutoSwitch: (enabled) => {
    const autoSwitch = Boolean(enabled);
    set({ autoSwitch });
    if (autoSwitch) {
      get().syncWithClock();
    } else {
      get().applyTheme();
      persistThemeState({ theme: get().theme, autoSwitch: false, toneLock: get().toneLock });
    }
  },

  setToneLock: (toneLock) => {
    if (!['warm', 'cool', 'auto'].includes(toneLock)) {
      throw new Error(`Invalid tone lock: ${toneLock}`);
    }
    set({ toneLock });
    if (get().autoSwitch) {
      get().syncWithClock();
    } else {
      persistThemeState({ theme: get().theme, autoSwitch: get().autoSwitch, toneLock });
    }
  },

  syncWithClock: () => {
    const { autoSwitch, toneLock } = get();
    if (!autoSwitch) return;

    const targetTheme = computeThemeFromClock(new Date(), toneLock);
    set({ theme: targetTheme });
    get().applyTheme();
    persistThemeState({ theme: targetTheme, autoSwitch: true, toneLock });
  },

  applyTheme: () => {
    const { theme } = get();
    const themeDef = THEMES[theme] || THEMES['warm-morning'];
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.toggle('dark', themeDef.isDark);
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeDef.appBg);
      }
    }
    nativeBridge.setStatusBarTheme(themeDef.isDark, themeDef.appBg);
  },

  getEffectiveTheme: () => {
    const { autoSwitch, toneLock, theme } = get();
    if (autoSwitch) {
      const targetTheme = computeThemeFromClock(new Date(), toneLock);
      return THEMES[targetTheme];
    }
    return THEMES[theme] || THEMES['warm-morning'];
  },
}));
