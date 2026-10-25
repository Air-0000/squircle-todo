/** Demo data for "恢复预置种子数据" in the backup sheet. */
import { addDays, periodKey, toDateKey } from './dates';
import { createPiecewiseConfig } from './piecewise';
import { createSubtask, createTask, setCompleted, type Task, type TaskDraft } from './task';

const checklist = (items: [string, boolean?][]) => items.map(([text, done]) => ({ ...createSubtask(text), completed: Boolean(done) }));

export function createSeedTasks(now: Date = new Date()): Task[] {
  const drafts: TaskDraft[] = [
    {
      title: '考研数学：线性代数特征值与二次型专项复习',
      description: '复习特征方程与相似对角化大题',
      priority: 'urgent',
      isPinned: true,
      flavor: 'exam',
      examSubject: 'math',
      reviewTracking: true,
      reviewDueDate: toDateKey(addDays(now, 1)),
      focusMinutes: 75,
      pomodoroCount: 3,
      tags: ['#考研', '#数学', '#艾宾浩斯'],
      subtasks: checklist([['特征方程与特征向量基础解系求解', true], ['实对称矩阵正交相似对角化大题突破']]),
    },
    {
      title: '商业插画：角色线稿终版确认与铺色底色',
      description: '完成立绘精细线稿闭合与分层底色平铺',
      priority: 'high',
      flavor: 'art',
      tags: ['#商业约稿', '#角色立绘', '#铺色'],
      subtasks: checklist([['精细线稿闭合检查', true], ['固有色平铺与分层上色']]),
    },
    {
      title: '夜班巡查：消控中心监控主机运行状态巡检',
      description: '消控主机与灭火设施压力定期检查',
      flavor: 'work',
      period: 'daily',
      frequency: 'daily',
      frequencyDetail: '每日刷新',
      tags: ['#安保巡检', '#消控设施', '#夜班', '日常'],
      subtasks: checklist([['消火栓管网水压表检查 (≥0.14MPa)', true], ['防火门与防排烟风机电源指示正常', true]]),
    },
    {
      title: '🚨 突发排查：3号楼地下配电房温感烟感触发预警',
      description: '消控中心主机显示异常回路，立即携带巡检仪前往现场核对处置',
      flavor: 'work',
      isEmergency: true,
      emergencyLevel: 'urgent',
      tags: ['突发事件', '重要紧急', '消控处置'],
      subtasks: checklist([
        ['携带巡检仪赶往3号楼配电房现场', true],
        ['温感烟感探头回路红外热成像测温'],
        ['确认异常回路状态并排除火情隐患'],
        ['消控主机警报复位并登记交接台账'],
      ]),
    },
    {
      title: '📐 分段进阶：专业课核心考点与真题递进打卡',
      description: '分段周期推进：基础适应(7d) → 强化攻坚(14d) → 全真冲刺(9d)',
      priority: 'high',
      flavor: 'exam',
      period: 'daily',
      frequency: 'piecewise',
      frequencyDetail: '分段函数变化',
      piecewise: createPiecewiseConfig('exam_stages', toDateKey(addDays(now, -9))),
      tags: ['分段周期', '考研', 'f(t)进阶'],
    },
    {
      title: '【预设】员工入职流程',
      description: '新员工入职标准化SOP指引，包含信息填报、饭卡、异动及住宿',
      flavor: 'work',
      isTemplate: true,
      tags: ['预设事项', '文件参考', '人事行政'],
      subtasks: checklist([['入职信息填报'], ['饭卡更新'], ['添利总人员异动信息'], ['住宿信息']]),
    },
    {
      title: '【预设】消控中心主机火警预警排查',
      description: '消控主机报警即刻应急处置流程，核对回路、现场查证与复位台账',
      priority: 'urgent',
      flavor: 'work',
      isTemplate: true,
      tags: ['预设事项', '应急预案', '消控处置'],
      subtasks: checklist([
        ['消控主机核对异常报警回路编号与点位'],
        ['携带手持巡检仪与对讲机前往现场排查'],
        ['排查现场是否误报并复位消控主机'],
        ['登记消控中心火警处置工作台账'],
      ]),
    },
  ];

  return drafts.map(draft => {
    const task = createTask(draft, now);
    // The patrol seed starts out already checked off for today.
    if (task.period && task.subtasks.length > 0 && task.subtasks.every(s => s.completed)) {
      return { ...setCompleted(task, true, now), lastCycleKey: periodKey(now, task.period) };
    }
    return task;
  });
}
