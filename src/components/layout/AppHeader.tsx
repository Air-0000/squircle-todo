import React from 'react';
import { Bell, SlidersHorizontal, Timer } from 'lucide-react';
import { TEMPLATE_LABELS } from '../../domain/panels';
import { isActiveEmergency } from '../../domain/task';
import { useUIStore } from '../../stores/useUIStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { useUnreadBulletinCount } from '../../stores/useBulletinStore';
import { haptic } from '../../utils/bridge';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function todayLabel(now = new Date()): string {
  return `${now.getMonth() + 1}月${now.getDate()}日 周${WEEKDAYS[now.getDay()]}`;
}

const IconButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; dot?: boolean }> = ({ label, onClick, children, dot }) => (
  <button
    type="button"
    onClick={() => {
      haptic('light');
      onClick();
    }}
    aria-label={label}
    title={label}
    className="relative w-9 h-9 rounded-full bg-theme-card-subtle text-theme-accent flex items-center justify-center active:opacity-60 transition-opacity"
  >
    {children}
    {dot && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-theme-bg" />}
  </button>
);

/** Sticky large-title header for the current tab. */
export const AppHeader: React.FC = () => {
  const activeTab = useUIStore(s => s.activeTab);
  const panel = usePanelStore(s => s.panels.find(p => p.id === activeTab));
  const openCount = useTaskStore(s => s.tasks.filter(t => !t.completed && !t.isTemplate).length);
  const emergencyCount = useTaskStore(s => s.tasks.filter(isActiveEmergency).length);
  const unread = useUnreadBulletinCount();

  let title = '待办';
  let subtitle = `${todayLabel()} · ${openCount > 0 ? `${openCount} 项进行中` : '全部完成'}`;
  if (activeTab === 'analytics') {
    title = '成就';
    subtitle = todayLabel();
  } else if (activeTab === 'settings') {
    title = '设置';
    subtitle = '外观、面板与数据';
  } else if (panel) {
    title = panel.name;
    subtitle = `${TEMPLATE_LABELS[panel.templateId]} · ${panel.enabledModules.length} 个模块`;
  }
  if (activeTab === 'tasks' && emergencyCount > 0) subtitle = `${todayLabel()} · ${emergencyCount} 项紧急`;

  return (
    <header
      style={{ paddingTop: 'max(var(--safe-area-inset-top, 0px), var(--sat, 0px), env(safe-area-inset-top, 0px), 38px)' }}
      className="sticky top-0 z-30 bar-material border-b border-theme-border"
    >
      <div className="max-w-lg mx-auto px-4 pt-2 pb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title1 font-bold tracking-tight text-theme-text truncate">{title}</h1>
          <p className={`text-footnote truncate ${activeTab === 'tasks' && emergencyCount > 0 ? 'text-rose-500' : 'text-theme-text-secondary'}`}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          {panel && (
            <IconButton label="管理面板模块" onClick={() => useUIStore.getState().configurePanel(panel.id)}>
              <SlidersHorizontal className="w-[18px] h-[18px]" />
            </IconButton>
          )}
          <IconButton label="专注时钟" onClick={() => useFocusStore.getState().open({ mode: 'pomodoro' })}>
            <Timer className="w-[18px] h-[18px]" />
          </IconButton>
          <IconButton label="通知公告" onClick={() => useUIStore.getState().open('bulletinListOpen')} dot={unread > 0}>
            <Bell className="w-[18px] h-[18px]" />
          </IconButton>
        </div>
      </div>
    </header>
  );
};
