/**
 * Tier 4 Test Suite: 真实端到端业务场景测试 (Real-World Application Scenarios)
 * Covers:
 * 1. Full postgraduate exam prep day workflow (Morning to Night).
 * 2. Digital art commercial commission 7-stage workflow from brief to delivery and hours audit.
 * 3. 24-hour 3-shift security handover & emergency fire alarm incident response.
 * 4. Cross-device full database migration and theme preference persistence.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 4: Real-World Scenarios', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
  });

  it('T4-SCEN-01: Full Postgraduate Exam Prep Day (晨起倒计时 -> 艾宾浩斯复习 -> 番茄钟背单词 -> 180min真题模考 -> 晚间打卡归档)', () => {
    // 07:00 Morning: Candidate opens app
    app.env.mockDate('2026-10-08T07:00:00');
    app.setActivePersona('exam');
    expect(app.getEffectiveTheme().id).toBe('warm-morning');

    // Step 1: Check Target Exam Countdown (Exam on 2026-12-26)
    const countdown = app.calculateExamCountdown('2026-12-26T08:30:00');
    expect(countdown.isExpired).toBe(false);
    expect(countdown.daysRemaining).toBe(80);

    // Step 2: Review Ebbinghaus tasks due today
    const schedule = app.computeEbbinghausSchedule('2026-10-07T08:00:00'); // Learned yesterday
    const status = app.evaluateEbbinghausStatus('2026-10-08', schedule, 0);
    expect(status.status).toBe('due_today');
    expect(status.round).toBe(1);

    const politicsTask = app.addTask({
      personaId: 'exam',
      title: '政治 马原核心概念 第一轮复习',
      personaData: {
        subject: 'politics',
        ebbinghausTracking: true,
        ebbinghausRound: 1,
        focusTimeTotalMinutes: 0
      }
    });

    // Step 3: Morning 08:30 Study English Vocabulary using Pomodoro
    app.env.mockDate('2026-10-08T08:30:00');
    const englishTask = app.addTask({
      personaId: 'exam',
      title: '英语大纲词汇背诵 List 21-25',
      personaData: { subject: 'english', focusTimeTotalMinutes: 0, pomodoroCount: 0 }
    });

    // Complete two 25-minute Pomodoro sessions
    app.recordExamPomodoro(englishTask.id, 25);
    app.recordExamPomodoro(englishTask.id, 25);
    const completedEnglish = app.toggleTask(englishTask.id);
    expect(completedEnglish.isCompleted).toBe(true);
    expect(completedEnglish.personaData.focusTimeTotalMinutes).toBe(50);
    expect(completedEnglish.personaData.pomodoroCount).toBe(2);

    // Step 4: Afternoon 14:00 - 17:00 Mathematics 180-minute Full Mock Exam
    app.env.mockDate('2026-10-08T14:00:00');
    const mathMock = app.addTask({
      personaId: 'exam',
      title: '2023年 数学一 真题全真模拟考试',
      personaData: { subject: 'math', questionType: '全真模拟', focusTimeTotalMinutes: 0 }
    });

    // Stopwatch completes 180 mins
    app.recordExamPomodoro(mathMock.id, 180);
    const completedMath = app.toggleTask(mathMock.id);
    expect(completedMath.isCompleted).toBe(true);
    expect(completedMath.personaData.focusTimeTotalMinutes).toBe(180);

    // Step 5: Evening 21:00 Daily Audit & Checkoff
    app.env.mockDate('2026-10-08T21:00:00');
    expect(app.getEffectiveTheme().id).toBe('warm-evening');

    // Check off politics task
    app.toggleTask(politicsTask.id);

    // Verify day's completed tasks
    const completedToday = app.getTasks({ personaId: 'exam', isCompleted: true });
    expect(completedToday).toHaveLength(3);

    const totalMinutes = completedToday.reduce((sum, t) => sum + (t.personaData.focusTimeTotalMinutes || 0), 0);
    expect(totalMinutes).toBe(230); // 50m english + 180m math

    app.env.restoreDate();
  });

  it('T4-SCEN-02: Digital Art Commercial Commission 7-Stage Workflow (需求定稿 -> 画布设置 -> 7阶段推进 -> 工时核算 -> CSV账目导出)', () => {
    app.setActivePersona('art');

    // Step 1: Client project initialization with specs
    const commission = app.addTask({
      personaId: 'art',
      title: '游戏公司商业立绘: 机械剑士主视觉',
      tags: ['#商业约稿', '#赛博朋克', '#厚涂', '#加急加价'],
      personaData: {
        pipelineMilestone: 'planning',
        milestonesCompleted: ['planning'],
        canvasWidth: 3840,
        canvasHeight: 2160,
        dpi: 300,
        colorSpace: 'CMYK',
        software: 'Clip Studio Paint',
        estimatedHours: 20.0,
        actualHours: 0.0,
        inspirationTags: ['高对比冷光', '金属磨损材质', '动感构图']
      }
    });

    // Step 2: Milestone progression across 7 stages
    const stages = ['draft', 'lineart', 'flat_color', 'detail', 'post_process', 'delivery'];
    for (const stage of stages) {
      app.advanceArtStage(commission.id, stage);
    }

    const taskFinal = app.getTask(commission.id);
    expect(taskFinal.personaData.pipelineMilestone).toBe('delivery');
    expect(taskFinal.personaData.milestonesCompleted).toHaveLength(7);

    const progress = app.calculateArtStageProgress(taskFinal);
    expect(progress.percentage).toBe(100);
    expect(progress.isDelivered).toBe(true);

    // Step 3: Time logging and audit (23.5 actual hours vs 20.0 estimated hours)
    app.updateTask(commission.id, {
      personaData: { actualHours: 23.5 }
    });

    const hoursAudit = app.auditArtHours(taskFinal.personaData.estimatedHours, 23.5);
    expect(hoursAudit.isOvertime).toBe(true);
    expect(hoursAudit.delta).toBe(3.5);
    expect(hoursAudit.badgeText).toBe('+3.5h 超时');

    // Step 4: Mark commission completed & Export CSV for billing
    app.toggleTask(commission.id);
    const csvBilling = app.exportCSV();

    expect(csvBilling).toContain('游戏公司商业立绘: 机械剑士主视觉');
    expect(csvBilling).toContain('#商业约稿;#赛博朋克;#厚涂;#加急加价');
    expect(app.env.androidBridge.history.sharedFiles.length).toBeGreaterThan(0);
  });

  it('T4-SCEN-03: 24-Hour 3-Shift Security Handover & Emergency Fire Alarm Response (早班点检 -> 中班访客登记 -> 夜班跨日交接 -> 凌晨突发火警置顶处置)', () => {
    app.setActivePersona('security');

    // 07:00 Morning Shift: Patrol & Equipment Check
    app.env.mockDate('2026-10-08T07:00:00');
    const morningShift = app.addTask({
      personaId: 'security',
      title: '2026-10-08 早班安保日常工作',
      subtasks: [
        { id: 's1', title: '监控机房设备运行正常' },
        { id: 's2', title: '园区消防通道无遮挡' },
        { id: 's3', title: '东门/西门道闸起落正常' }
      ],
      personaData: { shiftType: 'morning', dutyPersonnel: '张队长', handoverStatus: 'in_progress' }
    });

    // Complete all patrol checklist items
    app.toggleSubtask(morningShift.id, 's1');
    app.toggleSubtask(morningShift.id, 's2');
    app.toggleSubtask(morningShift.id, 's3');
    expect(app.getSubtaskProgress(morningShift.id).percentText).toBe('100%');

    // 10:00 Morning: Visitor Entry Registration
    app.env.mockDate('2026-10-08T10:00:00');
    const visitorRecord = app.logSecurityVisitor(morningShift.id, {
      visitorName: '网络工程师刘工',
      phone: '13912345678',
      purpose: '核心交换机扩容',
      plateNumber: '京A88888',
      inTime: '2026-10-08T10:00:00'
    });
    expect(visitorRecord.status).toBe('on_site');

    // 15:00 Handover to Afternoon Shift
    app.env.mockDate('2026-10-08T15:00:00');
    app.recordSecurityShiftHandover(morningShift.id, {
      shiftType: 'morning',
      dutyPersonnel: '张队长',
      relievingPersonnel: '李队长',
      handoverStatus: 'completed',
      notes: '网络工程师刘工在机房作业中，车牌京A88888在场'
    });

    // 16:30 Afternoon: Visitor exits
    app.env.mockDate('2026-10-08T16:30:00');
    app.logSecurityVisitor(morningShift.id, {
      ...visitorRecord,
      outTime: '2026-10-08T16:30:00',
      status: 'departed'
    });

    // 23:00 Handover to Night Shift (Cross-midnight)
    app.env.mockDate('2026-10-08T23:00:00');
    const nightShift = app.addTask({
      personaId: 'security',
      title: '2026-10-08 夜班值守 (23:00 - 次日07:00)',
      personaData: { shiftType: 'night', dutyPersonnel: '王班长', handoverStatus: 'in_progress' }
    });

    // 02:30 AM Next Day: Sudden Emergency Fire Alarm
    app.env.mockDate('2026-10-09T02:30:00');
    const fireEmergency = app.addTask({
      personaId: 'security',
      title: '🚨 紧急: B座地库配电房温感烟雾突发报警',
      personaData: {
        isEmergency: true,
        dutyPersonnel: '王班长'
      }
    });

    // Must be pinned at index 0 with urgent priority
    const activeTasks = app.getTasks({ personaId: 'security' });
    expect(activeTasks[0].id).toBe(fireEmergency.id);
    expect(activeTasks[0].priority).toBe('urgent');
    expect(activeTasks[0].isPinned).toBe(true);

    // 03:00 AM: Security team resolves false alarm / handles situation
    app.env.mockDate('2026-10-09T03:00:00');
    const resolvedEmergency = app.toggleTask(fireEmergency.id);
    expect(resolvedEmergency.isCompleted).toBe(true);
    expect(resolvedEmergency.completedAt).toBeDefined();

    app.env.restoreDate();
  });

  it('T4-SCEN-04: Cross-Device Migration & Theme Preference Persistence (三角色多数据构建 -> 暗黑主题锁定 -> 全量备份 -> 抹盘重置 -> 完整恢复)', () => {
    // 1. Build diverse data across all 3 personas
    app.addTask({ personaId: 'exam', title: '考研政治考点清单', priority: 'high', tags: ['#政治'] });
    app.addTask({ personaId: 'art', title: '商业海报线稿阶段', priority: 'urgent', tags: ['#插画'] });
    app.addTask({ personaId: 'security', title: '门禁道闸月度维护', priority: 'medium', tags: ['#维保'] });

    // 2. Set theme to Cool Evening with Cool Tone Lock
    app.setToneLock('cool');
    app.setTheme('cool-evening');

    expect(app.getEffectiveTheme().id).toBe('cool-evening');
    expect(app.getEffectiveTheme().isDark).toBe(true);

    // 3. Export full JSON backup
    const backupJson = app.exportJSON();
    expect(backupJson).toContain('SquircleTodo');

    // 4. Simulate clean wipe on new device
    app.resetAllData();
    expect(app.getTasks()).toHaveLength(0);

    // 5. Restore full backup on new device
    const restoreResult = app.importJSON(backupJson, 'overwrite');
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.count).toBe(3);

    // 6. Verify full state recovery
    const restoredTasks = app.getTasks();
    expect(restoredTasks).toHaveLength(3);

    const exam = restoredTasks.find(t => t.personaId === 'exam');
    const art = restoredTasks.find(t => t.personaId === 'art');
    const sec = restoredTasks.find(t => t.personaId === 'security');

    expect(exam.title).toBe('考研政治考点清单');
    expect(art.title).toBe('商业海报线稿阶段');
    expect(sec.title).toBe('门禁道闸月度维护');

    // Verify theme state preserved
    expect(app.themeState.theme).toBe('cool-evening');
    expect(app.themeState.toneLock).toBe('cool');
  });
});
