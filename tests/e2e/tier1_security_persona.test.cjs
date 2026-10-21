/**
 * Tier 1 Test Suite: 安保文员 (Security Clerk) Persona Feature Coverage
 * Covers: 3-shift handover lifecycle, cross-midnight shifts, patrol checklists, visitor logs, emergency pinning.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 1: Security Persona - Feature Coverage', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
    app.setActivePersona('security');
  });

  it('T1-SEC-01: should manage morning, afternoon, and night shift handover cycles with duty officers', () => {
    const shiftTask = app.addTask({
      personaId: 'security',
      title: '2026-10-08 早班值班与交接管理',
      personaData: {
        shiftType: 'morning',
        dutyPersonnel: '张队长',
        relievingPersonnel: '李副队',
        handoverStatus: 'in_progress',
        notes: '对讲机3部电量充足，钥匙箱齐备'
      }
    });

    const recorded = app.recordSecurityShiftHandover(shiftTask.id, {
      shiftType: 'morning',
      dutyPersonnel: '张队长',
      relievingPersonnel: '李副队',
      handoverStatus: 'completed',
      notes: '对讲机3部电量充足，钥匙箱齐备，监控室交接完毕'
    });

    expect(recorded.handoverStatus).toBe('completed');
    expect(recorded.dutyPersonnel).toBe('张队长');
    expect(recorded.relievingPersonnel).toBe('李副队');
  });

  it('T1-SEC-02: should correctly record cross-midnight night shift without duplicate shift splits', () => {
    const nightShiftTask = app.addTask({
      personaId: 'security',
      title: '2026-10-08 夜班值班记录 (23:00 - 次日 07:00)',
      personaData: {
        shiftType: 'night',
        dutyPersonnel: '王班长',
        handoverStatus: 'in_progress',
        notes: '夜间重点监控地库与后门'
      }
    });

    expect(nightShiftTask.personaData.shiftType).toBe('night');
    expect(nightShiftTask.title).toContain('23:00 - 次日 07:00');

    // Archive shift
    const updated = app.updateTask(nightShiftTask.id, {
      personaData: {
        handoverStatus: 'completed',
        relievingPersonnel: '赵班长'
      }
    });
    expect(updated.personaData.handoverStatus).toBe('completed');
  });

  it('T1-SEC-03: should track patrol checklists across equipment, fire safety, and access control', () => {
    const patrolTask = app.addTask({
      personaId: 'security',
      title: '园区每日消防与设备安全巡查',
      subtasks: [
        { id: 'p1', title: '[设备] 监控大屏无黑屏与电梯五方通话正常', isCompleted: false },
        { id: 'p2', title: '[消防] 灭火器压力指针绿区与常闭防火门闭锁', isCompleted: false },
        { id: 'p3', title: '[门禁] 车辆道闸起落正常与行人闸机通畅', isCompleted: false }
      ]
    });

    expect(patrolTask.subtasks).toHaveLength(3);

    // Toggle equipment and fire safety
    app.toggleSubtask(patrolTask.id, patrolTask.subtasks[0].id);
    app.toggleSubtask(patrolTask.id, patrolTask.subtasks[1].id);

    const progress = app.getSubtaskProgress(patrolTask.id);
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(3);
    expect(progress.percentText).toBe('67%');
  });

  it('T1-SEC-04: should register visitor, vehicle plate, and track on-site to departed status', () => {
    const visitorTask = app.addTask({
      personaId: 'security',
      title: '访客与车辆登记流水',
      personaData: {
        shiftType: 'morning',
        dutyPersonnel: '张队长'
      }
    });

    // Register incoming visitor
    const entry = app.logSecurityVisitor(visitorTask.id, {
      visitorName: '陈先生',
      phone: '13800138000',
      purpose: 'B座网络机房维保',
      plateNumber: '粤B12345',
      itemDesc: '维保工具箱一组',
      inTime: '2026-10-08T09:15:00Z',
      status: 'on_site'
    });

    expect(entry.visitorName).toBe('陈先生');
    expect(entry.plateNumber).toBe('粤B12345');
    expect(entry.status).toBe('on_site');

    // Register exit
    const departure = app.logSecurityVisitor(visitorTask.id, {
      ...entry,
      outTime: '2026-10-08T11:45:00Z',
      status: 'departed'
    });

    expect(departure.status).toBe('departed');
    expect(departure.outTime).toBe('2026-10-08T11:45:00Z');
  });

  it('T1-SEC-05: should instantly top-pin emergency incidents with urgent priority override', () => {
    // Add regular routine tasks
    app.addTask({ personaId: 'security', title: '日常巡更签到 09:00', priority: 'low' });
    app.addTask({ personaId: 'security', title: '地库车辆巡查 10:00', priority: 'medium' });

    // Add sudden emergency incident
    const emergencyTask = app.addTask({
      personaId: 'security',
      title: '🚨 突发: B座2楼消防喷淋水压异常报警',
      personaData: {
        isEmergency: true,
        dutyPersonnel: '张队长'
      }
    });

    expect(emergencyTask.isPinned).toBe(true);
    expect(emergencyTask.priority).toBe('urgent');

    // Verify task list ordering: pinned emergency task must be at index 0
    const allTasks = app.getTasks({ personaId: 'security' });
    expect(allTasks[0].id).toBe(emergencyTask.id);
    expect(allTasks[0].isPinned).toBe(true);
  });

  it('T1-SEC-06: should resolve emergency incident and convert to closed event log', () => {
    const emergencyTask = app.addTask({
      personaId: 'security',
      title: '🚨 门禁突发断电脱扣',
      personaData: {
        isEmergency: true,
        dutyPersonnel: '张队长'
      }
    });

    // Mark resolved
    const resolvedTask = app.toggleTask(emergencyTask.id);
    expect(resolvedTask.isCompleted).toBe(true);
    expect(resolvedTask.completedAt).toBeDefined();
    expect(app.confettiBursts.length).toBe(1);
  });
});
