/**
 * Tier 1 Test Suite: 考研备考 (Postgraduate Exam) Persona Feature Coverage
 * Covers: Subject hierarchy, Ebbinghaus repetition, Countdown banner, Focus pomodoro & stopwatch.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 1: Exam Persona - Feature Coverage', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
    app.setActivePersona('exam');
  });

  it('T1-EXAM-01: should create exam tasks across subject hierarchy with modules and question types', () => {
    const mathTask = app.addTask({
      personaId: 'exam',
      title: '高数第七章 微分方程基础练习题 1-20',
      personaData: {
        subject: 'math',
        moduleName: '高等数学',
        questionType: '解答题/计算题',
        ebbinghausTracking: true,
        ebbinghausRound: 0,
        focusTimeTotalMinutes: 0,
        pomodoroCount: 0
      }
    });

    expect(mathTask.id).toBeDefined();
    expect(mathTask.title).toBe('高数第七章 微分方程基础练习题 1-20');
    expect(mathTask.personaData.subject).toBe('math');
    expect(mathTask.personaData.moduleName).toBe('高等数学');
    expect(mathTask.personaData.questionType).toBe('解答题/计算题');
  });

  it('T1-EXAM-02: should generate exact 1/2/4/7/15-day Ebbinghaus review schedule from start date', () => {
    const startDate = '2026-10-01T08:00:00Z';
    const schedule = app.computeEbbinghausSchedule(startDate);

    expect(schedule.round1).toBe('2026-10-02'); // +1 day
    expect(schedule.round2).toBe('2026-10-03'); // +2 days
    expect(schedule.round3).toBe('2026-10-05'); // +4 days
    expect(schedule.round4).toBe('2026-10-08'); // +7 days
    expect(schedule.round5).toBe('2026-10-16'); // +15 days
  });

  it('T1-EXAM-03: should correctly evaluate Ebbinghaus status across upcoming, due_today, and overdue states', () => {
    const schedule = {
      round1: '2026-10-02',
      round2: '2026-10-03',
      round3: '2026-10-05',
      round4: '2026-10-08',
      round5: '2026-10-16'
    };

    // Before round 1 due date -> upcoming
    const status1 = app.evaluateEbbinghausStatus('2026-10-01', schedule, 0);
    expect(status1.status).toBe('upcoming');
    expect(status1.round).toBe(1);

    // On round 1 due date -> due_today
    const status2 = app.evaluateEbbinghausStatus('2026-10-02', schedule, 0);
    expect(status2.status).toBe('due_today');
    expect(status2.round).toBe(1);

    // After round 1 due date without checking off -> overdue
    const status3 = app.evaluateEbbinghausStatus('2026-10-04', schedule, 0);
    expect(status3.status).toBe('overdue');
    expect(status3.round).toBe(1);

    // Completed all 5 rounds -> mastered
    const statusMastered = app.evaluateEbbinghausStatus('2026-10-20', schedule, 5);
    expect(statusMastered.status).toBe('mastered');
    expect(statusMastered.badge).toContain('5/5 轮');
  });

  it('T1-EXAM-04: should calculate exam target date countdown with ceiling days remaining', () => {
    app.env.mockDate('2026-10-08T10:00:00Z');
    try {
      const targetExamDate = '2026-12-26T08:30:00Z';
      const result = app.calculateExamCountdown(targetExamDate);

      expect(result.isExpired).toBe(false);
      // Diff from Oct 8 to Dec 26 is ~79 days
      expect(result.daysRemaining).toBe(79);
      expect(result.label).toBe('倒计时 79 天');
    } finally {
      app.env.restoreDate();
    }
  });

  it('T1-EXAM-05: should accurately record 25-minute Pomodoro study sessions linked to specific subject tasks', () => {
    const englishTask = app.addTask({
      personaId: 'exam',
      title: '考研英语 核心词汇记忆 List 1-5',
      personaData: {
        subject: 'english',
        focusTimeTotalMinutes: 0,
        pomodoroCount: 0
      }
    });

    // Record two 25-minute pomodoro sessions
    app.recordExamPomodoro(englishTask.id, 25);
    const updatedData = app.recordExamPomodoro(englishTask.id, 25);

    expect(updatedData.focusTimeTotalMinutes).toBe(50);
    expect(updatedData.pomodoroCount).toBe(2);

    const savedTask = app.getTask(englishTask.id);
    expect(savedTask.personaData.focusTimeTotalMinutes).toBe(50);
    expect(savedTask.personaData.pomodoroCount).toBe(2);
  });

  it('T1-EXAM-06: should record mock exam 180-minute stopwatch simulation and trigger completion feedback', () => {
    const mockExamTask = app.addTask({
      personaId: 'exam',
      title: '2024年 考研数学一 真题全真模拟测试 (180min)',
      personaData: {
        subject: 'math',
        questionType: '全真模拟',
        focusTimeTotalMinutes: 0,
        pomodoroCount: 0
      }
    });

    // Simulate completing a 180min mock session
    app.recordExamPomodoro(mockExamTask.id, 180);
    const completedTask = app.toggleTask(mockExamTask.id);

    expect(completedTask.isCompleted).toBe(true);
    expect(completedTask.completedAt).toBeDefined();
    expect(app.confettiBursts.length).toBe(1);
    expect(app.env.androidBridge.history.hapticFeedbacks.length).toBeGreaterThan(0);
    expect(completedTask.personaData.focusTimeTotalMinutes).toBe(180);
  });
});
