import React from 'react';
import {
  Bell,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  HardDrive,
  Layers,
  List,
  MessageSquarePlus,
  Moon,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  Settings2,
  Sun,
  Trash2,
} from 'lucide-react';
import { THEME_IDS, THEMES, type ToneLock } from '../../constants/themes';
import { PANEL_MODULES, type PanelTemplateId } from '../../domain/panels';
import { useThemeDefinition, useThemeStore } from '../../stores/useThemeStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useBulletinStore, useUnreadBulletinCount } from '../../stores/useBulletinStore';
import { useFeedbackStore } from '../../stores/useFeedbackStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { clearAllData, exportCsv } from '../../stores/dataActions';
import { haptic, nativeBridge } from '../../utils/bridge';
import { ModuleCard } from '../ui/ModuleCard';
import { PillTag } from '../ui/PillTag';
import { SegmentedControl, Switch } from '../ui/controls';
import { panelIcon } from '../ui/icons';
import { confirmDeletePanel } from '../panels/ModularPanelView';
import { createPanelAndOpen } from '../modals/AddPanelModal';

const TONE_OPTIONS: { value: ToneLock; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'warm', label: '偏暖' },
  { value: 'cool', label: '偏冷' },
];

const QUICK_PANELS: { id: PanelTemplateId; label: string }[] = [
  { id: 'exam', label: '启用考研攻坚面板' },
  { id: 'art', label: '启用绘画创作面板' },
  { id: 'work', label: '启用职场工作流面板' },
];

const secondaryButton =
  'py-2 px-3 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/80 text-xs font-semibold text-theme-text hover:border-theme-accent flex items-center justify-center gap-1.5 transition-colors';
const primaryButton =
  'py-1.5 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 flex items-center justify-center gap-1 transition-all';

