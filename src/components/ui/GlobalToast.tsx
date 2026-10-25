import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  RotateCcw, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  X 
} from 'lucide-react';
import { useToastStore, type ToastType } from '../../stores/useToastStore';
import { SPRING_PHYSICS } from '../../constants/themes';

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  cycle_reset: <RotateCcw className="w-4 h-4 text-theme-accent shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-theme-accent shrink-0" />,
};

const TOAST_BORDER_ACCENT: Record<ToastType, string> = {
  cycle_reset: 'border-theme-accent/60 shadow-theme-accent/10',
  success: 'border-emerald-500/60 shadow-emerald-500/10',
  warning: 'border-amber-500/60 shadow-amber-500/10',
  error: 'border-rose-500/60 shadow-rose-500/10',
  info: 'border-theme-border shadow-black/10',
};

export const GlobalToast: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-16 inset-x-0 z-[100] flex flex-col items-center pointer-events-none space-y-2 px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.94 }}
            transition={SPRING_PHYSICS.defaultCard}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer max-w-sm w-auto px-4 py-2.5 rounded-squircle 
              border shadow-squircle-lg flex items-center space-x-2.5
              bg-theme-card text-theme-text select-none active:scale-[0.98] transition-transform
              ${TOAST_BORDER_ACCENT[toast.type]}`}
          >
            <div className="p-1 rounded-squircle-sm bg-theme-bg/80 border border-theme-border/60">
              {TOAST_ICONS[toast.type]}
            </div>
            <span className="text-xs font-semibold text-theme-text leading-snug">
              {toast.message}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="p-1 text-theme-text-muted hover:text-theme-text rounded-full transition-colors"
              aria-label="关闭提示"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
