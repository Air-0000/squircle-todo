import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Maximize2, Pause, Play } from 'lucide-react';
import { formatClock } from '../../domain/focus';
import { useFocusStore, useLinkedTask } from '../../stores/useFocusStore';
import { haptic } from '../../utils/bridge';

/** Floating pill that shows a running timer while the full-screen clock is minimised. */
export const DynamicIslandCapsule: React.FC = () => {
  const { isRunning, isOpen, mode, timeLeft, elapsed, open, start, pause } = useFocusStore();
  const linked = useLinkedTask();
  const visible = isRunning && !isOpen && mode !== 'clock';

  const expand = () => {
    haptic('light');
    open();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={expand}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[92%] sm:w-auto px-4 py-2 rounded-full bg-slate-900/95 dark:bg-black/90 border border-emerald-500/40 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-400 select-none"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono font-bold text-xs text-emerald-200 tracking-wider">{formatClock(mode === 'pomodoro' ? timeLeft : elapsed)}</span>
          </div>
          <div className="truncate text-[11px] text-white/80 max-w-[130px] sm:max-w-[200px]">{linked ? linked.title : '深度专注中'}</div>
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                if (isRunning) pause();
                else start();
              }}
              aria-label="暂停/继续"
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                expand();
              }}
              aria-label="展开全屏翻页钟"
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
