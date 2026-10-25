import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, FolderPlus, Plus, Search } from 'lucide-react';
import { compareByUrgencyThenNewest, isActiveEmergency, isListable, matchesSearch } from '../../domain/task';
import { useTaskStore } from '../../stores/useTaskStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { SquircleCard } from '../ui/SquircleCard';
import { QuickAddForm, SegmentedControl } from '../ui/controls';
import { TaskItemRow } from '../tasks/TaskItemRow';
import { openTask } from '../tasks/taskActions';

type StatusFilter = 'all' | 'active' | 'completed';

const STATUS_OPTIONS = [
  { value: 'all' as const, label: '全部' },
  { value: 'active' as const, label: '进行中' },
  { value: 'completed' as const, label: '已完成' },
];

const PanelSwitcher: React.FC<{ count: number }> = ({ count }) => {
  const panels = usePanelStore(s => s.panels);
  const { setActiveTab, open } = useUIStore.getState();
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-theme-accent text-theme-accent-contrast shadow-2xs shrink-0 flex items-center gap-1">
        <span>全部待办</span>
        <span className="text-[10px] opacity-80 font-mono">({count})</span>
      </span>
      {panels.map(p => (
        <button
          key={p.id}
          onClick={() => setActiveTab(p.id)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-theme-card hover:bg-theme-card-subtle text-theme-text border border-theme-border/70 shrink-0 flex items-center gap-1.5 transition-colors"
        >
          <span>{p.name}</span>
          <span className="text-[9px] px-1 py-px rounded-full bg-theme-accent/15 text-theme-accent font-bold">{p.enabledModules.length}模块</span>
        </button>
      ))}
      <button
        onClick={() => {
          haptic('light');
          open('addPanelOpen');
        }}
        title="从模板或空白添加自定义面板"
        className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-theme-card-subtle hover:bg-theme-card text-theme-accent border border-dashed border-theme-accent/40 shrink-0 flex items-center gap-1 transition-colors"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        <span>添加面板</span>
      </button>
    </div>
  );
};

/** "待办" tab: every task across panels, with search and status filter. */
export const InboxTab: React.FC = () => {
  const tasks = useTaskStore(s => s.tasks);
  const addTask = useTaskStore(s => s.addTask);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const emergencies = useMemo(() => tasks.filter(isActiveEmergency), [tasks]);
  const visible = useMemo(
    () =>
      tasks
        .filter(t => isListable(t) && matchesSearch(t, query))
        .filter(t => (status === 'active' ? !t.completed : status === 'completed' ? t.completed : true))
        .sort(compareByUrgencyThenNewest),
    [tasks, query, status],
  );

  const quickAdd = (title: string) => {
    addTask({ title, period: 'daily', frequency: 'daily', tags: ['日常待办'] });
    haptic('light');
    toast.success('已添加新待办！');
  };

  return (
    <div className="space-y-3 pb-8">
      <PanelSwitcher count={visible.length} />

      {emergencies.length > 0 && (
        <SquircleCard elevation={2} radius="lg" className="p-3.5 bg-rose-500/10 border border-rose-500/30 shadow-squircle space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-xs font-bold text-rose-500">突发紧急事件提醒 ({emergencies.length})</h3>
            </div>
            <span className="text-[10px] px-1.5 py-px rounded-full bg-rose-500 text-white font-bold">最高优先级</span>
          </div>
          <div className="space-y-1">
            {emergencies.map(em => (
              <div
                key={em.id}
                onClick={() => openTask(em.id)}
                className="p-2 rounded-squircle bg-theme-card border border-rose-500/20 text-xs font-semibold text-theme-text flex items-center justify-between cursor-pointer"
              >
                <span className="truncate pr-2">{em.title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
              </div>
            ))}
          </div>
        </SquircleCard>
      )}

      <SquircleCard elevation={2} radius="lg" className="p-3.5 bg-theme-card border border-theme-border shadow-squircle space-y-2.5">
        <QuickAddForm placeholder="随时记录一条新待办事项..." onSubmit={quickAdd} />
        <div className="flex items-center justify-between pt-1 gap-2">
          <SegmentedControl appearance="chips" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <label className="flex items-center gap-1.5 w-36">
            <Search className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索待办..."
              className="w-full bg-transparent text-[11px] text-theme-text placeholder:text-theme-text-muted focus:outline-none"
            />
          </label>
        </div>
      </SquircleCard>

      <div className="space-y-1.5">
        {visible.length === 0 ? (
          <SquircleCard elevation={1} radius="lg" className="p-8 bg-theme-card border border-theme-border text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <h3 className="text-sm font-bold text-theme-text">当前无待办任务</h3>
            <p className="text-[11px] text-theme-text-muted">所有任务均已完成，或点击下方「+」随时创建新待办</p>
          </SquircleCard>
        ) : (
          visible.map(task => <TaskItemRow key={task.id} task={task} />)
        )}
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={() => {
            haptic('light');
            useUIStore.getState().openAddTask({ target: 'inbox', period: 'daily' });
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-theme-card hover:bg-theme-card-subtle border border-theme-border/60 text-xs text-theme-text-secondary hover:text-theme-text transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加更详细的待办事项</span>
        </button>
      </div>
    </div>
  );
};
