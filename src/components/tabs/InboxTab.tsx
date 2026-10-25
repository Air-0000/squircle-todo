import React, { useMemo, useState } from 'react';
import { CircleCheckBig, Search, X } from 'lucide-react';
import { compareByUrgencyThenNewest, isListable, matchesSearch } from '../../domain/task';
import { useTaskStore } from '../../stores/useTaskStore';
import { useUIStore } from '../../stores/useUIStore';
import { haptic } from '../../utils/bridge';
import { Section } from '../ui/List';
import { TextButton } from '../ui/ModuleCard';
import { EmptyState, QuickAddForm } from '../ui/controls';
import { TaskRow } from '../tasks/TaskRow';

const SearchField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <label className="flex items-center gap-2 h-10 px-3 rounded-squircle bg-theme-card-subtle">
    <Search className="w-4 h-4 text-theme-text-muted shrink-0" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="搜索"
      className="flex-1 min-w-0 bg-transparent text-body text-theme-text placeholder:text-theme-text-muted outline-none [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button type="button" onClick={() => onChange('')} aria-label="清除搜索" className="text-theme-text-muted">
        <X className="w-4 h-4" />
      </button>
    )}
  </label>
);

/** "待办" tab: every task across panels, grouped by status. */
export const InboxTab: React.FC = () => {
  const tasks = useTaskStore(s => s.tasks);
  const addTask = useTaskStore(s => s.addTask);
  const [query, setQuery] = useState('');
  const [showDone, setShowDone] = useState(false);

  const { emergencies, open, done } = useMemo(() => {
    const visible = tasks.filter(t => isListable(t) && matchesSearch(t, query)).sort(compareByUrgencyThenNewest);
    return {
      emergencies: visible.filter(t => t.isEmergency && !t.completed),
      open: visible.filter(t => !t.isEmergency && !t.completed),
      done: visible.filter(t => t.completed),
    };
  }, [tasks, query]);

  const quickAdd = (title: string) => {
    addTask({ title, period: 'daily', frequency: 'daily', tags: ['日常待办'] });
    haptic('light');
  };

  const nothingAtAll = tasks.filter(isListable).length === 0;

  return (
    <div className="space-y-6">
      <SearchField value={query} onChange={setQuery} />

      {emergencies.length > 0 && (
        <Section title={<span className="text-rose-500 font-medium">紧急</span>}>
          {emergencies.map(t => (
            <TaskRow key={t.id} task={t} showPanel />
          ))}
        </Section>
      )}

      <Section
        title="进行中"
        action={
          <TextButton className="h-auto px-0 text-footnote" onClick={() => useUIStore.getState().openAddTask({ target: 'inbox', period: 'daily' })}>
            详细添加
          </TextButton>
        }
      >
        <QuickAddForm variant="row" placeholder="新建每日待办" onSubmit={quickAdd} />
        {open.map(t => (
          <TaskRow key={t.id} task={t} showPanel />
        ))}
      </Section>

      {nothingAtAll ? (
        <EmptyState icon={<CircleCheckBig className="w-10 h-10 text-theme-text-muted/60" strokeWidth={1.5} />}>
          还没有待办。在上方输入，或点右下角「+」添加更详细的事项。
        </EmptyState>
      ) : (
        open.length === 0 &&
        emergencies.length === 0 &&
        !query && <EmptyState>今天的待办都完成了 🎉</EmptyState>
      )}

      {done.length > 0 && (
        <Section
          variant={showDone ? 'list' : 'plain'}
          title={`已完成 ${done.length}`}
          action={
            <TextButton className="h-auto px-0 text-footnote" onClick={() => setShowDone(v => !v)}>
              {showDone ? '隐藏' : '显示'}
            </TextButton>
          }
        >
          {showDone ? done.map(t => <TaskRow key={t.id} task={t} showPanel />) : null}
        </Section>
      )}

      {query && emergencies.length + open.length + done.length === 0 && <EmptyState>没有找到「{query}」</EmptyState>}
    </div>
  );
};
