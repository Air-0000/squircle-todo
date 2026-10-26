import React from 'react';
import { Play, Timer } from 'lucide-react';
import { toDateKey } from '../../../domain/dates';
import { formatClock, minutesOnDate } from '../../../domain/focus';
import { useFocusStore } from '../../../stores/useFocusStore';
import { ModuleCard } from '../../ui/ModuleCard';
import { SquircleButton } from '../../ui/SquircleButton';
import type { ModuleProps } from './types';

export const PomodoroFocusModule: React.FC<ModuleProps> = () => {
  const history = useFocusStore(s => s.history);
  const isRunning = useFocusStore(s => s.isRunning);
  const mode = useFocusStore(s => s.mode);
  const timeLeft = useFocusStore(s => s.timeLeft);
  const open = useFocusStore(s => s.open);
  const todayMinutes = minutesOnDate(history, toDateKey());

  return (
    <ModuleCard
      icon={Timer}
      iconTone="bg-emerald-500 text-white"
      title="专注"
      subtitle={isRunning ? (mode === 'pomodoro' ? `番茄钟进行中 · ${formatClock(timeLeft)}` : '秒表进行中') : `今天已专注 ${todayMinutes} 分钟`}
    >
      <div className="grid grid-cols-2 gap-2">
        <SquircleButton haptic={false} icon={<Play className="w-4 h-4 fill-current" />} onClick={() => open({ mode: 'pomodoro', minutes: 25 })}>
          番茄钟 25 分
        </SquircleButton>
        <SquircleButton haptic={false} variant="gray" onClick={() => open({ mode: 'stopwatch' })}>
          秒表 / 时钟
        </SquircleButton>
      </div>
    </ModuleCard>
  );
};
