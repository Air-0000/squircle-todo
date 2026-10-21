import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Search, 
  FolderPlus,
  ChevronRight,
  Plus
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { TaskItemRow } from '../common/TaskItemRow';
import { useTaskStore } from '../../stores/useTaskStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { TodoItem } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { toast } from '../../stores/useToastStore';

interface UniversalTasksTabProps {
  onOpenAddModal?: () => void;
  onEditTask: (task: TodoItem) => void;
  onNavigateToPanel: (panelId: string) => void;
}

export const UniversalTasksTab: React.FC<UniversalTasksTabProps> = ({
  onOpenAddModal,
  onEditTask,
  onNavigateToPanel,
}) => {
  const { tasks, toggleTask, deleteTask, addTask } = useTaskStore();
  const { panels, openAddPanelModal } = usePanelStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [quickInput, setQuickInput] = useState('');

  // Active emergency incidents
  const activeEmergencies = useMemo(() => {
    return tasks.filter(t => 
      !t.isTemplate && 
      !t.tags?.includes('预设事项') &&
      (t.isEmergency || t.periodType === 'emergency' || t.category === 'emergency') &&
      !t.completed && 
      !t.isCompleted
    );
  }, [tasks]);

  // General filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.isTemplate || t.tags?.includes('预设事项')) return false;

      // Status filter
      const isDone = Boolean(t.completed || t.isCompleted);
      if (statusFilter === 'active' && isDone) return false;
      if (statusFilter === 'completed' && !isDone) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const tagMatch = t.tags?.some(tag => tag.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !tagMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Pinned / Emergency first
      const aUrgent = a.isEmergency || a.priority === 'urgent' || a.isPinned;
      const bUrgent = b.isEmergency || b.priority === 'urgent' || b.isPinned;
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, statusFilter, searchQuery]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    addTask({
      title: quickInput.trim(),
      persona: 'custom',
      category: 'daily',
      tags: ['日常待办'],
    });

    setQuickInput('');
    nativeBridge.performHapticFeedback('light');
    toast.success('已添加新待办！');
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Dynamic Panel Switcher Pills & Add Panel shortcut */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          className="px-3 py-1.5 rounded-full text-xs font-bold bg-theme-accent text-theme-accent-contrast shadow-2xs shrink-0 flex items-center space-x-1"
        >
          <span>全部待办</span>
          <span className="text-[10px] opacity-80 font-mono">({filteredTasks.length})</span>
        </button>

        {panels.map(p => (
          <button
            key={p.id}
            onClick={() => onNavigateToPanel(p.id)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-theme-card hover:bg-theme-card-subtle text-theme-text border border-theme-border/70 shrink-0 flex items-center space-x-1.5 transition-colors"
          >
            <span>{p.name}</span>
            <span className="text-[9px] px-1 py-0.2 rounded-full bg-theme-accent/15 text-theme-accent font-bold">
              {p.enabledModules.length}模块
            </span>
          </button>
        ))}

        <button
          onClick={openAddPanelModal}
          className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-theme-card-subtle hover:bg-theme-card text-theme-accent border border-dashed border-theme-accent/40 shrink-0 flex items-center space-x-1 transition-colors"
          title="从模板或空白添加自定义面板"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>+ 添加面板</span>
        </button>
      </div>

      {/* Emergency alert card if active */}
      {activeEmergencies.length > 0 && (
        <SquircleCard elevation={2} radius="lg" className="p-3.5 bg-rose-500/10 border border-rose-500/30 shadow-squircle space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-xs font-bold text-rose-500">突发紧急事件提醒 ({activeEmergencies.length})</h3>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
              最高优先级
            </span>
          </div>

          <div className="space-y-1">
            {activeEmergencies.map(em => (
              <div
                key={em.id}
                onClick={() => onEditTask(em)}
                className="p-2 rounded-squircle bg-theme-card border border-rose-500/20 text-xs font-semibold text-theme-text flex items-center justify-between cursor-pointer"
              >
                <span className="truncate pr-2">{em.title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
              </div>
            ))}
          </div>
        </SquircleCard>
      )}

      {/* Search & Quick Add Section */}
      <SquircleCard elevation={2} radius="lg" className="p-3.5 bg-theme-card border border-theme-border shadow-squircle space-y-2.5">
        <form onSubmit={handleQuickAdd} className="flex items-center space-x-2">
          <input
            type="text"
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            placeholder="随时记录一条新待办事项..."
            className="flex-1 bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-accent"
          />
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="py-2 px-3.5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 disabled:opacity-50"
          >
            添加
          </button>
        </form>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                  : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                statusFilter === 'active'
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                  : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              进行中
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                statusFilter === 'completed'
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                  : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              已完成
            </button>
          </div>

          <div className="flex items-center space-x-1.5 w-36">
            <Search className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索待办..."
              className="w-full bg-transparent text-[11px] text-theme-text placeholder:text-theme-text-muted focus:outline-none"
            />
          </div>
        </div>
      </SquircleCard>

      {/* Task List */}
      <div className="space-y-1.5">
        {filteredTasks.length === 0 ? (
          <SquircleCard elevation={1} radius="lg" className="p-8 bg-theme-card border border-theme-border text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <h3 className="text-sm font-bold text-theme-text">当前无待办任务</h3>
            <p className="text-[11px] text-theme-text-muted">
              所有任务均已完成，或点击下方「+」随时创建新待办
            </p>
          </SquircleCard>
        ) : (
          filteredTasks.map(task => (
            <TaskItemRow
              key={task.id}
              task={task}
              onToggle={(id) => {
                nativeBridge.performHapticFeedback('light');
                toggleTask(id);
              }}
              onDelete={(id) => {
                nativeBridge.performHapticFeedback('medium');
                deleteTask(id);
              }}
              onClick={() => onEditTask(task)}
            />
          ))
        )}
      </div>

      {onOpenAddModal && (
        <div className="pt-2 text-center">
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              onOpenAddModal();
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-theme-card hover:bg-theme-card-subtle border border-theme-border/60 text-xs text-theme-text-secondary hover:text-theme-text transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加更详细的待办事项</span>
          </button>
        </div>
      )}
    </div>
  );
};
