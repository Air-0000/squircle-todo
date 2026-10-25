import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Flame,
  ListTodo,
  Pin,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { subtaskProgress, type CyclePeriod, type Task } from '../../domain/task';
import { evaluatePiecewise } from '../../domain/piecewise';
import { useTaskStore } from '../../stores/useTaskStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { CheckButton, ProgressBar } from '../ui/controls';
import { deleteTask, openTask, toggleSubtask, toggleTask } from './taskActions';

const PERIOD_BADGES: Record<CyclePeriod, { label: string; className: string }> = {
  daily: { label: '每日刷新', className: 'bg-amber-500/15 text-amber-600' },
  weekly: { label: '每周刷新', className: 'bg-blue-500/15 text-blue-600' },
  monthly: { label: '每月刷新', className: 'bg-purple-500/15 text-purple-600' },
};

const chip = 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full';

interface TaskItemRowProps {
  task: Task;
  /** Show the delete shortcut (hover on desktop). */
  deletable?: boolean;
}

const PiecewiseStrip: React.FC<{ task: Task }> = ({ task }) => {
  if (!task.piecewise) return null;
  const { currentStage, elapsedDays, daysToNextStage } = evaluatePiecewise(task.piecewise);
  if (!currentStage) return null;
  const stages = task.piecewise.stages;
  return (
    <div className="mt-1 p-2 rounded-squircle bg-theme-accent-subtle/50 border border-theme-accent/30 space-y-1 text-xs">
      <div className="flex items-center justify-between text-[10px] gap-2">
        <span className="font-bold text-theme-accent flex items-center gap-1 min-w-0">
          <TrendingUp className="w-3 h-3 shrink-0" />
          <span className="truncate">
            f(t) 阶段 {currentStage.stageIndex}/{stages.length}: {currentStage.stageName}
          </span>
        </span>
        <span className="text-theme-text-muted shrink-0">
          第 {elapsedDays} 天 · 距下阶段 {daysToNextStage} 天
        </span>
      </div>
      {currentStage.targetNote && (
        <p className="text-[10px] text-theme-text-secondary leading-tight">
          🎯 当前规则: {currentStage.targetNote} ({currentStage.frequencyText})
        </p>
      )}
      <div className="w-full h-1.5 bg-theme-border/60 rounded-full overflow-hidden flex gap-0.5 mt-0.5">
        {stages.map(st => (
          <div
            key={st.id}
            className={`h-full flex-1 rounded-sm ${
              st.stageIndex === currentStage.stageIndex
                ? 'bg-theme-accent shadow-sm'
                : st.stageIndex < currentStage.stageIndex
                  ? 'bg-theme-accent/50'
                  : 'bg-theme-card-subtle'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const MetaChips: React.FC<{ task: Task }> = ({ task }) => {
  const badge = task.period && !task.isEmergency ? PERIOD_BADGES[task.period] : null;
  return (
    <div className="flex items-center flex-wrap gap-1.5 pt-0.5 text-[10px] text-theme-text-muted">
      {badge && (
        <span className={`${chip} font-medium ${badge.className}`}>
          <RefreshCw className="w-2.5 h-2.5" />
          <span>{badge.label}</span>
        </span>
      )}
      {(task.startDate || task.endDate) && (
        <span className={`${chip} gap-1 bg-theme-card-subtle border border-theme-border/50 text-theme-text-secondary`}>
          <Calendar className="w-2.5 h-2.5" />
          <span>{[task.startDate?.slice(5), task.endDate?.slice(5)].filter(Boolean).join(' ~ ')}</span>
        </span>
      )}
      {task.frequencyDetail && task.frequencyDetail !== badge?.label && (
        <span className={`${chip} bg-theme-accent-subtle text-theme-accent font-medium`}>{task.frequencyDetail}</span>
      )}
      {task.clientName && <span className={`${chip} bg-purple-500/15 text-purple-500 font-medium`}>委托人: {task.clientName}</span>}
      {task.submitDate && <span className={`${chip} bg-amber-500/15 text-amber-500 font-medium`}>交付: {task.submitDate}</span>}
      {task.alarmTime && (
        <span className={`${chip} bg-theme-card-subtle text-theme-text-secondary`}>
          <Clock className="w-2.5 h-2.5" />
          <span>{task.alarmTime}</span>
        </span>
      )}
      {task.tags.slice(0, 2).map(tag => (
        <span key={tag} className={`${chip} bg-theme-card-subtle text-theme-text-muted`}>
          #{tag}
        </span>
      ))}
    </div>
  );
};

const InlineSubtaskInput: React.FC<{ taskId: string }> = ({ taskId }) => {
  const addSubtask = useTaskStore(s => s.addSubtask);
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    addSubtask(taskId, text);
    setText('');
  };
  return (
    <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 pt-1">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="+ 输入子任务名称按回车添加..."
        className="flex-1 text-[10px] px-2 py-1 rounded bg-theme-card-subtle border border-theme-border/60 text-theme-text outline-none focus:border-theme-accent"
      />
      {text.trim() && (
        <button type="button" onClick={submit} className="px-2 py-0.5 rounded bg-theme-accent text-theme-accent-contrast text-[10px] font-bold">
          添加
        </button>
      )}
    </div>
  );
};

/** Full task card used by the inbox and panel task lists. */
export const TaskItemRow: React.FC<TaskItemRowProps> = React.memo(({ task, deletable = true }) => {
  const [expanded, setExpanded] = useState(false);
  const progress = subtaskProgress(task.subtasks);
  const { completed, isEmergency } = task;

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const startFocus = stop(() => useFocusStore.getState().open({ mode: 'pomodoro', taskId: task.id }));
  const open = () => openTask(task.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      onClick={open}
      className={`group relative flex items-start gap-3 p-3.5 rounded-squircle-md border cursor-pointer select-none transition-colors duration-150 task-item-containment ${
        isEmergency
          ? completed
            ? 'bg-rose-500/10 border-rose-500/35 opacity-75'
            : 'bg-rose-500/15 border-rose-400/70 shadow-lg ring-1 ring-rose-500/30'
          : completed
            ? 'bg-theme-card/70 border-theme-border/40 opacity-75'
            : 'bg-theme-card border-theme-border hover:border-theme-accent/70 shadow-squircle hover:shadow-squircle-md'
      }`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/15 to-transparent rounded-t-squircle-md" />

      <div className="mt-0.5">
        <CheckButton checked={completed} onToggle={() => toggleTask(task.id)} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap gap-y-1">
          {isEmergency && (
            <span
              className={`${chip} text-[10px] font-bold ${completed ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500 text-white animate-pulse'}`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>{completed ? '已妥善处置' : task.emergencyLevel === 'critical' ? '特急突发' : '突发事件'}</span>
            </span>
          )}
          {task.isPinned && !isEmergency && (
            <span className={`${chip} py-px bg-rose-500/15 text-rose-500 text-[10px] font-bold`}>
              <Pin className="w-2.5 h-2.5" />
              <span>置顶</span>
            </span>
          )}
          <span
            className={`text-xs leading-snug break-words transition-all ${
              completed ? 'font-medium line-through text-theme-text-muted decoration-theme-text-muted/60 decoration-2' : 'text-theme-text font-semibold'
            }`}
          >
            {task.title}
          </span>
        </div>

        {task.description && !completed && (
          <p className="text-[11px] text-theme-text-secondary leading-tight line-clamp-1">{task.description}</p>
        )}

        <PiecewiseStrip task={task} />
        <MetaChips task={task} />

        {progress.total > 0 ? (
          <div className="mt-2 pt-2 border-t border-theme-border/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5 hover:text-theme-accent transition-colors" title="点击进入二级界面管理/划掉子任务">
                <ListTodo className="w-3.5 h-3.5 text-theme-accent shrink-0" />
                <span className="font-semibold text-theme-text text-[11px]">
                  子任务 ({progress.completed}/{progress.total})
                </span>
                <span
                  className={`text-[10px] px-1.5 py-px rounded-full font-bold ${
                    progress.ratio === 1 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-theme-accent-subtle text-theme-accent'
                  }`}
                >
                  {progress.percent}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={stop(() => setExpanded(v => !v))}
                  className="px-1.5 py-0.5 rounded-squircle text-[10px] text-theme-text-muted hover:text-theme-text hover:bg-theme-card-subtle transition-colors flex items-center gap-0.5"
                >
                  <span>{expanded ? '收起' : '展开'}</span>
                  {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
                <button
                  type="button"
                  onClick={startFocus}
                  title="为此任务开启番茄钟沉浸专注"
                  className="px-2 py-0.5 rounded-squircle bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                >
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  <span>专注</span>
                </button>
                <button
                  type="button"
                  onClick={stop(open)}
                  title="管理/划掉子任务"
                  className="px-2 py-0.5 rounded-squircle bg-theme-accent/15 text-theme-accent hover:bg-theme-accent/25 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                >
                  <span>管理步骤</span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            <ProgressBar ratio={progress.ratio} />

            {expanded && (
              <div className="space-y-1 pt-1">
                {task.subtasks.map(sub => (
                  <div
                    key={sub.id}
                    onClick={stop(() => toggleSubtask(task.id, sub.id))}
                    className={`flex items-center gap-2 py-1 px-1.5 rounded-squircle text-[11px] transition-colors cursor-pointer ${
                      sub.completed ? 'text-theme-text-muted line-through opacity-75' : 'text-theme-text hover:bg-theme-card-subtle'
                    }`}
                  >
                    <CheckButton size="sm" checked={sub.completed} onToggle={() => toggleSubtask(task.id, sub.id)} />
                    <span className="flex-1 truncate">{sub.text}</span>
                  </div>
                ))}
                <InlineSubtaskInput taskId={task.id} />
              </div>
            )}
          </div>
        ) : (
          <div className="pt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={stop(open)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-squircle text-[10px] font-semibold text-theme-accent bg-theme-accent/5 hover:bg-theme-accent/15 border border-dashed border-theme-accent/40 transition-colors shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>添加执行子步骤</span>
            </button>
            <button
              type="button"
              onClick={startFocus}
              title="为此任务开启番茄钟沉浸专注"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-squircle text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shadow-2xs"
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>专注</span>
            </button>
          </div>
        )}
      </div>

      {deletable && (
        <button
          type="button"
          onClick={stop(() => deleteTask(task.id))}
          aria-label="删除任务"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-theme-text-muted hover:text-rose-500 rounded-squircle transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
});
TaskItemRow.displayName = 'TaskItemRow';
