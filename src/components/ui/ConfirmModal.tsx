import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../../stores/useToastStore';
import { SPRING_PHYSICS } from '../../constants/themes';
import { SquircleButton } from './SquircleButton';

/** In-app replacement for window.confirm, driven by `toast.confirm(...)`. */
export const ConfirmModal: React.FC = () => {
  const dialog = useToastStore(s => s.confirmDialog);
  const closeConfirm = useToastStore(s => s.closeConfirm);

  const cancel = () => {
    dialog?.onCancel?.();
    closeConfirm();
  };
  const confirm = () => {
    dialog?.onConfirm();
    closeConfirm();
  };

  return (
    <AnimatePresence>
      {dialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancel}
            className="absolute inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={SPRING_PHYSICS.modalSpring}
            className="relative w-full max-w-xs rounded-squircle-lg bg-theme-bg/95 backdrop-blur-2xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-5 text-center"
          >
            <div className="mx-auto w-12 h-12 rounded-squircle bg-theme-bg/80 border border-theme-border flex items-center justify-center mb-3">
              {dialog.danger ? (
                <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
              ) : (
                <AlertCircle className="w-6 h-6 text-theme-accent" />
              )}
            </div>
            <h3 className="text-sm font-bold text-theme-text mb-1.5 leading-snug">{dialog.title}</h3>
            <p className="text-xs text-theme-text-secondary leading-relaxed mb-5">{dialog.message}</p>
            <div className="flex items-center gap-2.5">
              <SquircleButton variant="tonal" onClick={cancel} className="flex-1">
                {dialog.cancelText ?? '取消'}
              </SquircleButton>
              <SquircleButton variant={dialog.danger ? 'danger' : 'filled'} onClick={confirm} className="flex-1">
                {dialog.confirmText ?? '确定'}
              </SquircleButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
