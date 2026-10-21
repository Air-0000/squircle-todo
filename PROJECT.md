# Project: Android Squircle To-Do Application (圆润灵动待办)

## Architecture
- **Frontend Stack**: React 19 + Vite + Tailwind CSS + Lucide React + Zustand + Framer Motion + Canvas-Confetti.
- **Android Native Container**: Lightweight Native Android Shell (`android/`) with Gradle 8.7, AGP 8.5.2, Android SDK 34, AndroidX WebKit (`WebViewAssetLoader`), Safe Area Insets injection, dynamic status bar theming, and Android haptic/native bridge.
- **Data Persistence**: Offline-first dual-layer storage: Synchronous Zustand in-memory state with immediate LocalStorage snapshot and IndexedDB asynchronous long-term persistence. Versioned schema with automatic migration, RFC 4180 CSV export (UTF-8 BOM), and full JSON backup/restore.
- **Build & Packaging**: Root `build_apk.sh` one-click build script executing under OpenJDK 21, Android SDK 34, and Gradle 8.7, generating standalone signed APK at `app-debug.apk` and `build_output/app-debug.apk` with exit code 0.

## Code Layout
```
/home/constant/CodeBuddy/Dev/todolist/
├── .agents/                      # Teamwork agent metadata
├── android/                      # Native Android project shell
│   ├── app/
│   │   ├── build.gradle          # AGP 8.5.2 config, compileSdk 34, stdlib exclusion
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── assets/           # Web app build assets (HTML, CSS, JS)
│   │       ├── java/com/squircle/todo/
│   │       │   ├── MainActivity.java
│   │       │   └── WebAppInterface.java
│   │       └── res/              # Android app icons & styles
│   ├── build.gradle              # Top-level Gradle build file
│   ├── gradle.properties         # android.useAndroidX=true
│   └── settings.gradle
├── src/                          # Frontend source code
│   ├── assets/                   # Static assets & icons
│   ├── components/               # UI components
│   │   ├── common/               # SquircleCard, PillTag, SquircleButton, ConfettiBurst
│   │   ├── layout/               # Header, BottomNav, PersonaBar, SafeArea
│   │   ├── modals/               # TaskEditModal, BackupModal, TemplateModal
│   │   └── personas/             # Specialized persona workflow controls
│   │       ├── exam/             # SubjectHierarchy, EbbinghausCard, PomodoroTimer, CountdownBanner
│   │       ├── art/              # PipelineMilestones, StageProgress, CanvasSpecCard, HoursTracker
│   │       └── security/         # ShiftHandoverCard, PatrolChecklist, VisitorLog, EmergencyPin
│   ├── constants/                # Theme palettes, persona definitions, default templates
│   ├── hooks/                    # useTheme, useEbbinghaus, usePomodoro, useHaptics
│   ├── stores/                   # Zustand stores (useTaskStore, useThemeStore, usePersonaStore)
│   ├── types/                    # TypeScript interfaces (TodoItem, PersonaType, ThemeMode)
│   ├── utils/                    # Backup/restore (JSON/CSV), schema migration, date utils
│   ├── App.tsx                   # Main app entry & state router
│   ├── index.css                 # Tailwind directives, CSS variable themes, squircle styles
│   └── main.tsx                  # React DOM root
├── tests/                        # E2E & unit test suites
│   ├── e2e/                      # Opaque-box E2E test suite (Tiers 1-4)
│   └── e2e_runner.cjs            # Standalone Node E2E test runner
├── index.html                    # HTML entry point with safe-area viewport
├── package.json                  # Dependencies & scripts
├── tailwind.config.js            # Squircle radii, theme colors, spring animations
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite config with relative asset base './'
├── build_apk.sh                  # One-click build script
└── PROJECT.md                    # Project blueprint & milestones
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Workspace Build Pipeline & Scripts | Node/Vite build + Gradle 8.7 assembly in `build_apk.sh` with exit code 0 | M1 | Survey |
| 2 | Android Native Container & Manifest | Android 34 WebView shell, AndroidX WebKit, permissions, debug keystore | M1 | Survey |
| 3 | Safe Area & Android Bridge Integration | WebAppInterface for status bar theme coloring, window insets, and haptics | M1 | Survey |
| 4 | Base Frontend Scaffold & Dependencies | React 19, Vite, Tailwind CSS, Lucide React, Zustand, Framer Motion | M1 | Survey |
| 5 | Squircle Geometry & Elevation System | 16-24px squircle card radii, soft relief shadows, pill capsules | M2 | Survey |
| 6 | 4-Theme Matrix Palette Engine | Warm Morning, Cool Morning, Warm Evening, Cool Evening CSS token engine | M2 | Survey |
| 7 | Smart Theme Scheduler & Tone Lock | Auto-switch (06:00/18:00) with global Warm/Cool manual lock toggle | M2 | Survey |
| 8 | Spring Motion Physics System | Damped spring transitions for cards, modals, page views (Framer Motion) | M2 | Survey |
| 9 | Tactile Micro-interactions & Gestures | Smooth strikethrough, drag-to-delete, elastic swipe actions | M2 | Survey |
| 10 | Completion Particle Burst Effect | GPU-accelerated canvas-confetti burst on task / milestone completion | M2 | Survey |
| 11 | Polymorphic Task Data Model | Core `TodoItem` schema supporting universal fields & persona-specific state | M3 | Survey |
| 12 | Checklist Subtask Hierarchy | Nested checklist items with toggle, completion ratio, and drag reorder | M3 | Survey |
| 13 | Multi-Dimensional Custom Fields | Key-value custom fields (text, number, date, select, tags) per task | M3 | Survey |
| 14 | Task Priority & Recurrence Rules | Priorities (Urgent/High/Medium/Low), custom reminders, recurrence schedules | M3 | Survey |
| 15 | Offline-First Dual Storage Engine | Zustand state synchronized with LocalStorage and IndexedDB persistence | M3 | Survey |
| 16 | Automatic Schema Migration | Versioned schema migration engine to support data upgrades seamlessly | M3 | Survey |
| 17 | Full JSON Backup & Restore | Export full database to JSON; import with collision detection / merge | M3 | Survey |
| 18 | RFC 4180 UTF-8 BOM CSV Export | Standardized CSV export compatible with Excel/WPS without garbled Chinese | M3 | Survey |
| 19 | Safe Data Clear & Reset | One-click reset to factory defaults with safety confirmation dialog | M3 | Survey |
| 20 | Persona Quick-Switch Engine | Instant switching between Exam, Art, Security, and General views | M4 | Survey |
| 21 | Custom Template & Category Manager | User-defined custom workflow templates, field definitions, and tag colors | M4 | Survey |
| 22 | Exam: Subject Hierarchy Tree | Politics, English, Math, Major 1/2 with chapters and question types | M4 | Survey |
| 23 | Exam: Ebbinghaus Spaced Repetition | 1/2/4/7/15-day review scheduler, upcoming/due/overdue status, 5-dot mastery | M4 | Survey |
| 24 | Exam: Target Date Countdown Banner | Customizable exam date countdown with daily motivational quotes | M4 | Survey |
| 25 | Exam: Pomodoro & Mock Exam Stopwatch | 25m focus timer & 180m mock exam stopwatch linked to subject tasks | M4 | Survey |
| 26 | Art: 7-Stage Pipeline State Machine | Planning, draft, lineart, flat color, detail, post-process, delivery | M4 | Survey |
| 27 | Art: Stage Progress Visualization | Dynamic visual progress bar reflecting milestone completion percentages | M4 | Survey |
| 28 | Art: Canvas Specs & Metadata | Canvas dimensions (W×H, DPI, color profile), tool presets, reference links | M4 | Survey |
| 29 | Art: Inspiration Tag Matrix | Categorized inspiration & style tags (mood, lighting, composition) | M4 | Survey |
| 30 | Art: Estimated vs Actual Hours Audit | Hours logging with variance calculation and productivity metrics | M4 | Survey |
| 31 | Security: Shift Handover System | Morning, afternoon, night shift records with duty staff & transfer notes | M4 | Survey |
| 32 | Security: Patrol Checklist Manager | Timed inspection checklists for equipment, fire safety, and access control | M4 | Survey |
| 33 | Security: Visitor & Vehicle Flow Log | Fast registration for guest entry/exit, vehicle license, and baggage passes | M4 | Survey |
| 34 | Security: Emergency Incident Pinning | Instant priority override with top-pinning and high-contrast red alert styling | M4 | Survey |
| 35 | E2E Test Suite Pass (Tiers 1-4) | 100% pass rate across feature coverage, boundaries, pairwise, and workloads | M5 | Survey |
| 36 | Adversarial Hardening (Tier 5) & APK Delivery | Adversarial edge-case tests, code-coverage verification, and standalone APK | M5 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | App Foundation & Android Packaging | Features 1, 2, 3, 4: React+Vite frontend scaffold, Android 34 shell, `build_apk.sh` working end-to-end | none | DONE (Verified APK 3.3MB, 54/54 tests pass) |
| M2 | Squircle UI, 4 Themes & Motion Physics | Features 5, 6, 7, 8, 9, 10: Squircle components, theme matrix & auto-scheduler, Framer Motion springs, confetti | M1 | DONE (Verified Squircle tokens, 4 themes, 54/54 tests, APK 3.4MB) |
| M3 | Core Data Engine, Storage & Backup/Restore | Features 11, 12, 13, 14, 15, 16, 17, 18, 19: TodoItem store, checklists, custom fields, LocalStorage/IndexedDB, JSON/CSV | M1 | DONE (Dual-tier persistence, JSON/CSV backup & restore, TaskEditModal, BackupModal) |
| M4 | Three Persona Workflows & Template Manager | Features 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34: 考研, 绘画, 安保 specialized workflows & custom templates | M2, M3 | DONE (ExamPersonaView, ArtPersonaView, SecurityPersonaView, TemplateModal integrated) |
| M5 | Final Milestone: 100% E2E Pass & Packaging | Features 35, 36: Tier 1-5 E2E test verification, Tier 5 adversarial coverage hardening, final standalone APK generation | M4 | DONE (59/59 E2E tests pass 100%, standalone signed APK 3.4MB verified) |

## Interface Contracts
### M1 ↔ M2, M3, M4, M5
- Frontend Entry: `src/main.tsx` mounting `src/App.tsx` into `#root`.
- Native Bridge: `window.AndroidBridge` (with fallback mock in browser environment):
  - `setStatusBarTheme(dark: boolean, hexColor: string): void`
  - `performHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void`
  - `shareBackupFile(fileName: string, mimeType: string, content: string): void`
