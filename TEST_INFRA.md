# E2E Test Suite Infrastructure & Architecture Specification

**Project**: Android Squircle To-Do Application (圆润灵动待办)  
**Location**: `/home/constant/CodeBuddy/Dev/todolist/`  
**Execution Command**: `node tests/e2e_runner.cjs`  
**Environment Requirements**: Node.js >= 18 (Zero external runner dependencies)

---

## 1. Overview & Testing Philosophy

The End-to-End (E2E) Test Suite provides requirement-driven, opaque-box verification of all 34 cataloged features from `PROJECT.md` and `ORIGINAL_REQUEST.md`. It executes independently of internal UI frameworks, ensuring verification can run continuously from day one through final APK delivery.

Key Design Tenets:
1. **Zero External Dependencies**: Implemented natively in Node.js CommonJS without requiring Jest, Vitest, or Cypress npm packages.
2. **Sub-second Execution**: Entire 54-test suite completes in < 50ms, enabling instant feedback during local development and CI gates.
3. **Multi-Tier Coverage Hierarchy**: Structured across 4 testing tiers:
   - **Tier 1**: Feature Coverage (Happy Path & Core Domain Logic)
   - **Tier 2**: Boundary Value Analysis & Fault Recovery
   - **Tier 3**: Cross-Feature Pairwise Interactions & State Synchronization
   - **Tier 4**: Full Lifecycle Real-World User Scenarios

---

## 2. Directory Layout

```
/home/constant/CodeBuddy/Dev/todolist/tests/
├── e2e_runner.cjs                     # Standalone CLI test runner & reporter
├── harness/                           # Test harness & mock environments
│   ├── assertions.cjs                 # expect() assertion engine
│   ├── mock_env.cjs                   # Browser DOM, Storage, AndroidBridge & Clock mocks
│   └── app_driver.cjs                 # Opaque-box specification driver & contract engine
└── e2e/                               # 4-Tier test suites
    ├── tier1_exam_persona.test.cjs    # Tier 1: 考研备考 persona feature tests (6 cases)
    ├── tier1_art_persona.test.cjs     # Tier 1: 绘画创作 persona feature tests (6 cases)
    ├── tier1_security_persona.test.cjs# Tier 1: 安保文员 persona feature tests (6 cases)
    ├── tier1_squircle_themes.test.cjs # Tier 1: Squircle UI & 4 Themes feature tests (6 cases)
    ├── tier1_storage_backup.test.cjs  # Tier 1: Offline storage & Backup/Restore (6 cases)
    ├── tier2_boundaries.test.cjs      # Tier 2: Boundary & Corner Cases (12 cases)
    ├── tier3_pairwise.test.cjs        # Tier 3: Pairwise Combinations (8 cases)
    └── tier4_scenarios.test.cjs       # Tier 4: Real-World Scenarios (4 cases)
```

---

## 3. Harness Architecture

### 3.1 Mock Environment (`tests/harness/mock_env.cjs`)
- **`MockLocalStorage`**: In-memory key-value store replicating `window.localStorage` semantics (`getItem`, `setItem`, `removeItem`, `clear`).
- **`MockIndexedDBFactory`**: Full in-memory IndexedDB database simulator managing `todos`, `personas`, `settings`, and `customFieldDefs` object stores.
- **`MockAndroidBridge`**: Emulates native Android container bridge (`window.AndroidBridge`):
  - `setStatusBarTheme(dark: boolean, hexColor: string)`
  - `performHapticFeedback(type: string)`
  - `shareBackupFile(fileName: string, mimeType: string, content: string)`
  - Captures complete call history for assertion auditing.
- **Controllable Clock**: `mockDate(time)` and `advanceTime(ms)` allow time-travel testing across daylight/evening transitions, leap years, and cross-midnight shifts.

### 3.2 Assertion Engine (`tests/harness/assertions.cjs`)
Lightweight assertion library providing:
- Equality & Truthiness: `toBe(val)`, `toEqual(obj)`, `toBeTruthy()`, `toBeFalsy()`, `toBeNull()`, `toBeDefined()`.
- Numerical & Range: `toBeGreaterThan(n)`, `toBeGreaterThanOrEqual(n)`, `toBeLessThan(n)`, `toBeLessThanOrEqual(n)`.
- Collections & Regex: `toContain(item)`, `toHaveLength(len)`, `toMatch(regex)`.
- Exceptions: `toThrow(optMsg)`.
- Inversion: `.not.*` support on all matchers.

