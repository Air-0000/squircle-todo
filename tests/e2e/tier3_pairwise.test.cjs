/**
 * Tier 3 Test Suite: 交叉组合交互测试 (Pairwise Combinations)
 * Covers: persona switching with active timer, backup/restore across multiple personas,
 * theme lock under scheduled auto-switch, manual theme override, polymorphic CSV,
 * ID collision resolution on import, cross-persona pinned emergency persistence.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 3: Pairwise Combinations', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
  });

  it('T3-PAIR-01: should preserve Exam pomodoro timer accumulation during persona switching', () => {
    // Start in Exam persona
    app.setActivePersona('exam');
    const examTask = app.addTask({
      personaId: 'exam',
      title: '考研政治 马原冲刺大题背诵',
      personaData: { subject: 'politics', focusTimeTotalMinutes: 0, pomodoroCount: 0 }
    });

    app.recordExamPomodoro(examTask.id, 25);

    // Switch to Art persona and create an art task
    app.setActivePersona('art');
    app.addTask({
      personaId: 'art',
      title: '商插背景线稿',
      personaData: { pipelineMilestone: 'lineart', milestonesCompleted: ['planning', 'draft', 'lineart'] }
    });

    // Switch to Security persona and create a patrol task
    app.setActivePersona('security');
    app.addTask({
      personaId: 'security',
      title: '晚班重点门禁巡查',
      personaData: { shiftType: 'night', dutyPersonnel: '赵队长' }
    });

    // Switch back to Exam persona
    app.setActivePersona('exam');
    const resumedExamTask = app.getTask(examTask.id);

    expect(resumedExamTask.personaData.focusTimeTotalMinutes).toBe(25);
    expect(resumedExamTask.personaData.pomodoroCount).toBe(1);

    // Add another pomodoro session
    app.recordExamPomodoro(examTask.id, 25);
    const updatedTask = app.getTask(examTask.id);
    expect(updatedTask.personaData.focusTimeTotalMinutes).toBe(50);
    expect(updatedTask.personaData.pomodoroCount).toBe(2);
  });

  it('T3-PAIR-02: should preserve polymorphic fields across all 3 personas through full JSON backup and restore', () => {
    const examTask = app.addTask({
      personaId: 'exam',
      title: '考研数学 线性代数相似矩阵',
      personaData: { subject: 'math', ebbinghausRound: 2, focusTimeTotalMinutes: 75 }
    });

    const artTask = app.addTask({
      personaId: 'art',
      title: '全流程同人插画',
      personaData: {
        pipelineMilestone: 'flat_color',
        canvasWidth: 3840,
        canvasHeight: 2160,
        dpi: 300,
        estimatedHours: 12.5,
        actualHours: 8.0
      }
    });

    const secTask = app.addTask({
      personaId: 'security',
      title: '中班交接记录',
      personaData: {
        shiftType: 'afternoon',
        dutyPersonnel: '王班长',
        handoverStatus: 'completed'
      }
    });

    // Full export
    const backupJson = app.exportJSON();

    // Wipe database
    app.resetAllData();
    expect(app.getTasks()).toHaveLength(0);

    // Full Restore in overwrite mode
    app.importJSON(backupJson, 'overwrite');
    expect(app.getTasks()).toHaveLength(3);

    // Validate polymorphic fidelity
    const restoredExam = app.getTask(examTask.id);
    expect(restoredExam.personaData.subject).toBe('math');
    expect(restoredExam.personaData.focusTimeTotalMinutes).toBe(75);

    const restoredArt = app.getTask(artTask.id);
    expect(restoredArt.personaData.pipelineMilestone).toBe('flat_color');
    expect(restoredArt.personaData.canvasWidth).toBe(3840);
    expect(restoredArt.personaData.estimatedHours).toBe(12.5);

    const restoredSec = app.getTask(secTask.id);
    expect(restoredSec.personaData.shiftType).toBe('afternoon');
    expect(restoredSec.personaData.dutyPersonnel).toBe('王班长');
  });

  it('T3-PAIR-03: should transition correctly between morning and evening with Tone Lock active', () => {
    app.setAutoSwitch(true);
    app.setToneLock('warm');

    // 09:00 Morning
    app.env.mockDate('2026-10-08T09:00:00');
    expect(app.getEffectiveTheme().id).toBe('warm-morning');

    // 20:00 Evening
    app.env.mockDate('2026-10-08T20:00:00');
    expect(app.getEffectiveTheme().id).toBe('warm-evening');

    // Switch tone lock to Cool at 20:00
    app.setToneLock('cool');
    expect(app.getEffectiveTheme().id).toBe('cool-evening');

    // 07:00 Next Morning
    app.env.mockDate('2026-10-09T07:00:00');
    expect(app.getEffectiveTheme().id).toBe('cool-morning');

    app.env.restoreDate();
  });

  it('T3-PAIR-04: should maintain manual theme lock across clock changes when auto-switch is disabled', () => {
    // Manually select Cool Evening
    app.setTheme('cool-evening');
    expect(app.themeState.autoSwitch).toBe(false);

    // Clock set to 10:00 AM (Broad daylight)
    app.env.mockDate('2026-10-08T10:00:00');
    try {
      const currentTheme = app.getEffectiveTheme();
      // Must NOT switch to morning theme because autoSwitch is disabled
      expect(currentTheme.id).toBe('cool-evening');
      expect(currentTheme.isDark).toBe(true);
    } finally {
      app.env.restoreDate();
    }
  });

  it('T3-PAIR-05: should export heterogeneous multi-persona task set into unified RFC 4180 CSV without data corruption', () => {
    app.addTask({ personaId: 'exam', title: '政治主观题背诵', priority: 'high', tags: ['#考研'] });
    app.addTask({ personaId: 'art', title: '插画线稿提炼', priority: 'urgent', tags: ['#画画', '#约稿'] });
    app.addTask({ personaId: 'security', title: '消防设施巡检', priority: 'medium', tags: ['#安保'] });

    const csv = app.exportCSV();
    const lines = csv.replace('\uFEFF', '').split('\r\n').filter(Boolean);

    // Header + 3 data rows
    expect(lines).toHaveLength(4);
    expect(csv).toContain('exam,政治主观题背诵,high');
    expect(csv).toContain('art,插画线稿提炼,urgent');
    expect(csv).toContain('security,消防设施巡检,medium');
  });

  it('T3-PAIR-06: should resolve ID collisions during JSON Merge mode by updating existing and appending new', () => {
    const existing = app.addTask({ id: 'coll-task-1', title: '原标题 A', personaId: 'exam', priority: 'low' });
    app.addTask({ id: 'local-task-2', title: '本地独有任务', personaId: 'art', priority: 'medium' });

    const incomingBackup = JSON.stringify({
      schemaVersion: 2,
      tasks: [
        { id: 'coll-task-1', title: '已同步更新标题 A', personaId: 'exam', priority: 'urgent', tags: ['#已更新'] },
        { id: 'new-incoming-3', title: '远程新任务 C', personaId: 'security', priority: 'high', tags: [] }
      ]
    });

    const mergeResult = app.importJSON(incomingBackup, 'merge');
    expect(mergeResult.success).toBe(true);
    expect(app.getTasks()).toHaveLength(3);

    const mergedColl = app.getTask('coll-task-1');
    expect(mergedColl.title).toBe('已同步更新标题 A');
    expect(mergedColl.priority).toBe('urgent');

    const localTask = app.getTask('local-task-2');
    expect(localTask.title).toBe('本地独有任务');

    const newRemote = app.getTask('new-incoming-3');
    expect(newRemote.title).toBe('远程新任务 C');
  });

  it('T3-PAIR-07: should retain pinned emergency security task at top across persona filters', () => {
    // Add regular tasks
    app.addTask({ personaId: 'exam', title: '英语阅读精读' });
    app.addTask({ personaId: 'art', title: '商插草稿绘制' });
    app.addTask({ personaId: 'security', title: '日常巡更 14:00' });

    // Emergency security incident
    const emergency = app.addTask({
      personaId: 'security',
      title: '🚨 紧急: 园区西大门道闸起火',
      personaData: { isEmergency: true }
    });

    // In global view: emergency task must be at index 0
    const globalTasks = app.getTasks();
    expect(globalTasks[0].id).toBe(emergency.id);
    expect(globalTasks[0].isPinned).toBe(true);

    // In security persona filter: emergency task must be at index 0
    const securityTasks = app.getTasks({ personaId: 'security' });
    expect(securityTasks[0].id).toBe(emergency.id);
    expect(securityTasks[0].isPinned).toBe(true);
  });

  it('T3-PAIR-08: should record particle bursts and haptics accurately across rapid subtask completions', () => {
    const task = app.addTask({
      title: '多步骤安全点检',
      subtasks: [
        { id: 's1', title: '步骤 1' },
        { id: 's2', title: '步骤 2' },
        { id: 's3', title: '步骤 3' }
      ]
    });

    app.toggleSubtask(task.id, 's1');
    app.toggleSubtask(task.id, 's2');
    app.toggleSubtask(task.id, 's3');

    const progress = app.getSubtaskProgress(task.id);
    expect(progress.completed).toBe(3);
    expect(progress.percentText).toBe('100%');

    // Complete whole task
    app.toggleTask(task.id);
    expect(app.confettiBursts.length).toBe(1);
    expect(app.confettiBursts[0].taskId).toBe(task.id);
  });
});
