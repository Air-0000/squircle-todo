import React, { useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { flavorForTemplate } from '../../../domain/panels';
import { compareByUrgencyThenNewest } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { useUIStore } from '../../../stores/useUIStore';
import { toast } from '../../../stores/useToastStore';
import { haptic } from '../../../utils/bridge';
import { ModuleCard } from '../../ui/ModuleCard';
import { EmptyState, QuickAddForm, SegmentedControl } from '../../ui/controls';
import { TaskItemRow } from '../../tasks/TaskItemRow';
import type { ModuleProps } from './types';

const ALL = '__all__';

/** The panel's own task list, optionally split by subject categories. */
export const TaskListModule: React.FC<ModuleProps> = ({ panel }) => {
  const tasks = useTaskStore(s => s.tasks);
  const addTask = useTaskStore(s => s.addTask);
  const [category, setCategory] = useState(ALL);
  const categories = panel.subjectCategories ?? [];

  const panelTasks = tasks
    .filter(t => t.panelId === panel.id && !t.isTemplate)
    .filter(t => category === ALL || t.tags.includes(category) || t.examSubject === category)
    .sort(compareByUrgencyThenNewest);

  const quickAdd = (title: string) => {
    addTask({
      title,
      panelId: panel.id,
      flavor: flavorForTemplate(panel.templateId),
      tags: category === ALL ? [panel.name] : [panel.name, category],
    });
    haptic('light');
    toast.success('已添加到待办清单！');
  };

  return (
    <ModuleCard
      icon={ListChecks}
      title={`${panel.name} 事项清单`}
      subtitle={`共 ${panelTasks.length} 项待办`}
      actions={
        <button
          onClick={() => useUIStore.getState().openAddTask({ target: panel.id })}
          className="p-1 px-2.5 rounded-squircle bg-theme-accent/15 hover:bg-theme-accent/25 border border-theme-accent/30 text-theme-accent text-xs font-bold flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加</span>
        </button>
      }
    >
      {categories.length > 0 && (
        <SegmentedControl
          appearance="chips"
          value={category}
          onChange={setCategory}
          options={[{ value: ALL, label: '全部分类' }, ...categories.map(c => ({ value: c, label: c }))]}
        />
      )}
      <QuickAddForm placeholder={`快速添加「${panel.name}」待办...`} onSubmit={quickAdd} />
      {panelTasks.length === 0 ? (
        <EmptyState>暂无待办事项，输入上方内容快速添加</EmptyState>
      ) : (
        <div className="space-y-1.5 pt-1">
          {panelTasks.map(task => (
            <TaskItemRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </ModuleCard>
  );
};
