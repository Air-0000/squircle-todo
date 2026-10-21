import { create } from 'zustand';

export interface UserSettings {
  showExamCountdown: boolean;
  showExamPomodoro: boolean;
  targetExamDate: string;
  showDailyWork: boolean;
  showWeeklyWork: boolean;
  showMonthlyWork: boolean;
  showEmergencyWork: boolean;

  setShowExamCountdown: (show: boolean) => void;
  setShowExamPomodoro: (show: boolean) => void;
  setTargetExamDate: (date: string) => void;
  setShowDailyWork: (show: boolean) => void;
  setShowWeeklyWork: (show: boolean) => void;
  setShowMonthlyWork: (show: boolean) => void;
  setShowEmergencyWork: (show: boolean) => void;
}

const STORAGE_KEY = 'squircle_user_settings_v1';

function loadInitialSettings(): Partial<UserSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export const useSettingsStore = create<UserSettings>((set, get) => {
  const initial = loadInitialSettings();

  const persist = (partial: Partial<UserSettings>) => {
    try {
      const current = {
        showExamCountdown: get().showExamCountdown,
        showExamPomodoro: get().showExamPomodoro,
        targetExamDate: get().targetExamDate,
        showDailyWork: get().showDailyWork,
        showWeeklyWork: get().showWeeklyWork,
        showMonthlyWork: get().showMonthlyWork,
        showEmergencyWork: get().showEmergencyWork,
        ...partial
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      // ignore
    }
  };

  return {
    showExamCountdown: initial.showExamCountdown ?? true,
    showExamPomodoro: initial.showExamPomodoro ?? true,
    targetExamDate: initial.targetExamDate ?? '2026-12-26',
    showDailyWork: initial.showDailyWork ?? true,
    showWeeklyWork: initial.showWeeklyWork ?? true,
    showMonthlyWork: initial.showMonthlyWork ?? true,
    showEmergencyWork: initial.showEmergencyWork ?? true,

    setShowExamCountdown: (show) => {
      set({ showExamCountdown: show });
      persist({ showExamCountdown: show });
    },
    setShowExamPomodoro: (show) => {
      set({ showExamPomodoro: show });
      persist({ showExamPomodoro: show });
    },
    setTargetExamDate: (date) => {
      set({ targetExamDate: date });
      persist({ targetExamDate: date });
    },
    setShowDailyWork: (show) => {
      set({ showDailyWork: show });
      persist({ showDailyWork: show });
    },
    setShowWeeklyWork: (show) => {
      set({ showWeeklyWork: show });
      persist({ showWeeklyWork: show });
    },
    setShowMonthlyWork: (show) => {
      set({ showMonthlyWork: show });
      persist({ showMonthlyWork: show });
    },
    setShowEmergencyWork: (show) => {
      set({ showEmergencyWork: show });
      persist({ showEmergencyWork: show });
    },
  };
});
