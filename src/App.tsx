import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Plus,
  GraduationCap,
  Palette,
  Briefcase,
  Flame,
  Calendar,
  Settings,
  Bell,
  Clock
} from 'lucide-react';
import { useThemeStore } from './stores/useThemeStore';
import { useThemeScheduler } from './hooks/useThemeScheduler';
import { useBulletinScheduler } from './hooks/useBulletinScheduler';
import { useBulletinStore } from './stores/useBulletinStore';
import { useTaskStore } from './stores/useTaskStore';
import { useFocusStore } from './stores/useFocusStore';
import { TodoItem } from './types';
import { nativeBridge } from './utils/bridge';
import { SquircleButton } from './components/common/SquircleButton';
import { GlobalToast } from './components/common/GlobalToast';
import { ConfirmModal } from './components/common/ConfirmModal';
import { LiquidGlassFlipClockModal } from './components/focus/LiquidGlassFlipClockModal';
import { DynamicIslandCapsule } from './components/focus/DynamicIslandCapsule';

// Layout & Tabs
import { BottomTabBar, MainTabType } from './components/layout/BottomTabBar';
import { UniversalTasksTab } from './components/tabs/UniversalTasksTab';
import { ModularPanelView } from './components/panels/ModularPanelView';
import { ExamTab } from './components/tabs/ExamTab';
import { ArtTab } from './components/tabs/ArtTab';
import { WorkTab } from './components/tabs/WorkTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import { CalendarTab } from './components/tabs/CalendarTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { usePanelStore } from './stores/usePanelStore';
import { FolderPlus } from 'lucide-react';

// Modals
import { SmartAddTaskModal } from './components/modals/SmartAddTaskModal';
import { TaskEditModal } from './components/modals/TaskEditModal';
import { BackupModal } from './components/modals/BackupModal';
import { BulletinModal } from './components/modals/BulletinModal';
import { BulletinListModal } from './components/modals/BulletinListModal';
import { PublishBulletinModal } from './components/modals/PublishBulletinModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { AddPanelModal } from './components/modals/AddPanelModal';
import { ConfigureModulesModal } from './components/modals/ConfigureModulesModal';

