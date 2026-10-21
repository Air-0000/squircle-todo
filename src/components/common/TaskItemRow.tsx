import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Clock, 
  Calendar, 
  Trash2, 
  Pin, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw,
  ListTodo,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Flame
} from 'lucide-react';
import { TodoItem } from '../../types';
import { evaluatePiecewiseTask, calculateSubtaskProgress } from '../../types/task';
import { useTaskStore } from '../../stores/useTaskStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { nativeBridge } from '../../utils/bridge';

interface TaskItemRowProps {
  task: TodoItem;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (task: TodoItem) => void;
}

export const TaskItemRow: React.FC<TaskItemRowProps> = React.memo(({
  task,
  onToggle,
  onDelete,
  onClick,
}) => {
  const isCompleted = Boolean(task.completed || task.isCompleted);
  const isEmergency = Boolean(task.isEmergency || task.periodType === 'emergency');

  const toggleSubtask = useTaskStore(s => s.toggleSubtask);
  const addSubtask = useTaskStore(s => s.addSubtask);
  const openFocusModal = useFocusStore(s => s.openFocusModal);
  const subtasks = task.subtasks || task.checklists || [];
  const progress = calculateSubtaskProgress(subtasks);
  const [isInlineExpanded, setIsInlineExpanded] = useState(false);
  const [inlineNewSubtask, setInlineNewSubtask] = useState('');

  const piecewiseInfo = task.isPiecewise && task.piecewiseConfig 
    ? evaluatePiecewiseTask(task) 
    : null;

  const handleStartFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    nativeBridge.performHapticFeedback('medium');
    openFocusModal({ mode: 'pomodoro', task });
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    nativeBridge.performHapticFeedback(isCompleted ? 'light' : 'success');
    onToggle(task.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    nativeBridge.performHapticFeedback('medium');
    if (onDelete) onDelete(task.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onClick={() => onClick && onClick(task)}
      className={`group relative flex items-start space-x-3 p-3.5 rounded-squircle-md border cursor-pointer select-none transition-colors duration-150 task-item-containment ${
        isEmergency
          ? isCompleted
            ? 'bg-rose-500/10 border-rose-500/35 opacity-75'
            : 'bg-rose-500/15 border-rose-400/70 shadow-lg ring-1 ring-rose-500/30'
          : isCompleted
          ? 'bg-theme-card/70 border-theme-border/40 opacity-75'
          : 'bg-theme-card border-theme-border hover:border-theme-accent/70 shadow-squircle hover:shadow-squircle-md'
      }`}
    >
      {/* Specular glass reflection line */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/15 to-transparent rounded-t-squircle-md" 
      />

      {/* Round/Square Checkbox with iOS tactile squircle styling */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        aria-label={isCompleted ? '标记为未完成' : '标记为已完成'}
        className={`mt-0.5 w-5 h-5 rounded-squircle flex items-center justify-center shrink-0 border transition-colors ${
          isCompleted
            ? 'bg-theme-accent border-white/40 text-theme-accent-contrast shadow-[0_2px_10px_rgba(0,0,0,0.25)]'
            : 'border-theme-border/60 hover:border-theme-accent bg-theme-card-subtle shadow-inner'
        }`}
      >
        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      {/* Task Content Area */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {isEmergency && (
            <span className={`inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              isCompleted 
                ? 'bg-emerald-500/15 text-emerald-600' 
                : 'bg-rose-500 text-white animate-pulse'
            }`}>
              <AlertTriangle className="w-2.5 h-2.5 inline" />
              <span>{isCompleted ? '已妥善处置' : task.emergencyLevel === 'critical' ? '特急突发' : '突发事件'}</span>
            </span>
          )}

          {task.isPinned && !isEmergency && (
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-500 text-[10px] font-bold">
              <Pin className="w-2.5 h-2.5 inline" />
              <span>置顶</span>
            </span>
          )}

          {/* Title with smooth strikethrough */}
          <span
            className={`text-xs font-medium leading-snug break-words transition-all ${
              isCompleted
                ? 'line-through text-theme-text-muted decoration-theme-text-muted/60 decoration-2'
                : 'text-theme-text font-semibold'
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Optional Notes / Description */}
        {task.description && !isCompleted && (
          <p className="text-[11px] text-theme-text-secondary leading-tight line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Piecewise Function Stage Visualizer */}
        {task.isPiecewise && piecewiseInfo?.currentStage && (
          <div className="mt-1 p-2 rounded-squircle bg-theme-accent-subtle/50 border border-theme-accent/30 space-y-1 text-xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-theme-accent flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-theme-accent" />
                <span>f(t) 阶段 {piecewiseInfo.currentStage.stageIndex}/{task.piecewiseConfig?.stages.length}: {piecewiseInfo.currentStage.stageName}</span>
              </span>
              <span className="text-theme-text-muted">
                第 {piecewiseInfo.elapsedDays} 天 · 距下阶段 {piecewiseInfo.daysToNextStage} 天
              </span>
            </div>
            {piecewiseInfo.currentStage.targetNote && (
              <p className="text-[10px] text-theme-text-secondary leading-tight">
                🎯 当前规则: {piecewiseInfo.currentStage.targetNote} ({piecewiseInfo.currentStage.frequencyText})
              </p>
            )}
            {/* Step Ladder Visualizer */}
            <div className="w-full h-1.5 bg-theme-border/60 rounded-full overflow-hidden flex gap-0.5 mt-0.5">
              {task.piecewiseConfig?.stages.map((st, idx) => {
                const isCurrent = st.stageIndex === piecewiseInfo.currentStage?.stageIndex;
                const isPassed = st.stageIndex < (piecewiseInfo.currentStage?.stageIndex || 1);
                return (
                  <div
                    key={st.id || idx}
                    className={`h-full flex-1 rounded-sm ${
                      isCurrent
                        ? 'bg-theme-accent shadow-sm'
                        : isPassed
                        ? 'bg-theme-accent/50'
                        : 'bg-theme-card-subtle'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata Pills: Period, Frequency, Client, Alarm */}
        <div className="flex items-center flex-wrap gap-1.5 pt-0.5 text-[10px] text-theme-text-muted">
          {/* Cycle Refresh badges */}
          {(task.periodType === 'daily' || task.frequency === 'daily') && !isEmergency && (
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-medium">
              <RefreshCw className="w-2.5 h-2.5" />
              <span>每日刷新</span>
            </span>
          )}
          {(task.periodType === 'weekly' || task.frequency === 'weekly') && !isEmergency && (
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 font-medium">
              <RefreshCw className="w-2.5 h-2.5" />
              <span>每周刷新</span>
            </span>
          )}
          {(task.periodType === 'monthly' || task.frequency === 'monthly') && !isEmergency && (
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 font-medium">
              <RefreshCw className="w-2.5 h-2.5" />
              <span>每月刷新</span>
            </span>
          )}

          {/* Execution Period (e.g. 10/1 ~ 10/30) */}
          {(task.startDate || task.endDate) && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-theme-card-subtle border border-theme-border/50 text-theme-text-secondary">
              <Calendar className="w-2.5 h-2.5" />
              <span>
                {task.startDate ? task.startDate.slice(5) : ''}
                {task.startDate && task.endDate ? ' ~ ' : ''}
                {task.endDate ? task.endDate.slice(5) : ''}
              </span>
            </span>
          )}

          {/* Frequency (e.g. 每周一次) */}
          {task.frequencyDetail && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-theme-accent-subtle text-theme-accent font-medium">
              {task.frequencyDetail}
            </span>
          )}

          {/* Art: Client Name & Submit Date */}
          {task.clientName && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500 font-medium">
              委托人: {task.clientName}
            </span>
          )}
          {task.submitDate && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">
              交付: {task.submitDate}
            </span>
          )}

          {/* Alarm Reminder */}
          {task.alarmTime && (
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-theme-card-subtle text-theme-text-secondary">
              <Clock className="w-2.5 h-2.5" />
              <span>{task.alarmTime}</span>
            </span>
          )}

          {/* Tags */}
          {task.tags && task.tags.slice(0, 2).map((t, i) => (
            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-theme-card-subtle text-theme-text-muted">
              #{t}
            </span>
          ))}
        </div>

        {/* Subtask Status, Direct Jump, and Inline Progression */}
        {progress.total > 0 ? (
          <div className="mt-2 pt-2 border-t border-theme-border/50 space-y-1.5">
            {/* Clickable Subtask Progress Bar & Direct Jump Pill */}
            <div className="flex items-center justify-between text-xs">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClick) onClick(task);
                }}
                className="flex items-center space-x-1.5 hover:text-theme-accent transition-colors"
                title="点击进入二级界面管理/划掉子任务"
              >
                <ListTodo className="w-3.5 h-3.5 text-theme-accent shrink-0" />
                <span className="font-semibold text-theme-text text-[11px]">
                  子任务 ({progress.completed}/{progress.total})
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  progress.ratio === 1 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-theme-accent-subtle text-theme-accent'
                }`}>
                  {progress.percentText}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                {/* Inline Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInlineExpanded(!isInlineExpanded);
                  }}
                  className="px-1.5 py-0.5 rounded-squircle text-[10px] text-theme-text-muted hover:text-theme-text hover:bg-theme-card-subtle transition-colors flex items-center space-x-0.5"
                >
                  <span>{isInlineExpanded ? '收起' : '展开'}</span>
                  {isInlineExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>

                {/* Focus Button */}
                <button
                  type="button"
                  onClick={handleStartFocus}
                  className="px-2 py-0.5 rounded-squircle bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-semibold transition-colors flex items-center space-x-0.5"
                  title="为此任务开启番茄钟沉浸专注"
                >
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  <span>专注</span>
                </button>

                {/* Jump to Secondary Modal */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onClick) onClick(task);
                  }}
                  className="px-2 py-0.5 rounded-squircle bg-theme-accent/15 text-theme-accent hover:bg-theme-accent/25 text-[10px] font-semibold transition-colors flex items-center space-x-0.5"
                  title="跳转至二级全屏界面管理/划掉子任务"
                >
                  <span>管理步骤</span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-1 bg-theme-border/60 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  progress.ratio === 1 ? 'bg-emerald-500' : 'bg-theme-accent'
                }`}
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </div>

            {/* Inline Subtasks List when expanded */}
            {isInlineExpanded && (
              <div className="space-y-1 pt-1">
                {subtasks.map((sub, idx) => {
                  const isDone = Boolean(sub.completed || sub.isCompleted);
                  return (
                    <div
                      key={sub.id || idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubtask(task.id, sub.id);
                      }}
                      className={`flex items-center space-x-2 py-1 px-1.5 rounded-squircle text-[11px] transition-colors cursor-pointer ${
                        isDone ? 'text-theme-text-muted line-through opacity-75' : 'text-theme-text hover:bg-theme-card-subtle'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubtask(task.id, sub.id);
                        }}
                        className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 border transition-all ${
                          isDone ? 'bg-theme-accent border-theme-accent text-white' : 'border-theme-border bg-theme-card'
                        }`}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <span className="flex-1 truncate">{sub.text || sub.title}</span>
                    </div>
                  );
                })}

                {/* Inline Quick Add Input */}
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center space-x-1 pt-1"
                >
                  <input
                    type="text"
                    value={inlineNewSubtask}
                    onChange={(e) => setInlineNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inlineNewSubtask.trim()) {
                        e.preventDefault();
                        addSubtask(task.id, inlineNewSubtask.trim());
                        setInlineNewSubtask('');
                      }
                    }}
                    placeholder="+ 输入子任务名称按回车添加..."
                    className="flex-1 text-[10px] px-2 py-1 rounded bg-theme-card-subtle border border-theme-border/60 text-theme-text outline-none focus:border-theme-accent"
                  />
                  {inlineNewSubtask.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        addSubtask(task.id, inlineNewSubtask.trim());
                        setInlineNewSubtask('');
                      }}
                      className="px-2 py-0.5 rounded bg-theme-accent text-white text-[10px] font-bold"
                    >
                      添加
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* When there are NO subtasks: Provide an unmistakable, clear entry point! */
          <div className="pt-1.5 flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(task);
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-squircle text-[10px] font-semibold text-theme-accent bg-theme-accent/5 hover:bg-theme-accent/15 border border-dashed border-theme-accent/40 transition-colors shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>+ 添加执行子步骤</span>
            </button>

            <button
              type="button"
              onClick={handleStartFocus}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-squircle text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shadow-2xs"
              title="为此任务开启番茄钟沉浸专注"
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>专注</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Quick Button (visible on hover or tap) */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDeleteClick}
          aria-label="删除任务"
          className="opacity-0 group-hover:opacity-100 p-1 text-theme-text-muted hover:text-rose-500 rounded-squircle transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
});
