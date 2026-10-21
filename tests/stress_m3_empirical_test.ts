/**
 * Milestone 3 Challenger Empirical Verification Suite
 * Stress-testing:
 * 1. Schema migration (v1 -> v2) under edge cases (corrupt records, missing fields, malformed types)
 * 2. JSON import collision resolution ('merge' and 'overwrite')
 * 3. Corrupt JSON recovery & state atomicity/integrity
 */

import { normalizeTaskV2, migrateV1ToV2, migrateStoragePayload, CURRENT_SCHEMA_VERSION } from '../src/utils/migration';
import { 
  exportTasksToJSON, 
  importTasksFromJSON, 
  validateAndParseBackupJSON, 
  exportTasksToCSV, 
  getDefaultSeedTasks,
  performDataReset 
} from '../src/utils/backup';
import { normalizeTask } from '../src/types/task';
import { TodoAppDriver } from './harness/app_driver.cjs';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail: string = '') {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    testsFailed++;
    const msg = `  ✗ [FAIL] ${testName} ${detail ? '--> ' + detail : ''}`;
    console.error(msg);
    failureDetails.push(msg);
  }
}

console.log('======================================================================');
console.log('🔬 Milestone 3 Empirical Challenger Verification (m3_challenger_1)');
console.log('   Timestamp: ' + new Date().toISOString());
console.log('======================================================================\n');

// ============================================================================
// PART 1: Schema Migration (v1 -> v2) Edge Cases
// ============================================================================
console.log('● Part 1: Schema Migration (v1 -> v2) Edge Cases');

// 1.1 Minimal legacy v1 record with only title
{
  const v1Minimal = { id: 'v1-min', title: 'Minimal V1 Task' };
  const v2 = normalizeTaskV2(v1Minimal);
  assert(v2.id === 'v1-min', '1.1.1 Preserves existing ID');
  assert(v2.title === 'Minimal V1 Task', '1.1.2 Preserves title');
  assert(v2.priority === 'medium', '1.1.3 Backfills default priority medium');
  assert(v2.isCompleted === false && v2.completed === false, '1.1.4 Sets isCompleted/completed to false');
  assert(Array.isArray(v2.tags) && v2.tags.length === 0, '1.1.5 Sets tags to empty array');
  assert(Array.isArray(v2.subtasks) && v2.subtasks.length === 0, '1.1.6 Sets subtasks to empty array');
  assert(Array.isArray(v2.checklists) && v2.checklists.length === 0, '1.1.7 Sets checklists alias');
  assert(v2.isPinned === false, '1.1.8 Sets isPinned to false');
  assert(v2.personaId === 'exam' && v2.persona === 'exam', '1.1.9 Sets default persona exam');
  assert(typeof v2.createdAt === 'string', '1.1.10 Auto-generates createdAt ISO timestamp');
  assert(typeof v2.updatedAt === 'string', '1.1.11 Auto-generates updatedAt ISO timestamp');
}

// 1.2 Missing fields: empty object {}
{
  const emptyObj = {};
  const v2 = normalizeTaskV2(emptyObj);
  assert(typeof v2.id === 'string' && v2.id.length > 0, '1.2.1 Auto-generates unique ID for empty object');
  assert(v2.title === '', '1.2.2 Normalizes title to empty string');
  assert(v2.priority === 'medium', '1.2.3 Backfills priority');
  assert(v2.isCompleted === false, '1.2.4 Normalizes isCompleted');
  assert(Array.isArray(v2.tags) && v2.tags.length === 0, '1.2.5 Empty tags array');
  assert(Array.isArray(v2.subtasks) && v2.subtasks.length === 0, '1.2.6 Empty subtasks array');
}

