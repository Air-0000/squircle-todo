import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { nativeBridge } from '../../utils/bridge';

export interface SquircleCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode;
  elevation?: 0 | 1 | 2 | 3;
  radius?: 'sm' | 'md' | 'lg'; // sm: 16px, md: 20px, lg: 24px
  variant?: 'surface' | 'subtle' | 'accent' | 'outlined';
  interactive?: boolean;
  haptic?: boolean | 'light' | 'medium' | 'heavy';
  className?: string;
}

const RADIUS_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'rounded-squircle',     // 16px
  md: 'rounded-squircle-md',  // 20px (standard M2 squircle)
  lg: 'rounded-squircle-lg',  // 24px
};

const ELEVATION_CLASSES: Record<0 | 1 | 2 | 3, string> = {
  0: 'shadow-none',
  1: 'shadow-squircle',
  2: 'shadow-squircle-md',
  3: 'shadow-squircle-lg',
};

const VARIANT_CLASSES: Record<'surface' | 'subtle' | 'accent' | 'outlined', string> = {
  surface: 'bg-theme-card border border-theme-border/80 shadow-squircle',
  subtle: 'bg-theme-card-subtle border border-theme-border/50',
  accent: 'bg-theme-accent-subtle border border-theme-accent/30',
  outlined: 'bg-theme-card/60 border border-theme-border/60',
};

export const SquircleCard: React.FC<SquircleCardProps> = ({
  children,
  elevation = 1,
  radius = 'md',
  variant = 'surface',
  interactive,
  haptic = false,
  className = '',
  onClick,
  ...rest
}) => {
  const isInteractive = interactive ?? Boolean(onClick);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractive && haptic) {
      const hapticType = typeof haptic === 'string' ? haptic : 'light';
      nativeBridge.performHapticFeedback(hapticType);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      whileHover={isInteractive ? { y: -1 } : undefined}
      whileTap={isInteractive ? { scale: 0.985 } : undefined}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      className={`relative overflow-hidden transition-colors ${RADIUS_CLASSES[radius]} ${ELEVATION_CLASSES[elevation]} ${VARIANT_CLASSES[variant]} ${
        isInteractive ? 'cursor-pointer select-none active:brightness-95' : ''
      } ${className}`}
      {...rest}
    >
      {/* Relief inner highlight line for tactile embossed elevation */}
      {elevation > 0 && (
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" 
        />
      )}
      {children}
    </motion.div>
  );
};

export default SquircleCard;
