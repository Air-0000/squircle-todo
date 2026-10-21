import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  X, 
  Calendar, 
  Clock, 
  Repeat, 
  Check, 
  GraduationCap,
  Palette,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  BookTemplate,
  ListChecks,
  Sparkles
} from 'lucide-react';
import { SquircleButton } from '../common/SquircleButton';
import { useTaskStore } from '../../stores/useTaskStore';
import { PersonaType, PiecewiseStage, PiecewiseConfig, ChecklistItem } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { triggerConfetti } from '../common/ConfettiBurst';
import { toast } from '../../stores/useToastStore';
import { MainTabType } from '../layout/BottomTabBar';

interface SmartAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'exam' | 'art' | 'daily' | 'weekly' | 'monthly' | 'work' | 'emergency';
  onNavigateTab?: (tab: MainTabType) => void;
}

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: '每日 (日常)', detail: '每日刷新' },
  { id: 'weekly', label: '每周一次 (周常)', detail: '每周刷新' },
  { id: 'monthly', label: '每月一次 (月常)', detail: '每月刷新' },
  { id: 'once', label: '仅此一次', detail: '单次任务' },
  { id: 'custom', label: '自定义频次', detail: '自定义' },
];

const PIECEWISE_TEMPLATES: {
  id: 'exam_stages' | 'ebbinghaus' | 'work_shift';
  name: string;
  desc: string;
  totalDays: number;
  stages: PiecewiseStage[];
}[] = [
  {
    id: 'exam_stages',
    name: '三阶段备考强化曲线',
    desc: '基础适应(7天) → 强化突破(14天) → 冲刺模拟(9天)',
    totalDays: 30,
    stages: [
      {
        id: 'st-1',
        stageIndex: 1,
        stageName: '第一阶段：基础适应期',
        startDay: 1,
        endDay: 7,
        frequency: 'daily',
        frequencyText: '每日1次',
        targetNote: '背诵核心高频词50个 + 基础知识框架梳理',
        formula: 'f(t) = 1次/日, t∈[1,7]',
      },
      {
        id: 'st-2',
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
        id: 'st-3',
        stageIndex: 3,
        stageName: '第三阶段：全真冲刺期',
        startDay: 22,
        endDay: 30,
        frequency: 'daily',
        frequencyText: '每日3次',
        targetNote: '全真模拟模考 + 核心知识点限时默写',
        formula: 'f(t) = 3次/日, t∈[22,30]',
      },
    ],
  },
  {
    id: 'ebbinghaus',
    name: '艾宾浩斯复习衰减曲线',
    desc: '高频复盘(3天) → 隔日强化(4天) → 每周巩固(8天)',
    totalDays: 15,
    stages: [
      {
        id: 'st-eb-1',
        stageIndex: 1,
        stageName: '阶段一：即时记忆期',
        startDay: 1,
        endDay: 3,
        frequency: 'daily',
        frequencyText: '每日高频',
        targetNote: '新知识点初记与次日早间即时复述',
        formula: 'f(t) = 每日, t∈[1,3]',
      },
      {
        id: 'st-eb-2',
        stageIndex: 2,
        stageName: '阶段二：中期巩固期',
        startDay: 4,
        endDay: 7,
        frequency: 'daily',
        frequencyText: '每2天1次',
        targetNote: '第4天与第7天关键遗忘节点复习',
        formula: 'f(t) = 隔日, t∈[4,7]',
      },
      {
        id: 'st-eb-3',
        stageIndex: 3,
        stageName: '阶段三：长期永久记忆',
        startDay: 8,
        endDay: 15,
        frequency: 'weekly',
        frequencyText: '每周1次',
        targetNote: '第15天全局知识树抽测梳理',
        formula: 'f(t) = 每周, t∈[8,15]',
      },
    ],
  },
  {
    id: 'work_shift',
    name: '工作日/周末双段交替',
    desc: '工作日全面点检(周一至周五) → 周末轮班抽检',
    totalDays: 7,
    stages: [
      {
        id: 'st-ws-1',
        stageIndex: 1,
        stageName: '阶段一：工作日巡检',
        startDay: 1,
        endDay: 5,
        frequency: 'daily',
        frequencyText: '每日全面巡查',
        targetNote: '消控主机/消防门禁/出入人员全面点检',
        formula: 'f(t) = 每日1次, t∈[1,5]',
      },
      {
        id: 'st-ws-2',
        stageIndex: 2,
        stageName: '阶段二：周末轮值',
        startDay: 6,
        endDay: 7,
        frequency: 'weekly',
        frequencyText: '周末轮检1次',
        targetNote: '重点部位监控防范与交接班核对',
        formula: 'f(t) = 1次, t∈[6,7]',
      },
    ],
  },
];

