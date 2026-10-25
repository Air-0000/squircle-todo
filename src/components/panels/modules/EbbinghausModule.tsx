import React, { useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { toDateKey } from '../../../domain/dates';
import type { Task } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { toast } from '../../../stores/useToastStore';
import { ModuleCard } from '../../ui/ModuleCard';
import { EmptyState, SegmentedControl } from '../../ui/controls';
import { CompactTaskRow } from '../../tasks/CompactTaskRow';
import { toggleTask } from '../../tasks/taskActions';
import type { ModuleProps } from './types';

type ReviewFilter = 'due_today' | 'overdue' | 'all';

const FILTERS = [
  { value: 'due_today' as const, label: '今日需复习' },
  { value: 'overdue' as const, label: '逾期未复习', activeClassName: 'bg-rose-500 text-white shadow-2xs' },
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
    if (!t.completed) toast.success('已完成本次艾宾浩斯复习打卡！');
  };

  return (
    <ModuleCard
      icon={BookOpen}
      iconTone="bg-indigo-500/15 border-indigo-500/25 text-indigo-500"
      title="艾宾浩斯智能复习排期"
      subtitle="1/2/4/7/15 天遗忘周期智能循环"
    >
      <SegmentedControl size="xs" stretch value={filter} onChange={setFilter} options={FILTERS} />
      {items.length === 0 ? (
        <EmptyState icon={<Check className="w-5 h-5 text-emerald-500 opacity-70" />}>当前无待复习事项，记忆周期维持良好！</EmptyState>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {items.map(task => (
            <CompactTaskRow
              key={task.id}
              task={task}
              onToggle={() => toggle(task)}
              subtitle={reviewDate(task) ? `下轮复习: ${reviewDate(task)}` : '艾宾浩斯复习条目'}
              trailing={<span className="text-[10px] px-1.5 py-px rounded-full bg-indigo-500/15 text-indigo-500 font-bold">复习</span>}
            />
          ))}
        </div>
      )}
    </ModuleCard>
  );
};
