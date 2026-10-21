import { ThemeMode, ToneLock } from '../types';

export interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  tone: 'warm' | 'cool';
  timeOfDay: 'morning' | 'evening';
  appBg: string;
  cardSurface: string;
  cardBorder: string;
  primaryAccent: string;
  secondaryAccent: string;
  textPrimary: string;
  textMuted: string;
  tagPillBg: string;
  tagPillText: string;
  isDark: boolean;
  description: string;
}

export const THEMES: Record<ThemeMode, ThemeDefinition> = {
  'warm-morning': {
    id: 'warm-morning',
    name: '晨曦暖阳',
    tone: 'warm',
    timeOfDay: 'morning',
    appBg: '#FAF7F2',
    cardSurface: '#FFFFFF',
    cardBorder: '#F0EAE1',
    primaryAccent: '#F97316',
    secondaryAccent: '#D97706',
    textPrimary: '#292524',
    textMuted: '#78716C',
    tagPillBg: '#FFEDD5',
    tagPillText: '#C2410C',
    isDark: false,
    description: '柔和暖杏白、阳光晨曦橙色点缀、温润木质调',
  },
  'cool-morning': {
    id: 'cool-morning',
    name: '冰川清晨',
    tone: 'cool',
    timeOfDay: 'morning',
    appBg: '#F0FDF9',
    cardSurface: '#FFFFFF',
    cardBorder: '#CCFBF1',
    primaryAccent: '#0D9488',
    secondaryAccent: '#0284C7',
    textPrimary: '#0F172A',
    textMuted: '#64748B',
    tagPillBg: '#E6FFFA',
    tagPillText: '#0F766E',
    isDark: false,
    description: '清新薄荷绿与冰川淡蓝渐变、明亮纯净',
  },
  'warm-evening': {
    id: 'warm-evening',
    name: '暮色暗金',
    tone: 'warm',
    timeOfDay: 'evening',
    appBg: '#1C1917',
    cardSurface: '#262320',
    cardBorder: '#3D3833',
    primaryAccent: '#F59E0B',
    secondaryAccent: '#EA580C',
    textPrimary: '#F5F5F4',
    textMuted: '#A8A29E',
    tagPillBg: '#451A03',
    tagPillText: '#FBBF24',
    isDark: true,
    description: '暗夜暖木灰黑、落日暗金色与晚霞琥珀色提亮',
  },
  'cool-evening': {
    id: 'cool-evening',
    name: '深海极夜',
    tone: 'cool',
    timeOfDay: 'evening',
    appBg: '#0B0F19',
    cardSurface: '#131C2E',
    cardBorder: '#1E293B',
    primaryAccent: '#06B6D4',
    secondaryAccent: '#3B82F6',
    textPrimary: '#F1F5F9',
    textMuted: '#94A3B8',
    tagPillBg: '#083344',
    tagPillText: '#22D3EE',
    isDark: true,
    description: '深邃午夜蓝与冷靛灰黑、荧光冷青色微光',
  },
};

export const SQUIRCLE_TOKENS = {
  cardRadius: '20px',
  cardRadiusRange: { min: 16, max: 24 },
  pillRadius: '9999px',
  fabRadius: '22px',
} as const;

export const SPRING_PHYSICS = {
  defaultCard: { stiffness: 300, damping: 25 },
  quickCheckbox: { stiffness: 450, damping: 20 },
  bottomSheet: { stiffness: 220, damping: 28 },
  tabSwitch: { stiffness: 320, damping: 26 },
  modalSpring: { stiffness: 260, damping: 26 },
  cardExit: { stiffness: 320, damping: 30 },
  swipeSnap: { stiffness: 350, damping: 28 },
} as const;

if (typeof window !== 'undefined') {
  (window as any).__SPRING_PHYSICS__ = SPRING_PHYSICS;
}

export function computeThemeFromClock(
  date: Date = new Date(),
  toneLock: ToneLock = 'warm'
): ThemeMode {
  const hour = date.getHours();
  const isMorning = hour >= 6 && hour < 18;
  const tone = toneLock === 'auto' ? 'warm' : toneLock;

  if (tone === 'warm') {
    return isMorning ? 'warm-morning' : 'warm-evening';
  } else {
    return isMorning ? 'cool-morning' : 'cool-evening';
  }
}
