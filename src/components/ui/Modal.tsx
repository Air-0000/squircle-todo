import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SPRING_PHYSICS } from '../../constants/themes';

export interface SheetAction {
  label: string;
  onClick?: () => void;
  /** Submits this form id instead of calling onClick. */
  form?: string;
  disabled?: boolean;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-hand nav button ("添加", "保存", "完成"). */
  primary?: SheetAction;
  /** Left-hand nav button; defaults to "取消". Pass null to hide. */
  cancelLabel?: string | null;
  /** Pinned under the scroll area (e.g. a destructive action). */
  footer?: React.ReactNode;
  maxWidth?: string;
  zIndex?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * iOS-style sheet: docks to the bottom on phones, centred on wide screens;
 * nav bar with Cancel / title / primary action over a grouped background.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  primary,
  cancelLabel = '取消',
  footer,
  maxWidth = 'max-w-lg',
  zIndex = 'z-50',
  bodyClassName = 'px-4 pt-2 pb-6 space-y-6',
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const navButton = 'min-w-[56px] h-11 text-body transition-opacity disabled:opacity-30';

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${zIndex} flex justify-center items-end sm:items-center sm:p-6`} role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 dark:bg-black/60"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING_PHYSICS.modalSpring}
            className={`relative w-full ${maxWidth} max-h-[94vh] flex flex-col overflow-hidden bg-theme-bg rounded-t-squircle-xl sm:rounded-squircle-xl shadow-squircle-lg`}
          >
            <div className="w-9 h-[5px] rounded-full bg-theme-text-muted/40 mx-auto mt-2 shrink-0" aria-hidden="true" />
            <header className="grid grid-cols-[1fr_auto_1fr] items-center px-2 shrink-0">
              <div className="justify-self-start">
                {cancelLabel && (
                  <button type="button" onClick={onClose} className={`${navButton} px-2 text-theme-accent text-left`}>
                    {cancelLabel}
                  </button>
                )}
              </div>
              <div className="text-center min-w-0 max-w-[60vw] py-1">
                <h3 className="text-headline font-semibold text-theme-text truncate">{title}</h3>
                {subtitle && <p className="text-caption text-theme-text-secondary truncate">{subtitle}</p>}
              </div>
              <div className="justify-self-end">
                {primary && (
                  <button
                    type={primary.form ? 'submit' : 'button'}
                    form={primary.form}
                    onClick={primary.onClick}
                    disabled={primary.disabled}
                    className={`${navButton} px-2 font-semibold text-theme-accent text-right`}
                  >
                    {primary.label}
                  </button>
                )}
              </div>
            </header>
            <div className={`flex-1 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>
            {footer && (
              <footer
                className="px-4 pt-3 shrink-0 border-t border-theme-border bg-theme-bg"
                style={{ paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px), 12px)' }}
              >
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
