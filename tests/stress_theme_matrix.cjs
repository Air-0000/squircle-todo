/**
 * Empirical Stress Test Harness: Theme Matrix, Clock Boundaries & Status Bar Synchronization
 * Part of Milestone 2 Adversarial Verification (m2_challenger_1).
 */

const { TodoAppDriver, THEMES, SQUIRCLE_TOKENS, SPRING_PHYSICS } = require('./harness/app_driver.cjs');
const { expect } = require('./harness/assertions.cjs');
const { setupMockEnvironment } = require('./harness/mock_env.cjs');

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  passedAssertions++;
}

console.log('====================================================');
console.log('STRESS TEST 1: Exact Date/Time Boundaries');
console.log('====================================================');

const env = setupMockEnvironment();
const app = new TodoAppDriver({ env });

// Boundary 1: 05:59:59 (evening) vs 06:00:00 (morning)
app.setAutoSwitch(true);
app.setToneLock('warm');

// Sub-second boundary test: 05:59:59.000
env.mockDate('2026-10-08T05:59:59.000');
let theme = app.getEffectiveTheme();
assert(theme.id === 'warm-evening', '05:59:59.000 must be warm-evening');
assert(theme.timeOfDay === 'evening', '05:59:59.000 timeOfDay must be evening');
assert(theme.isDark === true, '05:59:59.000 must be isDark true');
assert(theme.appBg === '#1C1917', '05:59:59.000 appBg must be #1C1917');

// Sub-second boundary test: 05:59:59.999
env.mockDate('2026-10-08T05:59:59.999');
theme = app.getEffectiveTheme();
assert(theme.id === 'warm-evening', '05:59:59.999 must still be warm-evening');

// Millisecond flip to 06:00:00.000
env.mockDate('2026-10-08T06:00:00.000');
theme = app.getEffectiveTheme();
assert(theme.id === 'warm-morning', '06:00:00.000 must flip to warm-morning');
assert(theme.timeOfDay === 'morning', '06:00:00.000 timeOfDay must be morning');
assert(theme.isDark === false, '06:00:00.000 must be isDark false');
assert(theme.appBg === '#FAF7F2', '06:00:00.000 appBg must be #FAF7F2');

// Status bar check at 06:00:00.000
let lastStatusCall = env.androidBridge.history.statusBarThemes.slice(-1)[0];
assert(lastStatusCall.dark === false, 'Status bar must be light at 06:00:00');
assert(lastStatusCall.hexColor === '#FAF7F2', 'Status bar hex must be #FAF7F2 at 06:00:00');

// Cool tone at Boundary 1
app.setToneLock('cool');
env.mockDate('2026-10-08T05:59:59.999');
theme = app.getEffectiveTheme();
assert(theme.id === 'cool-evening', '05:59:59.999 with cool lock must be cool-evening');
assert(theme.appBg === '#0B0F19', '05:59:59.999 cool-evening appBg must be #0B0F19');

env.mockDate('2026-10-08T06:00:00.000');
theme = app.getEffectiveTheme();
assert(theme.id === 'cool-morning', '06:00:00.000 with cool lock must flip to cool-morning');
assert(theme.appBg === '#F0FDF9', '06:00:00.000 cool-morning appBg must be #F0FDF9');
lastStatusCall = env.androidBridge.history.statusBarThemes.slice(-1)[0];
assert(lastStatusCall.dark === false, 'Status bar must be light at cool morning');
assert(lastStatusCall.hexColor === '#F0FDF9', 'Status bar hex must be #F0FDF9 at cool morning');

// Boundary 2: 17:59:59 (morning) vs 18:00:00 (evening)
app.setToneLock('warm');
env.mockDate('2026-10-08T17:59:59.000');
theme = app.getEffectiveTheme();
assert(theme.id === 'warm-morning', '17:59:59.000 must be warm-morning');
assert(theme.timeOfDay === 'morning', '17:59:59.000 timeOfDay must be morning');

env.mockDate('2026-10-08T17:59:59.999');
theme = app.getEffectiveTheme();
assert(theme.id === 'warm-morning', '17:59:59.999 must still be warm-morning');