- Build Output: `npm run build` outputs to `dist/`, mirrored into `android/app/src/main/assets/`. `build_apk.sh` compiles to `build_output/app-debug.apk` and workspace root `app-debug.apk`.

### M2 (UI & Themes) ↔ M3 & M4 (Task Engine & Personas)
- Theme Store: `useThemeStore`:
  - `theme: 'warm-morning' | 'cool-morning' | 'warm-evening' | 'cool-evening'`
  - `autoSwitch: boolean` (06:00–18:00 morning, 18:00–06:00 evening)
  - `toneLock: 'auto' | 'warm' | 'cool'`
  - `setTheme(theme)`, `setAutoSwitch(enabled)`, `setToneLock(lock)`
- Squircle UI Library:
  - `<SquircleCard className="..." onClick="..." elevation={1|2|3}>`
  - `<PillTag label="..." variant="primary|accent|subtle" color="..." />`
  - `<SquircleButton variant="filled|tonal|ghost" size="sm|md|lg">`
  - `triggerConfetti(origin?: {x: number, y: number})`

### M3 (Data Engine) ↔ M4 (Personas)
- Task Store: `useTaskStore`:
  - `tasks: TodoItem[]`
  - `addTask(task: Partial<TodoItem>): TodoItem`
  - `updateTask(id: string, updates: Partial<TodoItem>): void`
  - `deleteTask(id: string): void`
  - `toggleTask(id: string): void`
  - `exportJSON(): string`
  - `importJSON(jsonString: string, mode: 'merge' | 'overwrite'): { success: boolean, count: number }`
  - `exportCSV(): string`
  - `resetAllData(): void`
- Polymorphic Data Contract:
  - `TodoItem.persona: 'exam' | 'art' | 'security' | 'custom'`
  - `TodoItem.examData?: { subject: string, chapter: string, questionType: string, ebbinghaus: { round: number, nextDue: string, history: string[] }, timerSeconds: number }`
  - `TodoItem.artData?: { stage: ArtStage, canvasWidth: number, canvasHeight: number, dpi: number, colorProfile: string, estimatedHours: number, actualHours: number, inspirationTags: string[] }`
  - `TodoItem.securityData?: { shift: 'morning' | 'afternoon' | 'night', dutyPersonnel: string, patrolItems: ChecklistItem[], visitorLogs: VisitorRecord[], isEmergency: boolean }`
