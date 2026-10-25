import React from 'react';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { isActiveEmergency } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { useUIStore } from '../../../stores/useUIStore';
import { toast } from '../../../stores/useToastStore';
import { haptic } from '../../../utils/bridge';
import { ModuleCard } from '../../ui/ModuleCard';
import { QuickAddForm } from '../../ui/controls';
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
    toast.error(`🚨 突发事件「${title}」已置顶并设为最高优先级！`);
  };

  const resolve = (id: string, title: string) => {
    resolveEmergency(id);
    haptic('success');
    toast.success(`已处置并销项突发事件「${title}」`);
  };

  return (
    <ModuleCard
      icon={AlertTriangle}
      iconTone="bg-rose-500/15 border-rose-500/30 text-rose-500"
      className="bg-theme-card border border-rose-500/30"
      title={
        <span className="flex items-center gap-1.5">
          <span>突发紧急事件响应</span>
          {active.length > 0 && (
            <span className="text-[10px] px-1.5 py-px rounded-full bg-rose-500 text-white font-bold animate-pulse">{active.length} 项处理中</span>
          )}
        </span>
      }
      subtitle="全系统最高优先级置顶响应与处置闭环"
      actions={
        <button
          onClick={() => useUIStore.getState().openAddTask({ target: 'emergency' })}
          className="p-1 px-2.5 rounded-squircle bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>登记突发</span>
        </button>
      }
    >
      <QuickAddForm tone="danger" buttonLabel="置顶" placeholder="快速上报突发事件（如配电箱跳闸、消防门异常）..." onSubmit={report} />
      {active.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {active.map(em => (
            <div key={em.id} className="p-2.5 rounded-squircle bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-xs font-bold text-rose-500 truncate">{em.title}</span>
              </div>
              <button
                onClick={() => resolve(em.id, em.title)}
                className="py-1 px-2.5 rounded-squircle bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>处置销项</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </ModuleCard>
  );
};
