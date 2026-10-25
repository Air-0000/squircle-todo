import React from 'react';
import { Check, Settings2 } from 'lucide-react';
import { PANEL_MODULES, type PanelModuleType } from '../../domain/panels';
import { usePanel, usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { MODULE_ICONS } from '../ui/icons';
import { Modal } from '../ui/Modal';
import { SquircleButton } from '../ui/SquircleButton';

export const ConfigureModulesModal: React.FC = () => {
  const panelId = useUIStore(s => s.configuringPanelId);
  const panel = usePanel(panelId);
  const close = () => useUIStore.getState().close('configuringPanelId');

  const toggle = (module: PanelModuleType, name: string) => {
    if (!panel) return;
    const wasEnabled = panel.enabledModules.includes(module);
    if (!usePanelStore.getState().toggleModule(panel.id, module)) {
      toast.error('面板至少需保留一个功能模块');
      haptic('error');
      return;
    }
    haptic('light');
    toast.info(`${wasEnabled ? '已关闭' : '已启用'}「${name}」模块`);
  };

  return (
    <Modal
      open={Boolean(panel)}
      onClose={close}
      variant="sheet"
      icon={<Settings2 className="w-4.5 h-4.5" />}
      title={`「${panel?.name ?? ''}」功能模块配置`}
      subtitle="开启或关闭特定功能模块，按需定制专属界面"
      bodyClassName="p-4 space-y-2.5"
      footer={
        <div className="w-full flex justify-end">
          <SquircleButton size="sm" onClick={close}>
            完成配置
          </SquircleButton>
        </div>
      }
    >
      <p className="text-[11px] text-theme-text-secondary leading-relaxed">勾选启用该面板需要展示的功能卡片，随时可增减调整：</p>
      <div className="space-y-2 pt-1">
        {panel &&
          PANEL_MODULES.map(mod => {
            const Icon = MODULE_ICONS[mod.type];
            const enabled = panel.enabledModules.includes(mod.type);
            return (
              <button
                key={mod.type}
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggle(mod.type, mod.name)}
                className={`w-full text-left p-3 rounded-squircle border transition-all flex items-center justify-between ${
                  enabled ? 'bg-theme-accent/10 border-theme-accent/40 shadow-2xs' : 'bg-theme-card hover:bg-theme-card-subtle border-theme-border/60 opacity-70'
                }`}
              >
                <span className="flex items-start gap-2.5 min-w-0 pr-3">
                  <span
                    className={`w-8 h-8 rounded-squircle flex items-center justify-center shrink-0 border ${
                      enabled ? 'bg-theme-accent text-theme-accent-contrast border-theme-accent' : 'bg-theme-card-subtle text-theme-text-muted border-theme-border'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-theme-text">{mod.name}</span>
                      {enabled && <span className="text-[9px] px-1.5 py-px rounded-full bg-theme-accent/20 text-theme-accent font-bold">已启用</span>}
                    </span>
                    <span className="block text-[10px] text-theme-text-secondary mt-0.5 leading-relaxed">{mod.description}</span>
                  </span>
                </span>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                    enabled ? 'bg-theme-accent border-theme-accent text-theme-accent-contrast' : 'border-theme-border bg-theme-card-subtle'
                  }`}
                >
                  {enabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
      </div>
    </Modal>
  );
};