// 1.3 Malformed field types
{
  const malformed = {
    id: 12345, // ID is number
    title: '   Trimmed Title   ',
    isCompleted: 'truthy_string', // string instead of boolean
    priority: null, // null priority
    tags: null, // null tags instead of array
    subtasks: null, // null subtasks
    checklists: null,
    persona: null,
    personaId: undefined,
    isPinned: 1, // number 1 instead of boolean
    notes: 'Some notes in v1 notes field',
    description: undefined,
  };
  const v2 = normalizeTaskV2(malformed);
  assert(v2.id === 12345, '1.3.1 Retains numeric ID or string');
  assert(v2.title === 'Trimmed Title', '1.3.2 Trims whitespace around title');
  assert(v2.isCompleted === true && v2.completed === true, '1.3.3 Coerces truthy isCompleted to boolean true');
  assert(v2.priority === 'medium', '1.3.4 Replaces null priority with default medium');
  assert(Array.isArray(v2.tags) && v2.tags.length === 0, '1.3.5 Replaces null tags with empty array');
  assert(Array.isArray(v2.subtasks) && v2.subtasks.length === 0, '1.3.6 Replaces null subtasks with empty array');
  assert(v2.isPinned === true, '1.3.7 Coerces truthy 1 to isPinned true');
  assert(v2.personaId === 'exam' && v2.persona === 'exam', '1.3.8 Replaces null persona with exam');
  assert(v2.notes === 'Some notes in v1 notes field', '1.3.9 Keeps notes');
  assert(v2.description === 'Some notes in v1 notes field', '1.3.10 Synchronizes description with notes');
}

// 1.4 Checklist / Subtask migration & order normalization
{
  const v1Checklist = {
    id: 'chk-test',
    title: 'Checklist Task',
    checklists: [
      { text: '  Item 1  ', completed: true },
      { title: 'Item 2', isCompleted: false, order: 5 },
      { text: '', completed: 1 } // truthy completion
    ]
  };
  const v2 = normalizeTaskV2(v1Checklist);
  assert(v2.subtasks.length === 3, '1.4.1 Migrates 3 checklist items');
  assert(v2.subtasks[0].id === 'sub-1', '1.4.2 Auto-generates subtask id sub-1');
  assert(v2.subtasks[0].text === 'Item 1' && v2.subtasks[0].title === 'Item 1', '1.4.3 Synchronizes text and title trimmed');
  assert(v2.subtasks[0].completed === true && v2.subtasks[0].isCompleted === true, '1.4.4 Completed is boolean true');
  assert(v2.subtasks[0].order === 0, '1.4.5 Defaults order to index 0');
  assert(v2.subtasks[1].order === 5, '1.4.6 Preserves explicit order 5');
  assert(v2.subtasks[2].completed === true, '1.4.7 Coerces number 1 to true');
}

// 1.5 Emergency flag auto-pinning and urgent priority override
{
  const emergencyV1 = {
    id: 'em-1',
    title: 'Fire Alarm Outbreak',
    persona: 'security',
    securityData: { isEmergency: true }
  };
  const v2 = normalizeTaskV2(emergencyV1);
  assert(v2.isPinned === true, '1.5.1 Emergency task auto-pins (isPinned = true)');
  assert(v2.priority === 'urgent', '1.5.2 Emergency task auto-promotes priority to urgent');

  const emergencyV1Alt = {
    id: 'em-2',
    title: 'Gate Breach',
    personaData: { isEmergency: true }
  };
  const v2Alt = normalizeTaskV2(emergencyV1Alt);
  assert(v2Alt.isPinned === true, '1.5.3 personaData.isEmergency auto-pins');
  assert(v2Alt.priority === 'urgent', '1.5.4 personaData.isEmergency auto-promotes priority to urgent');
}

