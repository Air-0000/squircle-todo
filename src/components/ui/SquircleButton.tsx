import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { haptic as hapticFeedback, type HapticType } from '../../utils/bridge';

export type ButtonVariant = 'filled' | 'tonal' | 'plain' | 'danger' | 'gray';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'fab';

export interface SquircleButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  /** Tap feedback; false when the click handler gives its own. */
  haptic?: boolean | HapticType;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  filled: 'bg-theme-accent text-theme-accent-contrast',
  tonal: 'bg-theme-accent-subtle text-theme-accent',
  gray: 'bg-theme-card-subtle text-theme-text',
  plain: 'bg-transparent text-theme-accent',
  danger: 'bg-rose-500 text-white',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-footnote font-semibold gap-1 rounded-[10px]',
  md: 'h-11 px-4 text-body font-semibold gap-1.5 rounded-squircle',
  lg: 'h-12 px-5 text-headline font-semibold gap-2 rounded-squircle',
  fab: 'w-14 h-14 rounded-full shadow-squircle-lg',
};

export const SquircleButton: React.FC<SquircleButtonProps> = ({
  variant = 'filled',
  size = 'md',
  icon,
  loading = false,
  haptic = true,
  disabled = false,
  children,
  onClick,
  className = '',
  ...rest
}) => {
  const inactive = disabled || loading;
  return (
    <motion.button
      onClick={e => {
        if (inactive) return;
        if (haptic) hapticFeedback(typeof haptic === 'string' ? haptic : size === 'fab' ? 'medium' : 'light');
        onClick?.(e);
      }}
      disabled={inactive}
      whileTap={inactive ? undefined : { scale: size === 'fab' ? 0.92 : 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center select-none transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/50 ${SIZES[size]} ${VARIANTS[variant]} ${
        inactive ? 'opacity-40' : ''
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {icon && <span className="shrink-0 flex">{icon}</span>}
          {children && <span>{children}</span>}
        </>
      )}
    </motion.button>
  );
};
