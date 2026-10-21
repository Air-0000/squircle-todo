/**
 * Challenger 2: Empirical RFC 4180 CSV Export Verification & Stress Harness
 * 
 * Objectives:
 * 1. Verify UTF-8 BOM (\uFEFF / 0xEF, 0xBB, 0xBF) presence.
 * 2. Verify RFC 4180 escaping specification for commas, double quotes, and newlines (\n, \r\n, \r).
 * 3. Verify quote doubling ("" -> ") and field quoting boundaries.
 * 4. Verify 10-column header schema and CRLF line terminators.
 * 5. Verify round-trip parsing with a strict RFC 4180 finite-state machine (FSM) oracle.
 * 6. Stress test with adversarial edge cases, CJK unicode, emojis, and randomized fuzzing.
 * 7. Validate both src/utils/backup.ts (production) and tests/harness/app_driver.cjs (test harness).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { TodoAppDriver } = require('./harness/app_driver.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    const errMsg = `✗ [FAIL] ${testName}${details ? ': ' + details : ''}`;
    console.error(`  ${errMsg}`);
    failureDetails.push(errMsg);
  }
}

/**
 * Strict RFC 4180 CSV Parser (Section 2 Grammar Oracle)
 * Parses raw CSV string into 2D array of strings.
 */
