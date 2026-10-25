import React from 'react';
import type { Task } from '../../domain/task';
import { CheckButton } from '../ui/controls';
import { openTask, toggleTask } from './taskActions';

interface CompactTaskRowProps {
  task: Task;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onToggle?: () => void;
}

/** One-line task row used inside panel modules (cycles, review, calendar, ...). */
export const CompactTaskRow: React.FC<CompactTaskRowProps> = ({ task, subtitle, trailing, onToggle }) => (
  <div
    onClick={() => openTask(task.id)}
    className={`p-2.5 rounded-squircle border transition-all flex items-center justify-between gap-2 cursor-pointer ${
      task.completed
        ? 'bg-theme-card-subtle/50 border-theme-border/40 opacity-60'
        : 'bg-theme-card hover:bg-theme-card-subtle border-theme-border/70'
    }`}
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <CheckButton
        size="sm"
        shape="round"
        tone="success"
        checked={task.completed}
        onToggle={onToggle ?? (() => toggleTask(task.id))}
      />
      <div className="min-w-0">
        <span className={`text-xs font-semibold block truncate ${task.completed ? 'line-through text-theme-text-muted' : 'text-theme-text'}`}>
          {task.title}
        </span>
        {subtitle && <span className="text-[10px] text-theme-text-muted block truncate">{subtitle}</span>}
      </div>
    </div>
    {trailing && <div className="shrink-0">{trailing}</div>}
  </div>
);