// 1.6 Storage Payload migration: migrateStoragePayload
{
  // 1.6.1 null raw payload
  const resNull = migrateStoragePayload(null);
  assert(resNull.payload.schemaVersion === CURRENT_SCHEMA_VERSION, '1.6.1 Null payload returns schemaVersion 2');
  assert(Array.isArray(resNull.payload.tasks) && resNull.payload.tasks.length === 0, '1.6.2 Null payload returns empty tasks');
  assert(resNull.migrated === false, '1.6.3 Null payload not flagged as migrated');

  // 1.6.2 primitive string payload
  const resStr = migrateStoragePayload("invalid string");
  assert(resStr.payload.schemaVersion === CURRENT_SCHEMA_VERSION, '1.6.4 String payload safely defaults');
  assert(resStr.payload.tasks.length === 0, '1.6.5 String payload empty tasks');

  // 1.6.3 v1 payload with legacy tasks
  const rawV1 = {
    schemaVersion: 1,
    updatedAt: '2026-10-01T00:00:00Z',
    tasks: [
      { id: 'leg-1', title: 'Legacy Task 1', completed: true },
      { id: 'leg-2', title: 'Legacy Task 2', completed: false }
    ],
    themeState: { theme: 'cool-evening', autoSwitch: false, toneLock: 'cool' }
  };
  const resV1 = migrateStoragePayload(rawV1);
  assert(resV1.migrated === true, '1.6.6 v1 payload flagged as migrated = true');
  assert(resV1.payload.schemaVersion === 2, '1.6.7 Upgraded to schemaVersion 2');
  assert(resV1.payload.tasks.length === 2, '1.6.8 Preserves both tasks');
  assert(resV1.payload.tasks[0].priority === 'medium', '1.6.9 Normalized priority on migrated task');
  assert(resV1.payload.tasks[0].isCompleted === true, '1.6.10 Retains completion status');
  assert(resV1.payload.themeState?.theme === 'cool-evening', '1.6.11 Preserves themeState');

  // 1.6.4 Already v2 payload
  const rawV2 = {
    schemaVersion: 2,
    updatedAt: '2026-10-08T00:00:00Z',
    tasks: [
      { id: 'v2-1', title: 'V2 Task', priority: 'high', tags: ['#tag'], subtasks: [], isCompleted: false, completed: false }
    ]
  };
  const resV2 = migrateStoragePayload(rawV2);
  assert(resV2.migrated === false, '1.6.12 v2 payload not re-migrated (migrated = false)');
  assert(resV2.payload.tasks.length === 1, '1.6.13 Preserves v2 task');
  assert(resV2.payload.tasks[0].priority === 'high', '1.6.14 Preserves v2 high priority');
}


// ============================================================================
// PART 2: JSON Import Collision Resolution ('merge' & 'overwrite')
// ============================================================================
console.log('\n● Part 2: JSON Import Collision Resolution (Merge vs Overwrite)');

const initialDbTasks = [
  normalizeTaskV2({ id: 'base-1', title: 'Base Task 1', priority: 'low', isCompleted: false, notes: 'Original note 1' }),
  normalizeTaskV2({ id: 'base-2', title: 'Base Task 2', priority: 'medium', isCompleted: false, notes: 'Original note 2' }),
  normalizeTaskV2({ id: 'base-3', title: 'Base Task 3', priority: 'high', isCompleted: true, notes: 'Original note 3' })
];

// 2.1 Overwrite Mode: Complete replacement of database
{
  const incomingBackup = {
    app: 'SquircleTodo',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    themeState: { theme: 'warm-evening', autoSwitch: true, toneLock: 'warm' },
    tasks: [
      { id: 'new-100', title: 'Imported Task 100', priority: 'urgent' },
      { id: 'new-200', title: 'Imported Task 200', priority: 'high' }
    ]
  };
  const jsonStr = JSON.stringify(incomingBackup);

  const { tasks: overwriteTasks, result } = importTasksFromJSON(initialDbTasks, jsonStr, 'overwrite');
  assert(result.success === true, '2.1.1 Overwrite mode returns success: true');
  assert(result.mode === 'overwrite', '2.1.2 Result specifies mode: overwrite');
  assert(result.count === 2, '2.1.3 Overwrite count equals imported tasks length (2)');
  assert(result.total === 2, '2.1.4 Overwrite total equals 2');
  assert(overwriteTasks.length === 2, '2.1.5 Database contains exactly the 2 new tasks');
  assert(!overwriteTasks.some(t => t.id === 'base-1'), '2.1.6 base-1 completely eradicated');
  assert(!overwriteTasks.some(t => t.id === 'base-2'), '2.1.7 base-2 completely eradicated');
  assert(!overwriteTasks.some(t => t.id === 'base-3'), '2.1.8 base-3 completely eradicated');
  assert(overwriteTasks[0].id === 'new-100' && overwriteTasks[0].title === 'Imported Task 100', '2.1.9 new-100 present');
  assert(overwriteTasks[1].id === 'new-200' && overwriteTasks[1].title === 'Imported Task 200', '2.1.10 new-200 present');
  assert(result.themeState?.theme === 'warm-evening', '2.1.11 Returns imported themeState');
}

