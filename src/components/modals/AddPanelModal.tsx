import React, { useState } from 'react';
import { Check, FolderPlus } from 'lucide-react';
import { getPanelTemplate, PANEL_TEMPLATES, type PanelTemplateId } from '../../domain/panels';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { panelIcon } from '../ui/icons';
import { Modal } from '../ui/Modal';
import { SquircleButton } from '../ui/SquircleButton';

const defaultName = (id: PanelTemplateId) => (id === 'blank' ? '' : getPanelTemplate(id).name.replace('模板', ''));

/** Creates a panel, switches to it and closes the sheet. */
export function createPanelAndOpen(templateId: PanelTemplateId, name?: string): void {
  const panel = usePanelStore.getState().addPanel(templateId, name);
  const ui = useUIStore.getState();
  ui.close('addPanelOpen');
  ui.setActiveTab(panel.id);
  haptic('success');
  toast.success(`🎉 已成功创建「${panel.name}」面板！可在底栏与顶部直接切换`);
}

const AddPanelForm: React.FC = () => {
  const [templateId, setTemplateId] = useState<PanelTemplateId>('exam');
  const [name, setName] = useState(defaultName('exam'));

  const select = (id: PanelTemplateId) => {
    // Follow the template's default name unless the user typed their own.
    if (!name || name === defaultName(templateId)) setName(defaultName(id));
    setTemplateId(id);
    haptic('light');
  };

  return (
    <form
      id="add-panel-form"
      onSubmit={e => {
        e.preventDefault();
        createPanelAndOpen(templateId, name);
      }}
      className="space-y-3.5"
    >
      <div>
        <span className="text-[11px] font-bold text-theme-text block mb-1.5">选择面板模板</span>
        <div className="space-y-2" role="radiogroup">
          {PANEL_TEMPLATES.map(tmpl => {
            const Icon = panelIcon(tmpl.icon);
            const selected = templateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => select(tmpl.id)}
                className={`w-full text-left p-3 rounded-squircle border transition-all flex items-start gap-2.5 ${
                  selected ? 'bg-theme-accent/10 border-theme-accent/40' : 'bg-theme-card hover:bg-theme-card-subtle border-theme-border/70'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-squircle flex items-center justify-center shrink-0 border ${
                    selected ? 'bg-theme-accent text-theme-accent-contrast border-theme-accent' : 'bg-theme-card-subtle text-theme-text border-theme-border/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between">
                    <span className="font-bold text-xs text-theme-text">{tmpl.name}</span>
                    {selected && <span className="text-[10px] px-1.5 py-px rounded-full bg-theme-accent text-theme-accent-contrast font-bold">已选</span>}
                  </span>
                  <span className="block text-[10px] text-theme-text-secondary mt-0.5 line-clamp-1">{tmpl.tagline}</span>
                  <span className="block text-[10px] text-theme-text-muted mt-1 leading-relaxed">{tmpl.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <label className="block">
        <span className="text-[11px] font-bold text-theme-text block mb-1.5">自定义面板名称</span>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={defaultName(templateId) || '我的自定义看板'}
          className="w-full bg-theme-card px-3 py-2 rounded-squircle border border-theme-border text-xs text-theme-text focus:outline-none focus:border-theme-accent font-semibold"
        />
      </label>
    </form>
  );
};

export const AddPanelModal: React.FC = () => {
  const open = useUIStore(s => s.addPanelOpen);
  const close = () => useUIStore.getState().close('addPanelOpen');
  return (
    <Modal
      open={open}
      onClose={close}
      variant="sheet"
      icon={<FolderPlus className="w-4.5 h-4.5" />}
      title="添加自定义面板"
      subtitle="从模板一键生成或自由组合特定功能模块"
      footer={
        <div className="w-full flex items-center justify-end gap-2">
          <SquircleButton size="sm" variant="tonal" onClick={close}>
            取消
          </SquircleButton>
          <SquircleButton size="sm" type="submit" form="add-panel-form" haptic={false} icon={<Check className="w-3.5 h-3.5" />}>
            立即创建面板
          </SquircleButton>
        </div>
      }
    >
      <AddPanelForm />
    </Modal>
  );
};
