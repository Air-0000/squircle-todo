import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../stores/useToastStore';
import { useBackHandler } from '../../hooks/useBackHandler';

/** iOS-style alert driven by `toast.confirm(...)`. */
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
  useBackHandler(Boolean(dialog), cancel);

  return (
    <AnimatePresence>
      {dialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8" role="alertdialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancel}
            className="absolute inset-0 bg-black/35 dark:bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-[290px] rounded-squircle-lg bg-theme-card shadow-squircle-lg overflow-hidden text-center"
          >
            <div className="px-5 pt-5 pb-4">
              <h3 className="text-headline font-semibold text-theme-text">{dialog.title}</h3>
              <p className="text-footnote text-theme-text-secondary mt-1.5 leading-relaxed">{dialog.message}</p>
            </div>
            <div className="grid grid-cols-2 border-t border-theme-border">
              <button type="button" onClick={cancel} className="h-11 text-body text-theme-accent border-r border-theme-border active:bg-theme-card-subtle">
                {dialog.cancelText ?? '取消'}
              </button>
              <button
                type="button"
                onClick={confirm}
                className={`h-11 text-body font-semibold active:bg-theme-card-subtle ${dialog.danger ? 'text-rose-500' : 'text-theme-accent'}`}
              >
                {dialog.confirmText ?? '确定'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
