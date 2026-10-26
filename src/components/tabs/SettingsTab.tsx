import React from 'react';
import { Bell, Check, FileSpreadsheet, HardDrive, MessageSquare, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { THEME_IDS, THEMES, type ThemeMode, type ToneLock } from '../../constants/themes';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { TEMPLATE_LABELS, type PanelTemplateId } from '../../domain/panels';
import { useThemeStore } from '../../stores/useThemeStore';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUnreadBulletinCount } from '../../stores/useBulletinStore';
import { useFeedbackStore } from '../../stores/useFeedbackStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUpdateStore } from '../../stores/useUpdateStore';
import { toast } from '../../stores/useToastStore';
import { clearAllData, exportCsv } from '../../stores/dataActions';
import { haptic, nativeBridge } from '../../utils/bridge';
import { Badge, Row, RowIcon, Section } from '../ui/List';
import { SegmentedControl, Switch } from '../ui/controls';
import { panelIcon, TEMPLATE_TONES } from '../ui/icons';
import { createPanelAndOpen } from '../modals/AddPanelModal';

const TONE_OPTIONS: { value: ToneLock; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'warm', label: '暖' },
  { value: 'cool', label: '冷' },
];

/** Card background / text / accent for the swatch previews (mirrors index.css). */
const SWATCH: Record<ThemeMode, { bg: string; card: string; text: string }> = {
  'warm-morning': { bg: '#F6F2ED', card: '#FFFFFF', text: '#1C1917' },
  'cool-morning': { bg: '#EEF3F3', card: '#FFFFFF', text: '#0F172A' },
  'warm-evening': { bg: '#12100E', card: '#1F1C19', text: '#F5F2EE' },
  'cool-evening': { bg: '#0A0D13', card: '#161B24', text: '#EEF2F7' },
};

const ThemePicker: React.FC = () => {
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);
  return (
    <div className="grid grid-cols-4 gap-3">
      {THEME_IDS.map(id => {
        const def = THEMES[id];
        const sw = SWATCH[id];
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              haptic('light');
              setTheme(id);
            }}
            aria-pressed={active}
            className="flex flex-col items-center gap-1.5"
          >
            <span
              className={`relative w-full aspect-[3/4] rounded-[12px] p-1.5 flex flex-col gap-1 ring-offset-2 ring-offset-theme-card transition-shadow ${
                active ? 'ring-2 ring-theme-accent' : 'ring-1 ring-theme-border'
              }`}
              style={{ backgroundColor: sw.bg }}
            >
              <span className="h-2 w-3/4 rounded-full" style={{ backgroundColor: sw.text, opacity: 0.8 }} />
              <span className="flex-1 rounded-[6px]" style={{ backgroundColor: sw.card }} />
              <span className="h-2.5 w-2.5 rounded-full self-end" style={{ backgroundColor: def.primaryAccent }} />
              {active && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-theme-accent text-theme-accent-contrast flex items-center justify-center">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={`text-caption ${active ? 'text-theme-text font-semibold' : 'text-theme-text-secondary'}`}>{def.name}</span>
          </button>
        );
      })}
    </div>
  );
};

const QUICK_PANELS: { id: PanelTemplateId; label: string }[] = [
  { id: 'exam', label: '考研攻坚' },
  { id: 'art', label: '绘画创作' },
  { id: 'work', label: '职场工作流' },
];

const PanelsSection: React.FC = () => {
  const panels = usePanelStore(s => s.panels);
  const ui = useUIStore.getState();
  return (
    <Section title="面板" footer="面板会出现在底部标签栏，里面的待办也会汇总到「待办」。">
      {panels.map(panel => (
        <Row
          key={panel.id}
          leading={<RowIcon icon={panelIcon(panel.icon)} className={TEMPLATE_TONES[panel.templateId]} />}
          title={panel.name}
          subtitle={`${TEMPLATE_LABELS[panel.templateId]} · ${panel.enabledModules.length} 个模块`}
          chevron
          onClick={() => ui.configurePanel(panel.id)}
        />
      ))}
      {panels.length === 0 &&
        QUICK_PANELS.map(({ id, label }) => (
          <Row
            key={id}
            leading={<RowIcon icon={panelIcon(id === 'exam' ? 'GraduationCap' : id === 'art' ? 'Palette' : 'Briefcase')} className={TEMPLATE_TONES[id]} />}
            title={`添加${label}`}
            tone="accent"
            onClick={() => createPanelAndOpen(id)}
          />
        ))}
      <Row
        leading={<RowIcon icon={Plus} className="bg-theme-card-subtle text-theme-accent" />}
        title={panels.length === 0 ? '从模板新建…' : '新建面板'}
        tone="accent"
        onClick={() => ui.open('addPanelOpen')}
      />
    </Section>
  );
};

