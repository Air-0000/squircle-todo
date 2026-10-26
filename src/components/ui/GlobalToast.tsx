import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { useToastStore, type ToastType } from '../../stores/useToastStore';

const ICONS: Record<ToastType, React.ReactNode> = {
  cycle_reset: <RotateCcw className="w-[18px] h-[18px] text-theme-accent" />,
  success: <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />,
  warning: <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />,
  error: <AlertCircle className="w-[18px] h-[18px] text-rose-500" />,
  info: <Info className="w-[18px] h-[18px] text-theme-accent" />,
};

/** Notification pills under the status bar; tap to dismiss. */
export const GlobalToast: React.FC = () => {
  const toasts = useToastStore(s => s.toasts);
  const removeToast = useToastStore(s => s.removeToast);

  return (
    <div
      className="fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ top: 'calc(max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 38px) + 8px)' }}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <motion.button
            key={t.id}
            type="button"
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={() => removeToast(t.id)}
            className="pointer-events-auto max-w-sm min-h-[44px] pl-3 pr-4 py-2 rounded-full bg-theme-card shadow-squircle-lg border border-theme-border flex items-center gap-2 text-left"
          >
            <span className="shrink-0">{ICONS[t.type]}</span>
            <span className="text-callout font-medium text-theme-text leading-snug">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
};
