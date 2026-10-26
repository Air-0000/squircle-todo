import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  Link2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { POMODORO_PRESETS, type FocusMode } from '../../domain/focus';
import { useFocusStore, useLinkedTask } from '../../stores/useFocusStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { applyTheme } from '../../stores/useThemeStore';
import { useBackHandler } from '../../hooks/useBackHandler';
import { haptic, nativeBridge } from '../../utils/bridge';
import { LiquidGlassFlipCard } from './LiquidGlassFlipCard';

const FLAVOR_LABELS = { exam: '考研', art: '绘画', work: '工作', general: '通用' } as const;

const MODES: { id: FocusMode; label: string; icon: React.ComponentType<{ className?: string }>; active: string }[] = [
  { id: 'clock', label: '翻页时钟', icon: Clock, active: 'bg-white/25 text-white shadow-md border border-white/30' },
  { id: 'pomodoro', label: '番茄专注', icon: Flame, active: 'bg-emerald-500/35 text-emerald-200 shadow-md border border-emerald-400/30' },
  { id: 'stopwatch', label: '秒表模考', icon: Timer, active: 'bg-blue-500/35 text-blue-200 shadow-md border border-blue-400/30' },
];

const roundButton = 'p-3.5 rounded-full bg-white/10 border border-white/20 text-white/70 transition-all backdrop-blur-xl';
const toolButton = 'p-2 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 transition-all text-white/80 hover:text-white backdrop-blur-md';

const Separator: React.FC<{ tone: string }> = ({ tone }) => (
  <span className={`text-3xl sm:text-5xl font-mono font-light animate-pulse pb-4 sm:pb-6 select-none ${tone}`}>:</span>
);