// 2.2 Overwrite Mode with Empty Array
{
  const emptyBackup = {
    app: 'SquircleTodo',
    schemaVersion: 2,
    tasks: []
  };
  const { tasks: wipedTasks, result } = importTasksFromJSON(initialDbTasks, JSON.stringify(emptyBackup), 'overwrite');
  assert(result.success === true, '2.2.1 Empty overwrite returns success: true');
  assert(wipedTasks.length === 0, '2.2.2 Database wiped to 0 tasks');
  assert(result.count === 0 && result.total === 0, '2.2.3 Count and total are 0');
}

// 2.3 Merge Mode: Non-colliding tasks appended
{
  const nonCollidingBackup = {
    app: 'SquircleTodo',
    schemaVersion: 2,
    tasks: [
      { id: 'new-x', title: 'Task X', priority: 'urgent' },
      { id: 'new-y', title: 'Task Y', priority: 'low' }
    ]
  };
  const { tasks: mergedTasks, result } = importTasksFromJSON(initialDbTasks, JSON.stringify(nonCollidingBackup), 'merge');
  assert(result.success === true, '2.3.1 Merge success: true');
  assert(result.count === 2, '2.3.2 Newly added count = 2');
  assert(result.updatedCount === 0, '2.3.3 Updated existing count = 0');
  assert(mergedTasks.length === 5, '2.3.4 Total merged tasks length = 3 + 2 = 5');
  assert(result.total === 5, '2.3.5 Result total = 5');
  assert(mergedTasks.some(t => t.id === 'base-1'), '2.3.6 base-1 preserved');
  assert(mergedTasks.some(t => t.id === 'base-2'), '2.3.7 base-2 preserved');
  assert(mergedTasks.some(t => t.id === 'base-3'), '2.3.8 base-3 preserved');
  assert(mergedTasks.some(t => t.id === 'new-x'), '2.3.9 new-x appended');
  assert(mergedTasks.some(t => t.id === 'new-y'), '2.3.10 new-y appended');
}

// 2.4 Merge Mode: ID collision resolution (Update existing, append new)
{
  const collisionBackup = {
    app: 'SquircleTodo',
    schemaVersion: 2,
    tasks: [
      { id: 'base-1', title: 'Base Task 1 (UPDATED IN MERGE)', priority: 'urgent', isCompleted: true, notes: 'Updated note' },
      { id: 'new-z', title: 'Brand New Task Z', priority: 'medium' }
    ]
  };
  const { tasks: mergedTasks, result } = importTasksFromJSON(initialDbTasks, JSON.stringify(collisionBackup), 'merge');
  assert(result.success === true, '2.4.1 Collision merge success: true');
  assert(result.count === 1, '2.4.2 Newly added count = 1 (new-z)');
  assert(result.updatedCount === 1, '2.4.3 Updated existing count = 1 (base-1)');
  assert(mergedTasks.length === 4, '2.4.4 Total tasks count = 4 (3 original + 1 new)');
  assert(result.total === 4, '2.4.5 Result total = 4');

  // Check updated colliding task
  const updatedBase1 = mergedTasks.find(t => t.id === 'base-1');
  assert(updatedBase1 !== undefined, '2.4.6 base-1 found in merged set');
  assert(updatedBase1?.title === 'Base Task 1 (UPDATED IN MERGE)', '2.4.7 base-1 title updated');
  assert(updatedBase1?.priority === 'urgent', '2.4.8 base-1 priority updated to urgent');
  assert(updatedBase1?.isCompleted === true, '2.4.9 base-1 isCompleted updated to true');
  assert(updatedBase1?.notes === 'Updated note', '2.4.10 base-1 notes updated');

  // Check untouched tasks
  const untouchedBase2 = mergedTasks.find(t => t.id === 'base-2');
  assert(untouchedBase2?.title === 'Base Task 2', '2.4.11 base-2 untouched title');
  assert(untouchedBase2?.notes === 'Original note 2', '2.4.12 base-2 untouched notes');
  assert(untouchedBase2?.priority === 'medium', '2.4.13 base-2 untouched priority');

  const untouchedBase3 = mergedTasks.find(t => t.id === 'base-3');
  assert(untouchedBase3?.title === 'Base Task 3', '2.4.14 base-3 untouched title');
  assert(untouchedBase3?.isCompleted === true, '2.4.15 base-3 untouched isCompleted');
}

