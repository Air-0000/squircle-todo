import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CYCLE_LABELS, type CyclePeriod } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { toast } from '../../../stores/useToastStore';
import { haptic } from '../../../utils/bridge';
import { CardList } from '../../ui/List';
import { ModuleCard, TextButton } from '../../ui/ModuleCard';
import { EmptyState, SegmentedControl } from '../../ui/controls';
import { TaskRow } from '../../tasks/TaskRow';
import type { ModuleProps } from './types';

const PERIOD_LABELS: Record<CyclePeriod, string> = { daily: '每日', weekly: '每周', monthly: '每月' };

const RESET_HINT: Record<CyclePeriod, string> = {
  daily: '每天 0 点自动重置',
  weekly: '每周一自动重置',
  monthly: '每月 1 日自动重置',
};

/** This panel's recurring tasks, grouped by cycle, with a manual reset. */
export const CyclesModule: React.FC<ModuleProps> = ({ panel }) => {
  const periods = panel.cycleTypes?.length ? panel.cycleTypes : (['daily', 'weekly', 'monthly'] as CyclePeriod[]);
  const [period, setPeriod] = useState<CyclePeriod>(periods[0]);
  const tasks = useTaskStore(s => s.tasks);
  const resetCycleNow = useTaskStore(s => s.resetCycleNow);

  const cycleTasks = tasks.filter(t => t.panelId === panel.id && t.period === period && !t.isTemplate && !t.isEmergency);
  const doneCount = cycleTasks.filter(t => t.completed).length;

  const reset = () => {
    const count = resetCycleNow(period, panel.id);
    haptic('medium');
    toast.success(`已重置${CYCLE_LABELS[period]}打卡（${count} 项）`);
  };

  return (
    <ModuleCard
      icon={RefreshCw}
      iconTone="bg-amber-500 text-white"
      title="周期打卡"
      subtitle={`${RESET_HINT[period]} · 已完成 ${doneCount}/${cycleTasks.length}`}
      actions={<TextButton onClick={reset}>重置</TextButton>}
    >
      {periods.length > 1 && <SegmentedControl value={period} onChange={setPeriod} options={periods.map(p => ({ value: p, label: PERIOD_LABELS[p] }))} />}
      {cycleTasks.length === 0 ? (
        <EmptyState className="!py-3">还没有{PERIOD_LABELS[period]}打卡事项，点「+」添加</EmptyState>
      ) : (
        <CardList>
          {cycleTasks.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
        </CardList>
      )}
    </ModuleCard>
  );
};
