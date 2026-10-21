import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipCardProps {
  value: string | number;
  label?: string;
  size?: 'normal' | 'large' | 'compact';
}

export const LiquidGlassFlipCard: React.FC<FlipCardProps> = ({
  value,
  label,
  size = 'large',
}) => {
  const formatted = String(value).padStart(2, '0');

  const sizeClasses = {
    compact: 'w-16 h-20 text-3xl sm:w-20 sm:h-24 sm:text-4xl',
    normal: 'w-20 h-24 text-4xl sm:w-24 sm:h-28 sm:text-5xl',
    large: 'w-24 h-28 text-5xl sm:w-32 sm:h-38 sm:text-6xl md:w-36 md:h-44 md:text-7xl',
  }[size];

  return (
    <div className="flex flex-col items-center select-none">
      {/* Minimalist Liquid Glass Capsule Housing (Clean, No fake hinges or cut lines) */}
      <div 
        className={`relative ${sizeClasses} rounded-2xl sm:rounded-3xl flex items-center justify-center font-mono font-bold overflow-hidden bg-white/[0.08] dark:bg-black/60 border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl`}
      >
        {/* Subtle Specular Top Reflection */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent" 
        />

        {/* Ambient Inner Glass Glow */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-0 bg-radial from-white/[0.08] to-transparent" 
        />

        {/* Silky-Smooth Tabular Digit Transition (No clunky 3D flap distortions) */}
        <div className="relative z-10 flex items-center justify-center w-full h-full overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={formatted}
              initial={{ y: -14, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.96 }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 30,
                mass: 0.8
              }}
              className="inline-block tabular-nums tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] font-semibold"
            >
              {formatted}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Modern Minimalist Footnote Label */}
      {label && (
        <span className="mt-2 text-[10px] sm:text-[11px] font-semibold tracking-widest uppercase text-white/45">
          {label}
        </span>
      )}
    </div>
  );
};
