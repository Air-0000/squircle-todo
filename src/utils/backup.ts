/**
 * Backup, Export, Restore & Reset Engine for Android Squircle To-Do
 * Conforms to RFC 4180 CSV specifications and full versioned JSON backup format.
 */

import { TodoItem, BackupPayload } from '../types';
import { normalizeTaskV2, CURRENT_SCHEMA_VERSION } from './migration';
import { nativeBridge } from './bridge';

export interface BackupThemeState {
  theme: string;
  autoSwitch: boolean;
  toneLock: 'warm' | 'cool' | 'auto';
}

export interface ImportResult {
  success: boolean;
  count: number;        // Newly added tasks in merge mode; total tasks in overwrite mode
  total: number;        // Total tasks present in database after import
  mode: 'merge' | 'overwrite';
  updatedCount?: number;// Updated existing tasks in merge mode
  themeState?: any;
}

export interface ExportOptions {
  pretty?: boolean;
  shareBridge?: boolean;
  fileName?: string;
}

const DEFAULT_JSON_FILENAME = 'squircle_todo_backup.json';
const DEFAULT_CSV_FILENAME = 'squircle_todo_export.csv';
const APP_IDENTIFIER = 'SquircleTodo';

/**
 * Escapes a single CSV field conforming to RFC 4180:
 * If the field contains comma, double-quote, or newline (\r or \n),
 * wrap it in double quotes and escape internal double quotes as ""
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates RFC 4180 compliant CSV string with UTF-8 BOM prefix (\uFEFF)
 * for seamless compatibility with Microsoft Excel and WPS Office on Android/PC.
 */
export function exportTasksToCSV(
  tasks: TodoItem[],
  options: ExportOptions = {}
): string {
  const { shareBridge = true, fileName = DEFAULT_CSV_FILENAME } = options;
  const UTF8_BOM = '\uFEFF';

  // Standard 10-column header defined in test specifications
  const headers = [
    'ID',
    'Persona',
    'Title',
    'Priority',
    'IsCompleted',
    'DueDate',
    'Tags',
    'CreatedAt',
    'CompletedAt',
    'Notes'
  ];

  const rows = tasks.map(task => {
    const persona = (task as any).personaId || (task as any).persona || 'general';

    const isCompleted = (task as any).isCompleted !== undefined
      ? Boolean((task as any).isCompleted)
      : Boolean(task.completed);

    const tags = Array.isArray(task.tags) ? task.tags.join(';') : '';

    const notes = (task as any).description !== undefined
      ? (task as any).description
      : (task.notes || '');

    const completedAt = (task as any).completedAt || (isCompleted ? task.updatedAt || '' : '');

    const fields = [
      task.id || '',
      persona,
      task.title || '',
      task.priority || 'medium',
      isCompleted ? 'true' : 'false',
      task.dueDate || '',
      tags,
      task.createdAt || '',
      completedAt,
      notes
    ];

    return fields.map(escapeCsvField).join(',');
  });

  // RFC 4180 requires CRLF (\r\n) line terminators
  const csvContent = UTF8_BOM + [headers.join(','), ...rows].join('\r\n');

  if (shareBridge) {
    nativeBridge.shareBackupFile(fileName, 'text/csv', csvContent);
  }

  return csvContent;
}

export const createRFC4180CSV = exportTasksToCSV;

/**
 * Exports full database snapshot to versioned JSON.
 */
export function exportTasksToJSON(
  tasks: TodoItem[],
  themeState?: any,
  options: ExportOptions = {}
): string {
  const {
    pretty = true,
    shareBridge = true,
    fileName = DEFAULT_JSON_FILENAME
  } = options;

  const backup: BackupPayload = {
    app: APP_IDENTIFIER,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    themeState,
    tasks
  };

  const jsonStr = pretty ? JSON.stringify(backup, null, 2) : JSON.stringify(backup);

  if (shareBridge) {
    nativeBridge.shareBackupFile(fileName, 'application/json', jsonStr);
  }

  return jsonStr;
}