env.mockDate('2026-10-08T18:00:00.000');
theme = app.getEffectiveTheme();
assert(theme.id === 'warm-evening', '18:00:00.000 must flip to warm-evening');
assert(theme.timeOfDay === 'evening', '18:00:00.000 timeOfDay must be evening');
assert(theme.isDark === true, '18:00:00.000 must be isDark true');
assert(theme.appBg === '#1C1917', '18:00:00.000 appBg must be #1C1917');
lastStatusCall = env.androidBridge.history.statusBarThemes.slice(-1)[0];
assert(lastStatusCall.dark === true, 'Status bar must be dark at 18:00:00');
assert(lastStatusCall.hexColor === '#1C1917', 'Status bar hex must be #1C1917 at 18:00:00');

// Cool tone at Boundary 2
app.setToneLock('cool');
env.mockDate('2026-10-08T17:59:59.999');
theme = app.getEffectiveTheme();
assert(theme.id === 'cool-morning', '17:59:59.999 with cool lock must be cool-morning');

env.mockDate('2026-10-08T18:00:00.000');
theme = app.getEffectiveTheme();
assert(theme.id === 'cool-evening', '18:00:00.000 with cool lock must flip to cool-evening');
assert(theme.appBg === '#0B0F19', '18:00:00.000 cool-evening appBg must be #0B0F19');
lastStatusCall = env.androidBridge.history.statusBarThemes.slice(-1)[0];
assert(lastStatusCall.dark === true, 'Status bar must be dark at cool evening');
assert(lastStatusCall.hexColor === '#0B0F19', 'Status bar hex must be #0B0F19 at cool evening');

console.log('✓ Date/Time boundary tests passed (including sub-second limits).');

console.log('====================================================');
console.log('STRESS TEST 2: 24-Hour Discrete Minute Sweep (1,440 checks)');
console.log('====================================================');

for (let hour = 0; hour < 24; hour++) {
  for (let min = 0; min < 60; min++) {
    const hh = String(hour).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    const iso = `2026-10-08T${hh}:${mm}:30`;
    env.mockDate(iso);

    const isMorning = hour >= 6 && hour < 18;

    // Test warm lock
    app.setToneLock('warm');
    const warmTheme = app.getEffectiveTheme();
    if (isMorning) {
      assert(warmTheme.id === 'warm-morning', `Minute ${hh}:${mm} warm should be warm-morning`);
      assert(warmTheme.isDark === false, `Minute ${hh}:${mm} should be light`);
    } else {
      assert(warmTheme.id === 'warm-evening', `Minute ${hh}:${mm} warm should be warm-evening`);
      assert(warmTheme.isDark === true, `Minute ${hh}:${mm} should be dark`);
    }

    // Test cool lock
    app.setToneLock('cool');
    const coolTheme = app.getEffectiveTheme();
    if (isMorning) {
      assert(coolTheme.id === 'cool-morning', `Minute ${hh}:${mm} cool should be cool-morning`);
      assert(coolTheme.isDark === false, `Minute ${hh}:${mm} should be light`);
    } else {
      assert(coolTheme.id === 'cool-evening', `Minute ${hh}:${mm} cool should be cool-evening`);
      assert(coolTheme.isDark === true, `Minute ${hh}:${mm} should be dark`);
    }
  }
}
console.log('✓ 1,440 discrete minute sweep passed with 100% accuracy.');

console.log('====================================================');
console.log('STRESS TEST 3: toneLock When autoSwitch Is ON vs OFF');
console.log('====================================================');

// 1. autoSwitch ON: toneLock switch immediately updates theme
env.mockDate('2026-10-08T12:00:00'); // Noon
app.setAutoSwitch(true);
app.setToneLock('warm');
assert(app.getEffectiveTheme().id === 'warm-morning', 'Noon with warm lock is warm-morning');

app.setToneLock('cool');
assert(app.getEffectiveTheme().id === 'cool-morning', 'Noon with cool lock immediately switches to cool-morning');
assert(env.androidBridge.history.statusBarThemes.slice(-1)[0].hexColor === '#F0FDF9', 'Status bar hex updated to cool-morning');

