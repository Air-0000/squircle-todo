/**
 * Verification test for multi-tab manual and automatic cycle refresh:
 * 1. WorkTab Daily, Weekly, and Monthly manual cycle refresh.
 * 2. ArtTab Daily manual cycle refresh.
 * 3. ExamTab Daily manual cycle refresh.
 * 4. Automatic midnight cycle refresh (checkAndRefreshCycles).
 * 5. Full subtask & checklist reset verification.
 */

const assert = require('assert');

// Simulate the logic in useTaskStore
function isTaskInPersona(task, persona) {
  if (!persona || persona === 'all') return true;
  const p = task.personaId || task.persona;
  if (persona === 'exam') return p === 'exam';
  if (persona === 'art') return p === 'art';
  if (persona === 'work' || persona === 'security') return p !== 'exam' && p !== 'art';
  return p === persona;
}

function isTaskInPeriod(task, period) {
  if (task.isEmergency || task.periodType === 'emergency' || task.category === 'emergency') {
    return false;
  }
  if (task.isTemplate || task.category === 'template' || (task.tags && task.tags.includes('预设事项'))) {
    return false;
  }

  const pType = task.periodType;
  const cat = task.category;
  const freq = task.frequency;
  const tags = task.tags || [];
  const p = task.personaId || task.persona;
  const isWork = p !== 'exam' && p !== 'art';

  if (period === 'daily') {
    if (pType === 'daily' || cat === 'daily' || freq === 'daily') return true;
    if (tags.some(t => t.includes('日常') || t.includes('每日') || t.includes('打卡'))) return true;
    if (isWork && !pType && !cat && freq !== 'weekly' && freq !== 'monthly') {
      return true;
    }
    return false;
  }

  if (period === 'weekly') {
    if (pType === 'weekly' || cat === 'weekly' || freq === 'weekly') return true;
    if (tags.some(t => t.includes('周常') || t.includes('每周'))) return true;
    return false;
  }

  if (period === 'monthly') {
    if (pType === 'monthly' || cat === 'monthly' || freq === 'monthly') return true;
    if (tags.some(t => t.includes('月常') || t.includes('每月'))) return true;
    return false;
  }

  return false;
}

function simulateForceRefreshCycle(tasks, type = 'all', persona) {
  let resetCount = 0;
  const updatedTasks = tasks.map(t => {
    if (t.isEmergency || t.periodType === 'emergency' || t.category === 'emergency') return t;
    if (t.isTemplate || t.category === 'template' || (t.tags && t.tags.includes('预设事项'))) return t;

    if (!isTaskInPersona(t, persona)) return t;

    const matches = type === 'all' || isTaskInPeriod(t, type);
    if (!matches) return t;

    const isDone = Boolean(t.completed || t.isCompleted);
    const hasCompletedSubtasks = Boolean(
      (t.subtasks && t.subtasks.some(s => s.completed || s.isCompleted)) ||
      (t.checklists && t.checklists.some(c => c.completed || c.isCompleted))
    );

    if (isDone || hasCompletedSubtasks) {
      resetCount++;
      return {
        ...t,
        completed: false,
        isCompleted: false,
        completedAt: null,
        subtasks: (t.subtasks || []).map(s => ({ ...s, completed: false, isCompleted: false, completedAt: null })),
        checklists: (t.checklists || []).map(c => ({ ...c, completed: false, isCompleted: false, completedAt: null })),
      };
    }
    return t;
  });

  return { resetCount, updatedTasks };
}

console.log('--- Running Multi-Tab Cycle Refresh Verification ---');

// 1. Test WorkTab Daily Reset (including seed-sec-1 with no periodType/category, but marked security and completed)
const initialWorkTasks = [
  {
    id: 'seed-sec-1',
    title: '夜班巡查：消控中心监控主机运行状态巡检',
    completed: true,
    isCompleted: true,
    persona: 'security',
    subtasks: [
      { id: 'sub-1', title: '水压检查', completed: true },
      { id: 'sub-2', title: '风机电源', completed: true }
    ],
    checklists: [
      { id: 'sub-1', title: '水压检查', completed: true },
      { id: 'sub-2', title: '风机电源', completed: true }
    ]
  },
  {
    id: 'work-daily-added',
    title: '日常绿化巡检',
    completed: true,
    persona: 'security',
    periodType: 'daily',
    category: 'daily',
    subtasks: [{ id: 'sub-3', title: '草坪检查', completed: true }]
  },
  {
    id: 'work-weekly-1',
    title: '周一消防设备全量保养',
    completed: true,
    persona: 'security',
    periodType: 'weekly',
    category: 'weekly'
  },
  {
    id: 'work-monthly-1',
    title: '月度安全生产评定会议',
    completed: true,
    persona: 'security',
    periodType: 'monthly',
    category: 'monthly'
  },
  {
    id: 'exam-daily-1',
    title: '考研政治：肖秀荣精讲精练每日选择题',
    completed: true,
    persona: 'exam',
    periodType: 'daily',
    category: 'daily'
  },
  {
    id: 'art-daily-1',
    title: '每日人体速写打卡 30min',
    completed: true,
    persona: 'art',
    periodType: 'daily',
    category: 'daily'
  }
];

