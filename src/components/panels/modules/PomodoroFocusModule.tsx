import React from 'react';
import { Maximize2, Play, Timer } from 'lucide-react';
import { toDateKey } from '../../../domain/dates';
import { formatClock, minutesOnDate } from '../../../domain/focus';
import { useFocusStore } from '../../../stores/useFocusStore';
import { ModuleCard } from '../../ui/ModuleCard';
import type { ModuleProps } from './types';

export const PomodoroFocusModule: React.FC<ModuleProps> = ({ panel }) => {
  const history = useFocusStore(s => s.history);
  const isRunning = useFocusStore(s => s.isRunning);
  const mode = useFocusStore(s => s.mode);
  const timeLeft = useFocusStore(s => s.timeLeft);
  const open = useFocusStore(s => s.open);
  const todayMinutes = minutesOnDate(history, toDateKey());

  return (
    <ModuleCard
      icon={Timer}
      iconTone="bg-emerald-500/15 border-emerald-500/25 text-emerald-500"
      title={`${panel.name} 专注时钟`}
      subtitle={
        <>
          今日累计专注: <span className="font-bold text-emerald-500">{todayMinutes}</span> 分钟
        </>
      }
      actions={
        isRunning && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30 flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{mode === 'pomodoro' ? `番茄 ${formatClock(timeLeft)}` : '秒表进行中'}</span>
          </span>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => open({ mode: 'pomodoro', minutes: 25 })}
          className="py-2.5 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 flex items-center justify-center gap-1.5 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>25分钟番茄专注</span>
        </button>
        <button
          onClick={() => open({ mode: 'stopwatch' })}
          className="py-2.5 px-3 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/80 text-xs font-semibold text-theme-text hover:border-theme-accent flex items-center justify-center gap-1.5 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5 text-theme-accent" />
          <span>全屏翻页时钟</span>
        </button>
      </div>
    </ModuleCard>
  );
};
