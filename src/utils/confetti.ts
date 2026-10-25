import confetti from 'canvas-confetti';
import type { ThemeMode } from '../constants/themes';

const PALETTES: Record<ThemeMode, string[]> = {
  'warm-morning': ['#F97316', '#F59E0B', '#FB923C', '#EAB308', '#FFEDD5'],
  'cool-morning': ['#0D9488', '#10B981', '#0EA5E9', '#38BDF8', '#CCFBF1'],
  'warm-evening': ['#F59E0B', '#D97706', '#FBBF24', '#EA580C', '#FEF3C7'],
  'cool-evening': ['#06B6D4', '#38BDF8', '#3B82F6', '#22D3EE', '#E0F2FE'],
};

/** Colours of the theme currently applied to <html data-theme>. */
function currentColors(): string[] {
  const theme = document.documentElement.dataset.theme as ThemeMode | undefined;
  return PALETTES[theme ?? 'warm-morning'] ?? PALETTES['warm-morning'];
}

/** Small burst for checking off a task. */
export function burstConfetti(origin = { x: 0.5, y: 0.65 }): void {
  if (typeof window === 'undefined') return;
  confetti({
    particleCount: 32,
    spread: 60,
    startVelocity: 28,
    decay: 0.92,
    ticks: 120,
    scalar: 0.8,
    gravity: 1.1,
    origin,
    colors: currentColors(),
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}

/** Two-sided cannon for milestones (finished pomodoro, last pipeline stage, ...). */
export function celebrateMilestone(): void {
  if (typeof window === 'undefined') return;
  const colors = currentColors();
  const fire = (angle: number, x: number) =>
    confetti({ particleCount: 40, angle, spread: 55, origin: { x, y: 0.75 }, colors, zIndex: 9999, disableForReducedMotion: true });
  fire(60, 0.15);
  setTimeout(() => fire(120, 0.85), 80);
}
