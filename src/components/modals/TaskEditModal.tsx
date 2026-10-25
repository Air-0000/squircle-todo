import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BookTemplate, CheckCircle2, Layers, Plus, Save, Trash2 } from 'lucide-react';
import { createSubtask, subtaskProgress, type Subtask, type Task } from '../../domain/task';
import { getTask, useTaskStore } from '../../stores/useTaskStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { burstConfetti } from '../../utils/confetti';
import { Modal } from '../ui/Modal';
import { PillTag } from '../ui/PillTag';
import { SquircleButton } from '../ui/SquircleButton';
import { CheckButton, ProgressBar } from '../ui/controls';

interface EditorProps {
  task: Task;
  onClose: () => void;
}

/** Checklist-first editor. Edits are local until "保存". */
const TaskEditor: React.FC<EditorProps> = ({ task, onClose }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks);
  const [newSubtask, setNewSubtask] = useState('');
  const [error, setError] = useState('');

  const isTemplate = task.isTemplate;
  const progress = subtaskProgress(subtasks);
  const allDone = !isTemplate && progress.total > 0 && progress.completed === progress.total;

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, createSubtask(newSubtask)]);
    setNewSubtask('');
    haptic('light');
  };

  const toggle = (id: string) => {
    if (isTemplate) return;
    const next = subtasks.map(s => (s.id === id ? { ...s, completed: !s.completed } : s));
    setSubtasks(next);
    if (next.length > 0 && next.every(s => s.completed)) {
      haptic('success');
      burstConfetti();
    } else {
      haptic('light');
    }
  };

  const save = () => {
    if (!title.trim()) {
      setError('事项标题不能为空');
      haptic('error');
      return;
    }
    const store = useTaskStore.getState();
    store.updateTask(task.id, { title, description: description.trim() });
    // Syncs the parent's completion with the checklist.
    store.setSubtasks(task.id, subtasks);
    haptic('success');
    onClose();
  };

  const remove = () =>
    toast.confirm({
      title: isTemplate ? '删除预设预案？' : '删除待办事项？',
      message: isTemplate ? '确定要从预案库中删除此预设吗？' : '确定要删除此待办事项吗？此操作无法撤销。',
      confirmText: '确认删除',
      danger: true,
      onConfirm: () => {
        useTaskStore.getState().deleteTask(task.id);
        onClose();
        toast.info(isTemplate ? '预案已删除' : '待办事项已删除');
      },
    });

  return (
    <Modal
      open
      onClose={onClose}
      variant="sheet"
      maxWidth="max-w-lg"
      icon={isTemplate ? <BookTemplate className="w-4.5 h-4.5" /> : <Layers className="w-4.5 h-4.5" />}
      iconClassName={
        isTemplate ? 'bg-amber-500/15 text-amber-500' : task.isEmergency ? 'bg-rose-500/15 text-rose-500' : 'bg-theme-accent/15 text-theme-accent'
      }
      title={
        isTemplate ? `预案步骤编排 · ${title || '预设事项'}` : task.isEmergency ? `🚨 突发事件处置 · ${title}` : `📋 任务步骤执行 · ${title}`
      }
      subtitle={isTemplate ? '预设流程步骤清单 · 无需打卡 · 随时一键发起调用' : '逐项划掉子任务 · 全部完成自动刷新打卡'}
      footer={
        <>
          <button
            type="button"
            onClick={remove}
            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 px-2 py-1.5 rounded-squircle hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isTemplate ? '删除预案' : '删除任务'}</span>
          </button>
          <div className="flex items-center gap-2">
            <SquircleButton variant="tonal" onClick={onClose} size="sm">
              取消
            </SquircleButton>
            <SquircleButton
              variant="filled"
              onClick={save}
              size="sm"
              haptic={false}
              icon={<Save className="w-3.5 h-3.5" />}
              className={allDone ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              {allDone ? '保存并自动归档' : '保存修改'}
            </SquircleButton>
          </div>
        </>
      }
    >
      {error && (
        <div className="p-2.5 rounded-squircle bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-3 bg-theme-card rounded-squircle border border-theme-border/70 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">{isTemplate ? '预设事项名称' : '主任务名称'}</span>
          <span className="text-[10px] text-theme-text-muted">可直接修改</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            setError('');
          }}
          placeholder="请输入事项名称..."
          className="w-full text-xs px-2.5 py-1.5 rounded-squircle bg-theme-card-subtle text-theme-text border border-theme-border/60 focus:border-theme-accent outline-none font-semibold"
        />
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-squircle bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 text-xs flex items-center gap-2 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <div className="flex-1 font-semibold leading-tight">🎉 全部子任务已划掉完成！点击下方保存将自动刷新并妥善归档！</div>
        </motion.div>
      )}

      <div className="space-y-2.5 p-3.5 rounded-squircle-lg bg-theme-card-subtle border border-theme-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-theme-text flex items-center gap-1.5">
            <span>
              执行子步骤清单 ({progress.completed}/{progress.total})
            </span>
            {progress.total > 0 && <PillTag size="sm" variant={allDone ? 'primary' : 'subtle'} label={allDone ? '100% 全部完成' : `${progress.percent}%`} />}
          </span>
          {isTemplate ? (
            <span className="text-[10px] text-amber-500 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10">📋 预设清单 · 不划任务</span>
          ) : (
            <span className="text-[10px] text-theme-text-muted">点击左侧圆圈划掉完成</span>
          )}
        </div>

        {progress.total > 0 && <ProgressBar ratio={progress.ratio} height="h-1.5" />}

        <div className="flex items-center gap-1.5 pt-0.5">
          <input
            type="text"
            autoFocus
            value={newSubtask}
            onChange={e => setNewSubtask(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              }
            }}
            placeholder={isTemplate ? '+ 输入预案执行步骤，按回车快速添加...' : '+ 输入执行子步骤，按回车快速添加...'}
            className="flex-1 text-xs px-3 py-2 rounded-squircle bg-theme-card text-theme-text border border-theme-border outline-none focus:border-theme-accent placeholder:text-theme-text-muted/60"
          />
          <SquircleButton size="sm" variant="filled" onClick={addSubtask} haptic={false} className="shrink-0" icon={<Plus className="w-3.5 h-3.5" />}>
            添加步骤
          </SquircleButton>
        </div>

        <div className="space-y-1.5 pt-1 max-h-64 overflow-y-auto">
          {subtasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-theme-text-muted border border-dashed border-theme-border/70 rounded-squircle bg-theme-card/40">
              {isTemplate ? '暂无预案步骤，在上方输入如「核对交接单 / 检查配电箱」添加' : '暂无子任务步骤，在上方输入具体执行步骤按回车添加'}
            </div>
          ) : (
            subtasks.map((sub, i) => (
              <div
                key={sub.id}
                onClick={() => toggle(sub.id)}
                className={`flex items-center gap-2.5 p-2.5 rounded-squircle border text-xs transition-all ${
                  isTemplate
                    ? 'bg-theme-card border-theme-border text-theme-text'
                    : sub.completed
                      ? 'bg-theme-card/50 border-theme-border/40 text-theme-text-muted opacity-80 cursor-pointer'
                      : 'bg-theme-card border-theme-border text-theme-text hover:border-theme-accent/60 cursor-pointer shadow-sm'
                }`}
              >
                {isTemplate ? (
                  <span className="w-5 h-5 rounded-squircle bg-amber-500/15 text-amber-600 font-bold text-[10px] flex items-center justify-center shrink-0">{i + 1}</span>
                ) : (
                  <CheckButton checked={sub.completed} onToggle={() => toggle(sub.id)} />
                )}
                <span
                  className={`flex-1 truncate select-none ${
                    !isTemplate && sub.completed ? 'line-through text-theme-text-muted decoration-theme-text-muted/60 decoration-2' : 'font-medium'
                  }`}
                >
                  {sub.text}
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setSubtasks(subtasks.filter(s => s.id !== sub.id));
                    haptic('light');
                  }}
                  className="text-theme-text-muted hover:text-rose-500 p-1 rounded-squircle hover:bg-theme-card-subtle transition-colors shrink-0"
                  aria-label="删除子项"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <label className="block space-y-1 pt-1">
        <span className="text-[11px] font-medium text-theme-text-secondary">备注说明 (选填)</span>
        <textarea
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="添加详细要点或应急指引备注..."
          className="w-full text-xs px-3 py-2 rounded-squircle bg-theme-card text-theme-text border border-theme-border/70 focus:border-theme-accent outline-none resize-none placeholder:text-theme-text-muted/60"
        />
      </label>
    </Modal>
  );
};

export const TaskEditModal: React.FC = () => {
  const taskId = useUIStore(s => s.editingTaskId);
  // Snapshot at open time; edits stay local until saved.
  const task = taskId ? getTask(taskId) : undefined;
  const close = () => useUIStore.getState().close('editingTaskId');
  return task ? <TaskEditor key={task.id} task={task} onClose={close} /> : null;
};