export const SmartAddTaskModal: React.FC<SmartAddTaskModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'daily',
  onNavigateTab
}) => {
  const { tasks, addTask } = useTaskStore();

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextMonthStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Form Fields
  const [title, setTitle] = useState('');
  const [importedSubtasks, setImportedSubtasks] = useState<ChecklistItem[]>([]);
  const [newStepText, setNewStepText] = useState('');
  const [targetTab, setTargetTab] = useState<'exam' | 'art' | 'work' | 'emergency'>(
    defaultCategory === 'emergency' ? 'emergency' : defaultCategory === 'exam' ? 'exam' : defaultCategory === 'art' ? 'art' : 'work'
  );

  // Sub-category for Exam (日常打卡 vs 专项科目备考)
  const [examType, setExamType] = useState<'daily' | 'subject'>('daily');

  // Sub-category for Art (日常打卡 vs 商单约稿排单)
  const [artType, setArtType] = useState<'daily' | 'commission'>('daily');

  // Work Sub-category (日常/周常/月常)
  const [workPeriod, setWorkPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Emergency Level
  const [emergencyLevel, setEmergencyLevel] = useState<'urgent' | 'critical'>('urgent');

  // Execution Period (开始日期 ~ 结束日期，例如 10月1日 到 10月30日)
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextMonthStr);
  const [enablePeriod, setEnablePeriod] = useState(true);

  // Frequency (频次)
  const [frequency, setFrequency] = useState('daily');
  const [customFrequencyText, setCustomFrequencyText] = useState('每周一');

  // Alarm / Reminder Time (时 : 分)
  const [alarmTime, setAlarmTime] = useState('');
  const [enableAlarm, setEnableAlarm] = useState(false);

  // Art Persona Specific
  const [clientName, setClientName] = useState('');
  const [submitDate, setSubmitDate] = useState(nextMonthStr);

  // Exam Persona Specific
  const [examSubject, setExamSubject] = useState('math');

  // Piecewise Function Schedule (分段函数周期变化)
  const [enablePiecewise, setEnablePiecewise] = useState(false);
  const [selectedPiecewiseTemplate, setSelectedPiecewiseTemplate] = useState<'exam_stages' | 'ebbinghaus' | 'work_shift'>('exam_stages');

  // Available pre-defined templates
  const availableTemplates = tasks.filter(t => 
    t.isTemplate ||
    t.category === 'template' ||
    t.tags?.includes('预设事项') || 
    t.tags?.includes('文件参考') || 
    t.title.includes('【预设】') ||
    t.title.includes('【参考】')
  );

  // Synchronize category and reset inputs whenever modal opens or defaultCategory changes
  useEffect(() => {
    if (isOpen) {
      if (defaultCategory === 'emergency') {
        setTargetTab('emergency');
      } else if (defaultCategory === 'exam') {
        setTargetTab('exam');
        setExamType('daily');
      } else if (defaultCategory === 'art') {
        setTargetTab('art');
        setArtType('daily');
      } else if (defaultCategory === 'weekly') {
        setTargetTab('work');
        setWorkPeriod('weekly');
        setFrequency('weekly');
      } else if (defaultCategory === 'monthly') {
        setTargetTab('work');
        setWorkPeriod('monthly');
        setFrequency('monthly');
      } else {
        setTargetTab('work');
        setWorkPeriod('daily');
        setFrequency('daily');
      }
      setTitle('');
      setImportedSubtasks([]);
      setNewStepText('');
    }
  }, [isOpen, defaultCategory]);

  if (!isOpen) return null;

  const currentTemplate = PIECEWISE_TEMPLATES.find(t => t.id === selectedPiecewiseTemplate) || PIECEWISE_TEMPLATES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let persona: PersonaType = 'general';
    let periodType: 'daily' | 'weekly' | 'monthly' | 'emergency' | undefined = undefined;
    let targetPage: MainTabType = 'work';
    let targetPageName = '工作';

    if (targetTab === 'emergency') {
      persona = 'security';
      periodType = 'emergency';
      targetPage = 'work';
      targetPageName = '工作·突发事件';
    } else if (targetTab === 'exam') {
      persona = 'exam';
      periodType = examType === 'daily' ? 'daily' : undefined;
      targetPage = 'exam';
      targetPageName = examType === 'daily' ? '考研·每日打卡' : '考研·备考科目';
    } else if (targetTab === 'art') {
      persona = 'art';
      periodType = artType === 'daily' ? 'daily' : undefined;
      targetPage = 'art';
      targetPageName = artType === 'daily' ? '绘画·每日打卡' : '绘画·商单排单';
    } else if (targetTab === 'work') {
      persona = 'security';
      periodType = workPeriod;
      targetPage = 'work';
      targetPageName = workPeriod === 'daily' ? '工作·每日打卡' : workPeriod === 'weekly' ? '工作·本周重点' : '工作·本月规划';
    }

    const isDaily = periodType === 'daily' || frequency === 'daily';
    const effectiveFreq = isDaily ? 'daily' : (enablePiecewise ? 'piecewise' : frequency);
    const freqOption = FREQUENCY_OPTIONS.find(f => f.id === effectiveFreq);
    const freqDetail = enablePiecewise 
      ? '分段函数变化' 
      : isDaily 
      ? '每日刷新' 
      : effectiveFreq === 'custom' 
      ? customFrequencyText 
      : freqOption?.detail || '单次';

    let piecewiseConfig: PiecewiseConfig | undefined = undefined;
    if (enablePiecewise) {
      piecewiseConfig = {
        enabled: true,
        templateType: selectedPiecewiseTemplate,
        baseDate: startDate,
        totalDays: currentTemplate.totalDays,
        stages: currentTemplate.stages,
      };
    }

    addTask({
      title: title.trim(),
      persona,
      personaId: persona,
      periodType,
      category: periodType || (targetTab === 'exam' ? 'exam' : targetTab === 'art' ? 'art' : 'general'),
      priority: targetTab === 'emergency' ? (emergencyLevel === 'critical' ? 'urgent' : 'high') : 'high',
      isPinned: targetTab === 'emergency',
      isEmergency: targetTab === 'emergency',
      emergencyLevel: targetTab === 'emergency' ? emergencyLevel : undefined,
      startDate: enablePeriod ? startDate : null,
      endDate: enablePeriod ? endDate : null,
      frequency: effectiveFreq,
      frequencyDetail: freqDetail,
      alarmTime: enableAlarm && alarmTime ? alarmTime : null,
      isPiecewise: enablePiecewise,
      piecewiseConfig,
      subtasks: importedSubtasks,
      checklists: importedSubtasks,

      clientName: targetTab === 'art' && artType === 'commission' ? clientName.trim() : undefined,
      submitDate: targetTab === 'art' && artType === 'commission' ? submitDate : undefined,
      examData: targetTab === 'exam' ? {
        subject: examSubject,
        ebbinghausTracking: true,
        ebbinghausRound: 0,
      } : undefined,

      tags: [
        targetTab === 'emergency' ? '🚨突发事件' : targetTab === 'exam' ? (examType === 'daily' ? '考研日常' : '考研') : targetTab === 'art' ? (artType === 'daily' ? '绘画日常' : '绘画') : '工作',
        isDaily ? '每日打卡' : enablePiecewise ? 'f(t)分段变化' : periodType === 'weekly' ? '周常' : periodType === 'monthly' ? '月常' : '自填'
      ],
    });

    nativeBridge.performHapticFeedback('success');
    triggerConfetti();
    toast.success(`已自动归类放入【${targetPageName}】页面！`);
    if (onNavigateTab) {
      onNavigateTab(targetPage);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-theme-bg/95 backdrop-blur-2xl rounded-squircle-xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-theme-border/60 bg-theme-card/70 backdrop-blur-xl">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-squircle bg-theme-accent/15 text-theme-accent">
              <Plus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-theme-text">添加待办事件</h3>
              <p className="text-[10px] text-theme-text-muted">周期自适应 · 分段函数 · 突发登记</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-squircle text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {/* 1. 事件名称 (必填) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-theme-text">事件名称 *</label>
            <input
              type="text"
              autoFocus
              placeholder="输入待办事项内容（如：背考研单词 List 1 / 提交线稿 / 消防巡检）..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-theme-card-subtle px-3 py-2.5 rounded-squircle border border-theme-border/80 text-theme-text outline-none focus:border-theme-accent text-xs font-medium"
            />
          </div>

          {/* 2. 所属主分类与智能自动分流 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-theme-text">选择所属类别（自动分流至对应页面）</label>
              <span className="text-[10px] text-theme-accent font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 inline" />
                <span>自动归类入库</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'work', label: '工作事务', icon: Briefcase, color: 'text-amber-500' },
                { id: 'emergency', label: '突发事件', icon: AlertTriangle, color: 'text-rose-500' },
                { id: 'exam', label: '考研备考', icon: GraduationCap, color: 'text-indigo-500' },
                { id: 'art', label: '绘画创作', icon: Palette, color: 'text-purple-500' },
              ].map(cat => {
                const Icon = cat.icon;
                const isSelected = targetTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setTargetTab(cat.id as any);
                      nativeBridge.performHapticFeedback('light');
                    }}
                    className={`py-2 rounded-squircle text-xs flex flex-col items-center justify-center space-y-0.5 border transition-all active:scale-95 ${
                      isSelected
                        ? cat.id === 'emergency'
                          ? 'bg-rose-500 text-white font-bold border-rose-500 shadow-sm'
                          : 'bg-theme-accent text-theme-accent-contrast font-bold border-theme-accent shadow-sm'
                        : 'bg-theme-card-subtle text-theme-text-secondary border-theme-border/60 hover:text-theme-text'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 实时自动分流目标路径高亮显示 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-squircle bg-theme-accent/10 border border-theme-accent/25 text-theme-accent text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse shrink-0" />
              <span className="truncate">
                自动归档至：【{targetTab === 'exam' ? '考研' : targetTab === 'art' ? '绘画' : '工作'}】页面 · {
                  targetTab === 'emergency' ? '🚨 突发事件快速处置栏' :
                  targetTab === 'exam' ? (examType === 'daily' ? '☀️ 考研每日打卡' : '📚 专项科目备考') :
                  targetTab === 'art' ? (artType === 'daily' ? '☀️ 绘画每日打卡' : '🎨 商单约稿排单') :
                  (workPeriod === 'daily' ? '☀️ 每日打卡' : workPeriod === 'weekly' ? '📅 本周重点' : '🌕 本月规划')
                }
              </span>
            </div>
          </div>

          {/* 针对突发事件的等级选择 */}
          {targetTab === 'emergency' && (
            <div className="p-2.5 bg-rose-500/10 rounded-squircle border border-rose-500/40 space-y-2">
              <span className="text-[11px] font-bold text-rose-500 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 inline" />
                <span>突发事件等级与处置:</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'urgent', label: '⚠️ 重要紧急', desc: '即时响应排查' },
                  { id: 'critical', label: '⚡ 特急处置', desc: '全速优先置顶' },
                ].map(lvl => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      setEmergencyLevel(lvl.id as any);
                      nativeBridge.performHapticFeedback('light');
                    }}
                    className={`p-1.5 rounded-squircle text-xs border text-left transition-colors ${
                      emergencyLevel === lvl.id
                        ? 'bg-rose-500 text-white font-bold border-rose-500 shadow-sm'
                        : 'bg-theme-card text-theme-text-secondary border-rose-300/40'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{lvl.label}</div>
                    <div className="text-[9px] opacity-80">{lvl.desc}</div>
                  </button>
                ))}
              </div>

              {availableTemplates.length > 0 && (
                <div className="space-y-1.5 pt-1.5 border-t border-rose-300/30">
                  <span className="text-[10px] text-rose-500 font-bold flex items-center space-x-1">
                    <BookTemplate className="w-3 h-3" />
                    <span>从预设预案库一键选用（自动载入子任务清单）:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTemplates.map(tpl => {
                      const count = tpl.subtasks?.length || tpl.checklists?.length || 0;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setTitle(tpl.title.replace(/^【(预设|参考)】\s*/, ''));
                            const cloned = (tpl.subtasks || tpl.checklists || []).map((s, idx) => ({
                              id: `sub-${Date.now()}-${idx}`,
                              text: s.text || s.title || '',
                              title: s.text || s.title || '',
                              completed: false,
                              isCompleted: false,
                              order: idx,
                            }));
                            setImportedSubtasks(cloned);
                            nativeBridge.performHapticFeedback('light');
                          }}
                          className="px-2 py-1 rounded-squircle text-[10px] bg-theme-card hover:bg-rose-500/15 border border-rose-300/50 text-theme-text font-medium transition-all"
                        >
                          {tpl.title} {count > 0 && `(${count}项)`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 针对工作的分栏 (日常 / 周常 / 月常) */}
          {targetTab === 'work' && (
            <div className="p-2.5 bg-theme-card-subtle rounded-squircle border border-theme-border/60 space-y-1.5">
              <span className="text-[11px] font-medium text-theme-text-secondary">工作分栏选项（自动进入对应栏目）:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'daily', label: '☀️ 每日打卡' },
                  { id: 'weekly', label: '📅 本周重点' },
                  { id: 'monthly', label: '🌕 本月规划' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setWorkPeriod(p.id as any);
                      setFrequency(p.id);
                      nativeBridge.performHapticFeedback('light');
                    }}
                    className={`py-1.5 rounded-squircle text-xs font-medium border transition-colors ${
                      workPeriod === p.id
                        ? 'bg-theme-accent text-theme-accent-contrast font-semibold border-theme-accent'
                        : 'bg-theme-card text-theme-text-secondary border-theme-border/60'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 针对考研的分栏 (每日打卡 / 科目备考) */}
          {targetTab === 'exam' && (
            <div className="p-2.5 bg-theme-card-subtle rounded-squircle border border-theme-border/60 space-y-2">
              <span className="text-[11px] font-medium text-theme-text-secondary">考研分栏选项（自动进入对应栏目）:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'daily', label: '☀️ 考研每日打卡', desc: '00:00自动重置' },
                  { id: 'subject', label: '📚 专项科目备考', desc: '长期备考目标' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setExamType(item.id as any);
                      nativeBridge.performHapticFeedback('light');
                    }}
                    className={`py-1.5 px-2 rounded-squircle text-xs border transition-colors text-left ${
                      examType === item.id
                        ? 'bg-theme-accent text-theme-accent-contrast font-bold border-theme-accent'
                        : 'bg-theme-card text-theme-text-secondary border-theme-border/60'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{item.label}</div>
                    <div className="text-[9px] opacity-80">{item.desc}</div>
                  </button>
                ))}
              </div>

              <div>
                <span className="text-[10px] text-theme-text-muted">考研科目:</span>
                <select
                  value={examSubject}
                  onChange={e => setExamSubject(e.target.value)}
                  className="w-full mt-0.5 bg-theme-card px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
                >
                  <option value="math">数学 / 统考数学</option>
                  <option value="english">考研英语</option>
                  <option value="politics">思想政治理论</option>
                  <option value="major1">专业课一</option>
                  <option value="major2">专业课二</option>
                </select>
              </div>
            </div>
          )}

          {/* 针对绘画的分栏 (每日练习 / 商单约稿) */}
          {targetTab === 'art' && (
            <div className="p-2.5 bg-theme-card-subtle rounded-squircle border border-theme-border/60 space-y-2">
              <span className="text-[11px] font-medium text-theme-text-secondary">绘画分栏选项（自动进入对应栏目）:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'daily', label: '☀️ 绘画每日打卡', desc: '00:00自动重置' },
                  { id: 'commission', label: '🎨 商单约稿排单', desc: '稿件进度跟踪' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setArtType(item.id as any);
                      nativeBridge.performHapticFeedback('light');
                    }}
                    className={`py-1.5 px-2 rounded-squircle text-xs border transition-colors text-left ${
                      artType === item.id
                        ? 'bg-theme-accent text-theme-accent-contrast font-bold border-theme-accent'
                        : 'bg-theme-card text-theme-text-secondary border-theme-border/60'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{item.label}</div>
                    <div className="text-[9px] opacity-80">{item.desc}</div>
                  </button>
                ))}
              </div>

              {artType === 'commission' && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-theme-border/40">
                  <div>
                    <span className="text-[10px] text-theme-text-muted">单名 / 车主名字:</span>
                    <input
                      type="text"
                      placeholder="客户或车主姓名"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full mt-0.5 bg-theme-card px-2 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-theme-text-muted">交付截止时间:</span>
                    <input
                      type="date"
                      value={submitDate}
                      onChange={e => setSubmitDate(e.target.value)}
                      className="w-full mt-0.5 bg-theme-card px-2 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 执行子任务步骤配置区 */}
          <div className="space-y-2 p-2.5 bg-theme-card-subtle rounded-squircle border border-theme-border/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-theme-text flex items-center space-x-1.5">
                <ListChecks className="w-3.5 h-3.5 text-theme-accent" />
                <span>配置执行子任务步骤 ({importedSubtasks.length})</span>
              </label>
              <span className="text-[10px] text-theme-text-muted">选填 · 亦可在卡片上进入二级界面添加</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={newStepText}
                onChange={e => setNewStepText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!newStepText.trim()) return;
                    setImportedSubtasks([
                      ...importedSubtasks,
                      {
                        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        text: newStepText.trim(),
                        title: newStepText.trim(),
                        completed: false,
                        isCompleted: false,
                        order: importedSubtasks.length,
                      }
                    ]);
                    setNewStepText('');
                    nativeBridge.performHapticFeedback('light');
                  }
                }}
                placeholder="+ 输入执行子步骤按回车快速添加..."
                className="flex-1 bg-theme-card px-2.5 py-1.5 rounded-squircle text-xs border border-theme-border/60 text-theme-text outline-none focus:border-theme-accent placeholder:text-theme-text-muted/60"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newStepText.trim()) return;
                  setImportedSubtasks([
                    ...importedSubtasks,
                    {
                      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                      text: newStepText.trim(),
                      title: newStepText.trim(),
                      completed: false,
                      isCompleted: false,
                      order: importedSubtasks.length,
                    }
                  ]);
                  setNewStepText('');
                  nativeBridge.performHapticFeedback('light');
                }}
                className="px-2.5 py-1.5 rounded-squircle bg-theme-accent text-white text-xs font-bold shrink-0"
              >
                添加
              </button>
            </div>

            {importedSubtasks.length > 0 && (
              <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
                {importedSubtasks.map((st, idx) => (
                  <div key={st.id || idx} className="flex items-center justify-between p-1.5 rounded bg-theme-card border border-theme-border/40 text-[11px]">
                    <span className="text-theme-text font-medium truncate flex items-center space-x-1.5">
                      <span className="w-4 h-4 rounded-full bg-theme-accent/15 text-theme-accent text-[9px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{st.text || st.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setImportedSubtasks(importedSubtasks.filter((_, i) => i !== idx))}
                      className="text-theme-text-muted hover:text-rose-500 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 📐 分段函数样式的周期变化任务 (Piecewise Function Tasks) */}
          <div className="space-y-2 p-2.5 bg-theme-accent-subtle/30 rounded-squircle border border-theme-accent/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-text flex items-center space-x-1.5 cursor-pointer">
                <TrendingUp className="w-3.5 h-3.5 text-theme-accent" />
                <span>分段函数周期变化任务 (f(t) 规则)</span>
              </label>
              <input
                type="checkbox"
                checked={enablePiecewise}
                onChange={e => setEnablePiecewise(e.target.checked)}
                className="accent-theme-accent rounded w-4 h-4 cursor-pointer"
              />
            </div>

            {enablePiecewise && (
              <div className="space-y-2 pt-1 border-t border-theme-accent/20">
                <span className="text-[10px] text-theme-text-muted">选择分段递进模板:</span>
                <div className="space-y-1.5">
                  {PIECEWISE_TEMPLATES.map(tpl => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedPiecewiseTemplate(tpl.id)}
                      className={`p-2 rounded-squircle border text-left cursor-pointer transition-colors ${
                        selectedPiecewiseTemplate === tpl.id
                          ? 'bg-theme-card border-theme-accent shadow-sm'
                          : 'bg-theme-card-subtle/60 border-theme-border/50 hover:border-theme-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-theme-text">{tpl.name}</span>
                        <span className="text-[9px] text-theme-accent px-1.5 py-0.2 rounded-full bg-theme-accent-subtle">
                          共 {tpl.totalDays} 天
                        </span>
                      </div>
                      <p className="text-[10px] text-theme-text-secondary leading-tight mt-0.5">
                        {tpl.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Stages Detail Preview */}
                <div className="mt-2 p-2 bg-theme-card rounded-squircle border border-theme-border/60 space-y-1">
                  <span className="text-[10px] font-semibold text-theme-accent">
                    📐 阶段函数输出规则列表:
                  </span>
                  {currentTemplate.stages.map(st => (
                    <div key={st.id} className="text-[10px] flex items-center justify-between py-0.5 border-b border-theme-border/30 last:border-none">
                      <span className="text-theme-text font-medium">{st.stageName}</span>
                      <span className="text-theme-text-muted">{st.formula}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. 执行期限 (比如 10月1日 到 10月30日) */}
          <div className="space-y-1.5 pt-1 border-t border-theme-border/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-theme-text flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-theme-accent" />
                <span>执行期限 (开始日期 ~ 结束日期)</span>
              </label>
              <input
                type="checkbox"
                checked={enablePeriod}
                onChange={e => setEnablePeriod(e.target.checked)}
                className="accent-theme-accent rounded w-3.5 h-3.5"
              />
            </div>

            {enablePeriod && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-theme-text-muted">开始日期:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full mt-0.5 bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-theme-text-muted">结束日期:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full mt-0.5 bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. 频次设置 (当未开启分段函数时生效) */}
          {!enablePiecewise && targetTab !== 'emergency' && (
            <div className="space-y-1.5 pt-1 border-t border-theme-border/40">
              <label className="text-xs font-semibold text-theme-text flex items-center space-x-1">
                <Repeat className="w-3.5 h-3.5 text-theme-accent" />
                <span>固定周期刷新频次</span>
              </label>

              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full bg-theme-card-subtle px-2.5 py-2 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs font-medium"
              >
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {frequency === 'custom' && (
                <input
                  type="text"
                  placeholder="例如：每周一、周三 / 每3天一次"
                  value={customFrequencyText}
                  onChange={e => setCustomFrequencyText(e.target.value)}
                  className="w-full bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs mt-1"
                />
              )}
            </div>
          )}

          {/* 6. 闹钟/提醒时间 */}
          <div className="space-y-1.5 pt-1 border-t border-theme-border/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-theme-text flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-theme-accent" />
                <span>闹钟 / 定时提醒</span>
              </label>
              <input
                type="checkbox"
                checked={enableAlarm}
                onChange={e => setEnableAlarm(e.target.checked)}
                className="accent-theme-accent rounded w-3.5 h-3.5"
              />
            </div>

            {enableAlarm && (
              <input
                type="time"
                value={alarmTime}
                onChange={e => setAlarmTime(e.target.value)}
                className="w-full bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle border border-theme-border/60 text-theme-text outline-none text-xs"
              />
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-theme-border/60">
            <SquircleButton size="sm" variant="ghost" onClick={onClose}>
              取消
            </SquircleButton>
            <SquircleButton 
              size="sm" 
              variant="filled" 
              type="submit" 
              icon={<Check className="w-3.5 h-3.5" />}
            >
              {targetTab === 'emergency' ? '登记突发事件' : '添加事件'}
            </SquircleButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
