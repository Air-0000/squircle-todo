# Original User Request

## Initial Request — 2026-10-07T23:35:57Z

开发一款适用于 Android 系统的圆润灵动每日待办事项（To-Do）应用 APK，深度适配「考研备考」、「绘画创作」、「安保文员」三大典型工作流，支持冷暖双调早晚四套主题体系，具有高度自定义能力、丝滑弹簧微动效，并提供可直接在 Android 手机上安装的独立 APK 产物。

Working directory: /home/constant/CodeBuddy/Dev/todolist
Integrity mode: development

## Requirements

### R1. 三大职业场景深度适配与预置工作流 (Persona Workflows)
- **考研备考 (Postgraduate Exam)**：
  - 科目层级体系（政治、英语、数学/专业课），支持题型及章节拆分。
  - 艾宾浩斯复习记忆周期打卡（1/2/4/7/15天复习节点）。
  - 考研倒计时提醒与每日专注计时（番茄钟/学习时长统计）。
- **绘画创作 (Art Creation)**：
  - 创作流程里程碑管理（企划/草稿/线稿/铺色/细化/后期/成稿交件）。
  - 参考灵感标签、画布规格、预估与实际工时记录。
  - 阶段进度条与完成度可视化展示。
- **安保文员 (Security Clerk)**：
  - 班次值班交接记录（早班/中班/夜班交接状态、值班人员）。
  - 巡查签到清单（设备检查、消防设施、门禁巡检定时待办）。
  - 外来人员出入/车辆物品报备简易登记流，应急待办快速置顶。
- **切换与自定义**：顶部/侧边一键切换场景角色，同时支持自由新建自定义工作流模板、修改字段与标签分类。

### R2. 圆润现代视觉与冷暖早晚四套主题体系 (Squircle UI & Theming)
- **圆润现代视觉规范**：
  - 全站采用 Squircle 圆润几何圆角卡片（16-24px 圆角）、柔和浮雕阴影、宽裕的呼吸感留白与层级分明的排版。
  - 底部/悬浮操作键、状态胶囊标签（Pill tags）均呈圆润胶囊形态。
- **冷暖早晚四套主题切换**：
  1. **晨曦暖阳 (Warm Morning)**：柔和暖杏白、阳光晨曦橙色点缀、温润木质调。
  2. **冰川清晨 (Cool Morning)**：清新薄荷绿与冰川淡蓝渐变、明亮纯净。
  3. **暮色暗金 (Warm Evening)**：暗夜暖木灰黑、落日暗金色与晚霞琥珀色提亮。
  4. **深海极夜 (Cool Evening)**：深邃午夜蓝与冷靛灰黑、荧光冷青色微光。
  - 支持“随时间自动切换早晚”及“冷暖偏好全局锁定”开关。
- **流畅弹簧微动效 (Smooth Motion)**：
  - 待办完成打卡支持平滑划线、波纹震颤或轻量粒子爆破动效。
  - 列表增删、分类切换、手势滑动删除带有平滑弹簧阻尼过渡（60fps）。

### R3. 自定义配置能力与本地数据持久化 (Customization & Offline Storage)
- **多维度自定义字段**：
  - 支持任务优先级（紧急/高/中/低）、自定义提醒时间、周期重复规则（每日/工作日/轮班周期）。
  - 支持子任务清单检查项（Checklist）、富文本备注与标签组自由增删。
- **本地持久化与数据安全**：
  - 本地离线优先存储（IndexedDB / SQLite / LocalStorage），毫秒级响应。
  - 提供数据一键备份导出为 JSON/CSV，并支持本地导入恢复与清空重置。

### R4. 轻量高保真移动端架构与 APK 构建打包 (Architecture & APK Packaging)
- 采用现代化响应式移动端技术栈（Vue 3 / React + Vite + Tailwind CSS + Lucide 图标库），配合 Capacitor Android 封装或独立 WebView 容器。
- 深度适配 Android 状态栏安全区（Safe Area）、沉浸式全面屏手势与键盘自适应。
- 依托系统已安装的 OpenJDK 21、Android SDK 34 (位于 /home/constant/.wmtool/android-sdk) 及 Gradle 8.7 (位于 /home/constant/.wmtool/gradle-8.7/bin/gradle)，输出独立 Debug/Release APK。

## Acceptance Criteria

### 编译构建与产物交付 (Build & APK Verification)
- [ ] 在 /home/constant/CodeBuddy/Dev/todolist 目录中成功编译构建，并在输出路径下生成大小完整合法的 .apk 安装文件。
- [ ] 提供一键编译运行脚本（如 build_apk.sh），执行返回码为 0，无编译报错。

### 角色场景功能验收 (Persona Workflow Verification)
- [ ] 预置「考研」、「绘画」、「安保文员」三大完整角色模板，各角色专属工作流控件及打卡逻辑完全可用。
- [ ] 用户可随时新建自定义分类与任务项，修改后刷新或重启应用数据不丢失。
- [ ] 备份与恢复功能正常，JSON 数据可完整导出与恢复。

### 主题与动效体验验收 (Theming & Animation Verification)
- [ ] 提供完整的冷/暖早晚 4 套配色切换，主题切换时卡片底色、文字对比度及状态标签无瑕疵渲染。
- [ ] 待办完成、卡片折叠、模态弹窗均具备平滑圆润的弹簧动效，交互直观无跳动。
