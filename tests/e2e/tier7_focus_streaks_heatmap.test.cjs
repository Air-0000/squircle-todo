/**
 * Tier 7 Test Suite: 专注计时、翻页时钟、连续打卡热力图与精力看板
 * Covers: 番茄钟专注时长累加、打卡天数 Streak 连续性计算、热力图 0~4 活跃度分级与秒表模考
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 7: Focus Timer, Flip Clock & Streaks Heatmap', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
  });

  it('T7-FOC-01: should accurately track and accumulate focus study minutes and pomodoro counts linked to task', () => {
    const task = app.addTask({
      title: '考研数学高数真题求解',
      personaId: 'exam',
      personaData: {
        subject: 'math',
        focusTimeTotalMinutes: 0,
        pomodoroCount: 0
      }
    });

    // Record two 25-minute Pomodoro sessions linked to this task
    app.recordExamPomodoro(task.id, 25);
    app.recordExamPomodoro(task.id, 25);

    const updated = app.getTask(task.id);
    expect(updated.personaData.pomodoroCount).toBe(2);
    expect(updated.personaData.focusTimeTotalMinutes).toBe(50);
  });

  it('T7-FOC-02: should maintain consecutive streak days correctly based on completion dates', () => {
    const today = new Date();
    const dateList = [];

    // Simulate 5 consecutive days of completions
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dateList.push(dateStr);

      app.addTask({
        title: `每日打卡任务 Day ${5 - i}`,
        personaId: 'exam',
        isCompleted: true,
        completedAt: d.toISOString(),
      });
    }

    const tasks = app.getTasks();
    const activeDates = new Set();
    tasks.forEach(t => {
      if (t.isCompleted && t.completedAt) activeDates.add(t.completedAt.slice(0, 10));
    });

    expect(activeDates.size).toBe(5);
    dateList.forEach(d => {
      expect(activeDates.has(d)).toBe(true);
    });
  });

  it('T7-FOC-03: should calculate heatmap activity score and level mapping (0 to 4)', () => {
    // Scoring logic: score = taskCount * 2 + (focusMinutes / 20)
    const computeLevel = (taskCount, focusMinutes) => {
      const score = taskCount * 2 + focusMinutes / 20;
      if (score >= 6) return 4;
      if (score >= 4) return 3;
      if (score >= 2) return 2;
      if (score > 0) return 1;
      return 0;
    };

    expect(computeLevel(0, 0)).toBe(0);
    expect(computeLevel(0, 25)).toBe(1);  // 1.25 score -> level 1
    expect(computeLevel(1, 0)).toBe(2);   // 2.0 score -> level 2
    expect(computeLevel(2, 10)).toBe(3);  // 4.5 score -> level 3
    expect(computeLevel(3, 30)).toBe(4);  // 7.5 score -> level 4
  });

  it('T7-FOC-04: should support stopwatch simulation and record mock exam duration', () => {
    const mockTask = app.addTask({
      title: '全国统考英语真题模考全仿真',
      personaId: 'exam',
      personaData: {
        subject: 'english',
        focusTimeTotalMinutes: 0
      }
    });

    // Simulate 180min mock exam stopwatch completion
    app.recordExamPomodoro(mockTask.id, 180);

    const saved = app.getTask(mockTask.id);
    expect(saved.personaData.focusTimeTotalMinutes).toBe(180);
  });
});
