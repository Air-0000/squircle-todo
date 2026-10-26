import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { getPanelTemplate, PANEL_TEMPLATES, type PanelTemplateId } from '../../domain/panels';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { panelIcon, TEMPLATE_TONES } from '../ui/icons';
import { Modal } from '../ui/Modal';
import { Row, RowIcon, Section } from '../ui/List';

const FORM_ID = 'add-panel-form';

const defaultName = (id: PanelTemplateId) => (id === 'blank' ? '' : getPanelTemplate(id).name.replace('模板', ''));

/** Creates a panel, switches to it and closes the sheet. */
export function createPanelAndOpen(templateId: PanelTemplateId, name?: string): void {
  const panel = usePanelStore.getState().addPanel(templateId, name);
  const ui = useUIStore.getState();
  ui.close('addPanelOpen');
  ui.setActiveTab(panel.id);
  haptic('success');
  toast.success(`已创建「${panel.name}」`);
}

const AddPanelForm: React.FC = () => {
  const [templateId, setTemplateId] = useState<PanelTemplateId>('exam');
  const [name, setName] = useState(defaultName('exam'));
  const template = getPanelTemplate(templateId);

  const select = (id: PanelTemplateId) => {
    // Follow the template's default name unless the user typed their own.
    if (!name || name === defaultName(templateId)) setName(defaultName(id));
    setTemplateId(id);
    haptic('light');
  };

  return (
    <form
      id={FORM_ID}
      onSubmit={e => {
        e.preventDefault();
        createPanelAndOpen(templateId, name);
      }}
      className="space-y-6"
    >
      <Section title="名称">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={defaultName(templateId) || '我的面板'}
          className="w-full h-12 px-4 bg-transparent text-body text-theme-text placeholder:text-theme-text-muted outline-none"
        />
      </Section>

      <Section title="模板" footer={template.description}>
        {PANEL_TEMPLATES.map(tmpl => (
          <Row
            key={tmpl.id}
            leading={<RowIcon icon={panelIcon(tmpl.icon)} className={TEMPLATE_TONES[tmpl.id]} />}
            title={tmpl.name.replace('模板', '')}
            subtitle={tmpl.tagline}
            onClick={() => select(tmpl.id)}
            trailing={templateId === tmpl.id ? <Check className="w-5 h-5 text-theme-accent shrink-0" /> : <span className="w-5 shrink-0" />}
          />
        ))}
      </Section>
    </form>
  );
};

export const AddPanelModal: React.FC = () => {
  const open = useUIStore(s => s.addPanelOpen);
  const close = () => useUIStore.getState().close('addPanelOpen');
  return (
    <Modal open={open} onClose={close} title="新建面板" primary={{ label: '创建', form: FORM_ID }}>
      <AddPanelForm />
    </Modal>
  );
};
