# 📱 Squircle To-Do (圆润灵动待办)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Android](https://img.shields.io/badge/Android-SDK%2034-3DDC84?logo=android)](https://developer.android.com/)
[![Refresh Rate](https://img.shields.io/badge/Display-120Hz%20Ultra--Smooth-FF5722)]()

**Squircle To-Do** 是一款专为 Android 打造的高性能、纯粹离线自持的圆角灵动待办应用。它融合了 iOS 18 风格的 Squircle（连续超椭圆曲率）几何美学、液态玻璃质感、120Hz 极致顺滑的弹性物理动画，以及考研备考、商业插画、日程工作三大专属工作流。

---

## 🌟 核心特性 (Key Features)

### 🎨 四大昼夜灵动主题 (Diurnal Squircle Themes)
- **晨曦暖阳 (Warm Morning)** / **冰川清晨 (Cool Morning)** / **暮色暗金 (Warm Evening)** / **深海极夜 (Cool Evening)**
- 自动化日夜节律调度：日出日落自动切色，支持暖色/冷色调锁定。
- 深度主题同步：Tailwind CSS 变量透明度引擎驱动，全系统模态框随主题变色，无缝联动 Android 状态栏与导航栏。

### ⏳ 沉浸式毛玻璃翻页时钟与专注 (Liquid Glass Flip Clock & Pomodoro)
- **考研专属专注翻页时钟**：全屏液态玻璃拟物翻页时钟，支持自适应刘海与状态栏避让。
- **番茄钟倒计时与正向秒表**：25 分钟番茄钟、180 分钟全真模考计时，自动累加专注时长。
- **灵动发光胶囊 (Dynamic Island)**：时钟最小化后吸顶常驻，随时一键还原全屏。

### 🎯 三大专业工作流 (Multi-Persona Workflows)
1. **🎓 考研攻坚 (Postgraduate Exam)**：
   - 考研四科（政治、英语、数学、专业课）多维分类与倒计时看板。
   - 艾宾浩斯 1/2/4/7/15 天自动记忆复习曲线与状态追踪。
2. **🎨 商业绘画 (Digital Art Pipeline)**：
   - 7 阶段标准创作推进（需求定稿 ➔ 草图 ➔ 线稿 ➔ 铺色 ➔ 刻画 ➔ 终稿 ➔ 交付）。
   - 画布规格预设（A4 / B5 / 300~600 DPI）与工时超额预警。
3. **💼 日程与工作流 (Work & Life)**：
   - 周期自适应无感重置（每日晨起、每周一、每月 1 日自动刷新）。
   - 🚨 **突发紧急事件流**：一键置顶并覆盖最高优先级，闭环销项。

### 📅 打卡热力图与日历参考 (Activity Heatmap & Calendar)
- GitHub 风格的连续打卡活跃度热力图（0~4 级活跃度梯度计算）。
- 连续打卡天数（Streak）勋章激励与完成率多维环形统计。

### 🛡️ 纯粹离线自持与双重备份 (Offline-First & Dual Persistence)
- **零公网依赖**：所有待办、打卡与专注数据 100% 自持在本地存储。
- **双层持久化**：Zustand 内存状态 + 同步 LocalStorage 快照 + 异步 IndexedDB / SQLite 双保险。
- **双向数据自由迁移**：
  - 全量无损 **JSON 快照** 导入与导出（支持覆盖与智能增量合并）。
  - Excel / WPS 深度兼容的 **RFC 4180 CSV 导出**（带 UTF-8 BOM 编码，中文绝无乱码）。

### ⚡ 极致性能优化 (Ultra-Fast 120Hz Performance)
- 打包体积深度缩减 **57%**（核心 JS 仅 263 kB）。
- 动态代码分割（Vendor 分块隔离 + Confetti / 动画按需加载）。
- 60/120fps 弹性物理动效，手势操作零延迟触觉震动反馈。

---

## 🛠️ 技术架构 (Tech Stack)

| 模块 | 技术选型 | 说明 |
|---|---|---|
| **核心前端框架** | React 19 + TypeScript 5.7 | 严格类型安全，现代 Hooks 体系 |
| **构建工具** | Vite 6 | 秒级热更新，Rollup 高性能压缩 |
| **样式与设计系统** | Tailwind CSS 3.4 | Squircle 连续曲率、CSS 变量色彩引擎 |
| **动画引擎** | Framer Motion 12 | 真实弹簧物理动力学 (Spring Physics) |
| **状态中枢** | Zustand 5 | 纯净轻量状态，毫秒级响应 |
| **原生容器** | Android Native Shell (SDK 34) | Java WebAppInterface + WebViewAssetLoader |
| **测试框架** | 自研轻量级 E2E 测试运行器 | 12 大测试套件，71 项测试用例全部通过 |

---

## 🚀 快速上手 (Quick Start)

### 1. 环境准备
- Node.js >= 18.0.0
- npm >= 9.0.0
- (可选打包 Android APK) OpenJDK 21 + Android SDK 34 + Gradle 8.7

### 2. 安装依赖并启动开发服务器
```bash
# 安装依赖
npm install

# 启动 Web 端本地预览 (支持 120Hz 浏览器渲染)
npm run dev
```

### 3. 构建 Web 生产包
```bash
npm run build
```
构建产物将输出至 `dist/` 目录。

### 4. 运行全量 E2E 自动化测试
```bash
# 运行全部 12 个测试层级（71 项端到端测试用例）
node tests/e2e_runner.cjs

# 运行特定层级测试 (例如 Tier 1)
node tests/e2e_runner.cjs --tier=1

# 验证多 Tab 周期自适应重置
node tests/verify_all_tabs_cycle_refresh.cjs
```

### 5. 编译 Android 原生 APK
项目提供了标准化的一键打包构建脚本 `build_apk.sh`：
```bash
./build_apk.sh
```
成功编译后，将在项目根目录生成 `app-debug.apk`，可直接传输至 Android 手机或模拟器安装体验。

---

## 📂 项目结构 (Directory Structure)

```
squircle-todo/
├── android/                 # Android 原生容器工程 (SDK 34, AGP 8.5.2)
│   ├── app/src/main/
│   │   ├── java/            # Android WebAppInterface 原生交互桥
│   │   └── res/             # 应用图标与原生样式
├── src/
│   ├── components/          # UI 组件库
│   │   ├── common/          # Squircle 基础几何卡片、胶囊按钮、二次确认模态框
│   │   ├── focus/           # 拟物翻页时钟、番茄钟、灵动胶囊
│   │   ├── layout/          # 顶栏、底栏、状态栏
│   │   ├── modals/          # 智能添加、多维编辑、备份恢复、公告通知、反馈建议
│   │   └── tabs/            # 考研看板、绘画工作流、日程工作、日历参考、设置
│   ├── constants/           # 四大主题定义、版本号、几何常量
│   ├── hooks/               # 自动昼夜调度、公告调度、专注时钟调度
│   ├── stores/              # Zustand 状态管理 (待办、主题、专注、公告、反馈)
│   ├── types/               # 全量 TypeScript 类型定义
│   └── utils/               # 双重持久化、JSON/CSV 导入导出、原生震动与状态栏桥接
├── tests/                   # 自动化测试工程
│   ├── e2e/                 # 12 大测试套件 (Tiers 1-9)
│   └── e2e_runner.cjs       # 极速测试执行器
├── build_apk.sh             # Android APK 一键构建脚本
├── package.json             # 依赖与脚本定义
├── tailwind.config.js       # Squircle 圆角与主题色彩系统配置
└── vite.config.ts           # Vite 构建与分块配置
```

---

## 📄 开源许可证 (License)

本项目基于 [MIT 许可证](LICENSE) 开源。欢迎提交 Pull Request 或创建 Issue 交流改进！
