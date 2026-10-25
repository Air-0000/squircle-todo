import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { toDateKey } from '../../../domain/dates';
import type { Task } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { toast } from '../../../stores/useToastStore';
import { CardList } from '../../ui/List';
import { ModuleCard } from '../../ui/ModuleCard';
import { EmptyState, SegmentedControl } from '../../ui/controls';
import { TaskRow } from '../../tasks/TaskRow';
import { toggleTask } from '../../tasks/taskActions';
import type { ModuleProps } from './types';

type ReviewFilter = 'due_today' | 'overdue' | 'all';

const FILTERS = [
  { value: 'due_today' as const, label: '今日' },
  { value: 'overdue' as const, label: '逾期', activeClassName: 'text-rose-500' },
  { value: 'all' as const, label: '全部' },
];

const reviewDate = (t: Task) => t.reviewDueDate ?? t.dueDate ?? t.startDate;

/** Review items (tasks with reviewTracking) of this panel, by due date. */
export const EbbinghausModule: React.FC<ModuleProps> = ({ panel }) => {
  const tasks = useTaskStore(s => s.tasks);
  const [filter, setFilter] = useState<ReviewFilter>('due_today');
  const today = toDateKey();

  const items = tasks.filter(t => {
    if (t.panelId !== panel.id || !t.reviewTracking) return false;
    const due = reviewDate(t);
    if (filter === 'due_today') return due === today;
    if (filter === 'overdue') return Boolean(due && due < today && !t.completed);
    return true;
  });

  const toggle = (t: Task) => {
    toggleTask(t.id);
    if (!t.completed) toast.success('已完成本次复习');
  };

  return (
    <ModuleCard icon={BookOpen} iconTone="bg-indigo-500 text-white" title="艾宾浩斯复习" subtitle="1 / 2 / 4 / 7 / 15 天复习节点">
      <SegmentedControl value={filter} onChange={setFilter} options={FILTERS} />
      {items.length === 0 ? (
        <EmptyState className="!py-3">没有需要复习的内容</EmptyState>
      ) : (
        <CardList>
          {items.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggle(task)}
              subtitle={reviewDate(task) ? `下次复习 ${reviewDate(task)}` : undefined}
            />
          ))}
        </CardList>
      )}
    </ModuleCard>
  );
};