// 2.5 Merge Mode: Duplicate IDs within the import payload itself
{
  const internalDupBackup = {
    app: 'SquircleTodo',
    schemaVersion: 2,
    tasks: [
      { id: 'dup-id', title: 'Version A of dup-id', priority: 'low' },
      { id: 'dup-id', title: 'Version B of dup-id', priority: 'urgent' }
    ]
  };
  const { tasks: mergedTasks, result } = importTasksFromJSON([], JSON.stringify(internalDupBackup), 'merge');
  assert(mergedTasks.length === 1, '2.5.1 Duplicate IDs inside import payload are consolidated to 1 task');
  assert(mergedTasks[0].title === 'Version B of dup-id', '2.5.2 Later entry in import stream updates earlier entry');
  assert(mergedTasks[0].priority === 'urgent', '2.5.3 Later priority urgent persists');
}


// ============================================================================
// PART 3: Corrupt JSON Recovery & State Integrity
// ============================================================================
console.log('\n● Part 3: Corrupt JSON Recovery & State Integrity');

const goldenState = JSON.parse(JSON.stringify(initialDbTasks));

function verifyDatabaseUntouched(tasks: any[], contextMsg: string) {
  assert(tasks.length === goldenState.length, `${contextMsg}: Task count remains exactly ${goldenState.length}`);
  for (let i = 0; i < goldenState.length; i++) {
    assert(tasks[i].id === goldenState[i].id, `${contextMsg}: Task [${i}] ID untouched (${goldenState[i].id})`);
    assert(tasks[i].title === goldenState[i].title, `${contextMsg}: Task [${i}] title untouched (${goldenState[i].title})`);
    assert(tasks[i].priority === goldenState[i].priority, `${contextMsg}: Task [${i}] priority untouched`);
    assert(tasks[i].isCompleted === goldenState[i].isCompleted, `${contextMsg}: Task [${i}] isCompleted untouched`);
    assert(tasks[i].notes === goldenState[i].notes, `${contextMsg}: Task [${i}] notes untouched`);
  }
}

// 3.1 Syntax Error: Truncated JSON
{
  let currentTasks = JSON.parse(JSON.stringify(goldenState));
  let errorCaught = false;
  let errorMsg = '';
  try {
    importTasksFromJSON(currentTasks, '{"app": "SquircleTodo", "tasks": [ { "id": "t1"', 'overwrite');
  } catch (err: any) {
    errorCaught = true;
    errorMsg = err.message;
  }
  assert(errorCaught === true, '3.1.1 Truncated JSON throws error');
  assert(errorMsg.includes('Invalid JSON syntax'), `3.1.2 Error message clear: "${errorMsg}"`);
  verifyDatabaseUntouched(currentTasks, '3.1.3 Truncated JSON recovery');
}

