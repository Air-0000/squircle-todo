import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small icon badge left of the title. */
  icon?: React.ReactNode;
  iconClassName?: string;
  footer?: React.ReactNode;
  /** 'sheet' docks to the bottom on phones; 'center' is a centred dialog. */
  variant?: 'sheet' | 'center';
  maxWidth?: string;
  zIndex?: string;
  /** Extra classes for the scrollable body. */
  bodyClassName?: string;
  children: React.ReactNode;
}

/** Shared modal shell: backdrop, spring-in panel, header, scrollable body and footer. */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconClassName = 'bg-theme-accent/15 text-theme-accent',
  footer,
  variant = 'center',
  maxWidth = 'max-w-md',
  zIndex = 'z-50',
  bodyClassName = 'p-4 space-y-3.5',
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sheet = variant === 'sheet';

  return (
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 ${zIndex} flex justify-center ${sheet ? 'items-end sm:items-center p-0 sm:p-4' : 'items-center p-4'}`}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: sheet ? 40 : 15, scale: sheet ? 0.98 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: sheet ? 40 : 15, scale: sheet ? 0.98 : 0.95 }}
            transition={SPRING_PHYSICS.defaultCard}
            className={`relative w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-hidden bg-theme-bg/95 backdrop-blur-2xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] ${
              sheet ? 'rounded-t-squircle-xl sm:rounded-squircle-xl' : 'rounded-squircle-xl'
            }`}
          >
            {sheet && <div className="w-10 h-1 rounded-full bg-theme-text-muted/30 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />}

            <header className="px-4 py-3.5 flex items-center justify-between gap-2 border-b border-theme-border/60 bg-theme-card/70 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {icon && (
                  <span className={`w-9 h-9 rounded-squircle flex items-center justify-center shrink-0 ${iconClassName}`}>{icon}</span>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-theme-text truncate">{title}</h3>
                  {subtitle && <p className="text-[10px] text-theme-text-muted truncate">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="p-1.5 rounded-full text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-subtle shrink-0"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            <div className={`flex-1 overflow-y-auto text-xs ${bodyClassName}`}>{children}</div>

            {footer && (
              <footer className="p-4 border-t border-theme-border/60 flex items-center justify-between gap-2 shrink-0 bg-theme-card/70 backdrop-blur-xl">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
