import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { haptic as hapticFeedback } from '../../utils/bridge';

export type ButtonVariant = 'filled' | 'tonal' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'fab';
export type ButtonShape = 'squircle' | 'pill' | 'auto';

export interface SquircleButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  haptic?: boolean | 'light' | 'medium' | 'heavy';
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: 'bg-theme-accent text-theme-accent-contrast shadow-squircle shadow-theme-accent/20 active:opacity-95',
  tonal: 'bg-theme-card-subtle text-theme-text border border-theme-border/60 active:bg-theme-border/40',
  ghost: 'bg-transparent text-theme-text-secondary hover:text-theme-text active:bg-theme-card-subtle',
  danger: 'bg-rose-500 text-white shadow-sm shadow-rose-500/20 active:bg-rose-600',
  outline: 'bg-transparent text-theme-text border border-theme-border active:bg-theme-card-subtle',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-xs font-semibold gap-2 min-h-[40px]',
  lg: 'px-5 py-2.5 text-sm font-semibold gap-2.5 min-h-[48px]',
  fab: 'w-14 h-14 p-0 text-white shadow-squircle-lg flex items-center justify-center min-h-[56px] min-w-[56px]',
};

export const SquircleButton: React.FC<SquircleButtonProps> = ({
  variant = 'filled',
  size = 'md',
  shape = 'auto',
  icon,
  iconPosition = 'left',
  loading = false,
  haptic = true,
  disabled = false,
  children,
  onClick,
  className = '',
  ...rest
}) => {
  // Shape resolution: FAB defaults to 22px squircle; pill defaults to rounded-full; squircle defaults to 16/20px
  let shapeClass = 'rounded-squircle';
  if (size === 'fab') {
    shapeClass = 'rounded-[22px]';
  } else if (shape === 'pill') {
    shapeClass = 'rounded-full';
  } else if (size === 'sm') {
    shapeClass = 'rounded-squircle-sm';
  } else if (size === 'lg') {
    shapeClass = 'rounded-squircle-md';
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    if (haptic) {
      const hapticType = typeof haptic === 'string' ? haptic : (size === 'fab' ? 'heavy' : 'light');
      hapticFeedback(hapticType);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { y: -0.5 } : undefined}
      whileTap={!disabled && !loading ? { scale: size === 'fab' ? 0.94 : 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`inline-flex items-center justify-center relative select-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/50 ${
        shapeClass
      } ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};
