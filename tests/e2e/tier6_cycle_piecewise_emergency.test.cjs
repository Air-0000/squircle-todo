/**
 * Tier 6 Test Suite: 周期自适应刷新、分段函数周期任务与突发事件
 * Covers: 固定周期属性、分段函数阶段推进、突发事件置顶与处置生命周期
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 6: Cycle Refresh, Piecewise Functions & Emergency Incidents', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
    app.setActivePersona('security');
  });

  it('T6-EMER-01: should register emergency incident with urgent priority override and top-pinning', () => {
    const emer = app.addTask({
      title: '🚨 突发事件：消控中心主机火警预警',
      personaId: 'security',
      personaData: {
        isEmergency: true,
        emergencyLevel: 'urgent'
      }
    });

    expect(emer.isPinned).toBe(true);
    expect(emer.priority).toBe('urgent');
    expect(emer.title).toContain('消控中心主机火警预警');
  });

  it('T6-EMER-02: should resolve emergency incident and convert to closed status', () => {
    const emer = app.addTask({
      title: '🚨 突发事件：3号门门禁断电异常',
      personaId: 'security',
      personaData: { isEmergency: true }
    });

    const updated = app.toggleTask(emer.id);
    expect(updated.isCompleted).toBe(true);
    expect(updated.completedAt).toBeDefined();
  });

  it('T6-PCW-01: should track piecewise schedule configuration correctly across custom fields', () => {
    const piecewiseTask = app.addTask({
      title: '📐 分段进阶备考打卡',
      personaId: 'exam',
      customFields: {
        isPiecewise: true,
        currentStage: '强化攻坚期',
        stageFrequency: '每日2次',
        formula: 'f(t)=2, t∈[8,21]'
      }
    });

    expect(piecewiseTask.title).toBe('📐 分段进阶备考打卡');
    expect(piecewiseTask.customFields.isPiecewise).toBe(true);
    expect(piecewiseTask.customFields.formula).toBe('f(t)=2, t∈[8,21]');
    expect(piecewiseTask.customFields.currentStage).toBe('强化攻坚期');
  });
});

