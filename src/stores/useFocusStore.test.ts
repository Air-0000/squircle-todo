import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/sound', () => ({ soundSynth: { playDropletPop: vi.fn(), playBellChime: vi.fn() } }));
vi.mock('../utils/confetti', () => ({ burstConfetti: vi.fn(), celebrateMilestone: vi.fn() }));

const { useFocusStore } = await import('./useFocusStore');
const { useTaskStore } = await import('./useTaskStore');

const START = new Date('2026-10-24T09:00:00+08:00').getTime();

describe('useFocusStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    useFocusStore.setState({ mode: 'pomodoro', isRunning: false, pomodoroMinutes: 25, timeLeft: 1500, elapsed: 0, linkedTaskId: null, history: [] });
  });
  afterEach(() => vi.useRealTimers());

  it('counts down from wall-clock time, so throttled ticks do not drift', () => {
    useFocusStore.getState().start();
    vi.setSystemTime(START + 90_500); // e.g. the WebView skipped 90 ticks
    useFocusStore.getState().tick();
    expect(useFocusStore.getState().timeLeft).toBe(1410);
  });

  it('completes once, records the session and credits the linked task', () => {
    const task = useTaskStore.getState().addTask({ title: '背单词' });
    useFocusStore.getState().linkTask(task.id);
    useFocusStore.getState().start();
    vi.setSystemTime(START + 26 * 60_000);
    useFocusStore.getState().tick();
    useFocusStore.getState().tick();

    const s = useFocusStore.getState();
    expect(s.isRunning).toBe(false);
    expect(s.timeLeft).toBe(1500);
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toMatchObject({ durationMinutes: 25, taskId: task.id, date: '2026-10-24' });
    expect(useTaskStore.getState().tasks.find(t => t.id === task.id)).toMatchObject({ focusMinutes: 25, pomodoroCount: 1 });
  });

  it('keeps stopwatch time across pause / resume', () => {
    useFocusStore.setState({ mode: 'stopwatch' });
    const focus = useFocusStore.getState();
    focus.start();
    vi.setSystemTime(START + 30_000);
    focus.pause();
    vi.setSystemTime(START + 300_000); // paused for a while
    focus.start();
    vi.setSystemTime(START + 310_000);
    focus.tick();
    expect(useFocusStore.getState().elapsed).toBe(40);
  });
});
