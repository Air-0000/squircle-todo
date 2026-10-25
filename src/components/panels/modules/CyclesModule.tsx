import React, { useState } from 'react';
import { CalendarDays, CalendarRange, RefreshCw, RotateCcw, Sun } from 'lucide-react';
import { CYCLE_LABELS, type CyclePeriod } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { toast } from '../../../stores/useToastStore';
import { haptic } from '../../../utils/bridge';
import { ModuleCard } from '../../ui/ModuleCard';
import { EmptyState, SegmentedControl, type Segment } from '../../ui/controls';
import { CompactTaskRow } from '../../tasks/CompactTaskRow';
import type { ModuleProps } from './types';

const PERIOD_SEGMENTS: Record<CyclePeriod, Segment<CyclePeriod>> = {
  daily: { value: 'daily', label: '每日打卡', icon: Sun },
  weekly: { value: 'weekly', label: '周常事项', icon: CalendarDays },
  monthly: { value: 'monthly', label: '月常重点', icon: CalendarRange },
};

function hoursUntilMidnight(now = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1, Math.round((midnight.getTime() - now.getTime()) / 3_600_000));
}

/** This panel's recurring tasks, grouped by cycle, with a manual reset. */
export const CyclesModule: React.FC<ModuleProps> = ({ panel }) => {
  const periods = panel.cycleTypes?.length ? panel.cycleTypes : (['daily', 'weekly', 'monthly'] as CyclePeriod[]);
  const [period, setPeriod] = useState<CyclePeriod>(periods[0]);
  const tasks = useTaskStore(s => s.tasks);
  const resetCycleNow = useTaskStore(s => s.resetCycleNow);

  const cycleTasks = tasks.filter(t => t.panelId === panel.id && t.period === period && !t.isTemplate && !t.isEmergency);

  const reset = () => {
    const count = resetCycleNow(period, panel.id);
    haptic('medium');
    toast.success(`已重置「${CYCLE_LABELS[period]}」打卡事项 (${count} 项已刷新为待办)`);
  };

  return (
    <ModuleCard
      icon={RotateCcw}
      iconTone="bg-amber-500/15 border-amber-500/25 text-amber-500"
      title="周期自适应打卡待办"
      subtitle={
        <>
          距离零点刷新还剩 <span className="font-bold text-theme-accent">{hoursUntilMidnight()}</span> 小时
        </>
      }
      actions={
        <button
          onClick={reset}
          title="手动重置本周期"
          className="p-1 px-2 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border text-[11px] font-semibold text-theme-text flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3 text-theme-accent" />
          <span>手动重置</span>
        </button>
      }
    >
      <SegmentedControl stretch value={period} onChange={setPeriod} options={periods.map(p => PERIOD_SEGMENTS[p])} />
      {cycleTasks.length === 0 ? (
        <EmptyState>暂无当前周期的打卡事项，可点击「+」添加</EmptyState>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
          {cycleTasks.map(task => (
            <CompactTaskRow
              key={task.id}
              task={task}
              trailing={<span className="text-[10px] text-theme-text-muted font-mono">{task.frequencyDetail || '周期刷新'}</span>}
            />
          ))}
        </div>
      )}
    </ModuleCard>
  );
};