function parseRFC4180(csvString) {
  let input = csvString;
  // Strip BOM if present
  if (input.charCodeAt(0) === 0xFEFF) {
    input = input.slice(1);
  }

  const records = [];
  let currentRecord = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    if (insideQuotes) {
      if (ch === '"') {
        if (i + 1 < len && input[i + 1] === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        // Any character inside quotes (including comma, CR, LF)
        currentField += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        if (currentField.length === 0) {
          insideQuotes = true;
          i++;
          continue;
        } else {
          // Double quote inside non-quoted field is technically invalid RFC 4180,
          // but we record it to catch formatting violations
          currentField += ch;
          i++;
          continue;
        }
      } else if (ch === ',') {
        currentRecord.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (ch === '\r') {
        if (i + 1 < len && input[i + 1] === '\n') {
          // CRLF record boundary
          currentRecord.push(currentField);
          records.push(currentRecord);
          currentRecord = [];
          currentField = '';
          i += 2;
          continue;
        } else {
          // Bare CR record boundary
          currentRecord.push(currentField);
          records.push(currentRecord);
          currentRecord = [];
          currentField = '';
          i++;
          continue;
        }
      } else if (ch === '\n') {
        // Bare LF record boundary
        currentRecord.push(currentField);
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += ch;
        i++;
        continue;
      }
    }
  }

  // Push final field/record if any content remains
  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  return records;
}

console.log('======================================================================');
console.log('📊 Challenger 2: Empirical RFC 4180 CSV Export Verification');
console.log('   Timestamp: ' + new Date().toISOString());
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// Test Suite 1: Production src/utils/backup.ts via Node / tsx
// -----------------------------------------------------------------------------
console.log('● Test Suite 1: Production src/utils/backup.ts Export Functionality');

let prodExportResult;
try {
  // Test exportTasksToCSV directly using tsx runner
  const testScript = `
    import { exportTasksToCSV, escapeCsvField } from './src/utils/backup';
    import { TodoItem } from './src/types';

    // 1. Test escapeCsvField directly
    const escapedQuote = escapeCsvField('He said "Hello"');
    const escapedComma = escapeCsvField('Foo, Bar');
    const escapedNewline = escapeCsvField("Line1\\nLine2");
    const escapedCR = escapeCsvField("Line1\\rLine2");
    const escapedCRLF = escapeCsvField("Line1\\r\\nLine2");
    const escapedMixed = escapeCsvField('Hello, "World"\\nNew, "Line"');
    const escapedNormal = escapeCsvField('Normal String');
    const escapedNull = escapeCsvField(null);
    const escapedUndefined = escapeCsvField(undefined);

    // 2. Test exportTasksToCSV with adversarial tasks
    const testTasks: TodoItem[] = [
      {
        id: 'task-1',
        title: 'Plain task title',
        notes: 'Plain description',
        priority: 'high',
        completed: false,
        isCompleted: false,
        persona: 'exam',
        tags: ['#tag1', '#tag2'],
        createdAt: '2026-10-01T08:00:00Z',
        dueDate: '2026-10-15',
        checklists: []
      },
      {
        id: 'task-2-commas',
        title: 'Title with, multiple, commas, in, text',
        notes: 'Notes, with, commas',
        priority: 'urgent',
        completed: true,
        isCompleted: true,
        persona: 'art',
        tags: ['#tag,with,comma', '#normal'],
        createdAt: '2026-10-02T08:00:00Z',
        dueDate: '',
        checklists: []
      },
      {
        id: 'task-3-quotes',
        title: 'Title with "double quotes" and ""repeated"" quotes',
        notes: 'Notes starting with "quote" and ending with "quote"',
        priority: 'low',
        completed: false,
        isCompleted: false,
        persona: 'security',
        tags: ['#"quote-tag"'],
        createdAt: '2026-10-03T08:00:00Z',
        dueDate: '',
        checklists: []
      },
      {
        id: 'task-4-newlines',
        title: "Title with\\nnewline in between",
        notes: "Line 1\\r\\nLine 2\\r\\nLine 3 with \\"quotes\\" and , commas",
        priority: 'medium',
        completed: false,
        isCompleted: false,
        persona: 'exam',
        tags: ['#multiline'],
        createdAt: '2026-10-04T08:00:00Z',
        dueDate: '',
        checklists: []
      },
      {
        id: 'task-5-cjk-emoji',
        title: '考研政治："马克思主义基本原理"，重难点解析\\n第二节：唯物论',
        notes: '🎨 商业插画项目，画布规格："3840x2160, 300DPI"；工时结余：+2.5h',
        priority: 'urgent',
        completed: true,
        isCompleted: true,
        persona: 'art',
        tags: ['#考研数学', '#线性代数,特征值', '#"重点"'],
        createdAt: '2026-10-05T08:00:00Z',
        dueDate: '2026-12-25',
        checklists: []
      }
    ];

    const csvOutput = exportTasksToCSV(testTasks, { shareBridge: false });

    console.log(JSON.stringify({
      escapedQuote,
      escapedComma,
      escapedNewline,
      escapedCR,
      escapedCRLF,
      escapedMixed,
      escapedNormal,
      escapedNull,
      escapedUndefined,
      csvOutput
    }));
  `;

  const output = execSync(`npx --yes tsx -e "${testScript.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8'
  });
  prodExportResult = JSON.parse(output.trim());
} catch (err) {
  console.error('Failed to run production export test with tsx:', err.message);
  if (err.stdout) console.error('stdout:', err.stdout.toString());
  if (err.stderr) console.error('stderr:', err.stderr.toString());
}

assert(Boolean(prodExportResult), 'Production export tasks executed via tsx successfully');

if (prodExportResult) {
  const {
    escapedQuote,
    escapedComma,
    escapedNewline,
    escapedCR,
    escapedCRLF,
    escapedMixed,
    escapedNormal,
    escapedNull,
    escapedUndefined,
    csvOutput
  } = prodExportResult;

  // 1. escapeCsvField tests
  assert(escapedQuote === '"He said ""Hello"""', 'escapeCsvField wraps and doubles quotes: "He said ""Hello"""');
  assert(escapedComma === '"Foo, Bar"', 'escapeCsvField wraps comma in quotes: "Foo, Bar"');
  assert(escapedNewline === '"Line1\nLine2"', 'escapeCsvField wraps LF newline in quotes');
  assert(escapedCR === '"Line1\rLine2"', 'escapeCsvField wraps CR newline in quotes');
  assert(escapedCRLF === '"Line1\r\nLine2"', 'escapeCsvField wraps CRLF newline in quotes');
  assert(escapedMixed === '"Hello, ""World""\nNew, ""Line"""', 'escapeCsvField handles mixed quotes, commas, and newlines');
  assert(escapedNormal === 'Normal String', 'escapeCsvField leaves plain strings unquoted');
  assert(escapedNull === '', 'escapeCsvField converts null to empty string');
  assert(escapedUndefined === '', 'escapeCsvField converts undefined to empty string');

  // 2. UTF-8 BOM verification
  assert(csvOutput.charCodeAt(0) === 0xFEFF, 'CSV output starts with UTF-8 BOM character \\uFEFF (0xFEFF)');
  const csvBuffer = Buffer.from(csvOutput, 'utf8');
  assert(csvBuffer[0] === 0xEF && csvBuffer[1] === 0xBB && csvBuffer[2] === 0xBF,
    'CSV raw byte sequence starts with UTF-8 BOM bytes [0xEF, 0xBB, 0xBF]');

  // 3. Header verification
  const expectedHeader = 'ID,Persona,Title,Priority,IsCompleted,DueDate,Tags,CreatedAt,CompletedAt,Notes';
  assert(csvOutput.slice(1).startsWith(expectedHeader), 'CSV begins with expected 10-column RFC 4180 header line');

  // 4. Line terminator verification (RFC 4180 requires CRLF \r\n)
  const nonBomContent = csvOutput.slice(1);
  const crlfIndex = nonBomContent.indexOf('\r\n');
  assert(crlfIndex !== -1, 'CSV uses CRLF (\\r\\n) line terminators per RFC 4180 Section 2.1');

  // 5. Parse with strict RFC 4180 FSM Parser
  const parsedRecords = parseRFC4180(csvOutput);
  assert(parsedRecords.length === 6, `Strict RFC 4180 Parser parsed exactly 6 records (1 header + 5 tasks), got ${parsedRecords.length}`);

  const headerRecord = parsedRecords[0];
  assert(headerRecord.length === 10, `Header record has exactly 10 fields, got ${headerRecord.length}`);
  assert(headerRecord.join(',') === expectedHeader, 'Header columns match specification');

  // Check row 1 (Plain task)
  const row1 = parsedRecords[1];
  assert(row1.length === 10, 'Task 1 has exactly 10 columns');
  assert(row1[0] === 'task-1', 'Task 1 ID matches');
  assert(row1[1] === 'exam', 'Task 1 Persona matches');
  assert(row1[2] === 'Plain task title', 'Task 1 Title matches');
  assert(row1[9] === 'Plain description', 'Task 1 Notes matches');

  // Check row 2 (Commas)
  const row2 = parsedRecords[2];
  assert(row2.length === 10, 'Task 2 (Commas) parsed to exactly 10 columns without splitting across columns');
  assert(row2[2] === 'Title with, multiple, commas, in, text', 'Task 2 Title with commas recovered intact');
  assert(row2[9] === 'Notes, with, commas', 'Task 2 Notes with commas recovered intact');

  // Check row 3 (Quotes)
  const row3 = parsedRecords[3];
  assert(row3.length === 10, 'Task 3 (Quotes) parsed to exactly 10 columns');
  assert(row3[2] === 'Title with "double quotes" and ""repeated"" quotes', 'Task 3 Title with quotes recovered intact');
  assert(row3[9] === 'Notes starting with "quote" and ending with "quote"', 'Task 3 Notes with quotes recovered intact');

  // Check row 4 (Newlines)
  const row4 = parsedRecords[4];
  assert(row4.length === 10, 'Task 4 (Newlines) parsed to exactly 10 columns without splitting across records');
  assert(row4[2] === 'Title with\nnewline in between', 'Task 4 Title with LF newline recovered intact');
  assert(row4[9] === 'Line 1\r\nLine 2\r\nLine 3 with "quotes" and , commas', 'Task 4 Notes with CRLF, quotes, and commas recovered intact');

  // Check row 5 (CJK & Emoji)
  const row5 = parsedRecords[5];
  assert(row5.length === 10, 'Task 5 (CJK & Emoji) parsed to exactly 10 columns');
  assert(row5[2] === '考研政治："马克思主义基本原理"，重难点解析\n第二节：唯物论', 'Task 5 CJK title with quotes, commas, and newlines recovered intact');
  assert(row5[9] === '🎨 商业插画项目，画布规格："3840x2160, 300DPI"；工时结余：+2.5h', 'Task 5 CJK & Emoji notes with quotes and commas recovered intact');
}

// -----------------------------------------------------------------------------
// Test Suite 2: TodoAppDriver Harness CSV Export Verification
// -----------------------------------------------------------------------------
console.log('\n● Test Suite 2: TodoAppDriver Harness CSV Export Verification');

const driverApp = new TodoAppDriver();
driverApp.resetAllData();

// Add test tasks to harness
driverApp.addTask({
  title: '复杂任务: 含"双引号", 逗号, 以及\n换行符',
  description: '备注带有,"特殊符号"与中文: 考研政治',
  personaId: 'exam',
  priority: 'high',
  tags: ['#测试,带逗号', '#"带双引号"']
});

driverApp.addTask({
  title: '艺术插画商业委托: 赛博朋克角色',
  description: 'Line 1\r\nLine 2 "Quoted"\r\nLine 3, with comma',
  personaId: 'art',
  priority: 'urgent',
  tags: ['#插画', '#Commercial']
});

driverApp.addTask({
  title: '安保消控值班点检',
  description: '设备一切正常，无火情及隐患。',
  personaId: 'security',
  priority: 'medium',
  tags: ['#安保']
});

driverApp.env.androidBridge.clearHistory();
const driverCsv = driverApp.exportCSV();

// 1. Verify BOM
assert(driverCsv.charCodeAt(0) === 0xFEFF, 'Harness CSV starts with \\uFEFF BOM');

// 2. Verify Android Bridge sharing invocation
const sharedFiles = driverApp.env.androidBridge.history.sharedFiles;
assert(sharedFiles.length === 1, 'Harness exportCSV invoked Android Bridge shareBackupFile exactly once');
assert(sharedFiles[0].fileName === 'squircle_todo_export.csv', 'Shared file name is "squircle_todo_export.csv"');
assert(sharedFiles[0].mimeType === 'text/csv', 'Shared file MIME type is "text/csv"');
assert(sharedFiles[0].content === driverCsv, 'Shared content matches generated CSV string');

// 3. Parse with RFC 4180 Oracle
const driverRecords = parseRFC4180(driverCsv);
assert(driverRecords.length === 4, `Harness CSV parsed into exactly 4 records (1 header + 3 tasks), got ${driverRecords.length}`);

for (let r = 0; r < driverRecords.length; r++) {
  assert(driverRecords[r].length === 10, `Harness record ${r} contains exactly 10 fields`);
}

const driverTask1 = driverRecords[1];
assert(driverTask1[2] === '复杂任务: 含"双引号", 逗号, 以及\n换行符', 'Driver Task 1 title recovered with exact quotes, comma, and newline');
assert(driverTask1[9] === '备注带有,"特殊符号"与中文: 考研政治', 'Driver Task 1 description recovered with exact quotes, comma, and Chinese');

// -----------------------------------------------------------------------------
// Test Suite 3: Adversarial Fuzzing Stress Test (50 Randomized Tasks)
// -----------------------------------------------------------------------------
console.log('\n● Test Suite 3: Adversarial Fuzzing Stress Harness (50 Randomized Tasks)');

const fuzzTasks = [];
const quoteVariations = ['"', '""', '"""', '"""""', 'Simple "inside" word', '"Leading quote', 'Trailing quote"'];
const commaVariations = [',', ',,', 'one,two,three', ',leading comma', 'trailing comma,'];
const newlineVariations = ['\n', '\r\n', '\r', 'line1\nline2', 'line1\r\nline2\r\nline3'];
const cjkVariations = ['考研政治', '商业约稿', '消控巡查', '线性代数（第5章）', '特殊符号：【】《》「」—…'];
const emojis = ['🚀', '🎨', '🚨', '📚', '✨', '🔥'];

for (let i = 0; i < 50; i++) {
  const q = quoteVariations[i % quoteVariations.length];
  const c = commaVariations[(i * 3) % commaVariations.length];
  const n = newlineVariations[(i * 7) % newlineVariations.length];
  const cjk = cjkVariations[(i * 2) % cjkVariations.length];
  const em = emojis[i % emojis.length];

  const title = `Fuzz ${i}: ${em} ${cjk} [${q}] [${c}] [${n}]`;
  const notes = `Notes for fuzz ${i}:\n- Details: ${c}\n- Quote: ${q}\n- Raw: ${cjk}`;

  fuzzTasks.push({
    id: `fuzz-task-${i}`,
    title,
    notes,
    priority: (['urgent', 'high', 'medium', 'low'])[i % 4],
    completed: i % 2 === 0,
    isCompleted: i % 2 === 0,
    persona: (['exam', 'art', 'security'])[i % 3],
    personaId: (['exam', 'art', 'security'])[i % 3],
    tags: [`#tag${i}`, `#${cjk}`, `#${q}`],
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    dueDate: i % 3 === 0 ? '2026-12-31' : '',
    checklists: []
  });
}

