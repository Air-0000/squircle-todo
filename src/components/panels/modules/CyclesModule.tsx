import React, { useState, useMemo } from 'react';
import { RotateCcw, Sun, CalendarDays, CalendarRange, Check, RefreshCw } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { useTaskStore } from '../../../stores/useTaskStore';
import { TodoItem } from '../../../types';
import { nativeBridge } from '../../../utils/bridge';
import { toast } from '../../../stores/useToastStore';

interface CyclesModuleProps {
  personaId?: string;
  allowedPeriods?: ('daily' | 'weekly' | 'monthly')[];
  onEditTask?: (task: TodoItem) => void;
}

export const CyclesModule: React.FC<CyclesModuleProps> = ({
  personaId,
  allowedPeriods = ['daily', 'weekly', 'monthly'],
  onEditTask,
}) => {
  const { tasks, toggleTask, forceRefreshCycle } = useTaskStore();
  const [activeCycleTab, setActiveCycleTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hoursLeftToday = Math.max(1, Math.round((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)));

  const cycleTasks = useMemo(() => {
    return tasks.filter(t => {
      if (personaId && (t.persona || t.personaId) !== personaId) return false;
      if (t.isEmergency || t.periodType === 'emergency') return false;
      if (t.isTemplate || t.tags?.includes('预设事项')) return false;

      const pType = t.periodType || t.category;
      return pType === activeCycleTab || t.frequency === activeCycleTab;
    });
  }, [tasks, personaId, activeCycleTab]);

  const handleManualReset = () => {
    const count = forceRefreshCycle(activeCycleTab, personaId);
    nativeBridge.performHapticFeedback('medium');
    const label = activeCycleTab === 'daily' ? '每日' : activeCycleTab === 'weekly' ? '每周' : '每月';
    toast.success(`已重置「${label}」打卡事项 (${count} 项已刷新为待办)`);
  };

  const handleToggle = (taskId: string) => {
    nativeBridge.performHapticFeedback('light');
    toggleTask(taskId);
  };

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-theme-text">周期自适应打卡待办</h3>
            <p className="text-[10px] text-theme-text-muted mt-0.5">
              距离零点刷新还剩 <span className="font-bold text-theme-accent">{hoursLeftToday}</span> 小时
            </p>
          </div>
        </div>

        <button
          onClick={handleManualReset}
          className="p-1 px-2 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border text-[11px] font-semibold text-theme-text flex items-center space-x-1"
          title="手动无感重置本周期"
        >
          <RefreshCw className="w-3 h-3 text-theme-accent" />
          <span>手动重置</span>
        </button>
      </div>

      {/* Cycle Period Switcher Pills */}
      <div className="flex items-center space-x-1 bg-theme-card-subtle p-0.5 rounded-full border border-theme-border/60">
        {allowedPeriods.includes('daily') && (
          <button
            onClick={() => setActiveCycleTab('daily')}
            className={`flex-1 py-1 rounded-full text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
              activeCycleTab === 'daily'
                ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>每日打卡</span>
          </button>
        )}
        {allowedPeriods.includes('weekly') && (
          <button
            onClick={() => setActiveCycleTab('weekly')}
            className={`flex-1 py-1 rounded-full text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
              activeCycleTab === 'weekly'
                ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>周常事项</span>
          </button>
        )}
        {allowedPeriods.includes('monthly') && (
          <button
            onClick={() => setActiveCycleTab('monthly')}
            className={`flex-1 py-1 rounded-full text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
              activeCycleTab === 'monthly'
                ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>月常重点</span>
          </button>
        )}
      </div>

      {/* Tasks List */}
      {cycleTasks.length === 0 ? (
        <div className="py-4 text-center text-theme-text-muted text-xs bg-theme-card-subtle rounded-squircle border border-theme-border/40">
          <span>暂无当前周期的打卡事项，可在下方添加</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
          {cycleTasks.map(task => {
            const isDone = Boolean(task.completed || task.isCompleted);
            return (
              <div
                key={task.id}
                onClick={() => onEditTask && onEditTask(task)}
                className={`p-2.5 rounded-squircle border transition-all flex items-center justify-between cursor-pointer ${
                  isDone 
                    ? 'bg-theme-card-subtle/50 border-theme-border/40 opacity-60' 
                    : 'bg-theme-card hover:bg-theme-card-subtle border-theme-border/70'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(task.id);
                    }}
                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-theme-border hover:border-theme-accent'
                    }`}
                  >
                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span className={`text-xs font-semibold truncate ${isDone ? 'line-through text-theme-text-muted' : 'text-theme-text'}`}>
                    {task.title}
                  </span>
                </div>

                <span className="text-[10px] text-theme-text-muted shrink-0 font-mono">
                  {task.frequencyDetail || '周期刷新'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SquircleCard>
  );
};
