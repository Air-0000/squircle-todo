import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  Clock, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  EyeOff, 
  Edit3, 
  Check, 
  BookOpen,
  Sun,
  Plus,
  RefreshCw,
  Play,
  Timer,
  Maximize2
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { TaskItemRow } from '../common/TaskItemRow';
import { SquircleButton } from '../common/SquircleButton';
import { useTaskStore } from '../../stores/useTaskStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { TodoItem } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { toast } from '../../stores/useToastStore';

interface ExamTabProps {
  onOpenAddModal: () => void;
  onEditTask: (task: TodoItem) => void;
}

export const ExamTab: React.FC<ExamTabProps> = ({ onOpenAddModal, onEditTask }) => {
  const { tasks, toggleTask, deleteTask, addTask, forceRefreshCycle } = useTaskStore();
  const openFocusModal = useFocusStore(s => s.openFocusModal);
  const focusHistory = useFocusStore(s => s.focusHistory);
  const [dailyInput, setDailyInput] = useState('');
  const nowHour = new Date().getHours();
  const hoursLeftToday = Math.max(1, 24 - nowHour);

  // Today study focus minutes (memoized)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayStudyMinutes = useMemo(() => {
    return (focusHistory || [])
      .filter(r => r.date === todayStr && (r.persona === 'exam' || !r.persona))
      .reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
  }, [focusHistory, todayStr]);
  const { 
    showExamCountdown, 
    setShowExamCountdown, 
    targetExamDate,
    setTargetExamDate 
  } = useSettingsStore();

  // Collapsible cards state
  const [isCountdownCollapsed, setIsCountdownCollapsed] = useState(false);
  const [isEditingTargetDate, setIsEditingTargetDate] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState(targetExamDate);

  // Days remaining calculation
  const [daysRemaining, setDaysRemaining] = useState(79);

  useEffect(() => {
    const now = new Date();
    const target = new Date(targetExamDate);
    const diffMs = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    setDaysRemaining(days);
  }, [targetExamDate]);

  const handleSaveTargetDate = () => {
    if (targetDateInput) {
      setTargetExamDate(targetDateInput);
      setIsEditingTargetDate(false);
      nativeBridge.performHapticFeedback('light');
    }
  };

  // Split into daily tasks and longer-term subject tasks (memoized)
  const { dailyExamTasks, otherExamTasks } = useMemo(() => {
    const list = tasks.filter(t => 
      !t.isTemplate && 
      t.category !== 'template' && 
      !t.tags?.includes('预设事项') &&
      (t.persona || t.personaId) === 'exam'
    );
    const daily = list.filter(t => t.periodType === 'daily' || t.frequency === 'daily' || t.category === 'daily');
    const other = list.filter(t => t.periodType !== 'daily' && t.frequency !== 'daily' && t.category !== 'daily');
    return { examTasks: list, dailyExamTasks: daily, otherExamTasks: other };
  }, [tasks]);

  const handleAddDailyTask = () => {
    if (!dailyInput.trim()) return;
    addTask({
      title: dailyInput.trim(),
      persona: 'exam',
      personaId: 'exam',
      periodType: 'daily',
      frequency: 'daily',
      frequencyDetail: '每日刷新',
      category: 'daily',
      tags: ['考研日常', '每日打卡'],
    });
    setDailyInput('');
    nativeBridge.performHapticFeedback('light');
    toast.success('已加入考研每日打卡清单！');
  };

  const handleManualCycleReset = () => {
    const count = forceRefreshCycle('daily', 'exam');
    nativeBridge.performHapticFeedback('medium');
    toast.cycleReset(`已重置考研每日打卡状态，共 ${count} 项待办已恢复待打卡！`);
  };

  return (
    <div className="space-y-3.5 pb-40">
      {/* 1. 考研时间卡片 (支持自定义日期、折叠与隐藏，解决“卡片无法移动删除”痛点) */}
      {showExamCountdown && (
        <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-squircle bg-amber-500/15 text-amber-500">
                <GraduationCap className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
                考研时间倒计时
              </span>
            </div>

            {/* Actions: Start Focus, Edit Date, Collapse, Hide */}
            <div className="flex items-center space-x-1.5 text-theme-text-secondary">
              <button
                onClick={() => {
                  nativeBridge.performHapticFeedback('light');
                  openFocusModal({ mode: 'pomodoro' });
                }}
                title="开启考研番茄专注"
                className="px-2.5 py-1 rounded-squircle bg-theme-accent/15 hover:bg-theme-accent/25 text-theme-accent border border-theme-accent/30 text-[11px] font-bold flex items-center space-x-1 active:scale-95 transition-all shadow-2xs mr-0.5"
              >
                <Clock className="w-3 h-3" />
                <span>开启专注</span>
              </button>
              <button
                onClick={() => setIsEditingTargetDate(!isEditingTargetDate)}
                title="修改目标考试日期"
                className="p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-muted hover:text-theme-text transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCountdownCollapsed(!isCountdownCollapsed)}
                title={isCountdownCollapsed ? '展开' : '折叠'}
                className="p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-muted hover:text-theme-text transition-colors"
              >
                {isCountdownCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowExamCountdown(false)}
                title="隐藏此卡片（可在设置中重新开启）"
                className="p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-muted hover:text-rose-500 transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isCountdownCollapsed && (
            <div className="pt-2">
              {isEditingTargetDate ? (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="date"
                    value={targetDateInput}
                    onChange={e => setTargetDateInput(e.target.value)}
                    className="flex-1 bg-theme-card-subtle px-2.5 py-1.5 rounded-squircle text-xs border border-theme-border/60 text-theme-text outline-none"
                  />
                  <SquircleButton size="sm" variant="filled" onClick={handleSaveTargetDate} icon={<Check className="w-3 h-3" />}>
                    保存
                  </SquircleButton>
                </div>
              ) : (
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-theme-accent tracking-tight">{daysRemaining}</span>
                  <span className="text-xs font-medium text-theme-text-secondary">天剩余</span>
                  <span className="text-[11px] text-theme-text-muted">（目标：{targetExamDate}）</span>
                </div>
              )}
            </div>
          )}
        </SquircleCard>
      )}

      {/* 2. 考研专属液态专注时钟工作台 (考研核心生产力入口，解决时钟缺失痛点) */}
      <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-squircle bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
                  考研专注翻牌时钟
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                  番茄学习法
                </span>
              </div>
              <p className="text-[10px] text-theme-text-muted mt-0.5">
                真题模考计时 · 25min 极简番茄沉浸 · 艾宾浩斯心流
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-theme-accent">
              {todayStudyMinutes > 0 ? `${todayStudyMinutes} 分钟` : '今日待开始'}
            </div>
            <span className="text-[10px] text-theme-text-muted">今日专注时长</span>
          </div>
        </div>

        {/* 快捷专注入口按钮组 */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openFocusModal({ mode: 'pomodoro', durationMinutes: 25 });
            }}
            className="p-2.5 rounded-squircle bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all shadow-2xs"
          >
            <div className="flex items-center space-x-1">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-bold">番茄专注</span>
            </div>
            <span className="text-[10px] opacity-75">25 分钟倒计时</span>
          </button>

          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openFocusModal({ mode: 'stopwatch' });
            }}
            className="p-2.5 rounded-squircle bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all shadow-2xs"
          >
            <div className="flex items-center space-x-1">
              <Timer className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">秒表模考</span>
            </div>
            <span className="text-[10px] opacity-75">正向真题计时</span>
          </button>

          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openFocusModal({ mode: 'clock' });
            }}
            className="p-2.5 rounded-squircle bg-theme-accent/15 hover:bg-theme-accent/25 border border-theme-accent/30 text-theme-accent flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all shadow-2xs"
          >
            <div className="flex items-center space-x-1">
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">全屏时钟</span>
            </div>
            <span className="text-[10px] opacity-75">极简液态翻牌</span>
          </button>
        </div>
      </SquircleCard>

      {/* 3. 考研每日任务 (选择性添加，固定00:00刷新) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-xs font-bold text-theme-text">
              考研每日打卡 ({dailyExamTasks.length})
            </h3>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-medium flex items-center space-x-0.5">
              <RefreshCw className="w-2.5 h-2.5 inline" />
              <span>00:00刷新 · 距重置{hoursLeftToday}h</span>
            </span>
            <button
              onClick={handleManualCycleReset}
              title="手动重置今日完成状态"
              className="p-1 rounded-squircle text-theme-text-muted hover:text-theme-accent hover:bg-theme-card-subtle transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 快速内联添加输入框 */}
        <div className="flex items-center space-x-1.5">
          <input
            type="text"
            value={dailyInput}
            onChange={(e) => setDailyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDailyTask();
              }
            }}
            placeholder="快速添加今日背单词 / 刷题打卡..."
            className="flex-1 text-xs px-3 py-2 rounded-squircle bg-theme-card text-theme-text border border-theme-border/70 placeholder:text-theme-text-muted/60 outline-none focus:border-theme-accent shadow-inner"
          />
          <button
            type="button"
            onClick={handleAddDailyTask}
            className="w-8 h-8 rounded-squircle bg-theme-accent text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform border border-white/25"
            aria-label="添加每日打卡"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 每日任务列表 */}
        <div className="space-y-2">
          {dailyExamTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-theme-text-muted bg-theme-card/40 rounded-squircle-md border border-dashed border-theme-border/60">
              暂无今日考研打卡，可选择性在上方快速添加（如单词打卡、专业课精读）
            </div>
          ) : (
            dailyExamTasks.map(task => (
              <TaskItemRow
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onClick={onEditTask}
              />
            ))
          )}
        </div>
      </div>

      {/* 4. 考研长期与各科任务 */}
      <div className="space-y-2 pt-2 border-t border-theme-border/50">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-theme-accent" />
            <span>各科规划与专项任务 ({otherExamTasks.length})</span>
          </h3>
          <span className="text-[10px] text-theme-text-muted">点击方框顺畅划掉</span>
        </div>

        <div className="space-y-2">
          {otherExamTasks.length === 0 ? (
            <div 
              onClick={onOpenAddModal}
              className="py-8 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle-md border border-dashed border-theme-border/80 cursor-pointer hover:border-theme-accent transition-colors"
            >
              暂无长线规划任务，点击右下角「+」录入新目标
            </div>
          ) : (
            otherExamTasks.map(task => (
              <TaskItemRow
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onClick={onEditTask}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
