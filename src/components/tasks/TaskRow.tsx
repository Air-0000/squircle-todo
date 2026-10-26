import React from 'react';
import { Pin } from 'lucide-react';
import { CYCLE_LABELS, subtaskProgress, type Task } from '../../domain/task';
import { evaluatePiecewise } from '../../domain/piecewise';
import { usePanelStore } from '../../stores/usePanelStore';
import { Badge } from '../ui/List';
import { CheckButton } from '../ui/controls';
import { openTask, toggleTask } from './taskActions';

const shortDate = (d: string) => d.slice(5).replace('-', '/');

/** "描述 · 每日 · 考研攻坚 · 子任务 1/2 · 10/25–11/24 · 07:30" */
function metaLine(task: Task, panelName: string | undefined): string {
  const parts: string[] = [];
  if (task.description) parts.push(task.description);
  if (task.piecewise) {
    const stage = evaluatePiecewise(task.piecewise).currentStage;
    if (stage) parts.push(`阶段 ${stage.stageIndex}/${task.piecewise.stages.length}`);
  } else if (task.period && !task.isEmergency) {
    parts.push(CYCLE_LABELS[task.period]);
  }
  if (panelName) parts.push(panelName);
  const progress = subtaskProgress(task.subtasks);
  if (progress.total > 0) parts.push(`子任务 ${progress.completed}/${progress.total}`);
  if (task.startDate && task.endDate) parts.push(`${shortDate(task.startDate)}–${shortDate(task.endDate)}`);
  if (task.clientName) parts.push(`委托人 ${task.clientName}`);
  if (task.submitDate) parts.push(`${shortDate(task.submitDate)} 交付`);
  if (task.alarmTime) parts.push(`${task.alarmTime} 提醒`);
  return parts.join(' · ');
}

interface TaskRowProps {
  task: Task;
  /** Show the owning panel's name in the meta line (inbox). */
  showPanel?: boolean;
  /** Replaces the computed meta line. */
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onToggle?: () => void;
}

/** One task inside a grouped list: check, title, one line of meta. Tap opens the editor. */
export const TaskRow: React.FC<TaskRowProps> = React.memo(({ task, showPanel = false, subtitle, trailing, onToggle }) => {
  const panelName = usePanelStore(s => (showPanel && task.panelId ? s.panels.find(p => p.id === task.panelId)?.name : undefined));
  const meta = subtitle ?? metaLine(task, panelName);
  const { completed, isEmergency } = task;

  const status = isEmergency ? (
    completed ? (
      <Badge tone="success">已处置</Badge>
    ) : (
      <Badge tone="danger">{task.emergencyLevel === 'critical' ? '特急' : '紧急'}</Badge>
    )
  ) : task.isPinned ? (
    <Pin className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
  ) : null;

  return (
    <div className="task-item-containment">
      <div
        role="button"
        tabIndex={0}
        onClick={() => openTask(task.id)}
        onKeyDown={e => e.key === 'Enter' && openTask(task.id)}
        className="flex items-start gap-3 pl-4 cursor-pointer active:bg-theme-card-subtle transition-colors"
      >
        <div className="pt-3">
          <CheckButton checked={completed} tone={isEmergency ? 'danger' : 'accent'} onToggle={onToggle ?? (() => toggleTask(task.id))} />
        </div>
        <div className="row-sep flex-1 min-w-0 flex items-center gap-2 pr-4 py-3 border-b border-theme-border">
          <div className="flex-1 min-w-0">
            <p className={`text-body break-words ${completed ? 'text-theme-text-muted line-through decoration-theme-text-muted/50' : 'text-theme-text'}`}>
              {task.title}
            </p>
            {meta && <p className="text-footnote text-theme-text-secondary truncate mt-0.5">{meta}</p>}
          </div>
          {status}
          {trailing}
        </div>
      </div>
    </div>
  );
});
TaskRow.displayName = 'TaskRow';