// 3.2 Syntax Error: Trailing comma / invalid tokens
{
  let currentTasks = JSON.parse(JSON.stringify(goldenState));
  let errorCaught = false;
  try {
    importTasksFromJSON(currentTasks, '{"tasks": [1, 2, ],}', 'merge');
  } catch (err: any) {
    errorCaught = true;
  }
  assert(errorCaught === true, '3.2.1 Trailing comma throws error');
  verifyDatabaseUntouched(currentTasks, '3.2.2 Invalid tokens recovery');
}

// 3.3 Schema Error: Missing tasks property
{
  let currentTasks = JSON.parse(JSON.stringify(goldenState));
  let errorCaught = false;
  let errorMsg = '';
  try {
    importTasksFromJSON(currentTasks, JSON.stringify({ app: 'SquircleTodo', version: 1 }), 'overwrite');
  } catch (err: any) {
    errorCaught = true;
    errorMsg = err.message;
  }
  assert(errorCaught === true, '3.3.1 Missing tasks property throws error');
  assert(errorMsg.includes('Missing tasks array'), `3.3.2 Error message clear: "${errorMsg}"`);
  verifyDatabaseUntouched(currentTasks, '3.3.3 Missing tasks property recovery');
}

// 3.4 Schema Error: tasks is null or primitive
{
  const invalidTasksValues = [null, 'not an array', 12345, true, {}];
  invalidTasksValues.forEach((badVal, idx) => {
    let currentTasks = JSON.parse(JSON.stringify(goldenState));
    let errorCaught = false;
    try {
      importTasksFromJSON(currentTasks, JSON.stringify({ app: 'SquircleTodo', tasks: badVal }), 'merge');
    } catch (err: any) {
      errorCaught = true;
    }
    assert(errorCaught === true, `3.4.${idx + 1} tasks = ${JSON.stringify(badVal)} throws error`);
    verifyDatabaseUntouched(currentTasks, `3.4.${idx + 1} Non-array tasks recovery`);
  });
}

// 3.5 Empty / Null String Inputs
{
  const emptyInputs = ['', '   ', '\t\n\r  ', null as any, undefined as any];
  emptyInputs.forEach((emptyVal, idx) => {
    let currentTasks = JSON.parse(JSON.stringify(goldenState));
    let errorCaught = false;
    let errorMsg = '';
    try {
      importTasksFromJSON(currentTasks, emptyVal, 'overwrite');
    } catch (err: any) {
      errorCaught = true;
      errorMsg = err.message;
    }
    assert(errorCaught === true, `3.5.${idx + 1} Empty input "${String(emptyVal)}" throws error`);
    assert(errorMsg.includes('Invalid JSON string'), `3.5.${idx + 1} Clear error message: "${errorMsg}"`);
    verifyDatabaseUntouched(currentTasks, `3.5.${idx + 1} Empty input recovery`);
  });
}

// 3.6 Primitives as root JSON
{
  const primitiveJsonStrings = ['123', '"hello"', 'true', 'null'];
  primitiveJsonStrings.forEach((primStr, idx) => {
    let currentTasks = JSON.parse(JSON.stringify(goldenState));
    let errorCaught = false;
    try {
      importTasksFromJSON(currentTasks, primStr, 'merge');
    } catch (err: any) {
      errorCaught = true;
    }
    assert(errorCaught === true, `3.6.${idx + 1} Root primitive JSON "${primStr}" throws error`);
    verifyDatabaseUntouched(currentTasks, `3.6.${idx + 1} Primitive root recovery`);
  });
}


// ============================================================================
// PART 4: Verification of TodoAppDriver & Storage Layer Synchronization
// ============================================================================
console.log('\n● Part 4: Verification of TodoAppDriver & Storage Layer Synchronization');

