import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Play, Pause, Maximize2 } from 'lucide-react';
import { useFocusStore } from '../../stores/useFocusStore';
import { nativeBridge } from '../../utils/bridge';

const DynamicIslandCapsuleContent: React.FC = () => {
  const isRunning = useFocusStore(s => s.isRunning);
  const mode = useFocusStore(s => s.mode);
  const timeLeft = useFocusStore(s => s.timeLeft);
  const stopwatchElapsed = useFocusStore(s => s.stopwatchElapsed);
  const openFocusModal = useFocusStore(s => s.openFocusModal);
  const pauseTimer = useFocusStore(s => s.pauseTimer);
  const startTimer = useFocusStore(s => s.startTimer);
  const linkedTask = useFocusStore(s => s.linkedTask);

  const pomoMinutes = Math.floor(timeLeft / 60);
  const pomoSeconds = timeLeft % 60;
  const timeText = mode === 'pomodoro'
    ? `${String(pomoMinutes).padStart(2, '0')}:${String(pomoSeconds).padStart(2, '0')}`
    : `${String(Math.floor(stopwatchElapsed / 60)).padStart(2, '0')}:${String(stopwatchElapsed % 60).padStart(2, '0')}`;

  const handleOpen = () => {
    nativeBridge.performHapticFeedback('light');
    openFocusModal();
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) pauseTimer();
    else startTimer();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -40, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={handleOpen}
        className="fixed top-14 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[92%] sm:w-auto px-4 py-2 rounded-full bg-slate-900/95 dark:bg-black/90 border border-emerald-500/40 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex items-center justify-between space-x-3 cursor-pointer group hover:border-emerald-400 select-none"
      >
        {/* Left: Glowing Pulse Dot + Time */}
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono font-bold text-xs text-emerald-200 tracking-wider">
            {timeText}
          </span>
        </div>

        {/* Center: Linked Task or Status */}
        <div className="truncate text-[11px] text-white/80 max-w-[130px] sm:max-w-[200px]">
          {linkedTask ? linkedTask.title : '深度专注中'}
        </div>

        {/* Right: Quick Pause / Maximize */}
        <div className="flex items-center space-x-1 pl-1">
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label="暂停/继续"
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
          </button>
          <button
            type="button"
            onClick={handleOpen}
            aria-label="展开全屏翻页钟"
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const DynamicIslandCapsule: React.FC = () => {
  const isRunning = useFocusStore(s => s.isRunning);
  const isFullScreenOpen = useFocusStore(s => s.isFullScreenOpen);
  const mode = useFocusStore(s => s.mode);

  if (!isRunning || isFullScreenOpen || mode === 'clock') return null;
  return <DynamicIslandCapsuleContent />;
};
