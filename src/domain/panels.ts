/**
 * Custom panels ("面板"): user-created boards built from a template and a set
 * of feature modules. Tasks join a panel through `Task.panelId`.
 */
import type { CyclePeriod, TaskFlavor } from './task';

export type PanelModuleType =
  | 'countdown'
  | 'pomodoro'
  | 'ebbinghaus'
  | 'pipeline'
  | 'emergency'
  | 'cycles'
  | 'specs'
  | 'calendar'
  | 'tasklist';

export type PanelTemplateId = 'exam' | 'art' | 'work' | 'calendar' | 'blank';

/** Icon names resolved to components by `components/ui/icons.ts`. */
export type PanelIconName = 'GraduationCap' | 'Palette' | 'Briefcase' | 'Calendar' | 'FolderPlus';

export interface PanelModuleMeta {
  type: PanelModuleType;
  name: string;
  description: string;
  category: 'efficiency' | 'planning' | 'routine';
}

export const PANEL_MODULES: PanelModuleMeta[] = [
  { type: 'countdown', name: '目标倒计时', description: '设定重大考试、项目截止日或里程碑，实时展示天数倒计时', category: 'planning' },
  { type: 'pomodoro', name: '专注时钟与番茄钟', description: '25分钟番茄专注与正向秒表计时，累计今日与历史专注时长', category: 'efficiency' },
  { type: 'ebbinghaus', name: '艾宾浩斯复习曲线', description: '1/2/4/7/15天记忆遗忘规律智能排期，支持逾期预警与快速复习打卡', category: 'efficiency' },
  { type: 'pipeline', name: '阶段推进流水线', description: '多阶段里程碑式进度推进（如需求/草图/线稿/终稿/交付），进度百分比可视化', category: 'planning' },
  { type: 'emergency', name: '突发紧急事件响应', description: '重大突发与突发故障一键高亮置顶，支持快速录入与处置闭环销项', category: 'routine' },
  { type: 'cycles', name: '周期打卡待办', description: '每日晨起、每周一、每月1日自动无感刷新重置打卡事项', category: 'routine' },
  { type: 'specs', name: '规格与属性参数', description: '技术参数、画布尺寸（A4/B5）、分辨率DPI、色彩模式等规范卡片', category: 'planning' },
  { type: 'calendar', name: '月度日历参考', description: '月度全局日程排期、历史打卡热点与选定日期纪事查看', category: 'planning' },
  { type: 'tasklist', name: '专属分类待办列表', description: '本面板专属待办事项清单，支持多级子任务、重要优先级与滑动操作', category: 'routine' },
];

export interface SpecField {
  label: string;
  value: string;
}

export interface Panel {
  id: string;
  name: string;
  icon: PanelIconName;
  description: string;
  templateId: PanelTemplateId;
  enabledModules: PanelModuleType[];
  createdAt: string;

  // Module settings
  countdownTitle?: string;
  countdownTargetDate?: string; // YYYY-MM-DD
  pipelineStages?: string[];
  /** Index of the stage currently in progress (pipeline module). */
  pipelineCurrentStage?: number;
  specsFields?: SpecField[];
  cycleTypes?: CyclePeriod[];
  subjectCategories?: string[];
}

export interface PanelTemplate {
  id: PanelTemplateId;
  name: string;
  icon: PanelIconName;
  tagline: string;
  description: string;
  defaultModules: PanelModuleType[];
  defaultConfig?: Partial<Panel>;
}