const TaskLinker: React.FC = () => {
  const linked = useLinkedTask();
  const linkTask = useFocusStore(s => s.linkTask);
  const candidates = useTaskStore(s => s.tasks).filter(t => !t.completed && !t.isTemplate);
  const [open, setOpen] = useState(false);
  useBackHandler(open, () => setOpen(false));
  const pick = (id: string | null) => {
    haptic('light');
    linkTask(id);
    setOpen(false);
  };
  return (
    <div className="mb-6 w-full max-w-md relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 hover:border-emerald-400/50 backdrop-blur-2xl transition-all shadow-lg"
      >
        <span className="flex items-center gap-2 text-left truncate">
          <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-300">
            <Link2 className="w-3.5 h-3.5" />
          </span>
          <span className="truncate">
            <span className="block text-[10px] text-white/50 uppercase font-semibold">当前关联任务</span>
            <span className="block text-xs font-bold text-white truncate">{linked ? linked.title : '未关联具体任务（点击选择）'}</span>
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-white/50 shrink-0 ml-2" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-3xl z-40 max-h-56 overflow-y-auto text-left"
          >
            <button onClick={() => pick(null)} className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/60 hover:bg-white/10 transition-colors">
              ✕ 不关联具体任务（自由专注）
            </button>
            {candidates.length === 0 ? (
              <p className="p-3 text-xs text-white/40 text-center">暂无进行中的任务</p>
            ) : (
              candidates.map(t => (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                    linked?.id === t.id ? 'bg-emerald-500/25 text-emerald-200 font-bold' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] text-white/40 ml-2 shrink-0">{FLAVOR_LABELS[t.flavor]}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LiveClock: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const date = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/90">{date}</span>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <LiquidGlassFlipCard value={now.getHours()} label="时" />
        <Separator tone="text-white/35" />
        <LiquidGlassFlipCard value={now.getMinutes()} label="分" />
        <Separator tone="text-white/35" />
        <LiquidGlassFlipCard value={now.getSeconds()} label="秒" />
      </div>
      <p className="text-xs sm:text-sm text-white/60 tracking-wider font-light mt-4">「 志之所趋，穷山距海，不可阻也 」</p>
    </div>
  );
};

/** Reset / start-pause / "settle now" buttons shared by pomodoro and stopwatch. */
const TimerControls: React.FC<{ accent: 'emerald' | 'blue'; startLabel: string; pauseLabel: string; elapsedMinutes: number }> = ({
  accent,
  startLabel,
  pauseLabel,
  elapsedMinutes,
}) => {
  const { isRunning, start, pause, reset, recordSession } = useFocusStore();
  const settle = () => {
    if (elapsedMinutes >= 1) recordSession(elapsedMinutes);
    reset();
  };
  const startClass =
    accent === 'emerald'
      ? 'bg-emerald-500 border-emerald-400/60 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
      : 'bg-blue-500 border-blue-400/60 hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]';
  return (
    <div className="flex items-center gap-4 pt-2">
      <button onClick={reset} aria-label="重置计时" title="重置" className={`${roundButton} hover:bg-white/20 hover:text-white`}>
        <RotateCcw className="w-5 h-5" />
      </button>
      <button
        onClick={isRunning ? pause : start}
        className={`px-8 py-3.5 rounded-full font-bold text-sm flex items-center gap-2.5 transition-all shadow-xl backdrop-blur-2xl border ${
          isRunning ? 'bg-amber-500/30 border-amber-400/50 text-amber-200 hover:bg-amber-500/40' : `${startClass} text-slate-950`
        }`}
      >
        {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
        <span>{isRunning ? pauseLabel : startLabel}</span>
      </button>
      <button
        onClick={settle}
        aria-label="提前结算本次专注"
        title="提前结算本次专注"
        className={`${roundButton} ${accent === 'emerald' ? 'hover:bg-emerald-500/20 hover:text-emerald-300' : 'hover:bg-blue-500/20 hover:text-blue-300'}`}
      >
        <CheckCircle2 className="w-5 h-5" />
      </button>
    </div>
  );
};

const PomodoroView: React.FC = () => {
  const { timeLeft, pomodoroMinutes, isRunning, setPomodoroMinutes } = useFocusStore();
  const total = pomodoroMinutes * 60;
  const progress = Math.max(0, Math.min(1, 1 - timeLeft / total));
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center gap-2">
        {POMODORO_PRESETS.map(mins => (
          <button
            key={mins}
            onClick={() => setPomodoroMinutes(mins)}
            disabled={isRunning}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              pomodoroMinutes === mins
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-md'
                : 'bg-white/5 border-white/15 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40'
            }`}
          >
            {mins} 分钟
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        <LiquidGlassFlipCard value={Math.floor(timeLeft / 60)} label="分" />
        <Separator tone="text-emerald-400/60" />
        <LiquidGlassFlipCard value={timeLeft % 60} label="秒" />
      </div>
      <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/15">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <TimerControls accent="emerald" startLabel="开始专注" pauseLabel="暂停专注" elapsedMinutes={Math.round((total - timeLeft) / 60)} />
    </div>
  );
};

const StopwatchView: React.FC = () => {
  const elapsed = useFocusStore(s => s.elapsed);
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <p className="text-xs text-white/50 tracking-wide font-medium">适合全真模考仿真模拟 / 自由作画连续计时</p>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <LiquidGlassFlipCard value={Math.floor(elapsed / 3600)} label="时" />
        <Separator tone="text-blue-400/60" />
        <LiquidGlassFlipCard value={Math.floor((elapsed % 3600) / 60)} label="分" />
        <Separator tone="text-blue-400/60" />
        <LiquidGlassFlipCard value={elapsed % 60} label="秒" />
      </div>
      <TimerControls accent="blue" startLabel="开始计时" pauseLabel="暂停秒表" elapsedMinutes={Math.round(elapsed / 60)} />
    </div>
  );
};

const FocusClockContent: React.FC = () => {
  const { mode, setMode, close, soundEnabled, toggleSound } = useFocusStore();
  const [fullscreen, setFullscreen] = useState(false);
  // Back minimises to the capsule, like the close button (the timer keeps running).
  useBackHandler(true, close);

  // Dark status bar while the clock is up; restore the theme's on close.
  useEffect(() => {
    nativeBridge.setStatusBarTheme(true, '#020617');
    return () => applyTheme();
  }, []);

  const toggleFullscreen = () => {
    haptic('light');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setFullscreen(true), () => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false), () => {});
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="专注时钟"
      className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white select-none backdrop-blur-3xl overflow-y-auto"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[130px] animate-pulse" style={{ animationDuration: '9s' }} />
      </div>

      <header
        style={{ paddingTop: fullscreen ? '14px' : 'max(var(--safe-area-inset-top, 0px), var(--sat, 0px), env(safe-area-inset-top, 0px), 38px)' }}
        className="px-4 pb-3 pt-2 flex items-center justify-between border-b border-white/10 backdrop-blur-md shrink-0 transition-all"
      >
        <div className="flex items-center p-0.5 sm:p-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-2xl">
          {MODES.map(({ id, label, icon: Icon, active }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                mode === id ? active : 'text-white/60 hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleSound} aria-label={soundEnabled ? '静音' : '开启音效'} title={soundEnabled ? '音效开启' : '音效静音'} className={toolButton}>
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
          </button>
          <button onClick={toggleFullscreen} aria-label="切换全屏沉浸" title="全屏模式" className={`${toolButton} hidden sm:flex`}>
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              haptic('light');
              close();
            }}
            aria-label="关闭 / 最小化为灵动胶囊"
            title="最小化"
            className="p-2 rounded-full bg-white/15 border border-white/25 hover:bg-rose-500/30 hover:border-rose-400/40 transition-all text-white backdrop-blur-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main
        style={{ paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), var(--sab, 0px), env(safe-area-inset-bottom, 0px), 32px)' }}
        className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full"
      >
        {mode !== 'clock' && <TaskLinker />}
        {mode === 'clock' && <LiveClock />}
        {mode === 'pomodoro' && <PomodoroView />}
        {mode === 'stopwatch' && <StopwatchView />}
      </main>
    </motion.div>
  );
};

/** Full-screen flip clock with pomodoro and stopwatch modes. */
export const FocusClockModal: React.FC = () => {
  const isOpen = useFocusStore(s => s.isOpen);
  return <AnimatePresence>{isOpen && <FocusClockContent />}</AnimatePresence>;
};
