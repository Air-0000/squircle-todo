/**
 * TypeScript Direct Implementation Stress Test
 * Verifies src/constants/themes.ts and src/stores/useThemeStore.ts
 * Executed via tsx.
 */

import { THEMES, SQUIRCLE_TOKENS, SPRING_PHYSICS, computeThemeFromClock } from '../src/constants/themes';
import { ThemeMode, ToneLock } from '../src/types';

// Mock Browser & Android Bridge globals before importing/invoking useThemeStore
interface StatusBarCall {
  dark: boolean;
  hexColor: string;
  timestamp: number;
}

const statusBarCalls: StatusBarCall[] = [];

const mockBridge = {
  setStatusBarTheme: (dark: boolean, hexColor: string) => {
    statusBarCalls.push({ dark: Boolean(dark), hexColor, timestamp: Date.now() });
  },
  performHapticFeedback: () => {},
  shareBackupFile: () => {},
};

const mockLocalStorageStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => mockLocalStorageStore.get(k) || null,
  setItem: (k: string, v: string) => { mockLocalStorageStore.set(k, String(v)); },
  removeItem: (k: string) => { mockLocalStorageStore.delete(k); },
  clear: () => { mockLocalStorageStore.clear(); },
};

let dataThemeAttribute = '';
const mockDocument = {
  documentElement: {
    setAttribute: (attr: string, val: string) => {
      if (attr === 'data-theme') dataThemeAttribute = val;
    },
    getAttribute: (attr: string) => {
      return attr === 'data-theme' ? dataThemeAttribute : null;
    }
  },
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  visibilityState: 'visible'
};

(global as any).window = {
  localStorage: mockLocalStorage,
  AndroidBridge: mockBridge,
};
(global as any).localStorage = mockLocalStorage;
(global as any).document = mockDocument;
(global as any).AndroidBridge = mockBridge;

// Now import useThemeStore
import { useThemeStore } from '../src/stores/useThemeStore';

let passedChecks = 0;
let totalChecks = 0;

function assert(cond: boolean, msg: string) {
  totalChecks++;
  if (!cond) {
    throw new Error(`TS ASSERTION FAILED: ${msg}`);
  }
  passedChecks++;
}

console.log('--- Testing computeThemeFromClock direct unit tests ---');

// 05:59:59 -> evening
const d1 = new Date('2026-10-08T05:59:59.999');
assert(computeThemeFromClock(d1, 'warm') === 'warm-evening', '05:59:59 warm is warm-evening');
assert(computeThemeFromClock(d1, 'cool') === 'cool-evening', '05:59:59 cool is cool-evening');
assert(computeThemeFromClock(d1, 'auto') === 'warm-evening', '05:59:59 auto is warm-evening');

// 06:00:00 -> morning
const d2 = new Date('2026-10-08T06:00:00.000');
assert(computeThemeFromClock(d2, 'warm') === 'warm-morning', '06:00:00 warm is warm-morning');
assert(computeThemeFromClock(d2, 'cool') === 'cool-morning', '06:00:00 cool is cool-morning');
assert(computeThemeFromClock(d2, 'auto') === 'warm-morning', '06:00:00 auto is warm-morning');

// 17:59:59 -> morning
const d3 = new Date('2026-10-08T17:59:59.999');
assert(computeThemeFromClock(d3, 'warm') === 'warm-morning', '17:59:59 warm is warm-morning');
assert(computeThemeFromClock(d3, 'cool') === 'cool-morning', '17:59:59 cool is cool-morning');

// 18:00:00 -> evening
const d4 = new Date('2026-10-08T18:00:00.000');
assert(computeThemeFromClock(d4, 'warm') === 'warm-evening', '18:00:00 warm is warm-evening');
assert(computeThemeFromClock(d4, 'cool') === 'cool-evening', '18:00:00 cool is cool-evening');

// Full 24h sweep on computeThemeFromClock
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m++) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const dt = new Date(`2026-10-08T${hh}:${mm}:00`);
    const isMorning = h >= 6 && h < 18;
    assert(
      computeThemeFromClock(dt, 'warm') === (isMorning ? 'warm-morning' : 'warm-evening'),
      `computeThemeFromClock at ${hh}:${mm} warm`
    );
    assert(
      computeThemeFromClock(dt, 'cool') === (isMorning ? 'cool-morning' : 'cool-evening'),
      `computeThemeFromClock at ${hh}:${mm} cool`
    );
  }
}
console.log('✓ computeThemeFromClock 24h sweep passed.');

console.log('--- Testing useThemeStore state & bridge sync ---');

const store = useThemeStore.getState();

// Rapid theme cycling on Zustand store
statusBarCalls.length = 0;
const testThemes: ThemeMode[] = ['warm-morning', 'cool-morning', 'warm-evening', 'cool-evening'];
for (let i = 0; i < 1000; i++) {
  const targetTheme = testThemes[i % 4];
  store.setTheme(targetTheme);
  const current = useThemeStore.getState();
  assert(current.theme === targetTheme, `Zustand store theme matches ${targetTheme}`);
  assert(current.autoSwitch === false, 'setTheme disables autoSwitch');
  assert(dataThemeAttribute === targetTheme, `DOM data-theme is ${targetTheme}`);
}

assert(statusBarCalls.length === 1000, `1000 status bar calls recorded, got ${statusBarCalls.length}`);
for (let i = 0; i < 1000; i++) {
  const targetTheme = testThemes[i % 4];
  const themeDef = THEMES[targetTheme];
  const call = statusBarCalls[i];
  assert(call.hexColor === themeDef.appBg, `Status bar hex matches theme appBg (${call.hexColor} === ${themeDef.appBg})`);
  assert(call.dark === themeDef.isDark, `Status bar dark matches theme isDark (${call.dark} === ${themeDef.isDark})`);
}
console.log('✓ 1000 direct Zustand store rapid cycles passed with exact status bar & DOM sync.');

// Error checks
let errCount = 0;
try {
  (store.setTheme as any)('invalid-theme');
} catch (e) {
  errCount++;
}
try {
  (store.setToneLock as any)('invalid-tone');
} catch (e) {
  errCount++;
}
assert(errCount === 2, 'Invalid theme and tone threw errors as expected');

console.log(`=== TS STRESS TESTS PASSED: ${totalChecks} assertions ===`);
