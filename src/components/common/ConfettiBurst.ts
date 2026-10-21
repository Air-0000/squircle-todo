import confetti, { Options as ConfettiOptions } from 'canvas-confetti';
import { ThemeMode } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';

// 4-Theme Adaptive Confetti Color Palettes
export const THEME_CONFETTI_PALETTES: Record<ThemeMode, string[]> = {
  // 晨曦暖阳 (Warm Morning): Sunrise orange, warm amber, apricot peach, warm gold, coral
  'warm-morning': ['#F97316', '#F59E0B', '#FB923C', '#EAB308', '#FFEDD5'],

  // 冰川清晨 (Cool Morning): Glacial teal, mint emerald, sky azure, fresh cyan, pale mint
  'cool-morning': ['#0D9488', '#10B981', '#0EA5E9', '#38BDF8', '#CCFBF1'],

  // 暮色暗金 (Warm Evening): Sunset amber, dark gold, radiant gold, burnt orange, golden cream
  'warm-evening': ['#F59E0B', '#D97706', '#FBBF24', '#EA580C', '#FEF3C7'],

  // 深海极夜 (Cool Evening): Fluorescent cyan, electric azure, neon teal, deep blue, ice white
  'cool-evening': ['#06B6D4', '#38BDF8', '#3B82F6', '#22D3EE', '#E0F2FE'],
};

export interface TriggerConfettiOptions {
  theme?: ThemeMode;
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  ticks?: number;
  scalar?: number;
  origin?: { x: number; y: number };
}

/**
 * Trigger lightweight 60fps task completion particle burst
 * @param origin Optional viewport coordinates { x: 0..1, y: 0..1 }
 * @param customOptions Optional override options
 */
export const triggerConfetti = (
  origin?: { x: number; y: number },
  customOptions?: Partial<TriggerConfettiOptions>
): void => {
  if (typeof window === 'undefined') return;

  const currentTheme = customOptions?.theme || useThemeStore.getState().theme || 'warm-morning';
  const colors = THEME_CONFETTI_PALETTES[currentTheme] || THEME_CONFETTI_PALETTES['warm-morning'];

  const normalizedOrigin = origin || { x: 0.5, y: 0.65 };

  const options: ConfettiOptions = {
    particleCount: customOptions?.particleCount ?? 32,
    spread: customOptions?.spread ?? 60,
    startVelocity: customOptions?.startVelocity ?? 28,
    decay: customOptions?.decay ?? 0.92,
    ticks: customOptions?.ticks ?? 120,
    scalar: customOptions?.scalar ?? 0.8,
    gravity: 1.1,
    origin: normalizedOrigin,
    colors,
    zIndex: 9999,
    disableForReducedMotion: true,
  };

  try {
    confetti(options);
  } catch (err) {
    console.warn('[ConfettiBurst] Failed to render particles:', err);
  }
};

/**
 * Trigger celebratory dual-cannon burst for major milestones
 * (e.g., Art 7-stage completion, 180min mock exam finish, Emergency task closed)
 */
export const triggerMilestoneCelebration = (theme?: ThemeMode): void => {
  if (typeof window === 'undefined') return;

  const currentTheme = theme || useThemeStore.getState().theme || 'warm-morning';
  const colors = THEME_CONFETTI_PALETTES[currentTheme] || THEME_CONFETTI_PALETTES['warm-morning'];

  // Left cannon
  confetti({
    particleCount: 40,
    angle: 60,
    spread: 55,
    origin: { x: 0.15, y: 0.75 },
    colors,
    zIndex: 9999,
    disableForReducedMotion: true,
  });

  // Right cannon (delayed by 80ms for natural stagger)
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 0.85, y: 0.75 },
      colors,
      zIndex: 9999,
      disableForReducedMotion: true,
    });
  }, 80);
};

/**
 * Force cleanup of active confetti canvases
 */
export const resetConfetti = (): void => {
  if (typeof window !== 'undefined') {
    confetti.reset();
  }
};

export default triggerConfetti;
