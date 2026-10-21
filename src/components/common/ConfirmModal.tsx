import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useToastStore } from '../../stores/useToastStore';
import { SquircleButton } from './SquircleButton';
import { SPRING_PHYSICS } from '../../constants/themes';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm } = useToastStore();

  if (!confirmDialog || !confirmDialog.isOpen) return null;

  const {
    title,
    message,
    confirmText = '确定',
    cancelText = '取消',
    danger = false,
    onConfirm,
    onCancel,
  } = confirmDialog;

  const handleCancel = () => {
    if (onCancel) onCancel();
    closeConfirm();
  };

  const handleConfirm = () => {
    onConfirm();
    closeConfirm();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="fixed inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-md"
        />

        {/* Squircle Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 12 }}
          transition={SPRING_PHYSICS.modalSpring}
          className="relative z-10 w-full max-w-xs rounded-squircle-lg bg-theme-bg/95 backdrop-blur-2xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-5 text-center overflow-hidden"
        >
          {/* Top Decorative Icon */}
          <div className="mx-auto w-12 h-12 rounded-squircle bg-theme-bg/80 border border-theme-border flex items-center justify-center mb-3">
            {danger ? (
              <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
            ) : (
              <AlertCircle className="w-6 h-6 text-theme-accent" />
            )}
          </div>

          <h3 className="text-sm font-bold text-theme-text mb-1.5 leading-snug">
            {title}
          </h3>

          <p className="text-xs text-theme-text-secondary leading-relaxed mb-5">
            {message}
          </p>

          <div className="flex items-center space-x-2.5">
            <SquircleButton
              variant="tonal"
              size="md"
              onClick={handleCancel}
              className="flex-1"
            >
              {cancelText}
            </SquircleButton>
            <SquircleButton
              variant={danger ? 'danger' : 'filled'}
              size="md"
              onClick={handleConfirm}
              className="flex-1"
            >
              {confirmText}
            </SquircleButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
