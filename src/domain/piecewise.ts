/**
 * Piecewise ("分段函数") schedules: a task whose required frequency changes
 * across consecutive day ranges, e.g. 1x/day for days 1–7, 2x/day for 8–21.
 */
import { daysBetween, parseDateKey } from './dates';

export type PiecewiseTemplateId = 'exam_stages' | 'ebbinghaus' | 'work_shift';

export interface PiecewiseStage {
  id: string;
  stageIndex: number;
  stageName: string;
  startDay: number; // 1-based, inclusive
  endDay: number;   // inclusive
  frequency: 'daily' | 'weekly' | 'custom';
  frequencyText: string;
  targetNote?: string;
  formula?: string;
}

export interface PiecewiseConfig {
  templateType?: PiecewiseTemplateId | 'custom';
  baseDate: string; // YYYY-MM-DD
  totalDays: number;
  stages: PiecewiseStage[];
}

export interface PiecewiseTemplate {
  id: PiecewiseTemplateId;
  name: string;
  desc: string;
  totalDays: number;
  stages: PiecewiseStage[];
}

export const PIECEWISE_TEMPLATES: PiecewiseTemplate[] = [
  {
    id: 'exam_stages',
    name: '三阶段备考强化曲线',
    desc: '基础适应(7天) → 强化突破(14天) → 冲刺模拟(9天)',
    totalDays: 30,
    stages: [
      { id: 'st-1', stageIndex: 1, stageName: '第一阶段：基础适应期', startDay: 1, endDay: 7, frequency: 'daily', frequencyText: '每日1次', targetNote: '背诵核心高频词50个 + 基础知识框架梳理', formula: 'f(t) = 1次/日, t∈[1,7]' },
      { id: 'st-2', stageIndex: 2, stageName: '第二阶段：强化攻坚期', startDay: 8, endDay: 21, frequency: 'daily', frequencyText: '每日2次', targetNote: '真题综合大题精练 + 错题闭环归纳', formula: 'f(t) = 2次/日, t∈[8,21]' },
      { id: 'st-3', stageIndex: 3, stageName: '第三阶段：全真冲刺期', startDay: 22, endDay: 30, frequency: 'daily', frequencyText: '每日3次', targetNote: '全真模拟模考 + 核心知识点限时默写', formula: 'f(t) = 3次/日, t∈[22,30]' },
    ],
  },
  {
    id: 'ebbinghaus',
    name: '艾宾浩斯复习衰减曲线',
    desc: '高频复盘(3天) → 隔日强化(4天) → 每周巩固(8天)',
    totalDays: 15,
    stages: [
      { id: 'st-eb-1', stageIndex: 1, stageName: '阶段一：即时记忆期', startDay: 1, endDay: 3, frequency: 'daily', frequencyText: '每日高频', targetNote: '新知识点初记与次日早间即时复述', formula: 'f(t) = 每日, t∈[1,3]' },
      { id: 'st-eb-2', stageIndex: 2, stageName: '阶段二：中期巩固期', startDay: 4, endDay: 7, frequency: 'daily', frequencyText: '每2天1次', targetNote: '第4天与第7天关键遗忘节点复习', formula: 'f(t) = 隔日, t∈[4,7]' },
      { id: 'st-eb-3', stageIndex: 3, stageName: '阶段三：长期永久记忆', startDay: 8, endDay: 15, frequency: 'weekly', frequencyText: '每周1次', targetNote: '第15天全局知识树抽测梳理', formula: 'f(t) = 每周, t∈[8,15]' },
    ],
  },
  {
    id: 'work_shift',
    name: '工作日/周末双段交替',
    desc: '工作日全面点检(周一至周五) → 周末轮班抽检',
    totalDays: 7,
    stages: [
      { id: 'st-ws-1', stageIndex: 1, stageName: '阶段一：工作日巡检', startDay: 1, endDay: 5, frequency: 'daily', frequencyText: '每日全面巡查', targetNote: '消控主机/消防门禁/出入人员全面点检', formula: 'f(t) = 每日1次, t∈[1,5]' },
      { id: 'st-ws-2', stageIndex: 2, stageName: '阶段二：周末轮值', startDay: 6, endDay: 7, frequency: 'weekly', frequencyText: '周末轮检1次', targetNote: '重点部位监控防范与交接班核对', formula: 'f(t) = 1次, t∈[6,7]' },
    ],
  },
];

export function createPiecewiseConfig(templateId: PiecewiseTemplateId, baseDate: string): PiecewiseConfig {
  const tpl = PIECEWISE_TEMPLATES.find(t => t.id === templateId) ?? PIECEWISE_TEMPLATES[0];
  return { templateType: tpl.id, baseDate, totalDays: tpl.totalDays, stages: tpl.stages };
}

export interface PiecewiseProgress {
  currentStage: PiecewiseStage | null;
  nextStage: PiecewiseStage | null;
  elapsedDays: number;      // 1-based day number since baseDate
  daysToNextStage: number;
  progressPercent: number;
}

export function evaluatePiecewise(config: PiecewiseConfig, now: Date = new Date()): PiecewiseProgress {
  const { stages } = config;
  if (stages.length === 0) {
    return { currentStage: null, nextStage: null, elapsedDays: 1, daysToNextStage: 0, progressPercent: 0 };
  }

  const elapsedDays = Math.max(1, daysBetween(parseDateKey(config.baseDate), now) + 1);
  const last = stages[stages.length - 1];

  let index = stages.findIndex(s => elapsedDays >= s.startDay && elapsedDays <= s.endDay);
  if (index === -1) index = elapsedDays > last.endDay ? stages.length - 1 : 0;

  const currentStage = stages[index];
  // Past the final stage there is nothing "next".
  const nextStage = elapsedDays > last.endDay ? null : stages[index + 1] ?? null;
  const totalDays = config.totalDays || last.endDay || 30;

  return {
    currentStage,
    nextStage,
    elapsedDays,
    daysToNextStage: Math.max(0, currentStage.endDay - elapsedDays + 1),
    progressPercent: Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))),
  };
}

/** Cycle a piecewise task's progress resets on: weekly during weekly stages, otherwise daily. */
export function piecewiseCyclePeriod(config: PiecewiseConfig, now: Date = new Date()): 'daily' | 'weekly' {
  return evaluatePiecewise(config, now).currentStage?.frequency === 'weekly' ? 'weekly' : 'daily';
}