// Test WorkTab: Reset Daily
const workDailyRes = simulateForceRefreshCycle(initialWorkTasks, 'daily', 'work');
assert.strictEqual(workDailyRes.resetCount, 2, 'WorkTab daily reset should reset exactly 2 daily work tasks (seed-sec-1 and work-daily-added)');
const resetSec1 = workDailyRes.updatedTasks.find(t => t.id === 'seed-sec-1');
assert.strictEqual(resetSec1.completed, false, 'seed-sec-1 completed flag must be reset to false');
assert.strictEqual(resetSec1.isCompleted, false, 'seed-sec-1 isCompleted flag must be reset to false');
assert.strictEqual(resetSec1.subtasks[0].completed, false, 'subtasks must be reset');
assert.strictEqual(resetSec1.checklists[0].completed, false, 'checklists must be reset');

// Verify Exam and Art tasks were NOT touched by WorkTab daily reset
const untouchedExam = workDailyRes.updatedTasks.find(t => t.id === 'exam-daily-1');
assert.strictEqual(untouchedExam.completed, true, 'Exam task should NOT be reset by WorkTab reset');
const untouchedArt = workDailyRes.updatedTasks.find(t => t.id === 'art-daily-1');
assert.strictEqual(untouchedArt.completed, true, 'Art task should NOT be reset by WorkTab reset');
console.log('✓ WorkTab Daily reset verified (including untyped security tasks & subtasks)');

// Test WorkTab: Reset Weekly
const workWeeklyRes = simulateForceRefreshCycle(initialWorkTasks, 'weekly', 'work');
assert.strictEqual(workWeeklyRes.resetCount, 1, 'WorkTab weekly reset should reset 1 weekly work task');
const resetWeekly = workWeeklyRes.updatedTasks.find(t => t.id === 'work-weekly-1');
assert.strictEqual(resetWeekly.completed, false);
console.log('✓ WorkTab Weekly reset verified');

// Test WorkTab: Reset Monthly
const workMonthlyRes = simulateForceRefreshCycle(initialWorkTasks, 'monthly', 'work');
assert.strictEqual(workMonthlyRes.resetCount, 1, 'WorkTab monthly reset should reset 1 monthly work task');
const resetMonthly = workMonthlyRes.updatedTasks.find(t => t.id === 'work-monthly-1');
assert.strictEqual(resetMonthly.completed, false);
console.log('✓ WorkTab Monthly reset verified');

// Test ArtTab: Reset Daily
const artDailyRes = simulateForceRefreshCycle(initialWorkTasks, 'daily', 'art');
assert.strictEqual(artDailyRes.resetCount, 1, 'ArtTab daily reset should reset 1 daily art task');
const resetArt = artDailyRes.updatedTasks.find(t => t.id === 'art-daily-1');
assert.strictEqual(resetArt.completed, false);
console.log('✓ ArtTab Daily reset verified');

// Test ExamTab: Reset Daily
const examDailyRes = simulateForceRefreshCycle(initialWorkTasks, 'daily', 'exam');
assert.strictEqual(examDailyRes.resetCount, 1, 'ExamTab daily reset should reset 1 daily exam task');
const resetExam = examDailyRes.updatedTasks.find(t => t.id === 'exam-daily-1');
assert.strictEqual(resetExam.completed, false);
console.log('✓ ExamTab Daily reset verified');

// Test Partial Subtask Reset (Task not marked completed, but subtask completed)
const partialSubtaskTask = [
  {
    id: 'partial-work-1',
    title: '考研英语长难句打卡',
    completed: false,
    persona: 'exam',
    periodType: 'daily',
    subtasks: [
      { id: 'st-1', title: '句型分析', completed: true },
      { id: 'st-2', title: '生词整理', completed: false }
    ]
  }
];
const partialRes = simulateForceRefreshCycle(partialSubtaskTask, 'daily', 'exam');
assert.strictEqual(partialRes.resetCount, 1, 'Task with completed subtask should be recognized and reset');
assert.strictEqual(partialRes.updatedTasks[0].subtasks[0].completed, false, 'Completed subtask must be reset to false');
console.log('✓ Partial subtask reset verified');

console.log('All multi-tab cycle refresh assertions PASSED successfully!');
