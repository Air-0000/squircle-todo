import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';
import { haptic as hapticFeedback } from '../../utils/bridge';

export type PillVariant = 
  | 'primary' 
  | 'accent' 
  | 'subtle' 
  | 'tonal' 
  | 'outline' 
  | 'urgent' 
  | 'high' 
  | 'medium' 
  | 'low';

export type PillSize = 'sm' | 'md' | 'lg';

export interface PillTagProps extends Omit<HTMLMotionProps<'span'>, 'children'> {
  label: React.ReactNode;
  variant?: PillVariant;
  size?: PillSize;
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  haptic?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<PillSize, { tag: string; icon: string; close: string }> = {
  sm: {
    tag: 'text-[10px] px-2 py-0.5 gap-1 leading-tight',
    icon: 'w-2.5 h-2.5',
    close: 'w-2.5 h-2.5 -mr-0.5',
  },
  md: {
    tag: 'text-xs px-2.5 py-1 gap-1.5 leading-none',
    icon: 'w-3 h-3',
    close: 'w-3 h-3 -mr-0.5',
  },
  lg: {
    tag: 'text-xs font-semibold px-3.5 py-1.5 gap-2 leading-none',
    icon: 'w-3.5 h-3.5',
    close: 'w-3.5 h-3.5 -mr-1',
  },
};

const VARIANT_CLASSES: Record<PillVariant, string> = {
  primary: 'bg-theme-accent text-theme-accent-contrast shadow-sm',
  accent: 'bg-theme-accent-subtle text-theme-accent border border-theme-accent/25',
  subtle: 'bg-theme-card-subtle text-theme-text-secondary border border-theme-border/60',
  tonal: 'bg-theme-card-subtle text-theme-text font-medium border border-theme-border/40',
  outline: 'bg-transparent text-theme-text-secondary border border-theme-border',
  urgent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-medium',
  high: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium',
  medium: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30 font-medium',
  low: 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border border-stone-500/30',
};

export const PillTag: React.FC<PillTagProps> = ({
  label,
  variant = 'accent',
  size = 'md',
  icon,
  removable = false,
  onRemove,
  haptic = false,
  onClick,
  className = '',
  ...rest
}) => {
  const isClickable = Boolean(onClick);
  const sizeConfig = SIZE_CLASSES[size];

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (isClickable && haptic) {
      hapticFeedback('light');
    }
    if (onClick) {
      onClick(e);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (haptic) {
      hapticFeedback('medium');
    }
    if (onRemove) {
      onRemove(e);
    }
  };

  return (
    <motion.span
      onClick={handleClick}
      whileTap={isClickable ? { scale: 0.94 } : undefined}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
      className={`inline-flex items-center rounded-full font-medium transition-colors select-none ${
        sizeConfig.tag
      } ${VARIANT_CLASSES[variant]} ${
        isClickable ? 'cursor-pointer active:brightness-95' : ''
      } ${className}`}
      {...rest}
    >
      {icon && <span className={`inline-flex items-center justify-center shrink-0 ${sizeConfig.icon}`}>{icon}</span>}
      <span className="truncate">{label}</span>
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label="移除标签"
          className={`inline-flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity focus:outline-none ${sizeConfig.close}`}
        >
          <X className="w-full h-full" />
        </button>
      )}
    </motion.span>
  );
};