const ThemeSection: React.FC = () => {
  const { theme, autoSwitch, toneLock, setTheme, setAutoSwitch, setToneLock } = useThemeStore();
  const current = useThemeDefinition();
  return (
    <ModuleCard icon={Sun} title="冷暖早晚四套主题体系" actions={<PillTag size="sm" variant="tonal" label={current.name} />}>
      <div className="grid grid-cols-2 gap-2">
        {THEME_IDS.map(id => {
          const def = THEMES[id];
          const Icon = def.timeOfDay === 'morning' ? Sun : Moon;
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => {
                haptic('light');
                setTheme(id);
              }}
              aria-pressed={active}
              className={`p-2.5 rounded-squircle text-xs flex items-center justify-between border transition-all text-left ${
                active
                  ? 'border-theme-accent bg-theme-accent-subtle text-theme-accent font-semibold shadow-sm'
                  : 'border-theme-border/60 bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: def.primaryAccent }}>
                  <Icon className="w-2.5 h-2.5 text-white" />
                </span>
                <span className="truncate">
                  <span className="block text-xs leading-tight">{def.name}</span>
                  <span className="block text-[10px] opacity-75 font-normal">
                    {def.tone === 'warm' ? '暖色调' : '冷色调'} · {def.timeOfDay === 'morning' ? '晨' : '暮'}
                  </span>
                </span>
              </span>
              {active && <span className="w-2 h-2 rounded-full bg-theme-accent shrink-0 ml-1" />}
            </button>
          );
        })}
      </div>
      <div className="pt-2 border-t border-theme-border/40 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-theme-text">
            <Clock className="w-3.5 h-3.5 text-theme-accent" />
            <span>按系统时间自动切换早晚 (06:00/18:00)</span>
          </span>
          <Switch checked={autoSwitch} onChange={setAutoSwitch} label="按系统时间自动切换早晚" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-theme-text-secondary">冷暖偏好全局锁定</span>
          <SegmentedControl size="xs" value={toneLock} onChange={setToneLock} options={TONE_OPTIONS} />
        </div>
      </div>
    </ModuleCard>
  );
};

const PanelsSection: React.FC = () => {
  const panels = usePanelStore(s => s.panels);
  const ui = useUIStore.getState();
  return (
    <ModuleCard
      icon={Layers}
      title={
        <span className="flex items-center gap-1.5">
          <span>自定义功能面板与特定模块</span>
          <PillTag variant="accent" size="sm" label={`${panels.length} 个面板`} />
        </span>
      }
      subtitle="考研、绘画、工作流等已转为自由添加模板，可按需启用或移除"
      actions={
        <button
          onClick={() => {
            haptic('light');
            ui.open('addPanelOpen');
          }}
          className={primaryButton}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加面板</span>
        </button>
      }
    >
      {panels.length === 0 ? (
        <div className="p-3.5 rounded-squircle bg-theme-bg/60 border border-dashed border-theme-border text-center space-y-2">
          <p className="text-xs text-theme-text-muted">当前仅保留基础通用待办、成就与设置。</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {QUICK_PANELS.map(({ id, label }) => {
              const Icon = panelIcon(id === 'exam' ? 'GraduationCap' : id === 'art' ? 'Palette' : 'Briefcase');
              return (
                <button
                  key={id}
                  onClick={() => createPanelAndOpen(id)}
                  className="px-2 py-1 rounded-squircle bg-theme-accent/10 hover:bg-theme-accent/20 text-theme-accent text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  <span>+ {label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {panels.map(panel => (
            <div
              key={panel.id}
              className="flex items-center justify-between p-2.5 rounded-squircle bg-theme-bg/60 border border-theme-border/60 hover:border-theme-border transition-colors"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-theme-text">{panel.name}</span>
                  <span className="text-[10px] text-theme-text-muted px-1.5 py-0.5 rounded-full bg-theme-card border border-theme-border">
                    {panel.enabledModules.length} 个功能模块
                  </span>
                </div>
                <p className="text-[11px] text-theme-text-secondary truncate mt-0.5">
                  {panel.enabledModules.map(m => PANEL_MODULES.find(pm => pm.type === m)?.name ?? m).join('、')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    haptic('light');
                    ui.configurePanel(panel.id);
                  }}
                  className="p-1.5 rounded-squircle hover:bg-theme-accent/15 text-theme-accent transition-colors"
                  title="配置此面板功能模块"
                  aria-label="配置此面板功能模块"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => confirmDeletePanel(panel)}
                  className="p-1.5 rounded-squircle hover:bg-rose-500/15 text-theme-text-muted hover:text-rose-500 transition-colors"
                  title="删除面板"
                  aria-label="删除面板"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModuleCard>
  );
};

const BulletinSection: React.FC = () => {
  const bulletins = useBulletinStore(s => s.bulletins);
  const unread = useUnreadBulletinCount();
  const latest = bulletins[0];
  const ui = useUIStore.getState();
  const openPublish = () => {
    haptic('light');
    ui.open('publishBulletinOpen');
  };
  return (
    <ModuleCard
      icon={Bell}
      title={
        <span className="flex items-center gap-1.5">
          <span>通知公告与更新日志中心</span>
          {unread > 0 ? (
            <span className="text-[10px] px-1.5 py-px rounded-full bg-rose-500 text-white font-bold">{unread} 条未读</span>
          ) : (
            <span className="text-[10px] px-1.5 py-px rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">已读</span>
          )}
        </span>
      }
      subtitle="版本特性日志 · 随时发布新公告"
      actions={
        <button
          onClick={openPublish}
          title="发布新公告"
          className="py-1 px-2.5 rounded-squircle bg-theme-accent/15 hover:bg-theme-accent/25 border border-theme-accent/30 text-theme-accent text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>发公告</span>
        </button>
      }
    >
      {latest && (
        <button
          onClick={() => {
            haptic('light');
            useBulletinStore.getState().markRead(latest.id);
            ui.showBulletin(latest.id);
          }}
          className="w-full text-left p-2.5 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/70 transition-all flex items-center justify-between group"
        >
          <span className="min-w-0 pr-2">
            <span className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] px-1.5 py-px rounded-full bg-theme-accent/15 text-theme-accent font-bold">
                {latest.category === 'update_log' ? '更新日志' : '最新公告'}
              </span>
              <span className="text-[10px] text-theme-text-muted font-mono">{latest.publishedAt}</span>
            </span>
            <span className="block text-xs font-bold text-theme-text truncate group-hover:text-theme-accent transition-colors">{latest.title}</span>
            <span className="block text-[10px] text-theme-text-secondary truncate mt-0.5">{latest.summary}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-theme-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            haptic('light');
            ui.open('bulletinListOpen');
          }}
          className={secondaryButton}
        >
          <List className="w-3.5 h-3.5 text-theme-accent" />
          <span>查看全部公告 ({bulletins.length})</span>
        </button>
        <button onClick={openPublish} className={primaryButton}>
          <Plus className="w-3.5 h-3.5" />
          <span>发布新公告/日志</span>
        </button>
      </div>
    </ModuleCard>
  );
};

const DataSection: React.FC = () => {
  const ui = useUIStore.getState();
  const reset = () =>
    toast.confirm({
      title: '彻底清理全部数据？',
      message: '此操作将完全清空所有待办任务、专注记录、连续打卡热力图与勋章，恢复纯净空白状态（自定义面板与主题设置会保留），请确认！',
      confirmText: '确认彻底清空',
      danger: true,
      onConfirm: () => {
        clearAllData();
        haptic('heavy');
        toast.success('已彻底清空全部数据，恢复纯净空白状态！');
      },
    });
  return (
    <ModuleCard icon={HardDrive} title="本地离线数据存储与导出" actions={<span className="text-[10px] text-theme-text-muted">双层持久化</span>}>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => ui.open('backupOpen')} className={secondaryButton}>
          <HardDrive className="w-3.5 h-3.5 text-theme-accent" />
          <span>备份与恢复 (JSON)</span>
        </button>
        <button
          onClick={() => {
            haptic('light');
            exportCsv();
          }}
          className={secondaryButton}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          <span>导出表格 (Excel CSV)</span>
        </button>
      </div>
      <button
        onClick={reset}
        className="w-full py-2.5 px-3 rounded-squircle text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 hover:border-rose-500/40 transition-all flex items-center justify-center gap-1.5"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>彻底清理数据（恢复纯净空白 · 无预存）</span>
      </button>
    </ModuleCard>
  );
};

export const SettingsTab: React.FC = () => {
  const feedbackCount = useFeedbackStore(s => s.feedbacks.length);
  const refreshRate = nativeBridge.displayRefreshRate();

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <SettingsIcon className="w-4 h-4 text-theme-accent" />
          <h2 className="text-xs font-bold text-theme-text uppercase tracking-wider">偏好与系统设置</h2>
        </div>
        {refreshRate && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
            ⚡ 屏幕刷新率 {refreshRate}Hz
          </span>
        )}
      </div>

      <ThemeSection />
      <PanelsSection />
      <BulletinSection />

      <ModuleCard
        icon={MessageSquarePlus}
        iconTone="bg-emerald-500/15 border-emerald-500/25 text-emerald-500"
        title="意见与需求反馈"
        subtitle="记录改进建议与缺陷，可再到 GitHub Issues 反馈给开发者"
        actions={
          <button
            onClick={() => {
              haptic('light');
              useUIStore.getState().open('feedbackOpen');
            }}
            className={primaryButton}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>我要反馈{feedbackCount > 0 ? ` (${feedbackCount})` : ''}</span>
          </button>
        }
      />

      <DataSection />
    </div>
  );
};
