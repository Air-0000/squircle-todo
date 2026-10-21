#!/usr/bin/env node

/**
 * Standalone E2E Test Runner for Android Squircle To-Do Application
 * Zero external dependencies. Fast execution.
 * Supports: Tiers 1-4, test filtering, JSON reporting, detailed error stacks.
 */

const fs = require('fs');
const path = require('path');
const { expect } = require('./harness/assertions.cjs');

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const BG_GREEN = '\x1b[42m\x1b[30m';
const BG_RED = '\x1b[41m\x1b[37m';

// Command line arguments parsing
const args = process.argv.slice(2);
const options = {
  tier: null,
  filter: null,
  json: false,
  verbose: false
};

args.forEach(arg => {
  if (arg.startsWith('--tier=')) {
    options.tier = arg.split('=')[1];
  } else if (arg.startsWith('--filter=')) {
    options.filter = arg.split('=')[1];
  } else if (arg === '--json') {
    options.json = true;
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  }
});

// Test Suite Context
const suites = [];
let currentSuite = null;

function describe(suiteName, fn) {
  const suite = {
    name: suiteName,
    tests: [],
    beforeEachHooks: [],
    afterEachHooks: [],
    beforeAllHooks: [],
    afterAllHooks: []
  };
  const prevSuite = currentSuite;
  currentSuite = suite;
  suites.push(suite);

  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

function it(testName, fn) {
  if (!currentSuite) {
    throw new Error(`Test "${testName}" must be inside a describe() block`);
  }
  currentSuite.tests.push({
    name: testName,
    fn,
    status: 'pending',
    error: null,
    durationMs: 0
  });
}

const test = it;

function beforeEach(fn) {
  if (currentSuite) currentSuite.beforeEachHooks.push(fn);
}

function afterEach(fn) {
  if (currentSuite) currentSuite.afterEachHooks.push(fn);
}

function beforeAll(fn) {
  if (currentSuite) currentSuite.beforeAllHooks.push(fn);
}

function afterAll(fn) {
  if (currentSuite) currentSuite.afterAllHooks.push(fn);
}

// Global exposure for test files
global.describe = describe;
global.it = it;
global.test = test;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.expect = expect;

async function runTestSuite() {
  const testDir = path.resolve(__dirname, 'e2e');
  if (!fs.existsSync(testDir)) {
    console.error(`${RED}Test directory not found: ${testDir}${RESET}`);
    process.exit(1);
  }

  const files = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.cjs') || file.endsWith('.test.js'))
    .sort();

  // Filter files by tier if specified
  const filteredFiles = files.filter(file => {
    if (options.tier && options.tier !== 'all') {
      const tierPrefix = `tier${options.tier}`;
      if (!file.startsWith(tierPrefix)) return false;
    }
    return true;
  });

  if (filteredFiles.length === 0) {
    console.log(`${YELLOW}No test files matched criteria (tier: ${options.tier || 'all'})${RESET}`);
    process.exit(0);
  }

  // Load all test files
  for (const file of filteredFiles) {
    const filePath = path.join(testDir, file);
    try {
      require(filePath);
    } catch (err) {
      console.error(`${RED}Failed to load test file ${file}:${RESET}`, err);
      process.exit(1);
    }
  }

  // Run all loaded suites
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  const suiteResults = [];

  const startTime = Date.now();

  for (const suite of suites) {
    const suiteResult = {
      name: suite.name,
      tests: [],
      passed: true
    };

    let suiteMatchingTests = suite.tests;
    if (options.filter) {
      const reg = new RegExp(options.filter, 'i');
      suiteMatchingTests = suite.tests.filter(t => reg.test(t.name) || reg.test(suite.name));
    }

    if (suiteMatchingTests.length === 0) continue;

    if (!options.json) {
      console.log(`\n${BOLD}${CYAN}● ${suite.name}${RESET}`);
    }

    // Execute beforeAll hooks
    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    for (const testItem of suiteMatchingTests) {
      totalTests++;
      const testStart = Date.now();

      try {
        for (const hook of suite.beforeEachHooks) {
          await hook();
        }

        await testItem.fn();

        for (const hook of suite.afterEachHooks) {
          await hook();
        }

        testItem.status = 'passed';
        testItem.durationMs = Date.now() - testStart;
        passedTests++;

        if (!options.json) {
          console.log(`  ${GREEN}✓${RESET} ${testItem.name} ${GRAY}(${testItem.durationMs}ms)${RESET}`);
        }
      } catch (err) {
        testItem.status = 'failed';
        testItem.durationMs = Date.now() - testStart;
        testItem.error = {
          message: err.message,
          stack: err.stack
        };
        failedTests++;
        suiteResult.passed = false;

        if (!options.json) {
          console.log(`  ${RED}✗ ${testItem.name} (${testItem.durationMs}ms)${RESET}`);
          console.log(`    ${RED}Error: ${err.message}${RESET}`);
          if (options.verbose && err.stack) {
            console.log(`    ${GRAY}${err.stack.split('\n').slice(1, 4).join('\n    ')}${RESET}`);
          }
        }
      }

      suiteResult.tests.push({
        name: testItem.name,
        status: testItem.status,
        durationMs: testItem.durationMs,
        error: testItem.error ? testItem.error.message : null
      });
    }

    // Execute afterAll hooks
    for (const hook of suite.afterAllHooks) {
      await hook();
    }

    suiteResults.push(suiteResult);
  }

  const totalDuration = Date.now() - startTime;

  if (options.json) {
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        durationMs: totalDuration,
        timestamp: new Date().toISOString()
      },
      suites: suiteResults
    };
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n' + '─'.repeat(60));
    console.log(`${BOLD}E2E Test Execution Summary:${RESET}`);
    console.log(`  Total Test Suites: ${suites.length}`);
    console.log(`  Total Tests Run:   ${totalTests}`);
    console.log(`  ${GREEN}Tests Passed:      ${passedTests}${RESET}`);
    if (failedTests > 0) {
      console.log(`  ${RED}Tests Failed:      ${failedTests}${RESET}`);
    } else {
      console.log(`  Tests Failed:      0`);
    }
    console.log(`  Duration:          ${(totalDuration / 1000).toFixed(2)}s`);

    if (failedTests === 0) {
      console.log(`\n${BG_GREEN} PASS ${RESET} ${GREEN}${BOLD}All E2E test suites passed successfully!${RESET}\n`);
    } else {
      console.log(`\n${BG_RED} FAIL ${RESET} ${RED}${BOLD}${failedTests} test(s) failed.${RESET}\n`);
    }
  }

  process.exit(failedTests === 0 ? 0 : 1);
}

if (require.main === module) {
  runTestSuite().catch(err => {
    console.error(`${RED}Fatal error running test suite:${RESET}`, err);
    process.exit(1);
  });
}

module.exports = {
  describe,
  it,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  expect,
  runTestSuite
};
