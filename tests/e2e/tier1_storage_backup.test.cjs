/**
 * Tier 1 Test Suite: 离线存储与备份还原 (Offline Storage & Backup/Restore) Feature Coverage
 * Covers: LocalStorage snapshots, IndexedDB sync, schema migration, JSON export/restore, CSV export with UTF-8 BOM.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 1: Storage & Backup - Feature Coverage', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
  });

  it('T1-STOR-01: should synchronously snapshot state into LocalStorage upon any task mutation', () => {
    const task = app.addTask({
      title: '高数真题模拟练习',
      personaId: 'exam',
      priority: 'high'
    });

    const storedRaw = app.env.localStorage.getItem(app.storageKey);
    expect(storedRaw).toBeDefined();

    const parsed = JSON.parse(storedRaw);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].id).toBe(task.id);
    expect(parsed.tasks[0].title).toBe('高数真题模拟练习');
  });

  it('T1-STOR-02: should persist tasks asynchronously into IndexedDB object stores', async () => {
    const task = app.addTask({
      title: '安保消火栓日常点检',
      personaId: 'security'
    });

    const db = app.env.indexedDB.open(app.dbName, app.schemaVersion);
    const todoStore = db.getStore('todos');
    const storedTask = await todoStore.get(task.id);

    expect(storedTask).toBeDefined();
    expect(storedTask.id).toBe(task.id);
    expect(storedTask.title).toBe('安保消火栓日常点检');
  });

  it('T1-STOR-03: should automatically migrate legacy v1 data schema to v2 without data loss', () => {
    const legacyV1Payload = {
      schemaVersion: 1,
      tasks: [
        {
          id: 'legacy-task-1',
          title: '旧版考研英语单词打卡',
          isCompleted: false
          // Missing priority, tags, subtasks, isPinned in v1
        }
      ]
    };

    app.env.localStorage.setItem(app.storageKey, JSON.stringify(legacyV1Payload));

    // Reload app driver with same environment
    const migratedApp = new TodoAppDriver({ env: app.env });
    const tasks = migratedApp.getTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('legacy-task-1');
    expect(tasks[0].title).toBe('旧版考研英语单词打卡');
    expect(tasks[0].priority).toBe('medium'); // Default filled by migration
    expect(tasks[0].isPinned).toBe(false);
    expect(tasks[0].tags).toEqual([]);
    expect(tasks[0].subtasks).toEqual([]);
  });

  it('T1-STOR-04: should export complete database snapshot as formatted JSON and notify Android bridge', () => {
    app.addTask({ title: '任务 A', personaId: 'exam' });
    app.addTask({ title: '任务 B', personaId: 'art' });

    app.env.androidBridge.clearHistory();
    const jsonOutput = app.exportJSON();

    expect(typeof jsonOutput).toBe('string');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.app).toBe('SquircleTodo');
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.tasks).toHaveLength(2);

    // Verify Android file sharing bridge was invoked
    const shared = app.env.androidBridge.history.sharedFiles;
    expect(shared).toHaveLength(1);
    expect(shared[0].fileName).toBe('squircle_todo_backup.json');
    expect(shared[0].mimeType).toBe('application/json');
  });

  it('T1-STOR-05: should restore JSON backup in both merge and overwrite modes', () => {
    app.addTask({ id: 'existing-1', title: '现有任务 1', personaId: 'exam' });

    const backupData = JSON.stringify({
      app: 'SquircleTodo',
      schemaVersion: 2,
      tasks: [
        { id: 'backup-1', title: '备份任务 1', personaId: 'art', priority: 'high', tags: [], subtasks: [] },
        { id: 'existing-1', title: '现有任务 1 (已更新)', personaId: 'exam', priority: 'urgent', tags: [], subtasks: [] }
      ]
    });

    // Test Merge Mode
    const mergeResult = app.importJSON(backupData, 'merge');
    expect(mergeResult.success).toBe(true);
    expect(mergeResult.count).toBe(1); // 1 new task added
    expect(app.getTasks()).toHaveLength(2);
    expect(app.getTask('existing-1').title).toBe('现有任务 1 (已更新)');

    // Test Overwrite Mode
    const overwriteResult = app.importJSON(backupData, 'overwrite');
    expect(overwriteResult.success).toBe(true);
    expect(app.getTasks()).toHaveLength(2);
  });

  it('T1-STOR-06: should export RFC 4180 CSV with UTF-8 BOM prefix for Excel Chinese compatibility', () => {
    app.addTask({
      title: '考研政治 史纲选择题',
      personaId: 'exam',
      priority: 'high',
      tags: ['#政治', '#刷题']
    });

    app.env.androidBridge.clearHistory();
    const csvContent = app.exportCSV();

    // Check UTF-8 BOM (\uFEFF)
    expect(csvContent.startsWith('\uFEFF')).toBe(true);

    // Check Header line
    expect(csvContent).toContain('ID,Persona,Title,Priority,IsCompleted,DueDate,Tags,CreatedAt,CompletedAt,Notes');

    // Check Row content
    expect(csvContent).toContain('考研政治 史纲选择题');
    expect(csvContent).toContain('#政治;#刷题');

    // Check Android file share invocation
    const shared = app.env.androidBridge.history.sharedFiles;
    expect(shared).toHaveLength(1);
    expect(shared[0].fileName).toBe('squircle_todo_export.csv');
    expect(shared[0].mimeType).toBe('text/csv');
  });
});