// Run fuzz tasks through production export via tsx
const fuzzScript = `
  import { exportTasksToCSV } from './src/utils/backup';
  const tasks = ${JSON.stringify(fuzzTasks)};
  const csv = exportTasksToCSV(tasks, { shareBridge: false });
  console.log(csv);
`;

let fuzzCsvOutput;
try {
  fuzzCsvOutput = execSync(`npx --yes tsx -e "${fuzzScript.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8'
  });
} catch (err) {
  console.error('Fuzz test execution failed:', err.message);
}

assert(Boolean(fuzzCsvOutput), 'Fuzz CSV export executed successfully');

if (fuzzCsvOutput) {
  const fuzzRecords = parseRFC4180(fuzzCsvOutput);
  assert(fuzzRecords.length === 51, `Fuzz CSV parsed into exactly 51 records (1 header + 50 tasks), got ${fuzzRecords.length}`);

  let allColumns10 = true;
  let allTitlesMatch = true;
  let allNotesMatch = true;
  let mismatches = 0;

  for (let i = 0; i < 50; i++) {
    const record = fuzzRecords[i + 1];
    if (!record || record.length !== 10) {
      allColumns10 = false;
      mismatches++;
      continue;
    }

    const expectedTitle = fuzzTasks[i].title;
    const expectedNotes = fuzzTasks[i].notes;

    if (record[2] !== expectedTitle) {
      allTitlesMatch = false;
      if (mismatches < 3) {
        console.error(`Title mismatch on task ${i}:`);
        console.error('Expected:', expectedTitle);
        console.error('Actual:  ', record[2]);
      }
      mismatches++;
    }

    if (record[9] !== expectedNotes) {
      allNotesMatch = false;
      if (mismatches < 3) {
        console.error(`Notes mismatch on task ${i}:`);
        console.error('Expected:', expectedNotes);
        console.error('Actual:  ', record[9]);
      }
      mismatches++;
    }
  }

  assert(allColumns10, 'All 50 fuzz records have exactly 10 columns without schema drift');
  assert(allTitlesMatch, 'All 50 fuzz task titles recovered with 100% byte fidelity');
  assert(allNotesMatch, 'All 50 fuzz task notes recovered with 100% byte fidelity');
}

// -----------------------------------------------------------------------------
// Test Suite 4: Edge Cases & Boundary Conditions
// -----------------------------------------------------------------------------
console.log('\n● Test Suite 4: Boundary Cases & Corner Invariants');

// 1. Empty tasks list
const emptyScript = `
  import { exportTasksToCSV } from './src/utils/backup';
  const csv = exportTasksToCSV([], { shareBridge: false });
  console.log(JSON.stringify(csv));
`;
const emptyCsv = JSON.parse(execSync(`npx --yes tsx -e "${emptyScript.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, {
  cwd: PROJECT_ROOT,
  encoding: 'utf8'
}).trim());

