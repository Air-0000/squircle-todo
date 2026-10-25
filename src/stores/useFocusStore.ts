/**
 * Focus clock: pomodoro countdown, stopwatch and the focus history that feeds
 * the achievements tab. Timers are anchored to wall-clock timestamps so they
 * stay correct when the WebView throttles or suspends the 1s tick.
 */
import { create } from 'zustand';
import { createFocusRecord, type FocusMode, type FocusRecord } from '../domain/focus';
import { persistSlice, readJSON, STORAGE_KEYS } from '../utils/storage';
import { soundSynth } from '../utils/sound';
import { haptic } from '../utils/bridge';
import { celebrateMilestone } from '../utils/confetti';
import { getTask, useTaskStore } from './useTaskStore';
import { toast } from './useToastStore';

interface FocusState {
  mode: FocusMode;
  isOpen: boolean;
  isRunning: boolean;
  pomodoroMinutes: number;
  /** Seconds left in the pomodoro. */
  timeLeft: number;
  /** Seconds on the stopwatch. */
  elapsed: number;
  linkedTaskId: string | null;
  soundEnabled: boolean;
  history: FocusRecord[];

  open: (options?: { mode?: FocusMode; taskId?: string | null; minutes?: number }) => void;
  close: () => void;
  setMode: (mode: FocusMode) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setPomodoroMinutes: (minutes: number) => void;
  linkTask: (taskId: string | null) => void;
  toggleSound: () => void;
  tick: (now?: number) => void;
  /** Logs a session (and credits the linked task). */
  recordSession: (minutes: number) => void;
  replaceHistory: (history: FocusRecord[]) => void;
  clearHistory: () => void;
}

// Wall-clock anchors for the running timer; not part of rendered state.
let pomodoroDeadline = 0;
let stopwatchStartedAt = 0;
let stopwatchBase = 0;

function loadHistory(): FocusRecord[] {
  const stored = readJSON<{ focusHistory?: FocusRecord[] }>(STORAGE_KEYS.focus);
  return Array.isArray(stored?.focusHistory) ? stored.focusHistory : [];
}

export const useFocusStore = create<FocusState>((set, get) => {
  const anchor = (now = Date.now()) => {
    const { timeLeft, elapsed } = get();
    pomodoroDeadline = now + timeLeft * 1000;
    stopwatchStartedAt = now;
    stopwatchBase = elapsed;
  };
  const pop = () => {
    if (get().soundEnabled) soundSynth.playDropletPop();
  };

  const completePomodoro = () => {
    const minutes = get().pomodoroMinutes;
    set({ isRunning: false, timeLeft: minutes * 60 });
    if (get().soundEnabled) soundSynth.playBellChime();
    haptic('success');
    celebrateMilestone();
    get().recordSession(minutes);
    toast.success(`🎉 太棒了！已深度专注 ${minutes} 分钟！休息 5 分钟吧 ☕`);
  };

  return {
    mode: 'clock',
    isOpen: false,
    isRunning: false,
    pomodoroMinutes: 25,
    timeLeft: 25 * 60,
    elapsed: 0,
    linkedTaskId: null,
    soundEnabled: true,
    history: loadHistory(),

    open: options => {
      const { isRunning, timeLeft, pomodoroMinutes, mode, linkedTaskId } = get();
      const minutes = options?.minutes ?? pomodoroMinutes;
      set({
        isOpen: true,
        mode: options?.mode ?? mode,
        linkedTaskId: options?.taskId !== undefined ? options.taskId : linkedTaskId,
        pomodoroMinutes: minutes,
        timeLeft: isRunning ? timeLeft : minutes * 60,
      });
      haptic('medium');
    },
    close: () => set({ isOpen: false }),

    setMode: mode => {
      if (get().isRunning) {
        anchor();
        set({ mode });
      } else if (mode === 'pomodoro') {
        set({ mode, timeLeft: get().pomodoroMinutes * 60 });
      } else if (mode === 'stopwatch') {
        set({ mode, elapsed: 0 });
      } else {
        set({ mode });
      }
      haptic('light');
    },

    start: () => {
      pop();
      haptic('medium');
      anchor();
      set({ isRunning: true });
    },
    pause: () => {
      pop();
      haptic('light');
      get().tick();
      set({ isRunning: false });
    },
    reset: () => {
      pop();
      haptic('light');
      set({ isRunning: false, timeLeft: get().pomodoroMinutes * 60, elapsed: 0 });
    },
    setPomodoroMinutes: minutes => {
      set({ pomodoroMinutes: minutes, timeLeft: minutes * 60, isRunning: false });
      haptic('light');
    },
    linkTask: linkedTaskId => set({ linkedTaskId }),
    toggleSound: () => {
      set({ soundEnabled: !get().soundEnabled });
      pop();
    },

    tick: (now = Date.now()) => {
      const { isRunning, mode, timeLeft, elapsed } = get();
      if (!isRunning) return;
      if (mode === 'pomodoro') {
        const left = Math.max(0, Math.ceil((pomodoroDeadline - now) / 1000));
        if (left === 0) completePomodoro();
        else if (left !== timeLeft) set({ timeLeft: left });
      } else if (mode === 'stopwatch') {
        const next = stopwatchBase + Math.floor((now - stopwatchStartedAt) / 1000);
        if (next !== elapsed) set({ elapsed: next });
      }
    },

    recordSession: minutes => {
      const task = get().linkedTaskId ? getTask(get().linkedTaskId!) ?? null : null;
      set({ history: [createFocusRecord(minutes, task), ...get().history] });
      if (task) useTaskStore.getState().addFocusMinutes(task.id, minutes);
    },
    replaceHistory: history => set({ history }),
    clearHistory: () => set({ history: [], isRunning: false, timeLeft: get().pomodoroMinutes * 60, elapsed: 0, linkedTaskId: null }),
  };
});

persistSlice(useFocusStore, STORAGE_KEYS.focus, s => s.history, history => ({ focusHistory: history }));

/** The linked task, resolved live from the task store. */
export const useLinkedTask = () => {
  const id = useFocusStore(s => s.linkedTaskId);
  return useTaskStore(s => (id ? s.tasks.find(t => t.id === id) ?? null : null));
};
