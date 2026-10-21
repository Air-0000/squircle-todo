import { create } from 'zustand';
import { BulletinItem } from '../types/bulletin';
import { toast } from './useToastStore';
import { nativeBridge } from '../utils/bridge';

const READ_BULLETINS_KEY = 'squircle_read_bulletins_v1';
const CACHE_BULLETINS_KEY = 'squircle_bulletins_cache_v1';

export const DEFAULT_BULLETINS: BulletinItem[] = [
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
    actionText: '访问 GitHub 仓库'
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

1. **纯粹离线存储，绝无隐私泄露**：待办数据直接加密存储于手机本地，无需注册登录，绝无数据上传第三方服务器。
2. **多维冷热备份**：支持全量 JSON 快照与 Excel/WPS 兼容的 UTF-8 BOM CSV 导出。
3. **换机与迁移**：随时可以在设置中一键导出备份文件，新机一键导入即可无损恢复全部待办、历史与热力图。`,
    tags: ['数据安全', '离线存储', '指引'],
    popupOnce: false,
    pinned: false,
    actionText: '打开备份面板',
    actionTab: 'settings'
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
    popupOnce: false,
    pinned: false,
  }
];

function getStoredReadIds(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(READ_BULLETINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getStoredCacheBulletins(): BulletinItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_BULLETINS;
  try {
    const raw = localStorage.getItem(CACHE_BULLETINS_KEY);
    if (raw) {
      const parsed: BulletinItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, BulletinItem>();
        DEFAULT_BULLETINS.forEach(b => map.set(b.id, b));
        parsed.forEach(b => map.set(b.id, b));
        return Array.from(map.values());
      }
    }
  } catch {}
  return DEFAULT_BULLETINS;
}

export interface BulletinState {
  bulletins: BulletinItem[];
  readIds: string[];
  isFetching: boolean;
  isPublishing: boolean;
  lastFetchTime: string | null;

  // Modals state
  activeModalBulletin: BulletinItem | null;
  isDetailModalOpen: boolean;
  isListModalOpen: boolean;
  isPublishModalOpen: boolean;

  // Actions
  fetchBulletins: (silent?: boolean) => Promise<void>;
  publishBulletin: (data: Omit<BulletinItem, 'id' | 'publishedAt'>) => Promise<boolean>;
  deleteBulletin: (id: string) => Promise<boolean>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  checkAutoPopup: () => void;

  openDetail: (bulletin: BulletinItem) => void;
  closeDetail: () => void;
  openListModal: () => void;
  closeListModal: () => void;
  openPublishModal: () => void;
  closePublishModal: () => void;

  getUnreadCount: () => number;
}

export const useBulletinStore = create<BulletinState>((set, get) => ({
  bulletins: getStoredCacheBulletins(),
  readIds: getStoredReadIds(),
  isFetching: false,
  isPublishing: false,
  lastFetchTime: null,

  activeModalBulletin: null,
  isDetailModalOpen: false,
  isListModalOpen: false,
  isPublishModalOpen: false,

  getUnreadCount: () => {
    const { bulletins, readIds } = get();
    return bulletins.filter(b => !readIds.includes(b.id)).length;
  },

  fetchBulletins: async (silent = false) => {
    set({ isFetching: true });
    // Local refresh from cache & defaults
    const currentList = getStoredCacheBulletins();
    const sorted = [...currentList].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    set({
      bulletins: sorted,
      isFetching: false,
      lastFetchTime: new Date().toISOString()
    });

    if (!silent) {
      toast.success(`已刷新公告列表 (${sorted.length} 条)`);
    }
  },

  publishBulletin: async (data) => {
    set({ isPublishing: true });
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const newBulletin: BulletinItem = {
        ...data,
        id: `notice-${Date.now().toString(36)}`,
        publishedAt: dateStr,
      };

      const currentList = get().bulletins;
      const updatedList = [newBulletin, ...currentList.filter(b => b.id !== newBulletin.id)].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });

      set({ bulletins: updatedList, isPublishing: false, isPublishModalOpen: false });

      try {
        localStorage.setItem(CACHE_BULLETINS_KEY, JSON.stringify(updatedList));
      } catch {}

      nativeBridge.performHapticFeedback('success');
      toast.success('📢 公告已发布！');
      return true;
    } catch (err: any) {
      set({ isPublishing: false });
      toast.error(`发布失败: ${err.message || '未知错误'}`);
      return false;
    }
  },

  deleteBulletin: async (id) => {
    const updated = get().bulletins.filter(b => b.id !== id);
    set({ bulletins: updated });

    try {
      localStorage.setItem(CACHE_BULLETINS_KEY, JSON.stringify(updated));
    } catch {}

    toast.success('公告已移除');
    return true;
  },

  markAsRead: (id) => {
    const { readIds } = get();
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      set({ readIds: newReadIds });
      try {
        localStorage.setItem(READ_BULLETINS_KEY, JSON.stringify(newReadIds));
      } catch {}
    }
  },

  markAllAsRead: () => {
    const allIds = get().bulletins.map(b => b.id);
    set({ readIds: allIds });
    try {
      localStorage.setItem(READ_BULLETINS_KEY, JSON.stringify(allIds));
    } catch {}
    nativeBridge.performHapticFeedback('light');
    toast.success('已将所有公告标记为已读');
  },

  checkAutoPopup: () => {
    const { bulletins, readIds, isDetailModalOpen } = get();
    if (isDetailModalOpen) return;

    const target = bulletins.find(b => 
      !readIds.includes(b.id) && (b.popupOnce || b.level === 'urgent')
    );

    if (target) {
      set({ activeModalBulletin: target, isDetailModalOpen: true });
    }
  },

  openDetail: (bulletin) => {
    get().markAsRead(bulletin.id);
    set({ activeModalBulletin: bulletin, isDetailModalOpen: true });
    nativeBridge.performHapticFeedback('light');
  },

  closeDetail: () => {
    const active = get().activeModalBulletin;
    if (active) {
      get().markAsRead(active.id);
    }
    set({ isDetailModalOpen: false, activeModalBulletin: null });
  },

  openListModal: () => {
    set({ isListModalOpen: true });
    nativeBridge.performHapticFeedback('light');
  },

  closeListModal: () => {
    set({ isListModalOpen: false });
  },

  openPublishModal: () => {
    set({ isPublishModalOpen: true });
    nativeBridge.performHapticFeedback('light');
  },

  closePublishModal: () => {
    set({ isPublishModalOpen: false });
  },
}));
