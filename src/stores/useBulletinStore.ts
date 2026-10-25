/**
 * Local announcements: built-in release notes plus any the user publishes on
 * this device. Nothing is fetched from a server.
 */
import { create } from 'zustand';
import { toDisplayDateTime } from '../domain/dates';
import { persistSlice, readJSON, STORAGE_KEYS } from '../utils/storage';

export type BulletinCategory = 'update_log' | 'important' | 'security' | 'tip' | 'feature';
export type BulletinLevel = 'info' | 'important' | 'urgent';

export interface Bulletin {
  id: string;
  title: string;
  category: BulletinCategory;
  level: BulletinLevel;
  publishedAt: string; // YYYY-MM-DD HH:mm
  author?: string;
  summary: string;
  content: string;
  tags?: string[];
  /** Show automatically once, until read. */
  popupOnce?: boolean;
  pinned?: boolean;
  actionText?: string;
  /** Tab to open from the bulletin's action button. */
  actionTab?: string;
}

export const DEFAULT_BULLETINS: Bulletin[] = [
  {
    id: 'notice-v138-open-source',
    title: 'v1.3.8 Squircle To-Do 极简轻量开源版发布',
    category: 'update_log',
    level: 'important',
    publishedAt: '2026-10-18 10:00',
    author: 'Squircle 团队',
    summary: '面向 GitHub 开源发布！纯粹离线自持、四大昼夜主题、120Hz 液态玻璃质感与三大专属工作流。',
    content: `### 🌟 v1.3.8 核心亮点：

- 🎨 **四大昼夜灵动主题**：晨曦暖阳、冰川清晨、暮色暗金、深海极夜，支持日出日落自动切色与色调锁定。
- 📱 **120Hz 超低延迟**：全系统组件采用弹性物理动画与硬件加速，包体体积深度压缩 57%，启动如闪电。
- ⏳ **考研与极简翻页时钟**：沉浸式翻页时钟、番茄钟、正向秒表与考研倒计时，专为深度专注打造。
- 🛡️ **纯粹离线自持**：不依赖任何公网中心化服务器，数据保存在手机本地 SQLite / IndexedDB，支持一键 JSON/CSV 双向备份与恢复。
- 💡 **多场景工作流**：考研四科攻坚、绘画三维进度打卡、日常与突发任务置顶流。`,
    tags: ['更新日志', '开源发布', 'v1.3.8'],
    popupOnce: true,
    pinned: true,
    actionText: '访问 GitHub 仓库',
  },
  {
    id: 'notice-local-data-security',
    title: '重要安全指引：待办数据纯粹离线自持与双重备份',
    category: 'security',
    level: 'important',
    publishedAt: '2026-10-16 14:00',
    author: '数据安全组',
    summary: '数据始终留在自己手机：离线第一、绝不上传公网、完整 JSON 快照与 Excel CSV 自由导出。',
    content: `### 🛡️ 数据安全与备份指南：

1. **纯粹离线存储，绝无隐私泄露**：待办数据直接存储于手机本地，无需注册登录，绝无数据上传第三方服务器。
2. **多维冷热备份**：支持全量 JSON 快照与 Excel/WPS 兼容的 UTF-8 BOM CSV 导出。
3. **换机与迁移**：随时可以在设置中一键导出备份文件，新机一键导入即可无损恢复全部待办、面板、专注历史与热力图。`,
    tags: ['数据安全', '离线存储', '指引'],
    actionText: '打开备份面板',
    actionTab: 'settings',
  },
  {
    id: 'notice-focus-and-personas',
    title: '高效使用贴士：多角色工作流与专注翻页时钟',
    category: 'tip',
    level: 'info',
    publishedAt: '2026-10-14 18:30',
    author: '效率实验室',
    summary: '考研备考、绘画创作、日常工作三大工作流角色自由切换，搭配沉浸式极简翻页时钟。',
    content: `### 💡 效率使用贴士：

- **角色快速切换**：底部导航栏支持一键切换三大专业工作流，字段与统计自适应匹配。
- **沉浸式专注翻页时钟**：支持番茄钟倒计时与正向秒表，自适应刘海与状态栏，全屏沉浸防打扰。
- **周期自适应刷新**：每日、每周一、每月 1 日自动无感刷新周期打卡待办。`,
    tags: ['效率技巧', '专注时钟'],
  },
];

/** Pinned first, then newest first. */
function sortBulletins(list: Bulletin[]): Bulletin[] {
  return [...list].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

function loadBulletins(): Bulletin[] {
  const cached = readJSON<Bulletin[]>(STORAGE_KEYS.bulletinsCache);
  return sortBulletins(Array.isArray(cached) && cached.length > 0 ? cached : DEFAULT_BULLETINS);
}

interface BulletinState {
  bulletins: Bulletin[];
  readIds: string[];

  publish: (data: Omit<Bulletin, 'id' | 'publishedAt'>) => Bulletin;
  remove: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useBulletinStore = create<BulletinState>((set, get) => ({
  bulletins: loadBulletins(),
  readIds: readJSON<string[]>(STORAGE_KEYS.bulletinsRead) ?? [],

  publish: data => {
    const bulletin: Bulletin = { ...data, id: `notice-${Date.now().toString(36)}`, publishedAt: toDisplayDateTime() };
    set({ bulletins: sortBulletins([bulletin, ...get().bulletins]) });
    return bulletin;
  },
  remove: id => set({ bulletins: get().bulletins.filter(b => b.id !== id) }),
  markRead: id => {
    if (!get().readIds.includes(id)) set({ readIds: [...get().readIds, id] });
  },
  markAllRead: () => set({ readIds: get().bulletins.map(b => b.id) }),
}));

persistSlice(useBulletinStore, STORAGE_KEYS.bulletinsCache, s => s.bulletins);
persistSlice(useBulletinStore, STORAGE_KEYS.bulletinsRead, s => s.readIds);

export const useUnreadBulletinCount = () =>
  useBulletinStore(s => s.bulletins.filter(b => !s.readIds.includes(b.id)).length);

/** First unread bulletin that should pop up on its own, if any. */
export function findAutoPopupBulletin(): Bulletin | undefined {
  const { bulletins, readIds } = useBulletinStore.getState();
  return bulletins.find(b => !readIds.includes(b.id) && (b.popupOnce || b.level === 'urgent'));
}
