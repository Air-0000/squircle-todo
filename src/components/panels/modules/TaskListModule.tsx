import React, { useState, useMemo } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { TaskItemRow } from '../../common/TaskItemRow';
import { useTaskStore } from '../../../stores/useTaskStore';
import { TodoItem } from '../../../types';
import { nativeBridge } from '../../../utils/bridge';
import { toast } from '../../../stores/useToastStore';

interface TaskListModuleProps {
  panelId: string;
  panelName?: string;
  subjectCategories?: string[];
  onEditTask?: (task: TodoItem) => void;
  onOpenAddModal?: () => void;
}

export const TaskListModule: React.FC<TaskListModuleProps> = ({
  panelId,
  panelName = '待办清单',
  subjectCategories,
  onEditTask,
  onOpenAddModal,
}) => {
  const { tasks, toggleTask, deleteTask, addTask } = useTaskStore();
  const [quickInput, setQuickInput] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');

  const panelTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.isTemplate || t.tags?.includes('预设事项')) return false;

      // Match by panelId or persona
      const p = (t as any).panelId || (t as any).personaId || t.persona;
      const matchesPanel = p === panelId || (panelId === 'exam' && p === 'exam') || (panelId === 'art' && p === 'art') || (panelId === 'work' && p !== 'exam' && p !== 'art');

      if (!matchesPanel) return false;

      if (selectedSubCategory !== 'all') {
        return t.category === selectedSubCategory || t.tags?.includes(selectedSubCategory) || (t as any).examData?.subject === selectedSubCategory;
      }
      return true;
    });
  }, [tasks, panelId, selectedSubCategory]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    addTask({
      title: quickInput.trim(),
      persona: panelId as any,
      personaId: panelId as any,
      category: selectedSubCategory !== 'all' ? selectedSubCategory : 'general',
      tags: selectedSubCategory !== 'all' ? [panelName, selectedSubCategory] : [panelName],
    });

    setQuickInput('');
    nativeBridge.performHapticFeedback('light');
    toast.success('已添加到待办清单！');
  };

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-theme-accent/15 border border-theme-accent/25 flex items-center justify-center text-theme-accent shrink-0">
            <ListChecks className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-theme-text">{panelName} 事项清单</h3>
            <p className="text-[10px] text-theme-text-muted mt-0.5">
              共 {panelTasks.length} 项待办
            </p>
          </div>
        </div>

        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="p-1 px-2.5 rounded-squircle bg-theme-accent/15 hover:bg-theme-accent/25 border border-theme-accent/30 text-theme-accent text-xs font-bold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加</span>
          </button>
        )}
      </div>

      {/* Subcategory pills if provided (e.g. for exam subjects) */}
      {subjectCategories && subjectCategories.length > 0 && (
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedSubCategory('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              selectedSubCategory === 'all'
                ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                : 'bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            全部分类
          </button>
          {subjectCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedSubCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                selectedSubCategory === cat
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                  : 'bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Quick Add Bar */}
      <form onSubmit={handleQuickAdd} className="flex items-center space-x-2">
        <input
          type="text"
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          placeholder={`快速添加「${panelName}」待办...`}
          className="flex-1 bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-accent"
        />
        <button
          type="submit"
          disabled={!quickInput.trim()}
          className="py-2 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 disabled:opacity-50"
        >
          添加
        </button>
      </form>

      {/* Task List */}
      {panelTasks.length === 0 ? (
        <div className="py-5 text-center text-theme-text-muted text-xs bg-theme-card-subtle rounded-squircle border border-theme-border/40">
          <span>暂无待办事项，输入上方内容快速添加</span>
        </div>
      ) : (
        <div className="space-y-1.5 pt-1">
          {panelTasks.map(task => (
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
              onClick={() => onEditTask && onEditTask(task)}
            />
          ))}
        </div>
      )}
    </SquircleCard>
  );
};
