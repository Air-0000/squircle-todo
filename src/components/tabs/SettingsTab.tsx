import React from 'react';
import { 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Clock, 
  HardDrive, 
  FileSpreadsheet, 
  RotateCcw, 
  Layout,
  Bell,
  ChevronRight,
  List,
  Plus,
  MessageSquarePlus
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { PillTag } from '../common/PillTag';
import { useThemeStore } from '../../stores/useThemeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { useBulletinStore } from '../../stores/useBulletinStore';
import { useFeedbackStore } from '../../stores/useFeedbackStore';
import { THEMES } from '../../constants/themes';
import { ThemeMode, ToneLock } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { toast } from '../../stores/useToastStore';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'warm-morning', label: '晨曦暖阳', icon: Sun },
  { id: 'cool-morning', label: '冰川清晨', icon: Sun },
  { id: 'warm-evening', label: '暮色暗金', icon: Moon },
  { id: 'cool-evening', label: '深海极夜', icon: Moon },
];

interface SettingsTabProps {
  onOpenBackupModal: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onOpenBackupModal }) => {
  const { theme, autoSwitch, toneLock, setTheme, setAutoSwitch, setToneLock, getEffectiveTheme } = useThemeStore();
  const { 
    bulletins, 
    openListModal, 
    openPublishModal, 
    openDetail, 
    getUnreadCount 
  } = useBulletinStore();
  const unreadBulletinCount = getUnreadCount();
  const latestBulletin = bulletins[0] || null;
  const { openFeedbackModal, feedbacks } = useFeedbackStore();
  const { 
    showExamCountdown, 
    setShowExamCountdown, 
    showDailyWork,
    setShowDailyWork,
    showWeeklyWork,
    setShowWeeklyWork,
    showMonthlyWork,
    setShowMonthlyWork,
    showEmergencyWork,
    setShowEmergencyWork
  } = useSettingsStore();

  const { exportCSV, resetAllData } = useTaskStore();

  const effectiveTheme = getEffectiveTheme();

  const handleExportCSV = () => {
    nativeBridge.performHapticFeedback('light');
    exportCSV();
  };

  const handleReset = () => {
    toast.confirm({
      title: '彻底清理全部数据？',
      message: '此操作将完全清空所有待办任务、专注记录、连续打卡热力图与勋章，恢复纯净空白状态（不保留任何预存数据），请确认！',
      confirmText: '确认彻底清空',
      cancelText: '取消',
      danger: true,
      onConfirm: () => {
        resetAllData({ seedDefaults: false });
        useFocusStore.getState().resetFocusData();
        nativeBridge.performHapticFeedback('heavy');
        toast.success('已彻底清空全部数据，恢复纯净空白状态！');
      },
    });
  };

  const refreshRate = nativeBridge.getDisplayRefreshRate();

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-1.5">
          <SettingsIcon className="w-4 h-4 text-theme-accent" />
          <h2 className="text-xs font-bold text-theme-text uppercase tracking-wider">
            偏好与系统设置
          </h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25 flex items-center space-x-1">
          <span>⚡ {refreshRate}Hz 高刷已锁定</span>
        </span>
      </div>

      {/* 1. 冷暖早晚四套主题体系 */}
      <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 text-theme-accent" />
            <h3 className="text-xs font-bold text-theme-text">冷暖早晚四套主题体系</h3>
          </div>
          <PillTag size="sm" variant="tonal" label={effectiveTheme.name} />
        </div>

        {/* 4 Theme Grid */}
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map(t => {
            const Icon = t.icon;
            const isCurrent = theme === t.id;
            const def = THEMES[t.id];
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  nativeBridge.performHapticFeedback('light');
                }}
                className={`p-2.5 rounded-squircle text-xs flex items-center justify-between border transition-all text-left ${
                  isCurrent
                    ? 'border-theme-accent bg-theme-accent-subtle text-theme-accent font-semibold shadow-sm'
                    : 'border-theme-border/60 bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" 
                    style={{ backgroundColor: def.primaryAccent }}
                  >
                    <Icon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs leading-tight">{t.label}</div>
                    <div className="text-[10px] opacity-75 font-normal">
                      {def.tone === 'warm' ? '暖色调' : '冷色调'} · {def.timeOfDay === 'morning' ? '晨' : '暮'}
                    </div>
                  </div>
                </div>
                {isCurrent && <span className="w-2 h-2 rounded-full bg-theme-accent shrink-0 ml-1"></span>}
              </button>
            );
          })}
        </div>

        {/* Theme Timing & Tone Lock */}
        <div className="pt-2 border-t border-theme-border/40 space-y-2 text-xs">
          {/* Auto Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-theme-text">
              <Clock className="w-3.5 h-3.5 text-theme-accent" />
              <span>按系统时间自动切换早晚 (06:00/18:00)</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSwitch}
              onClick={() => setAutoSwitch(!autoSwitch)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                autoSwitch ? 'bg-theme-accent' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out my-0.5 ${
                  autoSwitch ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Tone Lock */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-theme-text-secondary">冷暖偏好全局锁定</span>
            <div className="inline-flex rounded-squircle bg-theme-card-subtle p-0.5 border border-theme-border/60">
              {(['auto', 'warm', 'cool'] as ToneLock[]).map(lock => {
                const isSelected = toneLock === lock;
                const label = lock === 'auto' ? '自动' : lock === 'warm' ? '偏暖' : '偏冷';
                return (
                  <button
                    key={lock}
                    onClick={() => setToneLock(lock)}
                    className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                      isSelected 
                        ? 'bg-theme-accent text-theme-accent-contrast font-medium shadow-sm' 
                        : 'text-theme-text-secondary hover:text-theme-text'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SquircleCard>

      {/* 2. 界面卡片自定义显示 (解决“固定卡片无法删除移动”问题) */}
      <SquircleCard elevation={1} radius="md" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Layout className="w-3.5 h-3.5 text-theme-accent" />
            <h3 className="text-xs font-bold text-theme-text">界面卡片自定义与显隐控制</h3>
          </div>
          <span className="text-[10px] text-theme-text-muted">自由隐藏不需要的模块</span>
        </div>

        <div className="space-y-2 text-xs pt-1">
          <label className="flex items-center justify-between cursor-pointer py-1 border-b border-theme-border/40">
            <span className="text-theme-text">显示考研倒计时卡片</span>
            <input
              type="checkbox"
              checked={showExamCountdown}
              onChange={e => setShowExamCountdown(e.target.checked)}
              className="accent-theme-accent w-4 h-4 rounded"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer py-1 border-b border-theme-border/40">
            <span className="text-theme-text">显示工作 - 日常栏目</span>
            <input
              type="checkbox"
              checked={showDailyWork}
              onChange={e => setShowDailyWork(e.target.checked)}
              className="accent-theme-accent w-4 h-4 rounded"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer py-1 border-b border-theme-border/40">
            <span className="text-theme-text">显示工作 - 周常栏目</span>
            <input
              type="checkbox"
              checked={showWeeklyWork}
              onChange={e => setShowWeeklyWork(e.target.checked)}
              className="accent-theme-accent w-4 h-4 rounded"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer py-1 border-b border-theme-border/40">
            <span className="text-theme-text flex items-center space-x-1">
              <span>显示工作 - 🚨 突发事件栏目</span>
            </span>
            <input
              type="checkbox"
              checked={showEmergencyWork}
              onChange={e => setShowEmergencyWork(e.target.checked)}
              className="accent-theme-accent w-4 h-4 rounded"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-theme-text">显示工作 - 月常栏目</span>
            <input
              type="checkbox"
              checked={showMonthlyWork}
              onChange={e => setShowMonthlyWork(e.target.checked)}
              className="accent-theme-accent w-4 h-4 rounded"
            />
          </label>
        </div>
      </SquircleCard>

      {/* 3. 通知公告与更新日志中心 */}
      <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-squircle bg-theme-accent/15 border border-theme-accent/25 flex items-center justify-center text-theme-accent shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-bold text-theme-text">通知公告与更新日志中心</h3>
                {unreadBulletinCount > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                    {unreadBulletinCount} 条未读
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                    已读
                  </span>
                )}
              </div>
              <p className="text-[10px] text-theme-text-muted mt-0.5">
                版本特性日志 · 随时发布新公告
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openPublishModal();
            }}
            className="py-1 px-2.5 rounded-squircle bg-theme-accent/15 hover:bg-theme-accent/25 border border-theme-accent/30 text-theme-accent text-xs font-bold flex items-center space-x-1 transition-colors shrink-0"
            title="发布新公告"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>发公告</span>
          </button>
        </div>

        {/* Latest announcement snippet */}
        {latestBulletin && (
          <div 
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openDetail(latestBulletin);
            }}
            className="p-2.5 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/70 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <span className="text-[9px] px-1.5 py-0.1 rounded-full bg-theme-accent/15 text-theme-accent font-bold">
                  {latestBulletin.category === 'update_log' ? '更新日志' : '最新公告'}
                </span>
                <span className="text-[10px] text-theme-text-muted font-mono">{latestBulletin.publishedAt}</span>
              </div>
              <h4 className="text-xs font-bold text-theme-text truncate group-hover:text-theme-accent transition-colors">
                {latestBulletin.title}
              </h4>
              <p className="text-[10px] text-theme-text-secondary truncate mt-0.5">
                {latestBulletin.summary}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-theme-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openListModal();
            }}
            className="py-2 px-3 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/80 text-xs font-semibold text-theme-text hover:border-theme-accent flex items-center justify-center space-x-1.5 transition-colors"
          >
            <List className="w-3.5 h-3.5 text-theme-accent" />
            <span>查看全部公告 ({bulletins.length})</span>
          </button>
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openPublishModal();
            }}
            className="py-2 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 flex items-center justify-center space-x-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>发布新公告/日志</span>
          </button>
        </div>
      </SquircleCard>

      {/* 4. 意见与需求反馈直通车 */}
      <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-squircle bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-bold text-theme-text">意见与需求反馈直通车</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                  直达开发者
                </span>
              </div>
              <p className="text-[10px] text-theme-text-muted mt-0.5">
                随时提交改进建议与缺陷，开发者将直接根据反馈更新后续版本
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('light');
              openFeedbackModal();
            }}
            className="py-1.5 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 flex items-center space-x-1 transition-all shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>我要反馈{feedbacks.length > 0 ? ` (${feedbacks.length})` : ''}</span>
          </button>
        </div>
      </SquircleCard>

      {/* 4. 本地离线数据存储与导出 */}
      <SquircleCard elevation={1} radius="md" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <HardDrive className="w-3.5 h-3.5 text-theme-accent" />
            <h3 className="text-xs font-bold text-theme-text">本地离线数据存储与导出</h3>
          </div>
          <span className="text-[10px] text-theme-text-muted">双层持久化</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onOpenBackupModal}
            className="p-2.5 rounded-squircle bg-theme-card-subtle border border-theme-border/80 text-xs text-theme-text hover:border-theme-accent flex items-center justify-center space-x-1.5"
          >
            <HardDrive className="w-3.5 h-3.5 text-theme-accent" />
            <span>备份与恢复 (JSON)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="p-2.5 rounded-squircle bg-theme-card-subtle border border-theme-border/80 text-xs text-theme-text hover:border-theme-accent flex items-center justify-center space-x-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>导出表格 (Excel CSV)</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={handleReset}
            className="w-full py-2.5 px-3 rounded-squircle text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 hover:border-rose-500/40 transition-all flex items-center justify-center space-x-1.5 active:scale-98"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>彻底清理数据（恢复纯净空白 · 无预存）</span>
          </button>
        </div>
      </SquircleCard>
    </div>
  );
};
