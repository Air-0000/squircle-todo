import React from 'react';
import { Trash2 } from 'lucide-react';
import { PANEL_MODULES, type PanelModuleType } from '../../domain/panels';
import { usePanel, usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { MODULE_ICONS, MODULE_TONES } from '../ui/icons';
import { Modal } from '../ui/Modal';
import { Row, RowIcon, Section } from '../ui/List';
import { Switch } from '../ui/controls';
import { confirmDeletePanel } from '../panels/ModularPanelView';

export const ConfigureModulesModal: React.FC = () => {
  const panelId = useUIStore(s => s.configuringPanelId);
  const panel = usePanel(panelId);
  const close = () => useUIStore.getState().close('configuringPanelId');

  const toggle = (module: PanelModuleType) => {
    if (!panel) return;
    if (!usePanelStore.getState().toggleModule(panel.id, module)) {
      haptic('error');
      toast.error('面板至少需保留一个模块');
    }
  };

  return (
    <Modal open={Boolean(panel)} onClose={close} cancelLabel={null} title={panel?.name ?? ''} subtitle="模块" primary={{ label: '完成', onClick: close }}>
      {panel && (
        <>
          <Section title="显示的模块" footer="关闭的模块只是隐藏，面板里的待办不受影响。">
            {PANEL_MODULES.map(mod => (
              <Row
                key={mod.type}
                leading={<RowIcon icon={MODULE_ICONS[mod.type]} className={MODULE_TONES[mod.type]} />}
                title={mod.name}
                subtitle={mod.description}
                trailing={<Switch checked={panel.enabledModules.includes(mod.type)} onChange={() => toggle(mod.type)} label={mod.name} />}
              />
            ))}
          </Section>
          <Section>
            <Row
              leading={<RowIcon icon={Trash2} className="bg-rose-500 text-white" />}
              title="删除面板"
              tone="danger"
              onClick={() => {
                close();
                confirmDeletePanel(panel);
              }}
            />
          </Section>
        </>
      )}
    </Modal>
  );
};
