/**
 * Tier 1 Test Suite: Squircle UI Geometry & 4 Themes Feature Coverage
 * Covers: 4-theme matrix, status bar bridge, time scheduler, tone locks, squircle tokens, spring physics.
 */

const { TodoAppDriver, THEMES } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 1: Squircle UI & 4 Themes - Feature Coverage', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
  });

  it('T1-UI-01: should support all 4 themes in the palette matrix with precise tokens', () => {
    const tokens = app.getThemeTokens();

    // Warm Morning (晨曦暖阳)
    expect(tokens['warm-morning'].appBg).toBe('#FAF7F2');
    expect(tokens['warm-morning'].primaryAccent).toBe('#F97316');
    expect(tokens['warm-morning'].isDark).toBe(false);

    // Cool Morning (冰川清晨)
    expect(tokens['cool-morning'].appBg).toBe('#F0FDF9');
    expect(tokens['cool-morning'].primaryAccent).toBe('#0D9488');
    expect(tokens['cool-morning'].isDark).toBe(false);

    // Warm Evening (暮色暗金)
    expect(tokens['warm-evening'].appBg).toBe('#1C1917');
    expect(tokens['warm-evening'].primaryAccent).toBe('#F59E0B');
    expect(tokens['warm-evening'].isDark).toBe(true);

    // Cool Evening (深海极夜)
    expect(tokens['cool-evening'].appBg).toBe('#0B0F19');
    expect(tokens['cool-evening'].primaryAccent).toBe('#06B6D4');
    expect(tokens['cool-evening'].isDark).toBe(true);
  });

  it('T1-UI-02: should synchronize status bar theme with Android Bridge on theme switch', () => {
    app.env.androidBridge.clearHistory();

    // Switch to dark theme (Cool Evening)
    app.setTheme('cool-evening');
    const lastCall1 = app.env.androidBridge.history.statusBarThemes.slice(-1)[0];
    expect(lastCall1.dark).toBe(true);
    expect(lastCall1.hexColor).toBe('#0B0F19');

    // Switch to light theme (Warm Morning)
    app.setTheme('warm-morning');
    const lastCall2 = app.env.androidBridge.history.statusBarThemes.slice(-1)[0];
    expect(lastCall2.dark).toBe(false);
    expect(lastCall2.hexColor).toBe('#FAF7F2');
  });

  it('T1-UI-03: should automatically schedule morning vs evening themes based on system clock', () => {
    app.setAutoSwitch(true);
    app.setToneLock('warm');

    // 09:00 AM (Morning)
    app.env.mockDate('2026-10-08T09:00:00');
    try {
      const morningTheme = app.getEffectiveTheme();
      expect(morningTheme.id).toBe('warm-morning');
      expect(morningTheme.timeOfDay).toBe('morning');
    } finally {
      app.env.restoreDate();
    }

    // 21:00 PM (Evening)
    app.env.mockDate('2026-10-08T21:00:00');
    try {
      const eveningTheme = app.getEffectiveTheme();
      expect(eveningTheme.id).toBe('warm-evening');
      expect(eveningTheme.timeOfDay).toBe('evening');
    } finally {
      app.env.restoreDate();
    }
  });

  it('T1-UI-04: should strictly enforce global Cool tone lock across time shifts', () => {
    app.setAutoSwitch(true);
    app.setToneLock('cool');

    // Morning with cool lock -> cool-morning
    app.env.mockDate('2026-10-08T10:00:00');
    try {
      expect(app.getEffectiveTheme().id).toBe('cool-morning');
    } finally {
      app.env.restoreDate();
    }

    // Night with cool lock -> cool-evening
    app.env.mockDate('2026-10-08T23:00:00');
    try {
      expect(app.getEffectiveTheme().id).toBe('cool-evening');
    } finally {
      app.env.restoreDate();
    }
  });

  it('T1-UI-05: should conform to squircle geometry tokens (16-24px radii, 9999px pills)', () => {
    const squircle = app.getSquircleTokens();
    expect(squircle.cardRadius).toBe('20px');
    expect(squircle.cardRadiusRange.min).toBe(16);
    expect(squircle.cardRadiusRange.max).toBe(24);
    expect(squircle.pillRadius).toBe('9999px');
    expect(squircle.fabRadius).toBe('22px');
  });

  it('T1-UI-06: should configure spring motion physics parameters for smooth 60fps animations', () => {
    const physics = app.getSpringPhysics();
    expect(physics.defaultCard.stiffness).toBe(300);
    expect(physics.defaultCard.damping).toBe(25);
    expect(physics.quickCheckbox.stiffness).toBe(450);
    expect(physics.quickCheckbox.damping).toBe(20);
    expect(physics.bottomSheet.stiffness).toBe(220);
    expect(physics.bottomSheet.damping).toBe(28);
  });
});