assert(emptyCsv.charCodeAt(0) === 0xFEFF, 'Empty tasks CSV begins with UTF-8 BOM');
assert(emptyCsv.slice(1) === 'ID,Persona,Title,Priority,IsCompleted,DueDate,Tags,CreatedAt,CompletedAt,Notes',
  'Empty tasks CSV contains only the 10-column header line');

// 2. Extreme string values: only quotes, only commas, only newlines
const extremeScript = `
  import { exportTasksToCSV } from './src/utils/backup';
  const tasks = [
    { id: '1', title: '"""', notes: ',,,', persona: 'exam', completed: false },
    { id: '2', title: '\\r\\n\\r\\n', notes: '"\\n",', persona: 'art', completed: true },
    { id: '3', title: '', notes: '', persona: 'security', completed: false }
  ];
  const csv = exportTasksToCSV(tasks as any, { shareBridge: false });
  console.log(JSON.stringify(csv));
`;
const extremeCsv = JSON.parse(execSync(`npx --yes tsx -e "${extremeScript.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, {
  cwd: PROJECT_ROOT,
  encoding: 'utf8'
}).trim());

const extremeParsed = parseRFC4180(extremeCsv);
assert(extremeParsed.length === 4, `Extreme edge cases parsed into 4 records (1 header + 3 tasks)`);
assert(extremeParsed[1][2] === '"""', 'Consecutive quotes (""") round-trip successfully');
assert(extremeParsed[1][9] === ',,,', 'Consecutive commas (,,,) round-trip successfully');
assert(extremeParsed[2][2] === '\r\n\r\n', 'Consecutive CRLFs round-trip successfully');
assert(extremeParsed[2][9] === '"\n",', 'Complex mixed quotes, newline and comma ("\\n",) round-trip successfully');
assert(extremeParsed[3][2] === '', 'Empty string field round-trips to empty string');
assert(extremeParsed[3][9] === '', 'Empty notes field round-trips to empty string');

console.log('\n' + '─'.repeat(60));
console.log(`RFC 4180 CSV Verification Summary:`);
console.log(`  Total Tests Run: ${totalTests}`);
console.log(`  Passed:          ${passedTests}`);
console.log(`  Failed:          ${failedTests}`);
console.log('─'.repeat(60));

if (failedTests > 0) {
  console.error('\nFAILURES:');
  failureDetails.forEach(f => console.error(f));
  process.exit(1);
} else {
  console.log('\n🎉 ALL RFC 4180 CSV EXPORT VERIFICATION TESTS PASSED (100%)!\n');
  process.exit(0);
}
