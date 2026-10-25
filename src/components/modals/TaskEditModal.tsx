import React, { useState } from 'react';
import { Timer, Trash2, X } from 'lucide-react';
import { evaluatePiecewise } from '../../domain/piecewise';
import { CYCLE_LABELS, createSubtask, subtaskProgress, type Subtask, type Task } from '../../domain/task';
import { getTask, useTaskStore } from '../../stores/useTaskStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { burstConfetti } from '../../utils/confetti';
import { Modal } from '../ui/Modal';
import { Badge, Row, RowIcon, Section } from '../ui/List';
import { CheckButton, QuickAddForm } from '../ui/controls';

/** Read-only facts about the task, shown as value rows. */
function detailRows(task: Task, panelName: string | undefined): [string, string][] {
  const rows: [string, string][] = [];
  if (panelName) rows.push(['所属面板', panelName]);
  if (task.piecewise) {
    const stage = evaluatePiecewise(task.piecewise).currentStage;
    if (stage) rows.push(['分段周期', `阶段 ${stage.stageIndex}/${task.piecewise.stages.length} · ${stage.frequencyText}`]);
  } else if (task.period) {
    rows.push(['重复', `${CYCLE_LABELS[task.period]}自动重置`]);
  } else if (task.frequencyDetail) {
    rows.push(['频次', task.frequencyDetail]);
  }
  if (task.startDate || task.endDate) rows.push(['执行期限', [task.startDate, task.endDate].filter(Boolean).join(' – ')]);
  if (task.alarmTime) rows.push(['提醒', task.alarmTime]);
  if (task.clientName) rows.push(['委托人', task.clientName]);
  if (task.submitDate) rows.push(['交付日期', task.submitDate]);
  if (task.focusMinutes > 0) rows.push(['累计专注', `${task.focusMinutes} 分钟 · ${task.pomodoroCount} 个番茄`]);
  return rows;
}

interface EditorProps {
  task: Task;
  onClose: () => void;
}

/** Checklist-first editor. Edits stay local until "完成". */
const TaskEditor: React.FC<EditorProps> = ({ task, onClose }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks);
  const panelName = usePanelStore(s => (task.panelId ? s.panels.find(p => p.id === task.panelId)?.name : undefined));

  const isTemplate = task.isTemplate;
  const progress = subtaskProgress(subtasks);
  const allDone = !isTemplate && progress.total > 0 && progress.completed === progress.total;
  const details = detailRows(task, panelName);

  const toggle = (id: string) => {
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
      haptic('error');
      toast.error('标题不能为空');
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
      title: isTemplate ? '删除这个预设？' : '删除这条待办？',
      message: '删除后无法恢复。',
      confirmText: '删除',
      danger: true,
      onConfirm: () => {
        useTaskStore.getState().deleteTask(task.id);
        onClose();
      },
    });

  const startFocus = () => {
    if (!title.trim()) return save(); // reports the error
    save();
    useFocusStore.getState().open({ mode: 'pomodoro', taskId: task.id });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isTemplate ? '预设清单' : task.isEmergency ? '突发事件' : '待办详情'}
      primary={{ label: '完成', onClick: save }}
    >
      <Section>
        <div className="px-4 pt-3 pb-2 flex items-start gap-2">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="标题"
            className="flex-1 min-w-0 bg-transparent text-headline font-semibold text-theme-text placeholder:text-theme-text-muted outline-none"
          />
          {task.isEmergency && <Badge tone="danger">{task.emergencyLevel === 'critical' ? '特急' : '紧急'}</Badge>}
        </div>
        <div className="mx-4 border-t border-theme-border" />
        <textarea
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="备注"
          className="w-full px-4 py-3 bg-transparent text-body text-theme-text placeholder:text-theme-text-muted outline-none resize-none"
        />
      </Section>

      <Section
        title={isTemplate ? `步骤 ${progress.total}` : `子任务 ${progress.completed}/${progress.total}`}
        footer={allDone ? '全部子任务已完成，点「完成」后这条待办会标记为已完成。' : isTemplate ? '预设清单不打卡，可在登记突发事件时一键载入。' : undefined}
      >
        {subtasks.map((sub, i) => (
          <Row
            key={sub.id}
            leading={
              isTemplate ? (
                <span className="w-[22px] text-center text-footnote font-semibold text-theme-text-secondary tabular-nums">{i + 1}</span>
              ) : (
                <CheckButton checked={sub.completed} onToggle={() => toggle(sub.id)} />
              )
            }
            title={sub.text}
            titleClassName={!isTemplate && sub.completed ? 'text-theme-text-muted line-through' : ''}
            trailing={
              <button
                type="button"
                aria-label="删除子任务"
                onClick={() => setSubtasks(subtasks.filter(s => s.id !== sub.id))}
                className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-theme-text-muted active:bg-theme-card-subtle"
              >
                <X className="w-4 h-4" />
              </button>
            }
          />
        ))}
        <QuickAddForm
          variant="row"
          placeholder={isTemplate ? '添加步骤' : '添加子任务'}
          onSubmit={text => {
            setSubtasks([...subtasks, createSubtask(text)]);
            haptic('light');
          }}
        />
      </Section>

      {details.length > 0 && (
        <Section title="详情">
          {details.map(([label, value]) => (
            <Row key={label} title={label} value={<span className="text-callout">{value}</span>} />
          ))}
        </Section>
      )}

      <Section>
        {!isTemplate && !task.completed && (
          <Row leading={<RowIcon icon={Timer} className="bg-emerald-500 text-white" />} title="开始专注" tone="accent" onClick={startFocus} chevron />
        )}
        <Row leading={<RowIcon icon={Trash2} className="bg-rose-500 text-white" />} title={isTemplate ? '删除预设' : '删除待办'} tone="danger" onClick={remove} />
      </Section>
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