export const App: React.FC = () => {
  // Activate automatic theme clock scheduler & announcements
  useThemeScheduler();
  useBulletinScheduler();

  const getEffectiveTheme = useThemeStore(s => s.getEffectiveTheme);
  const updateTask = useTaskStore(s => s.updateTask);
  const deleteTask = useTaskStore(s => s.deleteTask);
  const setActivePersona = useTaskStore(s => s.setActivePersona);
  const checkAndRefreshCycles = useTaskStore(s => s.checkAndRefreshCycles);
  const tick = useFocusStore(s => s.tick);
  const openFocusModal = useFocusStore(s => s.openFocusModal);
  const { openListModal, getUnreadCount } = useBulletinStore();
  const unreadBulletinCount = getUnreadCount();

  // Focus clock & timer ticker (1s interval)
  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(timer);
  }, [tick]);

  // Periodic cycle reset scheduler (e.g. check on mount and every 60s)
  useEffect(() => {
    checkAndRefreshCycles();
    const timer = setInterval(() => {
      checkAndRefreshCycles();
    }, 60000);
    return () => clearInterval(timer);
  }, [checkAndRefreshCycles]);

  const { panels } = usePanelStore();

  // Navigation: base tabs (待办: 'tasks', 成就: 'analytics', 设置: 'settings') + dynamic custom panels
  const [activeTab, setActiveTab] = useState<MainTabType>('tasks');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultAddCategory, setDefaultAddCategory] = useState<'exam' | 'art' | 'daily' | 'weekly' | 'monthly' | 'work' | 'emergency'>('daily');
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const effectiveTheme = getEffectiveTheme();

  const handleTabChange = (newTab: MainTabType) => {
    setActiveTab(newTab);
    const targetPanel = panels.find(p => p.id === newTab);
    if (targetPanel) {
      if (targetPanel.templateId === 'exam') setActivePersona('exam');
      else if (targetPanel.templateId === 'art') setActivePersona('art');
      else if (targetPanel.templateId === 'work') setActivePersona('security');
      else setActivePersona('custom');
    } else if (newTab === 'exam') {
      setActivePersona('exam');
    } else if (newTab === 'art') {
      setActivePersona('art');
    } else if (newTab === 'work') {
      setActivePersona('security');
    } else {
      setActivePersona('general');
    }
  };

  const handleOpenAddForWork = (period: 'daily' | 'weekly' | 'monthly' | 'emergency' = 'daily') => {
    setDefaultAddCategory(period);
    setIsAddModalOpen(true);
  };

  const handleOpenAddForCurrentTab = () => {
    const activePanel = panels.find(p => p.id === activeTab);
    if (activePanel?.templateId === 'exam' || activeTab === 'exam') setDefaultAddCategory('exam');
    else if (activePanel?.templateId === 'art' || activeTab === 'art') setDefaultAddCategory('art');
    else setDefaultAddCategory('daily');
    setIsAddModalOpen(true);
  };

  const handleEditTask = (task: TodoItem) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
    nativeBridge.performHapticFeedback('light');
  };

  const getTabHeaderInfo = (tab: MainTabType) => {
    if (tab === 'tasks') {
      return {
        title: '待办清单',
        subtitle: '灵动待办 · 周期自适应 · 突发响应',
        icon: <CheckCircle2 className="w-4 h-4 text-theme-accent" />
      };
    }
    if (tab === 'analytics') {
      return {
        title: '专注成就',
        subtitle: '连续打卡 · 专注时长 · 勋章沉淀',
        icon: <Flame className="w-4 h-4 text-theme-accent" />
      };
    }
    if (tab === 'settings') {
      return {
        title: '偏好设置',
        subtitle: '外观主题 · 自定义面板 · 数据备份',
        icon: <Settings className="w-4 h-4 text-theme-accent" />
      };
    }
    const foundPanel = panels.find(p => p.id === tab);
    if (foundPanel) {
      return {
        title: foundPanel.name,
        subtitle: foundPanel.description || '自定义功能看板',
        icon: foundPanel.templateId === 'exam' ? <GraduationCap className="w-4 h-4 text-theme-accent" /> :
              foundPanel.templateId === 'art' ? <Palette className="w-4 h-4 text-theme-accent" /> :
              foundPanel.templateId === 'work' ? <Briefcase className="w-4 h-4 text-theme-accent" /> :
              <FolderPlus className="w-4 h-4 text-theme-accent" />
      };
    }
    switch (tab) {
      case 'exam':
        return {
          title: '考研备考',
          subtitle: '核心词汇与冲刺大题',
          icon: <GraduationCap className="w-4 h-4 text-theme-accent" />
        };
      case 'art':
        return {
          title: '绘画创作',
          subtitle: '手绘插画与委托进度',
          icon: <Palette className="w-4 h-4 text-theme-accent" />
        };
      case 'work':
        return {
          title: '工作事务',
          subtitle: '日/周/月周期自适应 · 突发处置',
          icon: <Briefcase className="w-4 h-4 text-theme-accent" />
        };
      case 'calendar':
        return {
          title: '日历视图',
          subtitle: '周期规划与时间轴一览',
          icon: <Calendar className="w-4 h-4 text-theme-accent" />
        };
      default:
        return {
          title: '圆润灵动待办',
          subtitle: '极简 · 流畅 · 周期自适应',
          icon: <CheckCircle2 className="w-4 h-4 text-theme-accent" />
        };
    }
  };

  const currentTabInfo = getTabHeaderInfo(activeTab);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-theme-bg text-theme-text transition-colors duration-300 relative overflow-x-hidden">
      {/* iOS 高能效液态流光背景层 (Zero-GPU Gaussian blur overhead, 60fps locked) */}
      <div className="fixed inset-0 pointer-events-none -z-10 ambient-glow-mesh" aria-hidden="true" />

      {/* 顶部沉浸式导航栏：无缝延展至状态栏底，内容避开刘海与状态栏 (max(sat, 38px)) */}
      <header
        style={{
          paddingTop: 'max(var(--safe-area-inset-top, 0px), var(--sat, 0px), env(safe-area-inset-top, 0px), 38px)',
        }}
        className="px-4 pb-2.5 pt-2 flex items-center justify-between border-b border-white/20 dark:border-white/10 sticky top-0 z-30 bg-theme-bg/95 shadow-2xs transition-colors"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8.5 h-8.5 rounded-squircle bg-theme-accent/15 border border-theme-accent/25 flex items-center justify-center shrink-0 shadow-2xs">
            {currentTabInfo.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-bold tracking-tight text-theme-text leading-tight truncate">
                {currentTabInfo.title}
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-card text-theme-text-secondary border border-white/30 dark:border-white/10 shrink-0 font-medium">
                {effectiveTheme.name}
              </span>
            </div>
            <p className="text-[11px] text-theme-text-secondary truncate mt-0.5">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* 顶部操作区 (精简高雅，无多余调试按钮) */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* 考研极简专注时钟快捷入口 */}
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openFocusModal({ mode: 'pomodoro' });
            }}
            aria-label="打开考研极简专注时钟"
            className="p-1.5 sm:px-2 sm:py-1 rounded-squircle bg-theme-card border border-white/30 dark:border-white/10 text-theme-text text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center space-x-1"
            title="打开考研极简专注翻页时钟"
          >
            <Clock className="w-3.5 h-3.5 text-theme-accent" />
            <span className="text-[10px] hidden sm:inline">专注时钟</span>
          </button>

          {/* 通知公告与更新日志 */}
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openListModal();
            }}
            aria-label="打开通知公告与更新日志"
            className="relative p-1.5 sm:px-2 sm:py-1 rounded-squircle bg-theme-card border border-white/30 dark:border-white/10 text-theme-text text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center space-x-1"
            title="通知公告与更新日志中心"
          >
            <Bell className="w-3.5 h-3.5 text-theme-accent" />
            {unreadBulletinCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-theme-bg animate-pulse" />
            )}
            <span className="text-[10px] hidden sm:inline">公告</span>
          </button>
        </div>
      </header>

      {/* 主视图区域 (根据手绘图五大 Tab 切换，硬件加速 60fps) */}
      <main className="flex-1 px-4 py-3 pb-32 max-w-lg mx-auto w-full">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        >
          {activeTab === 'tasks' && (
            <UniversalTasksTab
              onOpenAddModal={() => {
                setDefaultAddCategory('daily');
                setIsAddModalOpen(true);
              }}
              onEditTask={handleEditTask}
              onNavigateToPanel={(panelId) => setActiveTab(panelId)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
            />
          )}

          {activeTab === 'exam' && (
            <ExamTab
              onOpenAddModal={() => {
                setDefaultAddCategory('exam');
                setIsAddModalOpen(true);
              }}
              onEditTask={handleEditTask}
            />
          )}

          {activeTab === 'art' && (
            <ArtTab
              onOpenAddModal={() => {
                setDefaultAddCategory('art');
                setIsAddModalOpen(true);
              }}
              onEditTask={handleEditTask}
            />
          )}

          {activeTab === 'work' && (
            <WorkTab
              onOpenAddModal={handleOpenAddForWork}
              onEditTask={handleEditTask}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab
              onEditTask={handleEditTask}
              onOpenAddModal={handleOpenAddForCurrentTab}
            />
          )}

          {/* User Custom Modular Panels */}
          {(() => {
            const currentCustomPanel = panels.find(p => p.id === activeTab);
            if (currentCustomPanel) {
              return (
                <ModularPanelView
                  panel={currentCustomPanel}
                  onEditTask={handleEditTask}
                  onOpenAddModal={handleOpenAddForCurrentTab}
                  onNavigateHome={() => setActiveTab('tasks')}
                />
              );
            }
            return null;
          })()}
        </motion.div>
      </main>

      {/* 悬浮圆润「+」新增按钮 (在任意界面常驻于右下角，处于底栏上方，随时支持全局快速添加) */}
      <div 
        style={{
          bottom: 'calc(max(var(--safe-area-inset-bottom, 0px), var(--sab, 0px), 12px) + 68px)'
        }}
        className="fixed right-4 z-40"
      >
        <SquircleButton
          size="fab"
          variant="filled"
          icon={<Plus className="w-6 h-6" />}
          onClick={handleOpenAddForCurrentTab}
          aria-label="添加新待办事件"
        />
      </div>

      {/* 底部导航栏 (严格对照手绘图 1：考研 | 绘画 | 工作 | 日历参考 | 设置) */}
      <BottomTabBar
        activeTab={activeTab}
        onChangeTab={handleTabChange}
      />

      {/* 智能添加事件弹窗 (在任意界面添加均可根据选择的类别自动放入对应页面) */}
      <SmartAddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultCategory={defaultAddCategory}
        onNavigateTab={handleTabChange}
      />

      {/* 任务详情与多维编辑模态框 */}
      <TaskEditModal
        task={editingTask}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
        onSave={(id, updates) => updateTask(id, updates)}
        onDelete={(id) => deleteTask(id)}
      />

      {/* 数据备份与恢复模态框 */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* 自定义面板添加弹窗 */}
      <AddPanelModal onSelectNewPanel={(pid) => setActiveTab(pid)} />

      {/* 模块配置弹窗 */}
      <ConfigureModulesModal />

      {/* 通知公告与更新日志模态框体系 */}
      <BulletinModal />
      <BulletinListModal />
      <PublishBulletinModal />

      {/* 意见与需求反馈直通车模态框 */}
      <FeedbackModal />

      {/* 全局圆润灵动轻量气泡提示 (Toast) */}
      <GlobalToast />

      {/* 全局圆润确认弹窗 (替换系统原生丑陋 confirm) */}
      <ConfirmModal />

      {/* 全屏毛玻璃翻页时钟 & 禅定专注模态框 */}
      <LiquidGlassFlipClockModal />

      {/* 最小化时的顶部灵动发光胶囊 */}
      <DynamicIslandCapsule />
    </div>
  );
};

export default App;