{
  const app = new TodoAppDriver();
  app.resetAllData();

  // Add initial tasks
  app.addTask({ id: 'drv-1', title: 'Driver Task 1', priority: 'medium' });
  app.addTask({ id: 'drv-2', title: 'Driver Task 2', priority: 'high' });
  const initialCount = app.getTasks().length;
  assert(initialCount === 2, '4.1 Driver initialized with 2 tasks');

  // Test Corrupt JSON injection into Driver
  let driverErrorCaught = false;
  try {
    app.importJSON('{ invalid json ', 'overwrite');
  } catch (e: any) {
    driverErrorCaught = true;
    assert(e.message.includes('Invalid JSON syntax'), '4.2 Driver throws clear syntax error');
  }
  assert(driverErrorCaught === true, '4.3 Driver caught corrupt JSON');
  assert(app.getTasks().length === 2, '4.4 Driver tasks count unchanged after syntax error');
  assert(app.getTask('drv-1')?.title === 'Driver Task 1', '4.5 drv-1 intact in memory');

  // Verify LocalStorage snapshot remains intact
  const rawStorage = app.env.localStorage.getItem(app.storageKey);
  const parsedStorage = JSON.parse(rawStorage);
  assert(parsedStorage.tasks.length === 2, '4.6 LocalStorage snapshot retains 2 tasks after failed import');
  assert(parsedStorage.tasks[1].title === 'Driver Task 1', '4.7 LocalStorage snapshot content uncorrupted');

  // Test Merge Mode in Driver
  const mergeBackupStr = JSON.stringify({
    app: 'SquircleTodo',
    schemaVersion: 2,
    tasks: [
      { id: 'drv-1', title: 'Driver Task 1 (UPDATED)', priority: 'urgent' },
      { id: 'drv-3', title: 'Driver Task 3 (NEW)', priority: 'low' }
    ]
  });
  const mergeResult = app.importJSON(mergeBackupStr, 'merge');
  assert(mergeResult.success === true, '4.8 Driver merge returns success: true');
  assert(mergeResult.count === 1, '4.9 Driver merge reports 1 new task added');
  assert(app.getTasks().length === 3, '4.10 Driver total tasks is now 3');
  assert(app.getTask('drv-1')?.title === 'Driver Task 1 (UPDATED)', '4.11 drv-1 title updated in driver');
  assert(app.getTask('drv-1')?.priority === 'urgent', '4.12 drv-1 priority updated in driver');
  assert(app.getTask('drv-2')?.title === 'Driver Task 2', '4.13 drv-2 preserved untouched');
  assert(app.getTask('drv-3')?.title === 'Driver Task 3 (NEW)', '4.14 drv-3 added');

  // Test Overwrite Mode in Driver
  const overwriteBackupStr = JSON.stringify({
    app: 'SquircleTodo',
    schemaVersion: 2,
    tasks: [
      { id: 'drv-fresh', title: 'Fresh Replacement Task', priority: 'high' }
    ]
  });
  const overwriteResult = app.importJSON(overwriteBackupStr, 'overwrite');
  assert(overwriteResult.success === true, '4.15 Driver overwrite returns success: true');
  assert(app.getTasks().length === 1, '4.16 Driver total tasks replaced to exactly 1');
  assert(app.getTask('drv-fresh')?.title === 'Fresh Replacement Task', '4.17 drv-fresh exists');
  assert(app.getTask('drv-1') === null, '4.18 drv-1 completely wiped');
  assert(app.getTask('drv-2') === null, '4.19 drv-2 completely wiped');
  assert(app.getTask('drv-3') === null, '4.20 drv-3 completely wiped');
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n======================================================================');
console.log(`Execution Summary:`);
console.log(`  Total Checks: ${testsRun}`);
console.log(`  Passed:       ${testsPassed}`);
console.log(`  Failed:       ${testsFailed}`);
console.log('======================================================================');

if (testsFailed > 0) {
  console.error('\n❌ FAILURES DETECTED:');
  failureDetails.forEach(f => console.error(f));
  process.exit(1);
} else {
  console.log('\n🎉 ALL EMPIRICAL VERIFICATION CHECKS PASSED PERFECTLY!');
  process.exit(0);
}
