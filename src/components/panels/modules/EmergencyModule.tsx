import React from 'react';
import { Siren } from 'lucide-react';
import { isActiveEmergency } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { useUIStore } from '../../../stores/useUIStore';
import { toast } from '../../../stores/useToastStore';
import { haptic } from '../../../utils/bridge';
import { CardList } from '../../ui/List';
import { ModuleCard, TextButton } from '../../ui/ModuleCard';
import { QuickAddForm } from '../../ui/controls';
import { TaskRow } from '../../tasks/TaskRow';
import type { ModuleProps } from './types';

/** All open emergencies (app-wide), with quick report and resolve. */
export const EmergencyModule: React.FC<ModuleProps> = ({ panel }) => {
  const tasks = useTaskStore(s => s.tasks);
  const addTask = useTaskStore(s => s.addTask);
  const resolveEmergency = useTaskStore(s => s.resolveEmergency);
  const active = tasks.filter(isActiveEmergency);

  const report = (title: string) => {
    addTask({ title, isEmergency: true, emergencyLevel: 'urgent', panelId: panel.id, flavor: 'work', tags: ['突发事件', '紧急'] });
    haptic('heavy');
    toast.error(`已登记突发事件「${title}」`);
  };

  const resolve = (id: string, title: string) => {
    resolveEmergency(id);
    haptic('success');
    toast.success(`已处置「${title}」`);
  };

  return (
    <ModuleCard
      icon={Siren}
      iconTone="bg-rose-500 text-white"
      title="突发事件"
      subtitle={active.length > 0 ? <span className="text-rose-500">{active.length} 项待处置</span> : '暂无突发事件'}
      actions={<TextButton onClick={() => useUIStore.getState().openAddTask({ target: 'emergency' })}>登记</TextButton>}
    >
      <QuickAddForm tone="danger" buttonLabel="上报" placeholder="快速上报，如：配电箱跳闸" onSubmit={report} />
      {active.length > 0 && (
        <CardList>
          {active.map(em => (
            <TaskRow
              key={em.id}
              task={em}
              onToggle={() => resolve(em.id, em.title)}
              trailing={
                <TextButton
                  onClick={e => {
                    e.stopPropagation();
                    resolve(em.id, em.title);
                  }}
                >
                  处置
                </TextButton>
              }
            />
          ))}
        </CardList>
      )}
    </ModuleCard>
  );
};
