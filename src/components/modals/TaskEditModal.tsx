import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Trash2, 
  Save, 
  AlertTriangle,
  Layers,
  Check,
  CheckCircle2,
  Plus,
  BookTemplate
} from 'lucide-react';
import { TodoItem, ChecklistItem } from '../../types';
import { SPRING_PHYSICS } from '../../constants/themes';
import { PillTag } from '../common/PillTag';
import { SquircleButton } from '../common/SquircleButton';

import { nativeBridge } from '../../utils/bridge';
import { calculateSubtaskProgress } from '../../types/task';
import { triggerConfetti } from '../common/ConfettiBurst';
import { toast } from '../../stores/useToastStore';

interface TaskEditModalProps {
  task: TodoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<TodoItem>) => void;
  onDelete: (id: string) => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtasks, setSubtasks] = useState<ChecklistItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [justCompletedAll, setJustCompletedAll] = useState(false);

  const isTemplateMode = Boolean(
    task?.isTemplate || 
    task?.category === 'template' || 
    task?.tags?.includes('文件参考') ||
    task?.tags?.includes('预设事项') ||
    task?.title?.startsWith('【预设】') ||
    task?.title?.startsWith('【参考】')
  );

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || task.notes || '');
      setSubtasks(
        Array.isArray(task.subtasks)
          ? task.subtasks.map((s, idx) => ({
              id: s.id || `sub-${Date.now()}-${idx}`,
              text: s.text || s.title || '',
              title: s.text || s.title || '',
              completed: Boolean(s.completed ?? s.isCompleted ?? false),
              isCompleted: Boolean(s.completed ?? s.isCompleted ?? false),
              order: s.order !== undefined ? s.order : idx,
            }))
          : Array.isArray(task.checklists)
          ? task.checklists.map((s, idx) => ({
              id: s.id || `sub-${Date.now()}-${idx}`,
              text: s.text || s.title || '',
              title: s.text || s.title || '',
              completed: Boolean(s.completed ?? s.isCompleted ?? false),
              isCompleted: Boolean(s.completed ?? s.isCompleted ?? false),
              order: s.order !== undefined ? s.order : idx,
            }))
          : []
      );
      setErrorMsg('');
      setJustCompletedAll(false);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const progress = calculateSubtaskProgress(subtasks);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: ChecklistItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: newSubtaskTitle.trim(),
      title: newSubtaskTitle.trim(),
      completed: false,
      isCompleted: false,
      order: subtasks.length,
    };
    const updated = [...subtasks, newSub];
    setSubtasks(updated);
    setNewSubtaskTitle('');
    nativeBridge.performHapticFeedback('light');
  };

  const handleToggleSubtask = (subId: string) => {
    // In template mode, subtasks are not for strike-off
    if (isTemplateMode) return;

    const updated = subtasks.map(s => {
      if (s.id === subId) {
        const next = !(s.completed || s.isCompleted);
        return { ...s, completed: next, isCompleted: next };
      }
      return s;
    });

    setSubtasks(updated);
    nativeBridge.performHapticFeedback('light');

    // Check if now 100% completed ("任务完成之后自动刷新")
    const allDone = updated.length > 0 && updated.every(s => s.completed || s.isCompleted);
    if (allDone) {
      setJustCompletedAll(true);
      triggerConfetti();
      nativeBridge.performHapticFeedback('success');
    } else {
      setJustCompletedAll(false);
    }
  };

  const handleDeleteSubtask = (subId: string) => {
    setSubtasks(subtasks.filter(s => s.id !== subId));
    nativeBridge.performHapticFeedback('light');
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('事项标题不能为空');
      nativeBridge.performHapticFeedback('error');
      return;
    }

    const allDone = subtasks.length > 0 && subtasks.every(s => s.completed || s.isCompleted);
    const shouldMarkCompleted = !isTemplateMode && allDone;

    const updates: Partial<TodoItem> & Record<string, any> = {
      title: title.trim(),
      description: description.trim(),
      notes: description.trim(),
      subtasks,
      checklists: subtasks,
      updatedAt: new Date().toISOString(),
    };

    if (shouldMarkCompleted) {
      updates.completed = true;
      updates.isCompleted = true;
      updates.completedAt = new Date().toISOString();
      if (task.isEmergency) {
        updates.resolvedAt = updates.completedAt;
      }
    } else if (!isTemplateMode && subtasks.length > 0 && !allDone && (task.completed || task.isCompleted)) {
      updates.completed = false;
      updates.isCompleted = false;
      updates.completedAt = null;
      if (task.isEmergency) {
        updates.resolvedAt = null;
      }
    }

    onSave(task.id, updates);
    nativeBridge.performHapticFeedback('success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={SPRING_PHYSICS.defaultCard}
        className="w-full max-w-lg bg-theme-bg/95 backdrop-blur-2xl rounded-t-squircle-xl sm:rounded-squircle-xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* iOS Sheet Grabber Bar */}
        <div className="w-10 h-1 rounded-full bg-theme-text-muted/30 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 border-b border-theme-border/60 flex items-center justify-between shrink-0 bg-theme-card/70 backdrop-blur-xl">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-squircle flex items-center justify-center shrink-0 ${
              isTemplateMode 
                ? 'bg-amber-500/15 text-amber-500' 
                : task.isEmergency 
                ? 'bg-rose-500/15 text-rose-500' 
                : 'bg-theme-accent/15 text-theme-accent'
            }`}>
              {isTemplateMode ? <BookTemplate className="w-4.5 h-4.5" /> : <Layers className="w-4.5 h-4.5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-theme-text truncate">
                {isTemplateMode 
                  ? `预案步骤编排 · ${title || '预设事项'}` 
                  : task.isEmergency 
                  ? `🚨 突发事件处置 · ${title}` 
                  : `📋 任务步骤执行 · ${title}`}
              </h3>
              <p className="text-[10px] text-theme-text-muted truncate">
                {isTemplateMode 
                  ? '预设流程步骤清单 · 无需打卡 · 随时一键发起调用' 
                  : '逐项划掉子任务 · 全部完成自动刷新打卡'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary shrink-0"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-squircle bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. 事项基本信息 (轻量化展示，支持直接修改标题) */}
          <div className="p-3 bg-theme-card rounded-squircle border border-theme-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                {isTemplateMode ? '预设事项名称' : '主任务名称'}
              </span>
              <span className="text-[10px] text-theme-text-muted">可直接修改</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="请输入事项名称..."
              className="w-full text-xs px-2.5 py-1.5 rounded-squircle bg-theme-card-subtle text-theme-text border border-theme-border/60 focus:border-theme-accent outline-none font-semibold"
            />
          </div>

          {/* 全部完成自动刷新提示横幅 */}
          {justCompletedAll && !isTemplateMode && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-squircle bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 text-xs flex items-center space-x-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <div className="flex-1 font-semibold leading-tight">
                🎉 全部子任务已划掉完成！点击下方保存将自动刷新并妥善归档！
              </div>
            </motion.div>
          )}

          {/* 2. 核心：子任务步骤清单与添加栏 (置顶优先呈现) */}
          <div className="space-y-2.5 p-3.5 rounded-squircle-lg bg-theme-card-subtle border border-theme-border shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
                <span>执行子步骤清单 ({progress.completed}/{progress.total})</span>
                {progress.total > 0 && (
                  <PillTag 
                    size="sm" 
                    variant={justCompletedAll ? 'primary' : 'subtle'} 
                    label={justCompletedAll ? '100% 全部完成' : progress.percentText} 
                  />
                )}
              </label>
              {isTemplateMode ? (
                <span className="text-[10px] text-amber-500 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10">
                  📋 预设清单 · 不划任务
                </span>
              ) : (
                <span className="text-[10px] text-theme-text-muted">
                  点击左侧圆圈划掉完成
                </span>
              )}
            </div>

            {/* 进度条 */}
            {progress.total > 0 && (
              <div className="w-full h-1.5 bg-theme-border/60 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    justCompletedAll || progress.ratio === 1 ? 'bg-emerald-500' : 'bg-theme-accent'
                  }`}
                  style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                />
              </div>
            )}

            {/* 快速添加新子任务步骤 (直接置顶，免去找输入框) */}
            <div className="flex items-center space-x-1.5 pt-0.5">
              <input
                type="text"
                autoFocus
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder={isTemplateMode ? "+ 输入预案执行步骤，按回车快速添加..." : "+ 输入执行子步骤，按回车快速添加..."}
                className="flex-1 text-xs px-3 py-2 rounded-squircle bg-theme-card text-theme-text border border-theme-border outline-none focus:border-theme-accent placeholder:text-theme-text-muted/60"
              />
              <SquircleButton size="sm" variant="filled" onClick={handleAddSubtask} className="shrink-0 flex items-center space-x-1">
                <Plus className="w-3.5 h-3.5" />
                <span>添加步骤</span>
              </SquircleButton>
            </div>

            {/* 子任务步骤列表 */}
            <div className="space-y-1.5 pt-1 max-h-64 overflow-y-auto">
              {subtasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-theme-text-muted border border-dashed border-theme-border/70 rounded-squircle bg-theme-card/40">
                  {isTemplateMode
                    ? '暂无预案步骤，在上方输入如「核对交接单 / 检查配电箱」添加'
                    : '暂无子任务步骤，在上方输入具体执行步骤按回车添加'}
                </div>
              ) : (
                subtasks.map((sub, idx) => {
                  const isDone = Boolean(sub.completed || sub.isCompleted);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => !isTemplateMode && handleToggleSubtask(sub.id)}
                      className={`flex items-center space-x-2.5 p-2.5 rounded-squircle border text-xs transition-all ${
                        isTemplateMode
                          ? 'bg-theme-card border-theme-border text-theme-text'
                          : isDone
                          ? 'bg-theme-card/50 border-theme-border/40 text-theme-text-muted opacity-80 cursor-pointer'
                          : 'bg-theme-card border-theme-border text-theme-text hover:border-theme-accent/60 cursor-pointer shadow-sm'
                      }`}
                    >
                      {/* Checkbox (active task) or Step Badge (template mode) */}
                      {isTemplateMode ? (
                        <span className="w-5 h-5 rounded-squircle bg-amber-500/15 text-amber-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSubtask(sub.id);
                          }}
                          className={`w-5 h-5 rounded-squircle flex items-center justify-center shrink-0 border transition-all ${
                            isDone
                              ? 'bg-theme-accent border-theme-accent text-theme-accent-contrast shadow-sm'
                              : 'border-theme-border/80 hover:border-theme-accent bg-theme-card-subtle'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      )}

                      <span className={`flex-1 truncate select-none ${
                        !isTemplateMode && isDone ? 'line-through text-theme-text-muted decoration-theme-text-muted/60 decoration-2' : 'font-medium'
                      }`}>
                        {sub.text || sub.title}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubtask(sub.id);
                        }}
                        className="text-theme-text-muted hover:text-rose-500 p-1 rounded-squircle hover:bg-theme-card-subtle transition-colors shrink-0"
                        aria-label="删除子项"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. 选填备注说明 (收敛到下方，不干扰子任务核心操作) */}
          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-medium text-theme-text-secondary">备注说明 (选填)</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="添加详细要点或应急指引备注..."
              className="w-full text-xs px-3 py-2 rounded-squircle bg-theme-card text-theme-text border border-theme-border/70 focus:border-theme-accent outline-none resize-none placeholder:text-theme-text-muted/50"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-theme-border/60 flex items-center justify-between shrink-0 bg-theme-card/70 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              toast.confirm({
                title: isTemplateMode ? '删除预设预案？' : '删除待办事项？',
                message: isTemplateMode 
                  ? '确定要从预案库中删除此预设吗？' 
                  : '确定要删除此待办事项吗？此操作无法撤销。',
                confirmText: '确认删除',
                cancelText: '取消',
                danger: true,
                onConfirm: () => {
                  onDelete(task.id);
                  onClose();
                  toast.info(isTemplateMode ? '预案已删除' : '待办事项已删除');
                },
              });
            }}
            className="flex items-center space-x-1 text-xs text-rose-500 hover:text-rose-600 px-2 py-1.5 rounded-squircle hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isTemplateMode ? '删除预案' : '删除任务'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <SquircleButton variant="tonal" onClick={onClose} size="sm">
              取消
            </SquircleButton>
            <SquircleButton 
              variant="filled" 
              onClick={handleSave} 
              size="sm" 
              className={`flex items-center space-x-1 ${
                justCompletedAll ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{justCompletedAll ? '保存并自动归档' : '保存修改'}</span>
            </SquircleButton>
          </div>
        </div>
      </motion.div>
    </div>

  );
};
