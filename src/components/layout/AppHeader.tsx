import React from 'react';
import { Bell, CheckCircle2, Clock, Flame, Settings } from 'lucide-react';
import { useUIStore, type TabId } from '../../stores/useUIStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useThemeDefinition } from '../../stores/useThemeStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { useUnreadBulletinCount } from '../../stores/useBulletinStore';
import type { Panel } from '../../domain/panels';
import { panelIcon } from '../ui/icons';
import { haptic } from '../../utils/bridge';

interface TabMeta {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BASE_TAB_META: Record<string, TabMeta> = {
  tasks: { title: '待办清单', subtitle: '灵动待办 · 周期自适应 · 突发响应', icon: CheckCircle2 },
  analytics: { title: '专注成就', subtitle: '连续打卡 · 专注时长 · 勋章沉淀', icon: Flame },
  settings: { title: '偏好设置', subtitle: '外观主题 · 自定义面板 · 数据备份', icon: Settings },
};

function tabMeta(tab: TabId, panels: Panel[]): TabMeta {
  if (BASE_TAB_META[tab]) return BASE_TAB_META[tab];
  const panel = panels.find(p => p.id === tab);
  if (panel) return { title: panel.name, subtitle: panel.description || '自定义功能看板', icon: panelIcon(panel.icon) };
  return BASE_TAB_META.tasks;
}

const headerButton =
  'relative p-1.5 sm:px-2 sm:py-1 rounded-squircle bg-theme-card border border-white/30 dark:border-white/10 text-theme-text text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1';

export const AppHeader: React.FC = () => {
  const activeTab = useUIStore(s => s.activeTab);
  const openBulletins = useUIStore(s => s.open);
  const panels = usePanelStore(s => s.panels);
  const theme = useThemeDefinition();
  const unread = useUnreadBulletinCount();
  const meta = tabMeta(activeTab, panels);
  const Icon = meta.icon;

  return (
    <header
      style={{ paddingTop: 'max(var(--safe-area-inset-top, 0px), var(--sat, 0px), env(safe-area-inset-top, 0px), 38px)' }}
      className="px-4 pb-2.5 pt-2 flex items-center justify-between border-b border-white/20 dark:border-white/10 sticky top-0 z-30 bg-theme-bg/95 shadow-2xs transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8.5 h-8.5 rounded-squircle bg-theme-accent/15 border border-theme-accent/25 flex items-center justify-center shrink-0 shadow-2xs">
          <Icon className="w-4 h-4 text-theme-accent" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold tracking-tight text-theme-text leading-tight truncate">{meta.title}</h1>
            <span className="text-[10px] px-1.5 py-px rounded-full bg-theme-card text-theme-text-secondary border border-white/30 dark:border-white/10 shrink-0 font-medium">
              {theme.name}
            </span>
          </div>
          <p className="text-[11px] text-theme-text-secondary truncate mt-0.5">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => useFocusStore.getState().open({ mode: 'pomodoro' })}
          aria-label="打开专注时钟"
          title="打开专注翻页时钟"
          className={headerButton}
        >
          <Clock className="w-3.5 h-3.5 text-theme-accent" />
          <span className="text-[10px] hidden sm:inline">专注时钟</span>
        </button>
        <button
          onClick={() => {
            haptic('light');
            openBulletins('bulletinListOpen');
          }}
          aria-label="打开通知公告与更新日志"
          title="通知公告与更新日志中心"
          className={headerButton}
        >
          <Bell className="w-3.5 h-3.5 text-theme-accent" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-theme-bg animate-pulse" />
          )}
          <span className="text-[10px] hidden sm:inline">公告</span>
        </button>
      </div>
    </header>
  );
};
