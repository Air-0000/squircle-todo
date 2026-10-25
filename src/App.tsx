import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { useUIStore } from './stores/useUIStore';
import { usePanelStore } from './stores/usePanelStore';
import { AppHeader } from './components/layout/AppHeader';
import { BottomTabBar } from './components/layout/BottomTabBar';
import { ModalHost } from './components/layout/ModalHost';
import { SquircleButton } from './components/ui/SquircleButton';
import { InboxTab } from './components/tabs/InboxTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { ModularPanelView } from './components/panels/ModularPanelView';

const ActiveView: React.FC = () => {
  const activeTab = useUIStore(s => s.activeTab);
  const panel = usePanelStore(s => s.panels.find(p => p.id === activeTab));

  if (activeTab === 'analytics') return <AnalyticsTab />;
  if (activeTab === 'settings') return <SettingsTab />;
  if (panel) return <ModularPanelView panel={panel} />;
  return <InboxTab />;
};

/** Floating "+" above the tab bar; files new tasks into the panel being viewed. */
const AddTaskFab: React.FC = () => {
  const handleClick = () => {
    const { activeTab, openAddTask } = useUIStore.getState();
    const onPanel = usePanelStore.getState().panels.some(p => p.id === activeTab);
    openAddTask({ target: onPanel ? activeTab : 'inbox', period: 'daily' });
  };
  return (
    <div style={{ bottom: 'calc(max(var(--safe-area-inset-bottom, 0px), var(--sab, 0px), 12px) + 68px)' }} className="fixed right-4 z-40">
      <SquircleButton size="fab" variant="filled" icon={<Plus className="w-6 h-6" />} onClick={handleClick} aria-label="添加新待办事件" />
    </div>
  );
};

export const App: React.FC = () => {
  useAppLifecycle();
  const activeTab = useUIStore(s => s.activeTab);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-theme-bg text-theme-text transition-colors duration-300 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 ambient-glow-mesh" aria-hidden="true" />
      <AppHeader />
      <main className="flex-1 px-4 py-3 pb-32 max-w-lg mx-auto w-full">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        >
          <ActiveView />
        </motion.div>
      </main>
      <AddTaskFab />
      <BottomTabBar />
      <ModalHost />
    </div>
  );
};
