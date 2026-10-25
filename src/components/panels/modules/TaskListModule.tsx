import React, { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { flavorForTemplate } from '../../../domain/panels';
import { compareByUrgencyThenNewest } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { useUIStore } from '../../../stores/useUIStore';
import { haptic } from '../../../utils/bridge';
import { CardList } from '../../ui/List';
import { ModuleCard, TextButton } from '../../ui/ModuleCard';
import { QuickAddForm, SegmentedControl } from '../../ui/controls';
import { TaskRow } from '../../tasks/TaskRow';
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
    .sort((a, b) => Number(a.completed) - Number(b.completed) || compareByUrgencyThenNewest(a, b));
  const openCount = panelTasks.filter(t => !t.completed).length;

  const quickAdd = (title: string) => {
    addTask({
      title,
      panelId: panel.id,
      flavor: flavorForTemplate(panel.templateId),
      tags: category === ALL ? [panel.name] : [panel.name, category],
    });
    haptic('light');
  };

  return (
    <ModuleCard
      icon={ListChecks}
      title="事项清单"
      subtitle={`${openCount} 项进行中`}
      actions={<TextButton onClick={() => useUIStore.getState().openAddTask({ target: panel.id })}>添加</TextButton>}
    >
      {categories.length > 0 && (
        <SegmentedControl
          appearance="chips"
          value={category}
          onChange={setCategory}
          options={[{ value: ALL, label: '全部' }, ...categories.map(c => ({ value: c, label: c }))]}
        />
      )}
      <CardList>
        <QuickAddForm variant="row" placeholder={category === ALL ? '新建事项' : `新建「${category}」事项`} onSubmit={quickAdd} />
        {panelTasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
      </CardList>
    </ModuleCard>
  );
};
