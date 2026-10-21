import { create } from 'zustand';
import { nativeBridge } from '../utils/bridge';
import { toast } from './useToastStore';

export type PanelModuleType = 
  | 'countdown'       // 目标倒计时模块
  | 'pomodoro'        // 极简专注/番茄钟模块
  | 'ebbinghaus'      // 艾宾浩斯智能复习模块
  | 'pipeline'        // 多阶段推进流水线模块
  | 'emergency'       // 突发紧急事件响应模块
  | 'cycles'          // 周期自适应打卡模块 (每日/每周/每月)
  | 'specs'           // 规格参数与属性模块
  | 'calendar'        // 月度日历视图模块
  | 'tasklist';       // 分类待办任务列表模块

export interface PanelModuleMeta {
  type: PanelModuleType;
  name: string;
  description: string;
  icon: string;
  category: 'efficiency' | 'planning' | 'routine';
}

export const AVAILABLE_MODULES: PanelModuleMeta[] = [
  {
    type: 'countdown',
    name: '目标倒计时',
    description: '设定重大考试、项目截止日或里程碑，实时展示天数倒计时',
    icon: 'Clock',
    category: 'planning',
  },
  {
    type: 'pomodoro',
    name: '专注时钟与番茄钟',
    description: '25分钟番茄专注与正向秒表计时，累计今日与历史专注时长',
    icon: 'Timer',
    category: 'efficiency',
  },
  {
    type: 'ebbinghaus',
    name: '艾宾浩斯复习曲线',
    description: '1/2/4/7/15天记忆遗忘规律智能排期，支持逾期预警与快速复习打卡',
    icon: 'BookOpen',
    category: 'efficiency',
  },
  {
    type: 'pipeline',
    name: '阶段推进流水线',
    description: '多阶段里程碑式进度推进（如需求/草图/线稿/终稿/交付），进度百分比可视化',
    icon: 'Layers',
    category: 'planning',
  },
  {
    type: 'emergency',
    name: '突发紧急事件响应',
    description: '重大突发与突发故障一键高亮置顶，支持快速录入与处置闭环销项',
    icon: 'AlertTriangle',
    category: 'routine',
  },
  {
    type: 'cycles',
    name: '周期打卡待办',
    description: '每日晨起、每周一、每月1日自动无感刷新重置打卡事项',
    icon: 'RotateCcw',
    category: 'routine',
  },
  {
    type: 'specs',
    name: '规格与属性参数',
    description: '技术参数、画布尺寸（A4/B5）、分辨率DPI、色彩模式等规范卡片',
    icon: 'Sliders',
    category: 'planning',
  },
  {
    type: 'calendar',
    name: '月度日历参考',
    description: '月度全局日程排期、历史打卡热点与选定日期纪事查看',
    icon: 'Calendar',
    category: 'planning',
  },
  {
    type: 'tasklist',
    name: '专属分类待办列表',
    description: '本面板专属待办事项清单，支持多级子任务、重要优先级与滑动操作',
    icon: 'ListChecks',
    category: 'routine',
  },
];

export interface CustomPanelConfig {
  id: string;               // 唯一标识 (如 'exam', 'art', 'custom-123')
  name: string;             // 面板名称 (如 '考研攻坚', '商业绘画', '我的学习')
  icon: string;             // 图标名称 (如 'GraduationCap', 'Palette', 'Briefcase', 'Target', 'FolderPlus')
  description: string;      // 描述说明
  templateId?: 'exam' | 'art' | 'work' | 'calendar' | 'blank';
  isBuiltInTemplate?: boolean;
  enabledModules: PanelModuleType[];
  createdAt: string;

  // 模块自定义参数
  countdownTitle?: string;
  countdownTargetDate?: string; // YYYY-MM-DD
  pipelineStages?: string[];
  specsFields?: { label: string; value: string }[];
  cycleTypes?: ('daily' | 'weekly' | 'monthly')[];
  subjectCategories?: string[];
}

export interface PanelTemplate {
  id: 'exam' | 'art' | 'work' | 'calendar' | 'blank';
  name: string;
  icon: string;
  tagline: string;
  description: string;
  defaultModules: PanelModuleType[];
  defaultConfig?: Partial<CustomPanelConfig>;
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
    }
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
    }
  },
  {
    id: 'work',
    name: '职场工作流模板',
    icon: 'Briefcase',
    tagline: '安保巡查、值班交接与敏捷日常工作流',
    description: '预置突发紧急事件响应置顶、每日/每周/每月周期重置与工作任务清单',
    defaultModules: ['emergency', 'cycles', 'tasklist'],
    defaultConfig: {
      cycleTypes: ['daily', 'weekly', 'monthly'],
    }
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
    defaultModules: ['tasklist'],
  }
];

const STORAGE_KEY = 'squircle_custom_panels_v2';

