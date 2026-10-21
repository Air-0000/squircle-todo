import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Sparkles,
  Link2,
  ChevronDown,
  Timer
} from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { LiquidGlassFlipCard } from './LiquidGlassFlipCard';
import { nativeBridge } from '../../utils/bridge';

const LiquidGlassFlipClockModalContent: React.FC = () => {
  const {
    mode,
    setMode,
    closeFocusModal,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    timeLeft,
    stopwatchElapsed,
    pomodoroDurationMinutes,
    setPomodoroDuration,
    linkedTask,
    linkTask,
    isSoundEnabled,
    toggleSound,
    recordSession,
  } = useFocusStore();

  const { tasks } = useTaskStore();

  // Real-time live clock state
  const [liveDate, setLiveDate] = useState(new Date());
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);

  // Status bar theme synchronization when modal opens/closes
  useEffect(() => {
    nativeBridge.setStatusBarTheme(true, '#020617');
    return () => {
      useThemeStore.getState().applyTheme();
    };
  }, []);

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen toggle
  const toggleNativeFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsNativeFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsNativeFullscreen(false);
      }
    } catch {}
    nativeBridge.performHapticFeedback('light');
  };

  // Clock formatters
  const clockHours = liveDate.getHours();
  const clockMinutes = liveDate.getMinutes();
  const clockSeconds = liveDate.getSeconds();
  const dateStr = liveDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // Pomodoro formatters
  const pomoMinutes = Math.floor(timeLeft / 60);
  const pomoSeconds = timeLeft % 60;
  const pomoProgress = Math.max(0, Math.min(1, 1 - timeLeft / (pomodoroDurationMinutes * 60)));

  // Stopwatch formatters
  const swHours = Math.floor(stopwatchElapsed / 3600);
  const swMinutes = Math.floor((stopwatchElapsed % 3600) / 60);
  const swSeconds = stopwatchElapsed % 60;

  // Active candidate tasks to link
  const availableTasks = tasks.filter(t => !t.completed && !t.isCompleted);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white select-none backdrop-blur-3xl overflow-y-auto"
      >
        {/* Dynamic Ambient Aurora Background Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
          <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[130px] animate-pulse" style={{ animationDuration: '9s' }} />
        </div>

        {/* Top Header Bar: 适配状态栏刘海高度与沉浸式沉淀 */}
        <header 
          style={{
            paddingTop: isNativeFullscreen 
              ? '14px' 
              : 'max(var(--safe-area-inset-top, 0px), var(--sat, 0px), env(safe-area-inset-top, 0px), 38px)',
          }}
          className="px-4 pb-3 pt-2 flex items-center justify-between border-b border-white/10 backdrop-blur-md shrink-0 transition-all"
        >
          {/* Mode Switcher Segmented Control */}
          <div className="flex items-center p-0.5 sm:p-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-2xl">
            <button
              onClick={() => setMode('clock')}
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 ${
                mode === 'clock'
                  ? 'bg-white/25 text-white shadow-md border border-white/30 backdrop-blur-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>翻页时钟</span>
            </button>
            <button
              onClick={() => setMode('pomodoro')}
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 ${
                mode === 'pomodoro'
                  ? 'bg-emerald-500/35 text-emerald-200 shadow-md border border-emerald-400/30 backdrop-blur-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span>番茄专注</span>
            </button>
            <button
              onClick={() => setMode('stopwatch')}
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 ${
                mode === 'stopwatch'
                  ? 'bg-blue-500/35 text-blue-200 shadow-md border border-blue-400/30 backdrop-blur-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
              <span>秒表模考</span>
            </button>
          </div>

          {/* Action Tools: Sound, Fullscreen, Close */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSound}
              aria-label={isSoundEnabled ? '静音' : '开启音效'}
              className="p-2 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 transition-all text-white/80 hover:text-white backdrop-blur-md"
              title={isSoundEnabled ? '音效开启' : '音效静音'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
            </button>

            <button
              onClick={toggleNativeFullscreen}
              aria-label="切换全屏沉浸"
              className="p-2 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 transition-all text-white/80 hover:text-white backdrop-blur-md hidden sm:flex"
              title="全屏模式"
            >
              {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={closeFocusModal}
              aria-label="关闭 / 最小化为灵动胶囊"
              className="p-2 rounded-full bg-white/15 border border-white/25 hover:bg-rose-500/30 hover:border-rose-400/40 transition-all text-white backdrop-blur-md"
              title="最小化"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area: 适配底部手势横条安全区 */}
        <main 
          style={{
            paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), var(--sab, 0px), env(safe-area-inset-bottom, 0px), 32px)',
          }}
          className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full"
        >
          {/* Target Task Banner (if in Pomodoro / Stopwatch) */}
          {mode !== 'clock' && (
            <div className="mb-6 w-full max-w-md relative">
              <div 
                onClick={() => setIsTaskPickerOpen(!isTaskPickerOpen)}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 hover:border-emerald-400/50 backdrop-blur-2xl cursor-pointer transition-all shadow-lg"
              >
                <div className="flex items-center space-x-2 text-left truncate">
                  <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-300">
                    <Link2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="truncate">
                    <p className="text-[10px] text-white/50 uppercase font-semibold">当前关联任务</p>
                    <p className="text-xs font-bold text-white truncate">
                      {linkedTask ? linkedTask.title : '未关联具体任务（点击选择）'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-white/50 shrink-0 ml-2" />
              </div>

              {/* Task Picker Dropdown */}
              <AnimatePresence>
                {isTaskPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-3xl z-40 max-h-56 overflow-y-auto text-left"
                  >
                    <button
                      onClick={() => {
                        linkTask(null);
                        setIsTaskPickerOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/60 hover:bg-white/10 transition-colors"
                    >
                      ✕ 不关联具体任务（自由专注）
                    </button>
                    {availableTasks.length === 0 ? (
                      <p className="p-3 text-xs text-white/40 text-center">暂无进行中的任务</p>
                    ) : (
                      availableTasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            linkTask(t);
                            setIsTaskPickerOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                            linkedTask?.id === t.id
                              ? 'bg-emerald-500/25 text-emerald-200 font-bold'
                              : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate">{t.title}</span>
                          <span className="text-[10px] text-white/40 ml-2 shrink-0">
                            {t.persona === 'exam' ? '考研' : t.persona === 'art' ? '绘画' : '工作'}
                          </span>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ================= MODE 1: LIVE FLIP CLOCK ================= */}
          {mode === 'clock' && (
            <div className="flex flex-col items-center space-y-6">
              {/* Date Header */}
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/90">
                  {dateStr}
                </span>
              </div>

              {/* 3 Large Minimalist Liquid Glass Cards: HH : MM : SS */}
              <div className="flex items-center justify-center space-x-2 sm:space-x-4">
                <LiquidGlassFlipCard value={clockHours} label="时" size="large" />
                <span className="text-3xl sm:text-5xl font-mono font-light text-white/35 animate-pulse pb-4 sm:pb-6 select-none">:</span>
                <LiquidGlassFlipCard value={clockMinutes} label="分" size="large" />
                <span className="text-3xl sm:text-5xl font-mono font-light text-white/35 animate-pulse pb-4 sm:pb-6 select-none">:</span>
                <LiquidGlassFlipCard value={clockSeconds} label="秒" size="large" />
              </div>

              {/* Motivational Zen Footnote */}
              <p className="text-xs sm:text-sm text-white/60 tracking-wider font-light mt-4">
                「 志之所趋，穷山距海，不可阻也 」
              </p>
            </div>
          )}

          {/* ================= MODE 2: POMODORO TIMER ================= */}
          {mode === 'pomodoro' && (
            <div className="flex flex-col items-center space-y-6 w-full">
              {/* Duration Presets */}
              <div className="flex items-center space-x-2">
                {[15, 25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setPomodoroDuration(mins)}
                    disabled={isRunning}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      pomodoroDurationMinutes === mins
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-md'
                        : 'bg-white/5 border-white/15 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40'
                    }`}
                  >
                    {mins} 分钟
                  </button>
                ))}
              </div>

              {/* Liquid Glass Cards: MM : SS */}
              <div className="flex items-center justify-center space-x-3 sm:space-x-5">
                <LiquidGlassFlipCard value={pomoMinutes} label="分" size="large" />
                <span className="text-4xl sm:text-6xl font-mono font-light text-emerald-400/60 animate-pulse pb-4 sm:pb-6 select-none">:</span>
                <LiquidGlassFlipCard value={pomoSeconds} label="秒" size="large" />
              </div>

              {/* Progress Bar with Liquid Glow */}
              <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/15">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                  style={{ width: `${pomoProgress * 100}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-4 pt-2">
                <button
                  onClick={resetTimer}
                  aria-label="重置计时"
                  className="p-3.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-xl"
                  title="重置"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={isRunning ? pauseTimer : startTimer}
                  className={`px-8 py-3.5 rounded-full font-bold text-sm flex items-center space-x-2.5 transition-all shadow-xl backdrop-blur-2xl ${
                    isRunning
                      ? 'bg-amber-500/30 border border-amber-400/50 text-amber-200 hover:bg-amber-500/40'
                      : 'bg-emerald-500 border border-emerald-400/60 text-slate-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>暂停专注</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>开始专注</span>
                    </>
                  )}
                </button>

                {/* Quick Settle / Complete */}
                <button
                  onClick={() => {
                    const elapsed = Math.round((pomodoroDurationMinutes * 60 - timeLeft) / 60);
                    if (elapsed >= 1) {
                      recordSession(elapsed, linkedTask);
                    }
                    resetTimer();
                  }}
                  aria-label="提前结算打卡"
                  className="p-3.5 rounded-full bg-white/10 border border-white/20 hover:bg-emerald-500/20 hover:text-emerald-300 text-white/70 transition-all backdrop-blur-xl"
                  title="提前结算本次专注"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= MODE 3: STOPWATCH ================= */}
          {mode === 'stopwatch' && (
            <div className="flex flex-col items-center space-y-6 w-full">
              <p className="text-xs text-white/50 tracking-wide font-medium">
                适合全真模考仿真模拟 / 自由作画连续计时
              </p>

              {/* Minimalist Liquid Glass Cards: HH : MM : SS */}
              <div className="flex items-center justify-center space-x-2 sm:space-x-4">
                <LiquidGlassFlipCard value={swHours} label="时" size="large" />
                <span className="text-3xl sm:text-5xl font-mono font-light text-blue-400/60 animate-pulse pb-4 sm:pb-6 select-none">:</span>
                <LiquidGlassFlipCard value={swMinutes} label="分" size="large" />
                <span className="text-3xl sm:text-5xl font-mono font-light text-blue-400/60 animate-pulse pb-4 sm:pb-6 select-none">:</span>
                <LiquidGlassFlipCard value={swSeconds} label="秒" size="large" />
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-4 pt-2">
                <button
                  onClick={resetTimer}
                  aria-label="重置秒表"
                  className="p-3.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-xl"
                  title="重置"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={isRunning ? pauseTimer : startTimer}
                  className={`px-8 py-3.5 rounded-full font-bold text-sm flex items-center space-x-2.5 transition-all shadow-xl backdrop-blur-2xl ${
                    isRunning
                      ? 'bg-amber-500/30 border border-amber-400/50 text-amber-200 hover:bg-amber-500/40'
                      : 'bg-blue-500 border border-blue-400/60 text-slate-950 hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>暂停秒表</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>开始计时</span>
                    </>
                  )}
                </button>

                {/* Settle Stopwatch Session */}
                <button
                  onClick={() => {
                    const elapsedMins = Math.round(stopwatchElapsed / 60);
                    if (elapsedMins >= 1) {
                      recordSession(elapsedMins, linkedTask);
                    }
                    resetTimer();
                  }}
                  aria-label="保存为本次模考记录"
                  className="p-3.5 rounded-full bg-white/10 border border-white/20 hover:bg-blue-500/20 hover:text-blue-300 text-white/70 transition-all backdrop-blur-xl"
                  title="记录为打卡"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </main>
      </motion.div>
    </AnimatePresence>
  );
};

export const LiquidGlassFlipClockModal: React.FC = () => {
  const isFullScreenOpen = useFocusStore(s => s.isFullScreenOpen);
  if (!isFullScreenOpen) return null;
  return <LiquidGlassFlipClockModalContent />;
};
