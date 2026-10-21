/**
 * Mock Environment for E2E Testing (Browser & Android Native Container)
 */

class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

class MockIndexedDBStore {
  constructor(name) {
    this.name = name;
    this.data = new Map();
  }
  async get(key) {
    return this.data.get(key) || null;
  }
  async getAll() {
    return Array.from(this.data.values());
  }
  async put(key, value) {
    this.data.set(key, JSON.parse(JSON.stringify(value)));
    return key;
  }
  async delete(key) {
    return this.data.delete(key);
  }
  async clear() {
    this.data.clear();
  }
  async count() {
    return this.data.size;
  }
}

class MockIndexedDBDatabase {
  constructor(name, version = 1) {
    this.name = name;
    this.version = version;
    this.stores = new Map([
      ['todos', new MockIndexedDBStore('todos')],
      ['personas', new MockIndexedDBStore('personas')],
      ['settings', new MockIndexedDBStore('settings')],
      ['customFieldDefs', new MockIndexedDBStore('customFieldDefs')]
    ]);
  }
  getStore(name) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MockIndexedDBStore(name));
    }
    return this.stores.get(name);
  }
}

class MockIndexedDBFactory {
  constructor() {
    this.databases = new Map();
  }
  open(dbName, version = 1) {
    if (!this.databases.has(dbName)) {
      this.databases.set(dbName, new MockIndexedDBDatabase(dbName, version));
    }
    return this.databases.get(dbName);
  }
  deleteDatabase(dbName) {
    this.databases.delete(dbName);
  }
}

class MockAndroidBridge {
  constructor() {
    this.history = {
      statusBarThemes: [],
      hapticFeedbacks: [],
      sharedFiles: []
    };
  }
  setStatusBarTheme(dark, hexColor) {
    this.history.statusBarThemes.push({ dark: Boolean(dark), hexColor, timestamp: Date.now() });
  }
  performHapticFeedback(type) {
    this.history.hapticFeedbacks.push({ type, timestamp: Date.now() });
  }
  shareBackupFile(fileName, mimeType, content) {
    this.history.sharedFiles.push({ fileName, mimeType, content, timestamp: Date.now() });
  }
  clearHistory() {
    this.history.statusBarThemes = [];
    this.history.hapticFeedbacks = [];
    this.history.sharedFiles = [];
  }
}

let originalDate = Date;
let mockedTime = null;

function mockDate(isoOrTimestamp) {
  const targetTime = typeof isoOrTimestamp === 'number' ? isoOrTimestamp : new Date(isoOrTimestamp).getTime();
  mockedTime = targetTime;

  class CustomDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(mockedTime);
      } else {
        super(...args);
      }
    }
    static now() {
      return mockedTime;
    }
  }

  // Copy static methods
  CustomDate.UTC = originalDate.UTC;
  CustomDate.parse = originalDate.parse;

  global.Date = CustomDate;
}

function advanceTime(ms) {
  if (mockedTime !== null) {
    mockedTime += ms;
  }
}

function restoreDate() {
  global.Date = originalDate;
  mockedTime = null;
}

function setupMockEnvironment() {
  const localStorage = new MockLocalStorage();
  const indexedDB = new MockIndexedDBFactory();
  const androidBridge = new MockAndroidBridge();

  const mockWindow = {
    localStorage,
    AndroidBridge: androidBridge,
    navigator: {
      vibrate: (pattern) => {
        androidBridge.performHapticFeedback(pattern > 30 ? 'medium' : 'light');
        return true;
      }
    },
    crypto: {
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    }
  };

  global.window = mockWindow;
  global.localStorage = localStorage;
  global.AndroidBridge = androidBridge;
  if (!global.crypto || !global.crypto.randomUUID) {
    global.crypto = mockWindow.crypto;
  }

  return {
    localStorage,
    indexedDB,
    androidBridge,
    crypto: mockWindow.crypto,
    mockDate,
    advanceTime,
    restoreDate
  };
}

module.exports = {
  setupMockEnvironment,
  MockLocalStorage,
  MockIndexedDBFactory,
  MockAndroidBridge,
  mockDate,
  advanceTime,
  restoreDate
};