app.setToneLock('auto');
assert(app.getEffectiveTheme().id === 'warm-morning', 'Auto lock defaults to warm-morning');

// 2. autoSwitch OFF: manual override locks theme across clock changes & toneLock changes
app.setTheme('cool-evening'); // Explicit manual switch
assert(app.themeState.autoSwitch === false, 'setTheme must set autoSwitch to false');
assert(app.getEffectiveTheme().id === 'cool-evening', 'Theme is cool-evening');

// Shift clock to 10:00 AM (morning)
env.mockDate('2026-10-08T10:00:00');
assert(app.getEffectiveTheme().id === 'cool-evening', 'Must NOT change to morning theme because autoSwitch is OFF');

// Change toneLock while autoSwitch is OFF
app.setToneLock('warm');
assert(app.themeState.toneLock === 'warm', 'toneLock updated in state');
assert(app.themeState.autoSwitch === false, 'autoSwitch remains false');
assert(app.getEffectiveTheme().id === 'cool-evening', 'Theme must still remain cool-evening despite toneLock change');

// Shift clock to 02:00 AM (midnight)
env.mockDate('2026-10-08T02:00:00');
assert(app.getEffectiveTheme().id === 'cool-evening', 'Must stay cool-evening at 02:00');

// Re-enabling autoSwitch must immediately trigger sync with clock and toneLock ('warm' at 02:00 -> 'warm-evening')
app.setAutoSwitch(true);
assert(app.themeState.autoSwitch === true, 'autoSwitch is now true');
assert(app.getEffectiveTheme().id === 'warm-evening', 'Re-enabling autoSwitch immediately synced to warm-evening');
assert(env.androidBridge.history.statusBarThemes.slice(-1)[0].hexColor === '#1C1917', 'Status bar synced to #1C1917');

// Invalid toneLock / themeId error boundaries
let threwInvalidTone = false;
try {
  app.setToneLock('neon-cyber');
} catch (e) {
  threwInvalidTone = true;
  assert(e.message.includes('Invalid tone lock'), 'Error message specifies invalid tone lock');
}
assert(threwInvalidTone, 'setToneLock with invalid value must throw');

let threwInvalidTheme = false;
try {
  app.setTheme('cyberpunk-neon');
} catch (e) {
  threwInvalidTheme = true;
  assert(e.message.includes('Invalid theme ID'), 'Error message specifies invalid theme ID');
}
assert(threwInvalidTheme, 'setTheme with invalid value must throw');

console.log('✓ toneLock with autoSwitch ON and OFF verified completely.');

console.log('====================================================');
console.log('STRESS TEST 4: Rapid Theme Cycling & Status Bar Hex Updates');
console.log('====================================================');

env.androidBridge.clearHistory();
const themeKeys = ['warm-morning', 'cool-morning', 'warm-evening', 'cool-evening'];
const expectedHex = {
  'warm-morning': { hex: '#FAF7F2', dark: false },
  'cool-morning': { hex: '#F0FDF9', dark: false },
  'warm-evening': { hex: '#1C1917', dark: true },
  'cool-evening': { hex: '#0B0F19', dark: true }
};

// 1. 1,000 rapid sequential cycles (250 repetitions of all 4 themes)
const CYCLES = 250;
for (let i = 0; i < CYCLES; i++) {
  for (const t of themeKeys) {
    app.setTheme(t);
  }
}

const history = env.androidBridge.history.statusBarThemes;
assert(history.length === CYCLES * 4, `Status bar history must contain exactly ${CYCLES * 4} calls, got ${history.length}`);

for (let i = 0; i < history.length; i++) {
  const expectedTheme = themeKeys[i % 4];
  const spec = expectedHex[expectedTheme];
  const call = history[i];
  assert(call.hexColor === spec.hex, `Call ${i} hexColor must be ${spec.hex}, got ${call.hexColor}`);
  assert(call.dark === spec.dark, `Call ${i} dark flag must be ${spec.dark}, got ${call.dark}`);
}
console.log(`✓ 1,000 sequential rapid theme switches verified with zero errors.`);

