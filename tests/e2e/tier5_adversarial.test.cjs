/**
 * Tier 5 Test Suite: Adversarial Hardening, Workload Stress & State Isolation
 * Conforms to PROJECT.md Milestone M5 requirements.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 5: Adversarial Hardening & Stress Resilience', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
  });

  it('T5-ADV-01: Rapid multi-persona task creation and cross-persona state isolation', () => {
    // Interleaved creation across exam, art, and security personas
    const examTask = app.addTask({
      personaId: 'exam',
      title: '高数真题专项攻克 2024卷',
      personaData: {
        subject: 'math',
        ebbinghausTracking: true,
        ebbinghausRound: 2,
        focusTimeTotalMinutes: 120
      }
    });

    const artTask = app.addTask({
      personaId: 'art',
      title: '赛博机械姬二分铺色',
      personaData: {
        pipelineMilestone: 'flat_color',
        milestonesCompleted: ['planning', 'draft', 'lineart', 'flat_color'],
        canvasWidth: 7680,
        canvasHeight: 4320,
        estimatedHours: 25,
        actualHours: 18
      }
    });

    const secTask = app.addTask({
      personaId: 'security',
      title: '【中班】巡检异常报备及消防通道复核',
      personaData: {
        shiftType: 'afternoon',
        dutyPersonnel: '王铁柱',
        isEmergency: true
      }
    });

    // Pinned emergency security task must be at top
    const allTasks = app.getTasks();
    expect(allTasks[0].id).toBe(secTask.id);
    expect(allTasks[0].isPinned).toBe(true);

    // Filtering by persona isolates records
    const examOnly = app.getTasks({ personaId: 'exam' });
    expect(examOnly.length).toBe(1);
    expect(examOnly[0].title).toBe('高数真题专项攻克 2024卷');
    expect(examOnly[0].personaData.subject).toBe('math');

    const artOnly = app.getTasks({ personaId: 'art' });
    expect(artOnly.length).toBe(1);
    expect(artOnly[0].personaData.pipelineMilestone).toBe('flat_color');

    const secOnly = app.getTasks({ personaId: 'security' });
    expect(secOnly.length).toBe(1);
    expect(secOnly[0].personaData.isEmergency).toBe(true);
  });

  it('T5-ADV-02: Workload stress benchmark with 100+ heterogeneous polymorphic tasks', () => {
    // Generate 120 tasks across different categories
    for (let i = 1; i <= 120; i++) {
      const persona = i % 3 === 0 ? 'exam' : i % 3 === 1 ? 'art' : 'security';
      app.addTask({
        personaId: persona,
        title: `批量压力测试任务 #${i.toString().padStart(3, '0')}`,
        priority: i % 4 === 0 ? 'urgent' : i % 4 === 1 ? 'high' : 'medium',
        personaData: {
          index: i,
          metadata: `load-test-payload-${i}`
        }
      });
    }

    const tasks = app.getTasks();
    expect(tasks.length).toBe(120);

    // Filter by urgency
    const urgentTasks = app.getTasks({ priority: 'urgent' });
    expect(urgentTasks.length).toBe(30);

    // Export 120 items to RFC 4180 CSV
    const csv = app.exportCSV();
    expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
    const lines = csv.split('\r\n').filter(Boolean);
    expect(lines.length).toBe(121); // Header + 120 tasks
  });

  it('T5-ADV-03: Malformed and partial payload resilience during JSON import', () => {
    // Valid initial state
    app.addTask({ title: '基准数据项' });

    // 1. Incomplete JSON with partial fields
    const partialJSON = JSON.stringify({
      schemaVersion: 2,
      tasks: [
        { id: 'partial-1', title: '缺少部分字段的任务', priority: 'medium', tags: [] }
      ]
    });

    const mergeResult = app.importJSON(partialJSON, 'merge');
    expect(mergeResult.success).toBe(true);

    const mergedTask = app.getTask('partial-1');
    expect(mergedTask).toBeDefined();
    expect(mergedTask.title).toBe('缺少部分字段的任务');
    expect(mergedTask.priority).toBe('medium');

    // 2. Reject non-array or corrupt payload
    expect(() => {
      app.importJSON('{ invalid json syntax');
    }).toThrow();

    expect(() => {
      app.importJSON(JSON.stringify({ notTasks: true }));
    }).toThrow();
  });

  it('T5-ADV-04: High-frequency theme toggling concurrent with timer ticking', () => {
    // Create an exam task with timer
    const task = app.addTask({
      personaId: 'exam',
      title: '模考计时并发测试',
      personaData: {
        focusTimeTotalMinutes: 0,
        pomodoroCount: 0
      }
    });

    // Rapidly toggle themes 20 times across all 4 themes
    const themes = ['warm-morning', 'cool-morning', 'warm-evening', 'cool-evening'];
    for (let i = 0; i < 20; i++) {
      app.setTheme(themes[i % themes.length]);
      expect(app.themeState.theme).toBe(themes[i % themes.length]);
    }

    // Accumulate pomodoros
    app.recordExamPomodoro(task.id, 25);
    app.recordExamPomodoro(task.id, 25);

    const updated = app.getTask(task.id);
    expect(updated.personaData.focusTimeTotalMinutes).toBe(50);
    expect(updated.personaData.pomodoroCount).toBe(2);
  });

  it('T5-ADV-05: Emergency priority override and resolution life-cycle', () => {
    const emerg = app.addTask({
      personaId: 'security',
      title: '🔥 消控主机二总线回路接地故障',
      personaData: {
        isEmergency: true,
        dutyPersonnel: '值班班长'
      }
    });

    expect(emerg.isPinned).toBe(true);
    expect(emerg.priority).toBe('urgent');

    // Resolve and clear emergency
    const resolved = app.updateTask(emerg.id, {
      isPinned: false,
      priority: 'low',
      personaData: {
        isEmergency: false,
        resolutionNotes: '接地线路已查明并排查完毕，系统恢复正常监视状态'
      }
    });

    expect(resolved.isPinned).toBe(false);
    expect(resolved.priority).toBe('low');
    expect(resolved.personaData.isEmergency).toBe(false);
  });
});