function loadStoredPanels(): CustomPanelConfig[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export interface PanelStoreState {
  panels: CustomPanelConfig[];
  isAddPanelModalOpen: boolean;
  isConfigureModalOpen: boolean;
  activeConfiguringPanelId: string | null;

  // Actions
  openAddPanelModal: () => void;
  closeAddPanelModal: () => void;
  openConfigureModal: (panelId: string) => void;
  closeConfigureModal: () => void;

  addPanelFromTemplate: (templateId: PanelTemplate['id'], customName?: string) => CustomPanelConfig;
  addCustomPanel: (config: Omit<CustomPanelConfig, 'id' | 'createdAt'>) => CustomPanelConfig;
  updatePanel: (id: string, updates: Partial<CustomPanelConfig>) => void;
  deletePanel: (id: string) => void;
  toggleModule: (panelId: string, moduleType: PanelModuleType) => void;
  reorderPanels: (panelIds: string[]) => void;
  getPanel: (id: string) => CustomPanelConfig | undefined;
}

export const usePanelStore = create<PanelStoreState>((set, get) => ({
  panels: loadStoredPanels(),
  isAddPanelModalOpen: false,
  isConfigureModalOpen: false,
  activeConfiguringPanelId: null,

  openAddPanelModal: () => {
    set({ isAddPanelModalOpen: true });
    nativeBridge.performHapticFeedback('light');
  },

  closeAddPanelModal: () => {
    set({ isAddPanelModalOpen: false });
  },

  openConfigureModal: (panelId: string) => {
    set({ isConfigureModalOpen: true, activeConfiguringPanelId: panelId });
    nativeBridge.performHapticFeedback('light');
  },

  closeConfigureModal: () => {
    set({ isConfigureModalOpen: false, activeConfiguringPanelId: null });
  },

  addPanelFromTemplate: (templateId, customName) => {
    const tmpl = PANEL_TEMPLATES.find(t => t.id === templateId) || PANEL_TEMPLATES[4];
    const newId = `${templateId}-${Date.now().toString(36)}`;
    
    const newPanel: CustomPanelConfig = {
      id: newId,
      name: customName?.trim() || tmpl.name.replace('模板', ''),
      icon: tmpl.icon,
      description: tmpl.description,
      templateId: tmpl.id,
      isBuiltInTemplate: true,
      enabledModules: [...tmpl.defaultModules],
      createdAt: new Date().toISOString(),
      ...(tmpl.defaultConfig || {})
    };

    const updated = [...get().panels, newPanel];
    set({ panels: updated, isAddPanelModalOpen: false });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    nativeBridge.performHapticFeedback('success');
    toast.success(`🎉 已成功创建「${newPanel.name}」面板！可在底栏与顶部直接切换`);
    return newPanel;
  },

  addCustomPanel: (config) => {
    const newId = `custom-${Date.now().toString(36)}`;
    const newPanel: CustomPanelConfig = {
      ...config,
      id: newId,
      createdAt: new Date().toISOString(),
      enabledModules: config.enabledModules.length > 0 ? config.enabledModules : ['tasklist']
    };

    const updated = [...get().panels, newPanel];
    set({ panels: updated, isAddPanelModalOpen: false });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    nativeBridge.performHapticFeedback('success');
    toast.success(`🎉 自定义面板「${newPanel.name}」已创建！`);
    return newPanel;
  },

  updatePanel: (id, updates) => {
    const updated = get().panels.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });

    set({ panels: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    toast.success('面板配置已更新');
  },

  deletePanel: (id) => {
    const target = get().panels.find(p => p.id === id);
    const updated = get().panels.filter(p => p.id !== id);
    set({ 
      panels: updated,
      isConfigureModalOpen: false,
      activeConfiguringPanelId: null
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    nativeBridge.performHapticFeedback('light');
    toast.info(`已移除「${target?.name || '面板'}」`);
  },

  toggleModule: (panelId, moduleType) => {
    const panel = get().panels.find(p => p.id === panelId);
    if (!panel) return;

    let updatedModules: PanelModuleType[];
    if (panel.enabledModules.includes(moduleType)) {
      if (panel.enabledModules.length <= 1) {
        toast.error('面板至少需保留一个功能模块');
        return;
      }
      updatedModules = panel.enabledModules.filter(m => m !== moduleType);
    } else {
      updatedModules = [...panel.enabledModules, moduleType];
    }

    const updated = get().panels.map(p => {
      if (p.id === panelId) {
        return { ...p, enabledModules: updatedModules };
      }
      return p;
    });

    set({ panels: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    const meta = AVAILABLE_MODULES.find(m => m.type === moduleType);
    const isNowEnabled = updatedModules.includes(moduleType);
    nativeBridge.performHapticFeedback('light');
    toast.info(`${isNowEnabled ? '已启用' : '已关闭'}「${meta?.name || moduleType}」模块`);
  },

  reorderPanels: (panelIds) => {
    const map = new Map(get().panels.map(p => [p.id, p]));
    const reordered: CustomPanelConfig[] = [];
    panelIds.forEach(id => {
      const p = map.get(id);
      if (p) {
        reordered.push(p);
        map.delete(id);
      }
    });
    map.forEach(p => reordered.push(p));

    set({ panels: reordered });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reordered));
    } catch {}
  },

  getPanel: (id) => {
    return get().panels.find(p => p.id === id);
  }
}));