### 3.3 Application Driver (`tests/harness/app_driver.cjs`)
Encapsulates all interface contracts defined in `PROJECT.md`:
- **Theme Matrix**: Full color palette definitions and tokens for Warm Morning, Cool Morning, Warm Evening, Cool Evening.
- **Auto-Switch & Tone Lock**: Automatic time-of-day scheduler (06:00/18:00) with warm/cool tone constraints and manual override locking.
- **Squircle Geometry & Spring Motion**: 16-24px squircle card radii, 9999px pills, and spring physics coefficients ($k=300, c=25$; $k=450, c=20$; $k=220, c=28$).
- **Polymorphic Task Model**: Unified `TodoItem` schema with persona-specific fields (`examData`, `artData`, `securityData`).
- **Exam Domain Logic**: Subject hierarchy, Ebbinghaus 1/2/4/7/15-day scheduler with 5-dot mastery, target date countdown calculation, Pomodoro and 180min mock exam stopwatch.
- **Art Domain Logic**: 7-stage pipeline state machine (`planning` $\to$ `delivery`), visual stage progress %, canvas specs validation, inspiration tags, and estimated vs actual hours auditing.
- **Security Domain Logic**: 3-shift handover (morning, afternoon, night cross-midnight), patrol checklist manager (equipment, fire safety, access control), visitor flow logs, and emergency top-pinning override.
- **Dual Offline Storage & Backup**: Synchronous LocalStorage snapshots, asynchronous IndexedDB persistence, schema v1 $\to$ v2 auto-migration, JSON import/export (merge vs overwrite), and RFC 4180 CSV export with UTF-8 BOM (`\uFEFF`).

---

## 4. Test Suite Hierarchy & Inventory

| Tier | Suite File | Feature Scope | Cases |
|---|---|---|---|
| **Tier 1** | `tier1_exam_persona.test.cjs` | 考研备考: 科目层级、艾宾浩斯周期、倒计时横幅、专注番茄钟、180min模考秒表 | 6 |
| **Tier 1** | `tier1_art_persona.test.cjs` | 绘画创作: 7阶段流程状态机、阶段进度条%、画布规格、灵感标签、工时核算、阶段跳跃 | 6 |
| **Tier 1** | `tier1_security_persona.test.cjs` | 安保文员: 3班次交接、跨日夜班、巡更签到清单、访客登记流、突发应急置顶、排险归档 | 6 |
| **Tier 1** | `tier1_squircle_themes.test.cjs` | 视觉主题: 4套主题色彩矩阵、Android状态栏桥接、定时早晚切换、冷暖偏好锁定、圆润几何、弹簧阻尼 | 6 |
| **Tier 1** | `tier1_storage_backup.test.cjs` | 离线存储: LocalStorage快照、IndexedDB持久化、v1到v2迁移、JSON全量备份还原、UTF-8 BOM CSV导出 | 6 |
| **Tier 2** | `tier2_boundaries.test.cjs` | 边界异常: 空白标题拦截、过去/极远倒计时、闰年2月27跨月计算、非法画布规格、极值超时工时、损坏JSON防崩、CSV转义、高频主题切换、空子任务、负数计时、多应急置顶保序、跨班次访客签退 | 12 |
| **Tier 3** | `tier3_pairwise.test.cjs` | 交叉组合: 角色切换保留计时、多角色数据完整备份还原、自动切换下冷暖锁定生效、禁用自动切换锁定主题、多角色多态CSV导出、JSON导入ID冲突合并、应急任务跨视图置顶、粒子动效与触感连续触发 | 8 |
| **Tier 4** | `tier4_scenarios.test.cjs` | 真实场景: 1. 考研学子全天备考全流程; 2. 商业插画约稿7阶段全周期与工时审计; 3. 24小时三班制安保交接与突发火警排险; 4. 跨设备多角色数据全量迁移与主题配置保留 | 4 |
| **Total** | **8 Test Suites** | **All 34 Cataloged Features Covered** | **54** |

---

## 5. Execution Guide

### Run Complete Test Suite
```bash
node tests/e2e_runner.cjs
```

### Run by Specific Tier
```bash
node tests/e2e_runner.cjs --tier=1
node tests/e2e_runner.cjs --tier=2
node tests/e2e_runner.cjs --tier=3
node tests/e2e_runner.cjs --tier=4
```

### Filter Tests by Name
```bash
node tests/e2e_runner.cjs --filter=Exam
node tests/e2e_runner.cjs --filter=Security
```

### JSON Output (for CI / Tooling)
```bash
node tests/e2e_runner.cjs --json
```

### Verbose Mode (with full error stacks)
```bash
node tests/e2e_runner.cjs --verbose
```
