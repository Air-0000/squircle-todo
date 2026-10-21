import { create } from 'zustand';
import { TodoItem } from '../types';
import { soundSynth } from '../utils/sound';
import { nativeBridge } from '../utils/bridge';
import { triggerMilestoneCelebration } from '../components/common/ConfettiBurst';
import { useTaskStore } from './useTaskStore';
import { useToastStore } from './useToastStore';
import { useThemeStore } from './useThemeStore';

export type FocusMode = 'clock' | 'pomodoro' | 'stopwatch';

export interface FocusRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  durationMinutes: number;
  taskId?: string;
  taskTitle?: string;
  persona?: string;
}

export interface FocusStoreState {
  // Modes & View state
  mode: FocusMode;
  isFullScreenOpen: boolean;
  isRunning: boolean;
  
  // Timer numerical values
  pomodoroDurationMinutes: number; // 15, 25, 45, 60...
  timeLeft: number; // in seconds
  stopwatchElapsed: number; // in seconds

  // Task linking
  linkedTask: TodoItem | null;

  // Sound & ASMR
  isSoundEnabled: boolean;
  
  // Persistent history
  focusHistory: FocusRecord[];

  // Actions
  setMode: (mode: FocusMode) => void;
  openFocusModal: (options?: { mode?: FocusMode; task?: TodoItem; durationMinutes?: number }) => void;
  closeFocusModal: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setPomodoroDuration: (minutes: number) => void;
  linkTask: (task: TodoItem | null) => void;
  toggleSound: () => void;
  tick: () => void;
  resetFocusData: () => void;
  recordSession: (minutes: number, task?: TodoItem | null) => void;
}

const STORAGE_KEY = 'squircle_focus_data_v1';

function loadStoredHistory(): FocusRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.focusHistory)) {
        return parsed.focusHistory;
      }
    }
  } catch {}
  
  // Return clean empty array without pre-stored fake records
  return [];
}

function persistHistory(records: FocusRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ focusHistory: records }));
  } catch {}
}

export const useFocusStore = create<FocusStoreState>((set, get) => ({
  mode: 'clock',
  isFullScreenOpen: false,
  isRunning: false,
  pomodoroDurationMinutes: 25,
  timeLeft: 25 * 60,
  stopwatchElapsed: 0,
  linkedTask: null,
  isSoundEnabled: true,
  focusHistory: loadStoredHistory(),

  setMode: (mode) => {
    const { isRunning, pomodoroDurationMinutes } = get();
    if (!isRunning) {
      if (mode === 'pomodoro') {
        set({ mode, timeLeft: pomodoroDurationMinutes * 60 });
      } else if (mode === 'stopwatch') {
        set({ mode, stopwatchElapsed: 0 });
      } else {
        set({ mode });
      }
    } else {
      set({ mode });
    }
    nativeBridge.performHapticFeedback('light');
  },

  openFocusModal: (options) => {
    const state = get();
    const targetMode = options?.mode || state.mode || 'clock';
    const duration = options?.durationMinutes || state.pomodoroDurationMinutes || 25;
    const task = options?.task !== undefined ? options.task : state.linkedTask;

    set({
      isFullScreenOpen: true,
      mode: targetMode,
      linkedTask: task,
      pomodoroDurationMinutes: duration,
      timeLeft: state.isRunning ? state.timeLeft : duration * 60,
    });
    nativeBridge.performHapticFeedback('medium');
  },

  closeFocusModal: () => {
    set({ isFullScreenOpen: false });
    nativeBridge.performHapticFeedback('light');
  },

  startTimer: () => {
    const { isSoundEnabled } = get();
    if (isSoundEnabled) soundSynth.playDropletPop();
    nativeBridge.performHapticFeedback('medium');
    set({ isRunning: true });
  },

  pauseTimer: () => {
    const { isSoundEnabled } = get();
    if (isSoundEnabled) soundSynth.playDropletPop();
    nativeBridge.performHapticFeedback('light');
    set({ isRunning: false });
  },

  resetTimer: () => {
    const { pomodoroDurationMinutes, isSoundEnabled } = get();
    if (isSoundEnabled) soundSynth.playDropletPop();
    nativeBridge.performHapticFeedback('light');
    set({
      isRunning: false,
      timeLeft: pomodoroDurationMinutes * 60,
      stopwatchElapsed: 0,
    });
  },

  setPomodoroDuration: (minutes) => {
    set({
      pomodoroDurationMinutes: minutes,
      timeLeft: minutes * 60,
      isRunning: false,
    });
    nativeBridge.performHapticFeedback('light');
  },

  linkTask: (task) => {
    set({ linkedTask: task });
    nativeBridge.performHapticFeedback('light');
  },

  toggleSound: () => {
    const next = !get().isSoundEnabled;
    set({ isSoundEnabled: next });
    if (next) soundSynth.playDropletPop();
    nativeBridge.performHapticFeedback('light');
  },

  recordSession: (minutes, task) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const newRecord: FocusRecord = {
      id: `focus-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: todayStr,
      timestamp: new Date().toISOString(),
      durationMinutes: minutes,
      taskId: task?.id,
      taskTitle: task?.title,
      persona: task?.persona || 'general',
    };

    const updated = [newRecord, ...get().focusHistory];
    set({ focusHistory: updated });
    persistHistory(updated);

    // If linked to an existing task in useTaskStore, accumulate focus minutes and pomodoros
    if (task?.id) {
      const taskStore = useTaskStore.getState();
      const currentTask = taskStore.getTask(task.id);
      if (currentTask) {
        const prevExamData = (currentTask.examData || {}) as any;
        const newTotal = (prevExamData.focusTimeTotalMinutes || 0) + minutes;
        const newCount = (prevExamData.pomodoroCount || 0) + 1;
        taskStore.updateTask(task.id, {
          examData: {
            subject: prevExamData.subject || 'general',
            ...prevExamData,
            focusTimeTotalMinutes: newTotal,
            pomodoroCount: newCount,
          },
          personaData: {
            ...(currentTask.personaData || {}),
            focusTimeTotalMinutes: newTotal,
            pomodoroCount: newCount,
          },
        });
      }
    }
  },

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    if (state.mode === 'pomodoro') {
      if (state.timeLeft <= 1) {
        // Pomodoro Completed!
        const duration = state.pomodoroDurationMinutes;
        set({
          isRunning: false,
          timeLeft: duration * 60,
        });

        // Play chime & celebrate
        if (state.isSoundEnabled) soundSynth.playBellChime();
        nativeBridge.performHapticFeedback('success');
        triggerMilestoneCelebration(useThemeStore.getState().theme);

        // Record session
        state.recordSession(duration, state.linkedTask);

        // Notify user with toast
        useToastStore.getState().showToast(
          `🎉 太棒了！已深度专注 ${duration} 分钟！休息 5 分钟吧 ☕`,
          'success'
        );
      } else {
        set({ timeLeft: state.timeLeft - 1 });
      }
    } else if (state.mode === 'stopwatch') {
      set({ stopwatchElapsed: state.stopwatchElapsed + 1 });
    }
  },

  resetFocusData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    set({
      focusHistory: [],
      isRunning: false,
      timeLeft: get().pomodoroDurationMinutes * 60,
      stopwatchElapsed: 0,
      linkedTask: null,
    });
  },
}));