export const createJSONBackup = exportTasksToJSON;

/**
 * Validates and parses raw JSON string into BackupPayload.
 * Throws explicit errors on malformed syntax or invalid schema.
 * Leaves caller state completely untouched on failure.
 */
export function validateAndParseBackupJSON(jsonString: string): BackupPayload {
  if (!jsonString || typeof jsonString !== 'string' || jsonString.trim() === '') {
    throw new Error('Invalid JSON string');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Invalid JSON syntax: Malformed backup file');
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
    throw new Error('Invalid backup schema: Missing tasks array');
  }

  return parsed as BackupPayload;
}

/**
 * Imports tasks from JSON backup string with collision resolution.
 * Supports 'overwrite' (full replacement) and 'merge' (deduplicate / update existing).
 */
export function importTasksFromJSON(
  existingTasks: TodoItem[],
  jsonString: string,
  mode: 'merge' | 'overwrite' = 'merge'
): { tasks: TodoItem[]; result: ImportResult } {
  // Validate first — guaranteed atomic safety (no mutation if invalid)
  const parsed = validateAndParseBackupJSON(jsonString);

  // Normalize legacy v1 tasks
  const incomingTasks = parsed.tasks.map((t: any) => normalizeTaskV2(t));

  if (mode === 'overwrite') {
    const newTasks = [...incomingTasks];
    return {
      tasks: newTasks,
      result: {
        success: true,
        count: newTasks.length,
        total: newTasks.length,
        mode: 'overwrite',
        themeState: parsed.themeState
      }
    };
  }

  // 'merge' mode: update existing by ID, append new ones
  const merged = [...existingTasks];
  let importedCount = 0;
  let updatedCount = 0;

  for (const incoming of incomingTasks) {
    const existingIndex = merged.findIndex(t => t.id === incoming.id);
    if (existingIndex !== -1) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...incoming
      };
      updatedCount++;
    } else {
      merged.push(incoming);
      importedCount++;
    }
  }

  return {
    tasks: merged,
    result: {
      success: true,
      count: importedCount,
      updatedCount,
      total: merged.length,
      mode: 'merge',
      themeState: parsed.themeState
    }
  };
}

/**
 * Alternative function signature compatibility helper for restoreJSONBackup.
 */
export function restoreJSONBackup(
  jsonString: string,
  existingTasks: TodoItem[],
  mode: 'merge' | 'overwrite' = 'merge'
): { success: boolean; count: number; total: number; tasks: TodoItem[]; themeState?: any; updatedCount?: number } {
  const { tasks, result } = importTasksFromJSON(existingTasks, jsonString, mode);
  return {
    success: result.success,
    count: result.count,
    total: result.total,
    tasks,
    themeState: result.themeState,
    updatedCount: result.updatedCount
  };
}

/**
 * Returns default preset seed tasks for the 3 persona workflows.
 */