/** Android shell only: opens the update sheet, checking unless an update is already known. */
const UpdateRow: React.FC = () => {
  const phase = useUpdateStore(s => s.phase);
  const hasUpdate = useUpdateStore(s => s.update !== null) && phase !== 'latest';
  if (!nativeBridge.canSelfUpdate()) return null;
  const openSheet = () => {
    useUIStore.getState().open('updateOpen');
    if (!hasUpdate) useUpdateStore.getState().check();
  };
  return (
    <Section>
      <Row
        leading={<RowIcon icon={RefreshCw} className="bg-gray-500 text-white" />}
        title="软件更新"
        value={hasUpdate ? undefined : `v${CURRENT_APP_VERSION.versionName}`}
        trailing={hasUpdate ? <Badge tone="danger">新版本</Badge> : undefined}
        chevron
        onClick={openSheet}
      />
    </Section>
  );
};

export const SettingsTab: React.FC = () => {
  const { autoSwitch, toneLock, setAutoSwitch, setToneLock } = useThemeStore();
  const unread = useUnreadBulletinCount();
  const feedbackCount = useFeedbackStore(s => s.feedbacks.length);
  const refreshRate = nativeBridge.displayRefreshRate();
  const ui = useUIStore.getState();

  const clearAll = () =>
    toast.confirm({
      title: '清空所有数据？',
      message: '待办、专注记录、热力图与勋章会被清空，面板和主题设置会保留。',
      confirmText: '清空',
      danger: true,
      onConfirm: () => {
        clearAllData();
        haptic('heavy');
        toast.success('已清空');
      },
    });

  return (
    <div className="space-y-6">
      <Section title="主题" variant="card">
        <ThemePicker />
      </Section>
      <Section footer={autoSwitch ? '06:00–18:00 使用日间主题，其余时间使用夜间主题。' : '已固定当前主题。'}>
        <Row title="随时间自动切换" trailing={<Switch checked={autoSwitch} onChange={setAutoSwitch} label="随时间自动切换" />} />
        <Row title="色调" trailing={<SegmentedControl size="sm" stretch={false} value={toneLock} onChange={setToneLock} options={TONE_OPTIONS} />} />
      </Section>

      <PanelsSection />

      <Section title="公告与反馈">
        <Row
          leading={<RowIcon icon={Bell} className="bg-rose-500 text-white" />}
          title="通知公告"
          trailing={unread > 0 ? <Badge tone="danger">{unread}</Badge> : undefined}
          chevron
          onClick={() => ui.open('bulletinListOpen')}
        />
        <Row leading={<RowIcon icon={Send} className="bg-sky-500 text-white" />} title="发布公告" chevron onClick={() => ui.open('publishBulletinOpen')} />
        <Row
          leading={<RowIcon icon={MessageSquare} className="bg-emerald-500 text-white" />}
          title="意见反馈"
          value={feedbackCount > 0 ? feedbackCount : undefined}
          chevron
          onClick={() => ui.open('feedbackOpen')}
        />
      </Section>

      <Section title="数据" footer="所有数据只保存在这台设备上。">
        <Row leading={<RowIcon icon={HardDrive} className="bg-blue-500 text-white" />} title="备份与恢复" chevron onClick={() => ui.open('backupOpen')} />
        <Row
          leading={<RowIcon icon={FileSpreadsheet} className="bg-emerald-600 text-white" />}
          title="导出表格 (CSV)"
          onClick={() => {
            haptic('light');
            exportCsv();
          }}
        />
        <Row leading={<RowIcon icon={Trash2} className="bg-rose-500 text-white" />} title="清空所有数据" tone="danger" onClick={clearAll} />
      </Section>

      <UpdateRow />

      <p className="text-center text-caption text-theme-text-muted pb-2">
        Squircle To-Do v{CURRENT_APP_VERSION.versionName}
        {refreshRate ? ` · ${refreshRate}Hz` : ''}
      </p>
    </div>
  );
};