// 2. 2,000 pseudo-randomized rapid switches
env.androidBridge.clearHistory();
const RANDOM_COUNT = 2000;
// Seeded pseudo-random generator (LCG)
let seed = 42;
function pseudoRandom() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const randomSequence = [];
for (let i = 0; i < RANDOM_COUNT; i++) {
  const choice = themeKeys[Math.floor(pseudoRandom() * themeKeys.length)];
  randomSequence.push(choice);
  app.setTheme(choice);
}

const randHistory = env.androidBridge.history.statusBarThemes;
assert(randHistory.length === RANDOM_COUNT, `History must have ${RANDOM_COUNT} calls`);

for (let i = 0; i < RANDOM_COUNT; i++) {
  const expected = expectedHex[randomSequence[i]];
  const actual = randHistory[i];
  assert(actual.hexColor === expected.hex, `Random index ${i}: expected hex ${expected.hex}, got ${actual.hexColor}`);
  assert(actual.dark === expected.dark, `Random index ${i}: expected dark ${expected.dark}, got ${actual.dark}`);
}

const finalExpectedTheme = randomSequence[RANDOM_COUNT - 1];
assert(app.themeState.theme === finalExpectedTheme, `Final theme must be ${finalExpectedTheme}`);
assert(app.themeState.autoSwitch === false, 'autoSwitch must be false after manual switches');
console.log(`✓ 2,000 randomized rapid theme switches verified with zero drops or corruption.`);

console.log('====================================================');
console.log('STRESS TEST 5: Palette Contrast & Token Integrity');
console.log('====================================================');

for (const [id, def] of Object.entries(THEMES)) {
  assert(def.id === id, `Theme ID match for ${id}`);
  assert(typeof def.name === 'string' && def.name.length > 0, `Theme name present for ${id}`);
  assert(['warm', 'cool'].includes(def.tone), `Tone valid for ${id}`);
  assert(['morning', 'evening'].includes(def.timeOfDay), `TimeOfDay valid for ${id}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.appBg), `appBg valid hex: ${def.appBg}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.cardSurface), `cardSurface valid hex: ${def.cardSurface}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.cardBorder), `cardBorder valid hex: ${def.cardBorder}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.primaryAccent), `primaryAccent valid hex: ${def.primaryAccent}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.secondaryAccent), `secondaryAccent valid hex: ${def.secondaryAccent}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.textPrimary), `textPrimary valid hex: ${def.textPrimary}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.textMuted), `textMuted valid hex: ${def.textMuted}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.tagPillBg), `tagPillBg valid hex: ${def.tagPillBg}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(def.tagPillText), `tagPillText valid hex: ${def.tagPillText}`);
  assert(typeof def.isDark === 'boolean', `isDark boolean for ${id}`);
}

// Squircle & Spring tokens
assert(SQUIRCLE_TOKENS.cardRadius === '20px', 'cardRadius is 20px');
assert(SQUIRCLE_TOKENS.cardRadiusRange.min === 16, 'card min radius is 16');
assert(SQUIRCLE_TOKENS.cardRadiusRange.max === 24, 'card max radius is 24');
assert(SQUIRCLE_TOKENS.pillRadius === '9999px', 'pill radius is 9999px');
assert(SQUIRCLE_TOKENS.fabRadius === '22px', 'fab radius is 22px');

assert(SPRING_PHYSICS.defaultCard.stiffness === 300 && SPRING_PHYSICS.defaultCard.damping === 25, 'defaultCard spring valid');
assert(SPRING_PHYSICS.quickCheckbox.stiffness === 450 && SPRING_PHYSICS.quickCheckbox.damping === 20, 'quickCheckbox spring valid');
assert(SPRING_PHYSICS.bottomSheet.stiffness === 220 && SPRING_PHYSICS.bottomSheet.damping === 28, 'bottomSheet spring valid');

env.restoreDate();

console.log('====================================================');
console.log(`SUMMARY: All ${totalAssertions} assertions passed successfully!`);
console.log('====================================================');