export const PANEL_TEMPLATES: PanelTemplate[] = [
  {
    id: 'exam',
    name: '考研攻坚模板',
    icon: 'GraduationCap',
    tagline: '专为考研、公考、资格证打造的深度备考看板',
    description: '预置目标倒计时、艾宾浩斯智能复习排期、极简专注番茄钟与全科学科清单',
    defaultModules: ['countdown', 'pomodoro', 'ebbinghaus', 'tasklist'],
    defaultConfig: {
      countdownTitle: '2027 全国硕士研究生招生考试',
      countdownTargetDate: '2026-12-26',
      subjectCategories: ['数学 / 统考数学', '考研英语', '思想政治理论', '专业课一', '专业课二'],
    },
  },
  {
    id: 'art',
    name: '绘画创作模板',
    icon: 'Palette',
    tagline: '数字插画、商单约稿与美术创作流水线',
    description: '预置 7 阶段标准创作流水线、画布规格参数（A4/B5/DPI）与每日手绘练习',
    defaultModules: ['pipeline', 'specs', 'cycles', 'tasklist'],
    defaultConfig: {
      pipelineStages: ['需求定稿', '草图概念', '精细线稿', '底色铺设', '光影细化', '终稿验收', '文件交付'],
      specsFields: [
        { label: '常用画布', value: 'A4 (2480 × 3508 px)' },
        { label: '输出分辨率', value: '300 DPI' },
        { label: '色彩标准', value: 'RGB (sRGB IEC61966)' },
        { label: '工时预估', value: '单幅约 12 ~ 18 小时' },
      ],
      cycleTypes: ['daily'],
    },
  },
  {
    id: 'work',
    name: '职场工作流模板',
    icon: 'Briefcase',
    tagline: '安保巡查、值班交接与敏捷日常工作流',
    description: '预置突发紧急事件响应置顶、每日/每周/每月周期重置与工作任务清单',
    defaultModules: ['emergency', 'cycles', 'tasklist'],
    defaultConfig: { cycleTypes: ['daily', 'weekly', 'monthly'] },
  },
  {
    id: 'calendar',
    name: '日历参考模板',
    icon: 'Calendar',
    tagline: '月度全局视野与日程备忘纪事',
    description: '预置月度全景日历、选定日期任务索引与随手备忘录',
    defaultModules: ['calendar', 'tasklist'],
  },
  {
    id: 'blank',
    name: '自由定制空白面板',
    icon: 'FolderPlus',
    tagline: '自由搭配特定功能模块，随心定制',
    description: '从零开始，按需勾选倒计时、番茄钟、艾宾浩斯、流水线、突发事件等任意功能模块',
    defaultModules: ['tasklist', 'pomodoro'],
  },
];

export const TEMPLATE_LABELS: Record<PanelTemplateId, string> = {
  exam: '考研',
  art: '绘画',
  work: '工作',
  calendar: '日历',
  blank: '自定义',
};

export function getPanelTemplate(id: PanelTemplateId): PanelTemplate {
  return PANEL_TEMPLATES.find(t => t.id === id) ?? PANEL_TEMPLATES[PANEL_TEMPLATES.length - 1];
}

/** Task flavour that tasks created inside a panel of this template get. */
export function flavorForTemplate(id: PanelTemplateId): TaskFlavor {
  return id === 'exam' || id === 'art' || id === 'work' ? id : 'general';
}

export function createPanel(templateId: PanelTemplateId, name?: string, now: Date = new Date()): Panel {
  const tmpl = getPanelTemplate(templateId);
  const blank = templateId === 'blank';
  return {
    id: `${tmpl.id === 'blank' ? 'custom' : tmpl.id}-${now.getTime().toString(36)}`,
    name: name?.trim() || (blank ? '我的自定义看板' : tmpl.name.replace('模板', '')),
    icon: tmpl.icon,
    description: blank ? '完全由我定制的专属工作流模块' : tmpl.description,
    templateId: tmpl.id,
    enabledModules: [...tmpl.defaultModules],
    createdAt: now.toISOString(),
    ...tmpl.defaultConfig,
  };
}

const ICON_NAMES: PanelIconName[] = ['GraduationCap', 'Palette', 'Briefcase', 'Calendar', 'FolderPlus'];
const MODULE_TYPES = PANEL_MODULES.map(m => m.type);

/** Sanitizes panels read from storage or a backup file. */
export function normalizePanels(list: unknown): Panel[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p): p is Record<string, any> => typeof p === 'object' && p !== null && typeof p.id === 'string')
    .map(p => {
      const templateId: PanelTemplateId = PANEL_TEMPLATES.some(t => t.id === p.templateId) ? p.templateId : 'blank';
      const modules = Array.isArray(p.enabledModules)
        ? p.enabledModules.filter((m: unknown): m is PanelModuleType => MODULE_TYPES.includes(m as PanelModuleType))
        : [];
      return {
        ...p,
        name: typeof p.name === 'string' && p.name ? p.name : getPanelTemplate(templateId).name,
        icon: ICON_NAMES.includes(p.icon) ? p.icon : getPanelTemplate(templateId).icon,
        description: typeof p.description === 'string' ? p.description : '',
        templateId,
        enabledModules: modules.length > 0 ? modules : ['tasklist'],
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
      } as Panel;
    });
}