export function getDefaultSeedTasks(): TodoItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-exam-1',
      title: '考研数学：线性代数特征值与二次型专项复习',
      description: '复习特征方程与相似对角化大题',
      notes: '复习特征方程与相似对角化大题',
      completed: false,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      priority: 'urgent',
      persona: 'exam',
      personaId: 'exam',
      tags: ['#考研', '#数学', '#艾宾浩斯'],
      isPinned: true,
      checklists: [
        { id: 'sub-ex-1', text: '特征方程与特征向量基础解系求解', title: '特征方程与特征向量基础解系求解', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-ex-2', text: '实对称矩阵正交相似对角化大题突破', title: '实对称矩阵正交相似对角化大题突破', completed: false, isCompleted: false, order: 1 }
      ],
      subtasks: [
        { id: 'sub-ex-1', text: '特征方程与特征向量基础解系求解', title: '特征方程与特征向量基础解系求解', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-ex-2', text: '实对称矩阵正交相似对角化大题突破', title: '实对称矩阵正交相似对角化大题突破', completed: false, isCompleted: false, order: 1 }
      ],
      examData: {
        subject: 'math',
        chapter: '线性代数第5章',
        questionType: '解答综合题',
        ebbinghaus: {
          round: 3,
          nextDue: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          history: [now]
        },
        timerSeconds: 1500
      },
      personaData: {
        subject: 'math',
        focusTimeTotalMinutes: 75,
        pomodoroCount: 3
      }
    },
    {
      id: 'seed-art-1',
      title: '商业插画：角色线稿终版确认与铺色底色',
      description: '完成立绘精细线稿闭合与分层底色平铺',
      notes: '完成立绘精细线稿闭合与分层底色平铺',
      completed: false,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      priority: 'high',
      persona: 'art',
      personaId: 'art',
      tags: ['#商业约稿', '#角色立绘', '#铺色'],
      isPinned: false,
      checklists: [
        { id: 'sub-art-1', text: '精细线稿闭合检查', title: '精细线稿闭合检查', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-art-2', text: '固有色平铺与分层上色', title: '固有色平铺与分层上色', completed: false, isCompleted: false, order: 1 }
      ],
      subtasks: [
        { id: 'sub-art-1', text: '精细线稿闭合检查', title: '精细线稿闭合检查', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-art-2', text: '固有色平铺与分层上色', title: '固有色平铺与分层上色', completed: false, isCompleted: false, order: 1 }
      ],
      artData: {
        stage: 'flat_color',
        canvasWidth: 3840,
        canvasHeight: 2160,
        dpi: 300,
        colorProfile: 'RGB',
        colorSpace: 'RGB',
        estimatedHours: 12,
        actualHours: 8.5,
        inspirationTags: ['赛博朋克', '霓虹光影']
      },
      personaData: {
        pipelineMilestone: 'flat_color',
        milestonesCompleted: ['planning', 'draft', 'lineart', 'flat_color'],
        canvasWidth: 3840,
        canvasHeight: 2160,
        dpi: 300,
        colorSpace: 'RGB',
        estimatedHours: 12,
        actualHours: 8.5
      }
    },
    {
      id: 'seed-sec-1',
      title: '夜班巡查：消控中心监控主机运行状态巡检',
      description: '消控主机与灭火设施压力定期检查',
      notes: '消控主机与灭火设施压力定期检查',
      completed: true,
      isCompleted: true,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
      priority: 'medium',
      persona: 'security',
      personaId: 'security',
      periodType: 'daily',
      category: 'daily',
      frequency: 'daily',
      frequencyDetail: '每日刷新',
      tags: ['#安保巡检', '#消控设施', '#夜班', '日常'],
      isPinned: false,
      checklists: [
        { id: 'sub-sec-1', text: '消火栓管网水压表检查 (≥0.14MPa)', title: '消火栓管网水压表检查 (≥0.14MPa)', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-sec-2', text: '防火门与防排烟风机电源指示正常', title: '防火门与防排烟风机电源指示正常', completed: true, isCompleted: true, order: 1 }
      ],
      subtasks: [
        { id: 'sub-sec-1', text: '消火栓管网水压表检查 (≥0.14MPa)', title: '消火栓管网水压表检查 (≥0.14MPa)', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-sec-2', text: '防火门与防排烟风机电源指示正常', title: '防火门与防排烟风机电源指示正常', completed: true, isCompleted: true, order: 1 }
      ],
      securityData: {
        shift: 'night',
        shiftType: 'night',
        dutyPersonnel: '张主管',
        patrolItems: [],
        visitorLogs: [],
        isEmergency: false
      },
      personaData: {
        shiftType: 'night',
        dutyPersonnel: '张主管',
        handoverStatus: 'completed',
        isEmergency: false
      }
    },
    {
      id: 'seed-emer-1',
      title: '🚨 突发排查：3号楼地下配电房温感烟感触发预警',
      description: '消控中心主机显示异常回路，立即携带巡检仪前往现场核对处置',
      notes: '消控中心主机显示异常回路，立即携带巡检仪前往现场核对处置',
      completed: false,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      priority: 'urgent',
      persona: 'security',
      personaId: 'security',
      periodType: 'emergency',
      category: 'emergency',
      isEmergency: true,
      emergencyLevel: 'urgent',
      isPinned: true,
      tags: ['突发事件', '重要紧急', '消控处置'],
      subtasks: [
        { id: 'sub-emer-1', text: '携带巡检仪赶往3号楼配电房现场', title: '携带巡检仪赶往3号楼配电房现场', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-emer-2', text: '温感烟感探头回路红外热成像测温', title: '温感烟感探头回路红外热成像测温', completed: false, isCompleted: false, order: 1 },
        { id: 'sub-emer-3', text: '确认异常回路状态并排除火情隐患', title: '确认异常回路状态并排除火情隐患', completed: false, isCompleted: false, order: 2 },
        { id: 'sub-emer-4', text: '消控主机警报复位并登记交接台账', title: '消控主机警报复位并登记交接台账', completed: false, isCompleted: false, order: 3 },
      ],
      checklists: [
        { id: 'sub-emer-1', text: '携带巡检仪赶往3号楼配电房现场', title: '携带巡检仪赶往3号楼配电房现场', completed: true, isCompleted: true, order: 0 },
        { id: 'sub-emer-2', text: '温感烟感探头回路红外热成像测温', title: '温感烟感探头回路红外热成像测温', completed: false, isCompleted: false, order: 1 },
        { id: 'sub-emer-3', text: '确认异常回路状态并排除火情隐患', title: '确认异常回路状态并排除火情隐患', completed: false, isCompleted: false, order: 2 },
        { id: 'sub-emer-4', text: '消控主机警报复位并登记交接台账', title: '消控主机警报复位并登记交接台账', completed: false, isCompleted: false, order: 3 },
      ],
    },

    {
      id: 'seed-piecewise-1',
      title: '📐 分段进阶：专业课核心考点与真题递进打卡',
      description: '分段周期推进：基础适应(7d) → 强化攻坚(14d) → 全真冲刺(9d)',
      notes: '分段周期推进：基础适应(7d) → 强化攻坚(14d) → 全真冲刺(9d)',
      completed: false,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      priority: 'high',
      persona: 'exam',
      personaId: 'exam',
      periodType: 'daily',
      category: 'daily',
      frequency: 'piecewise',
      frequencyDetail: '分段函数变化',
      isPiecewise: true,
      piecewiseConfig: {
        enabled: true,
        templateType: 'exam_stages',
        baseDate: new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10),
        totalDays: 30,
        stages: [
          {
            id: 'st-seed-1',
            stageIndex: 1,
            stageName: '第一阶段：基础适应期',
            startDay: 1,
            endDay: 7,
            frequency: 'daily',
            frequencyText: '每日1次',
            targetNote: '背诵核心高频考点50个 + 基础知识框架梳理',
            formula: 'f(t) = 1次/日, t∈[1,7]',
          },
          {
            id: 'st-seed-2',
            stageIndex: 2,
            stageName: '第二阶段：强化攻坚期',
            startDay: 8,
            endDay: 21,
            frequency: 'daily',
            frequencyText: '每日2次',
            targetNote: '真题综合大题精练 + 错题闭环归纳',
            formula: 'f(t) = 2次/日, t∈[8,21]',
          },
          {
            id: 'st-seed-3',
            stageIndex: 3,
            stageName: '第三阶段：全真冲刺期',
            startDay: 22,
            endDay: 30,
            frequency: 'daily',
            frequencyText: '每日3次',
            targetNote: '全真模拟排查 + 核心知识点限时默写',
            formula: 'f(t) = 3次/日, t∈[22,30]',
          },
        ],
      },
      tags: ['分段周期', '考研', 'f(t)进阶'],
    },
    {
      id: 'seed-tpl-onboarding',
      title: '【预设】员工入职流程',
      description: '新员工入职标准化SOP指引，包含信息填报、饭卡、异动及住宿',
      notes: '新员工入职标准化SOP指引，包含信息填报、饭卡、异动及住宿',
      completed: false,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      priority: 'medium',
      persona: 'security',
      personaId: 'security',
      isTemplate: true,
      category: 'template',
      tags: ['预设事项', '文件参考', '人事行政'],
      subtasks: [
        { id: 'sub-onboard-1', text: '入职信息填报', title: '入职信息填报', completed: false, isCompleted: false, order: 0 },
        { id: 'sub-onboard-2', text: '饭卡更新', title: '饭卡更新', completed: false, isCompleted: false, order: 1 },
        { id: 'sub-onboard-3', text: '添利总人员异动信息', title: '添利总人员异动信息', completed: false, isCompleted: false, order: 2 },
        { id: 'sub-onboard-4', text: '住宿信息', title: '住宿信息', completed: false, isCompleted: false, order: 3 },
      ],
      checklists: [
        { id: 'sub-onboard-1', text: '入职信息填报', title: '入职信息填报', completed: false, isCompleted: false, order: 0 },
        { id: 'sub-onboard-2', text: '饭卡更新', title: '饭卡更新', completed: false, isCompleted: false, order: 1 },
        { id: 'sub-onboard-3', text: '添利总人员异动信息', title: '添利总人员异动信息', completed: false, isCompleted: false, order: 2 },
        { id: 'sub-onboard-4', text: '住宿信息', title: '住宿信息', completed: false, isCompleted: false, order: 3 },
      ],
    },
    {
      id: 'seed-tpl-fire-alarm',
      title: '【预设】消控中心主机火警预警排查',
      description: '消控主机报警即刻应急处置流程，核对回路、现场查证与复位台账',
      notes: '消控主机报警即刻应急处置流程，核对回路、现场查证与复位台账',
      completed: false,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      priority: 'urgent',
      persona: 'security',
      personaId: 'security',
      isTemplate: true,
      category: 'template',
      tags: ['预设事项', '应急预案', '消控处置'],
      subtasks: [
        { id: 'sub-fire-1', text: '消控主机核对异常报警回路编号与点位', title: '消控主机核对异常报警回路编号与点位', completed: false, isCompleted: false, order: 0 },
        { id: 'sub-fire-2', text: '携带手持巡检仪与对讲机前往现场排查', title: '携带手持巡检仪与对讲机前往现场排查', completed: false, isCompleted: false, order: 1 },
        { id: 'sub-fire-3', text: '排查现场是否误报并复位消控主机', title: '排查现场是否误报并复位消控主机', completed: false, isCompleted: false, order: 2 },
        { id: 'sub-fire-4', text: '登记消控中心火警处置工作台账', title: '登记消控中心火警处置工作台账', completed: false, isCompleted: false, order: 3 },
      ],
      checklists: [
        { id: 'sub-fire-1', text: '消控主机核对异常报警回路编号与点位', title: '消控主机核对异常报警回路编号与点位', completed: false, isCompleted: false, order: 0 },
        { id: 'sub-fire-2', text: '携带手持巡检仪与对讲机前往现场排查', title: '携带手持巡检仪与对讲机前往现场排查', completed: false, isCompleted: false, order: 1 },
        { id: 'sub-fire-3', text: '排查现场是否误报并复位消控主机', title: '排查现场是否误报并复位消控主机', completed: false, isCompleted: false, order: 2 },
        { id: 'sub-fire-4', text: '登记消控中心火警处置工作台账', title: '登记消控中心火警处置工作台账', completed: false, isCompleted: false, order: 3 },
      ],
    }
  ];

}

/**
 * Factory reset helper: wipes state and optionally seeds preset tasks.
 */
export function performDataReset(options: { seedDefaults?: boolean } = {}): {
  tasks: TodoItem[];
  themeState: BackupThemeState;
} {
  const { seedDefaults = true } = options;
  return {
    tasks: seedDefaults ? getDefaultSeedTasks() : [],
    themeState: {
      theme: 'warm-morning',
      autoSwitch: true,
      toneLock: 'warm'
    }
  };
}
