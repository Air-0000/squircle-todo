/**
 * Tier 2 Test Suite: 边界与极端异常场景 (Boundary & Corner Cases)
 * Covers: empty strings, extreme dates, leap year, canvas extremes, max hours,
 * corrupt JSON, CSV escaping, rapid theme switching, zero subtasks, multi-emergency.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 2: Boundary & Corner Cases', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
  });

  it('T2-BND-01: should reject empty and whitespace-only task titles', () => {
    expect(() => {
      app.addTask({ title: '' });
    }).toThrow('Task title cannot be empty');

    expect(() => {
      app.addTask({ title: '   \t  \n  ' });
    }).toThrow('Task title cannot be empty');

    expect(() => {
      app.addTask({ title: null });
    }).toThrow('Task title cannot be empty');
  });

  it('T2-BND-02: should gracefully handle past and far-future countdown target dates', () => {
    app.env.mockDate('2026-10-08T12:00:00');
    try {
      // Past date (exam yesterday)
      const pastResult = app.calculateExamCountdown('2026-10-07T08:00:00');
      expect(pastResult.isExpired).toBe(true);
      expect(pastResult.daysRemaining).toBe(0);
      expect(pastResult.label).toBe('已结束');

      // Far future date (year 2099)
      const futureResult = app.calculateExamCountdown('2099-12-25T08:00:00');
      expect(futureResult.isExpired).toBe(false);
      expect(futureResult.daysRemaining).toBeGreaterThan(25000);
      expect(futureResult.label).toContain('倒计时');
    } finally {
      app.env.restoreDate();
    }
  });

  it('T2-BND-03: should correctly compute Ebbinghaus review dates across leap year and non-leap year Feb 27 + 4 days', () => {
    // 2028 is a leap year (Feb 29 exists) -> Feb 27 + 4 days = March 2
    const leapSchedule = app.computeEbbinghausSchedule('2028-02-27T08:00:00Z');
    expect(leapSchedule.round3).toBe('2028-03-02');

    // 2027 is a normal year (28 days in Feb) -> Feb 27 + 4 days = March 3
    const normalSchedule = app.computeEbbinghausSchedule('2027-02-27T08:00:00Z');
    expect(normalSchedule.round3).toBe('2027-03-03');
  });

  it('T2-BND-04: should clamp zero or negative canvas dimensions to safe defaults', () => {
    const invalidSpecs = app.validateCanvasSpecs({
      width: 0,
      height: -500,
      dpi: 99999, // Unrecognized DPI
      colorSpace: 'INVALID_SPACE'
    });

    expect(invalidSpecs.width).toBe(1920);
    expect(invalidSpecs.height).toBe(1080);
    expect(invalidSpecs.dpi).toBe(300); // Fallback to 300
    expect(invalidSpecs.colorSpace).toBe('RGB'); // Fallback to RGB
  });

  it('T2-BND-05: should handle extreme overtime hours without UI layout overflow or crash', () => {
    // 5h estimated vs 25h actual (400% overtime)
    const audit = app.auditArtHours(5.0, 25.0);
    expect(audit.isOvertime).toBe(true);
    expect(audit.delta).toBe(20.0);
    expect(audit.badgeText).toBe('+20.0h 超时');

    // Negative estimated or actual should be clamped to 0
    const clamped = app.auditArtHours(-10, -5);
    expect(clamped.estimatedHours).toBe(0);
    expect(clamped.actualHours).toBe(0);
    expect(clamped.delta).toBe(0);
  });

  it('T2-BND-06: should recover from corrupted JSON backup without modifying existing state', () => {
    app.addTask({ title: '重要安全任务', personaId: 'security' });
    const initialTasksCount = app.getTasks().length;

    // Malformed JSON syntax
    expect(() => {
      app.importJSON('{ malformed: "json", not closed ', 'overwrite');
    }).toThrow('Invalid JSON syntax');

    // Missing tasks array
    expect(() => {
      app.importJSON(JSON.stringify({ app: 'UnknownApp', version: 1 }), 'overwrite');
    }).toThrow('Missing tasks array');

    // Verify existing database remained completely intact
    expect(app.getTasks()).toHaveLength(initialTasksCount);
    expect(app.getTasks()[0].title).toBe('重要安全任务');
  });

  it('T2-BND-07: should escape commas, quotes, newlines, and Chinese characters in CSV export', () => {
    app.addTask({
      title: '复杂任务: 含"双引号", 逗号, 以及\n换行符',
      description: '备注带有,"特殊符号"与中文: 考研政治',
      personaId: 'exam',
      tags: ['#测试,带逗号', '#"带双引号"']
    });

    const csv = app.exportCSV();

    // Verify BOM
    expect(csv.startsWith('\uFEFF')).toBe(true);

    // Verify double-quote escaping ("" -> double quotes inside quoted string)
    expect(csv).toContain('""双引号""');
    expect(csv).toContain('""带双引号""');
    expect(csv).toContain('考研政治');
  });

  it('T2-BND-08: should handle rapid consecutive theme switches without race conditions or corrupted classes', () => {
    const themeSequence = [
      'warm-morning',
      'cool-evening',
      'warm-evening',
      'cool-morning',
      'warm-morning',
      'cool-evening'
    ];

    themeSequence.forEach(t => app.setTheme(t));

    const finalTheme = app.getEffectiveTheme();
    expect(finalTheme.id).toBe('cool-evening');
    expect(finalTheme.isDark).toBe(true);

    // Android bridge should have received all status bar updates, last one matching final
    const history = app.env.androidBridge.history.statusBarThemes;
    expect(history.length).toBeGreaterThanOrEqual(6);
    expect(history[history.length - 1].hexColor).toBe('#0B0F19');
    expect(history[history.length - 1].dark).toBe(true);
  });

  it('T2-BND-09: should handle task with zero subtasks without returning NaN or dividing by zero', () => {
    const task = app.addTask({
      title: '空子任务测试',
      personaId: 'exam'
    });

    const progress = app.getSubtaskProgress(task.id);
    expect(progress.total).toBe(0);
    expect(progress.completed).toBe(0);
    expect(progress.ratio).toBe(0);
    expect(progress.percentText).toBe('0%');
  });

  it('T2-BND-10: should reject negative or zero study pomodoro duration', () => {
    const task = app.addTask({ title: '英语单词记忆', personaId: 'exam' });

    expect(() => {
      app.recordExamPomodoro(task.id, 0);
    }).toThrow('Duration must be positive');

    expect(() => {
      app.recordExamPomodoro(task.id, -25);
    }).toThrow('Duration must be positive');
  });

  it('T2-BND-11: should preserve correct sorting order when multiple emergency incidents are pinned', () => {
    app.addTask({ title: '普通安保巡查 1', personaId: 'security' });

    // Mock date 10:00
    app.env.mockDate('2026-10-08T10:00:00');
    const emergency1 = app.addTask({
      title: '🚨 应急 1: 消防通道报警',
      personaId: 'security',
      personaData: { isEmergency: true }
    });

    // Mock date 10:05
    app.env.mockDate('2026-10-08T10:05:00');
    const emergency2 = app.addTask({
      title: '🚨 应急 2: 监控主机脱扣',
      personaId: 'security',
      personaData: { isEmergency: true }
    });
    app.env.restoreDate();

    const tasks = app.getTasks({ personaId: 'security' });
    // Emergency 2 was created later, should be first
    expect(tasks[0].id).toBe(emergency2.id);
    expect(tasks[1].id).toBe(emergency1.id);
    expect(tasks[2].title).toBe('普通安保巡查 1');
  });

  it('T2-BND-12: should allow visitor departure to be registered after shift transition', () => {
    const task = app.addTask({
      title: '跨班次访客登记',
      personaId: 'security'
    });

    // Registered at morning shift
    const entry = app.logSecurityVisitor(task.id, {
      visitorName: '外部专家王工',
      inTime: '2026-10-08T10:00:00',
      status: 'on_site'
    });

    expect(entry.status).toBe('on_site');
    expect(entry.outTime).toBeNull();

    // Departed during afternoon shift at 16:30
    const departure = app.logSecurityVisitor(task.id, {
      ...entry,
      outTime: '2026-10-08T16:30:00',
      status: 'departed'
    });

    expect(departure.status).toBe('departed');
    expect(departure.outTime).toBe('2026-10-08T16:30:00');
  });
});
