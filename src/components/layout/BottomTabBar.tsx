import React from 'react';
import { CircleCheckBig, Settings, Trophy } from 'lucide-react';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { panelIcon } from '../ui/icons';
import { haptic } from '../../utils/bridge';

/** Docked tab bar: 待办, the user's panels, 成就, 设置. */
export const BottomTabBar: React.FC = () => {
  const panels = usePanelStore(s => s.panels);
  const activeTab = useUIStore(s => s.activeTab);
  const setActiveTab = useUIStore(s => s.setActiveTab);

  const tabs = [
    { id: 'tasks', label: '待办', icon: CircleCheckBig },
    ...panels.map(p => ({ id: p.id, label: p.name, icon: panelIcon(p.icon) })),
    { id: 'analytics', label: '成就', icon: Trophy },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <nav
      style={{ paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), var(--sab, 0px), env(safe-area-inset-bottom, 0px), 8px)' }}
      className="fixed bottom-0 inset-x-0 z-40 bar-material border-t border-theme-border"
      aria-label="主导航"
    >
      <div className="max-w-lg mx-auto flex overflow-x-auto no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (!active) haptic('light');
                setActiveTab(id);
              }}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-w-[64px] h-[50px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-theme-accent' : 'text-theme-text-muted'
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none max-w-[60px] truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
