import React, { useMemo } from 'react';
import { Timer, Play, Maximize2 } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { useFocusStore } from '../../../stores/useFocusStore';
import { nativeBridge } from '../../../utils/bridge';

interface PomodoroFocusModuleProps {
  personaId?: string;
  title?: string;
}

export const PomodoroFocusModule: React.FC<PomodoroFocusModuleProps> = ({
  personaId,
  title = '极简专注与番茄钟',
}) => {
  const { focusHistory, openFocusModal, isRunning, mode, timeLeft } = useFocusStore();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayMinutes = useMemo(() => {
    return (focusHistory || [])
      .filter(r => r.date === todayStr && (!personaId || r.persona === personaId))
      .reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
  }, [focusHistory, todayStr, personaId]);

  const handleStartPomodoro = () => {
    nativeBridge.performHapticFeedback('light');
    openFocusModal({ mode: 'pomodoro', durationMinutes: 25 });
  };

  const handleStartStopwatch = () => {
    nativeBridge.performHapticFeedback('light');
    openFocusModal({ mode: 'stopwatch' });
  };

  const formatTimerMinSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-theme-text">{title}</h3>
            <p className="text-[10px] text-theme-text-muted mt-0.5">
              今日累计专注: <span className="font-bold text-emerald-500">{todayMinutes}</span> 分钟
            </p>
          </div>
        </div>

        {isRunning && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30 flex items-center space-x-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{mode === 'pomodoro' ? `番茄 ${formatTimerMinSec(timeLeft)}` : '秒表进行中'}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          onClick={handleStartPomodoro}
          className="py-2.5 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 flex items-center justify-center space-x-1.5 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>25分钟番茄专注</span>
        </button>

        <button
          onClick={handleStartStopwatch}
          className="py-2.5 px-3 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/80 text-xs font-semibold text-theme-text hover:border-theme-accent flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5 text-theme-accent" />
          <span>全屏翻页时钟</span>
        </button>
      </div>
    </SquircleCard>
  );
};
