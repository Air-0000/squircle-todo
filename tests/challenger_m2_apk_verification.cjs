/**
 * Challenger 2: Empirical Verification & Stress Harness for Milestone 2
 * Tests APK deliverables, ZIP integrity, digital signature, web bundle contents,
 * squircle geometry tokens, 4-theme palette matrix, and motion physics.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DELIVERABLE_ROOT_APK = path.join(PROJECT_ROOT, 'app-debug.apk');
const DELIVERABLE_OUT_APK = path.join(PROJECT_ROOT, 'build_output', 'app-debug.apk');
const APKSIGNER_BIN = '/home/constant/.wmtool/android-sdk/build-tools/34.0.0/apksigner';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ✗ [FAIL] ${testName} ${details ? '- ' + details : ''}`);
  }
}

console.log('======================================================================');
console.log('🔍 Challenger 2: Empirical APK & M2 Asset Verification');
console.log('   Timestamp: ' + new Date().toISOString());
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// Test Group 1: APK Deliverable Artifacts & Checksums
// -----------------------------------------------------------------------------
console.log('● Test Group 1: APK Deliverables & Integrity');

assert(fs.existsSync(DELIVERABLE_ROOT_APK), 'Root APK exists at app-debug.apk');
assert(fs.existsSync(DELIVERABLE_OUT_APK), 'Build output APK exists at build_output/app-debug.apk');

const rootStat = fs.statSync(DELIVERABLE_ROOT_APK);
const outStat = fs.statSync(DELIVERABLE_OUT_APK);

assert(rootStat.size > 500000, `Root APK size is substantial (>500KB): ${rootStat.size} bytes`);
assert(outStat.size > 500000, `Output APK size is substantial (>500KB): ${outStat.size} bytes`);
assert(rootStat.size === outStat.size, `Both APK deliverables have identical byte size (${rootStat.size} bytes)`);

const rootHash = crypto.createHash('sha256').update(fs.readFileSync(DELIVERABLE_ROOT_APK)).digest('hex');
const outHash = crypto.createHash('sha256').update(fs.readFileSync(DELIVERABLE_OUT_APK)).digest('hex');

assert(rootHash === outHash, `Both APK deliverables share identical SHA256 checksum (${rootHash})`);

// -----------------------------------------------------------------------------
// Test Group 2: apksigner & unzip -t Verification
// -----------------------------------------------------------------------------
console.log('\n● Test Group 2: Digital Signature & ZIP Structure Verification');

try {
  const apksignerOut = execSync(`${APKSIGNER_BIN} verify -v --print-certs "${DELIVERABLE_ROOT_APK}"`, { encoding: 'utf8' });
  assert(apksignerOut.includes('Verifies'), 'apksigner confirms root APK verifies');
  assert(apksignerOut.includes('Verified using v2 scheme (APK Signature Scheme v2): true'), 'apksigner confirms v2 signature scheme is valid');
  assert(apksignerOut.includes('CN=Android Debug'), 'apksigner confirms valid Android Debug certificate signer');
} catch (err) {
  assert(false, 'apksigner verification threw error', err.message);
}

try {
  const unzipOut = execSync(`unzip -t "${DELIVERABLE_ROOT_APK}"`, { encoding: 'utf8' });
  assert(unzipOut.includes('No errors detected in compressed data'), 'unzip -t confirms zero archive corruption');
} catch (err) {
  assert(false, 'unzip -t verification threw error', err.message);
}

// -----------------------------------------------------------------------------
// Test Group 3: Web Bundle Assets Extraction & Parity with dist/
// -----------------------------------------------------------------------------
console.log('\n● Test Group 3: Web Bundle Packaging & Parity Verification');

const tempDir = path.join('/tmp', 'm2_challenger2_extract_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

try {
  execSync(`unzip -q "${DELIVERABLE_ROOT_APK}" "assets/*" -d "${tempDir}"`);
  const extractedIndex = path.join(tempDir, 'assets', 'index.html');
  const extractedAssetsDir = path.join(tempDir, 'assets', 'assets');
  
  assert(fs.existsSync(extractedIndex), 'Extracted assets/index.html exists');
  assert(fs.existsSync(extractedAssetsDir), 'Extracted assets/assets directory exists');

  const distIndex = path.join(PROJECT_ROOT, 'dist', 'index.html');
  const distAssetsDir = path.join(PROJECT_ROOT, 'dist', 'assets');

  const distIndexContent = fs.readFileSync(distIndex);
  const extIndexContent = fs.readFileSync(extractedIndex);
  assert(crypto.createHash('sha256').update(distIndexContent).digest('hex') ===
         crypto.createHash('sha256').update(extIndexContent).digest('hex'),
         'APK assets/index.html is bit-for-bit identical to dist/index.html');

  // Verify CSS and JS assets
  const distFiles = fs.readdirSync(distAssetsDir);
  const extFiles = fs.readdirSync(extractedAssetsDir);

  assert(distFiles.sort().join(',') === extFiles.sort().join(','),
         `Asset filenames in APK match dist exactly: [${distFiles.join(', ')}]`);

  for (const f of distFiles) {
    const dHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(distAssetsDir, f))).digest('hex');
    const eHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(extractedAssetsDir, f))).digest('hex');
    assert(dHash === eHash, `Asset ${f} in APK matches dist/assets/${f} bit-for-bit`);
  }

  // ---------------------------------------------------------------------------
  // Test Group 4: M2 Squircle Tokens, 4 Themes & Motion Physics inside APK Web Bundle
  // ---------------------------------------------------------------------------
  console.log('\n● Test Group 4: M2 Squircle & Theme Assets Inspection Inside APK');

  const cssFile = extFiles.find(f => f.endsWith('.css'));
  const jsFile = extFiles.find(f => f.endsWith('.js'));
  assert(Boolean(cssFile), `CSS bundle found in APK: ${cssFile}`);
  assert(Boolean(jsFile), `JS bundle found in APK: ${jsFile}`);

  const cssContent = fs.readFileSync(path.join(extractedAssetsDir, cssFile), 'utf8');
  const jsContent = fs.readFileSync(path.join(extractedAssetsDir, jsFile), 'utf8');

  // Check 4 Themes hex colors in CSS and JS
  const expectedThemeColors = [
    { name: 'Warm Morning appBg', hex: '#FAF7F2' },
    { name: 'Warm Morning accent', hex: '#F97316' },
    { name: 'Cool Morning appBg', hex: '#F0FDF9' },
    { name: 'Cool Morning accent', hex: '#0D9488' },
    { name: 'Warm Evening appBg', hex: '#1C1917' },
    { name: 'Warm Evening accent', hex: '#F59E0B' },
    { name: 'Cool Evening appBg', hex: '#0B0F19' },
    { name: 'Cool Evening accent', hex: '#06B6D4' },
  ];

  for (const tc of expectedThemeColors) {
    assert(cssContent.toLowerCase().includes(tc.hex.toLowerCase()),
           `Theme color ${tc.name} (${tc.hex}) present in APK CSS bundle`);
    assert(jsContent.toLowerCase().includes(tc.hex.toLowerCase()),
           `Theme color ${tc.name} (${tc.hex}) present in APK JS bundle`);
  }

  // Check 4 Theme IDs
  const themeIds = ['warm-morning', 'cool-morning', 'warm-evening', 'cool-evening'];
  for (const tid of themeIds) {
    assert(jsContent.includes(tid), `Theme ID '${tid}' present in APK JS bundle`);
  }

  // Check Chinese Theme Names
  const themeNames = ['晨曦暖阳', '冰川清晨', '暮色暗金', '深海极夜'];
  for (const tn of themeNames) {
    assert(jsContent.includes(tn), `Theme name '${tn}' present in APK JS bundle`);
  }

  // Check Squircle Radii & Relief Shadows in CSS
  assert(cssContent.includes('rounded-squircle'), 'rounded-squircle class present in APK CSS');
  assert(cssContent.includes('shadow-squircle'), 'shadow-squircle class/property present in APK CSS');
  assert(cssContent.includes('20px'), '20px squircle card radius present in CSS');
  assert(cssContent.includes('22px'), '22px squircle FAB radius present in CSS');
  assert(cssContent.includes('9999px'), '9999px pill capsule radius present in CSS');

  // Check Spring Motion Physics & Confetti in JS
  assert(jsContent.includes('defaultCard'), 'defaultCard spring config present in APK JS');
  assert(jsContent.includes('quickCheckbox'), 'quickCheckbox spring config present in APK JS');
  assert(jsContent.includes('stiffness:300') || jsContent.includes('stiffness: 300'), 'stiffness 300 spring present in JS');
  assert(jsContent.includes('damping:25') || jsContent.includes('damping: 25'), 'damping 25 spring present in JS');
  assert(jsContent.includes('confetti'), 'Canvas-confetti particle engine present in APK JS');
  assert(jsContent.includes('AndroidBridge'), 'AndroidBridge integration present in APK JS');
  assert(jsContent.includes('setStatusBarTheme'), 'setStatusBarTheme bridge method present in APK JS');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

console.log('\n======================================================================');
console.log(`Execution Summary:`);
console.log(`  Total Checks: ${testsRun}`);
console.log(`  Passed:       ${testsPassed}`);
console.log(`  Failed:       ${testsFailed}`);
console.log('======================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('\n🌟 ALL CHALLENGER EMPIRICAL VERIFICATION CHECKS PASSED!');
  process.exit(0);
}
