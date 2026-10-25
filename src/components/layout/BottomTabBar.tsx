import React from 'react';
import { CheckCircle2, Flame, Settings } from 'lucide-react';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { panelIcon } from '../ui/icons';
import { haptic } from '../../utils/bridge';

/** Fixed tabs (待办, 成就, 设置) with the user's panels in between. */
export const BottomTabBar: React.FC = () => {
  const panels = usePanelStore(s => s.panels);
  const activeTab = useUIStore(s => s.activeTab);
  const setActiveTab = useUIStore(s => s.setActiveTab);

  const tabs = [
    { id: 'tasks', label: '待办', icon: CheckCircle2 },
    ...panels.map(p => ({ id: p.id, label: p.name.length > 4 ? `${p.name.slice(0, 3)}…` : p.name, icon: panelIcon(p.icon) })),
    { id: 'analytics', label: '成就', icon: Flame },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <nav
      style={{ bottom: 'max(var(--safe-area-inset-bottom, 0px), var(--sab, 0px), env(safe-area-inset-bottom, 0px), 12px)' }}
      className="fixed inset-x-3 z-40 max-w-md mx-auto rounded-squircle-xl bg-theme-bg/95 dark:bg-theme-bg/92 border border-white/35 dark:border-white/10 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.35)] overflow-hidden"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent" />
      <div className="px-2 py-1.5 flex items-center justify-between overflow-x-auto no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                haptic('light');
                setActiveTab(id);
              }}
              aria-current={active ? 'page' : undefined}
              className={`relative flex-1 min-w-[54px] py-1.5 px-1 rounded-squircle flex flex-col items-center justify-center transition-all active:scale-95 ${
                active
                  ? 'text-theme-accent font-bold bg-theme-accent/15 border border-theme-accent/25 shadow-2xs'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[10px] leading-none tracking-tight truncate max-w-[52px]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
