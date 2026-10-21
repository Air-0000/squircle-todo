import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  GraduationCap, 
  Palette, 
  Briefcase, 
  Calendar, 
  FolderPlus, 
  Check
} from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';
import { usePanelStore, PANEL_TEMPLATES, PanelTemplate } from '../../stores/usePanelStore';
import { nativeBridge } from '../../utils/bridge';

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Palette,
  Briefcase,
  Calendar,
  FolderPlus,
};

interface AddPanelModalProps {
  onSelectNewPanel?: (panelId: string) => void;
}

export const AddPanelModal: React.FC<AddPanelModalProps> = ({ onSelectNewPanel }) => {
  const { isAddPanelModalOpen, closeAddPanelModal, addPanelFromTemplate, addCustomPanel } = usePanelStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<PanelTemplate['id']>('exam');
  const [customName, setCustomName] = useState('');

  if (!isAddPanelModalOpen) return null;

  const currentTmpl = PANEL_TEMPLATES.find(t => t.id === selectedTemplateId) || PANEL_TEMPLATES[0];

  const handleCreate = () => {
    nativeBridge.performHapticFeedback('medium');
    let created;
    if (selectedTemplateId === 'blank') {
      created = addCustomPanel({
        name: customName.trim() || '我的自定义看板',
        icon: 'FolderPlus',
        description: '完全由我定制的专属工作流模块',
        templateId: 'blank',
        enabledModules: ['tasklist', 'pomodoro'],
      });
    } else {
      created = addPanelFromTemplate(selectedTemplateId, customName.trim() || undefined);
    }

    if (created && onSelectNewPanel) {
      onSelectNewPanel(created.id);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={SPRING_PHYSICS.defaultCard}
          className="w-full max-w-md bg-theme-bg/95 backdrop-blur-2xl rounded-t-squircle-xl sm:rounded-squircle-xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Grabber Bar */}
          <div className="w-10 h-1 rounded-full bg-theme-text-muted/30 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

          {/* Modal Header */}
          <div className="p-4 border-b border-theme-border/60 flex items-center justify-between shrink-0 bg-theme-card/70 backdrop-blur-xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-squircle bg-theme-accent/20 border border-theme-accent/30 flex items-center justify-center text-theme-accent shadow-sm">
                <FolderPlus className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-theme-text leading-tight">添加自定义面板</h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">
                  从模板一键生成或自由组合特定功能模块
                </p>
              </div>
            </div>

            <button
              onClick={closeAddPanelModal}
              className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 space-y-3.5 overflow-y-auto text-xs">
            {/* Step 1: Template Selection */}
            <div>
              <label className="text-[11px] font-bold text-theme-text block mb-1.5">
                选择面板模板
              </label>
              <div className="space-y-2">
                {PANEL_TEMPLATES.map(tmpl => {
                  const Icon = TEMPLATE_ICONS[tmpl.icon] || FolderPlus;
                  const isSelected = selectedTemplateId === tmpl.id;

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedTemplateId(tmpl.id);
                        if (!customName || customName === currentTmpl.name.replace('模板', '')) {
                          setCustomName(tmpl.name.replace('模板', ''));
                        }
                        nativeBridge.performHapticFeedback('light');
                      }}
                      className={`p-3 rounded-squircle border cursor-pointer transition-all flex items-start space-x-2.5 ${
                        isSelected
                          ? 'bg-theme-accent/10 border-theme-accent/40 shadow-xs'
                          : 'bg-theme-card hover:bg-theme-card-subtle border-theme-border/70'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-squircle flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-theme-accent text-theme-accent-contrast border-theme-accent'
                          : 'bg-theme-card-subtle text-theme-text border-theme-border/80'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-theme-text">{tmpl.name}</span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-accent text-theme-accent-contrast font-bold">
                              已选
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-theme-text-secondary mt-0.5 line-clamp-1">{tmpl.tagline}</p>
                        <p className="text-[10px] text-theme-text-muted mt-1 leading-relaxed">{tmpl.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Panel Name */}
            <div>
              <label className="text-[11px] font-bold text-theme-text block mb-1.5">
                自定义面板名称
              </label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={currentTmpl.name.replace('模板', '')}
                className="w-full bg-theme-card px-3 py-2 rounded-squircle border border-theme-border text-xs text-theme-text focus:outline-none focus:border-theme-accent font-semibold"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 border-t border-theme-border/60 flex items-center justify-end space-x-2 bg-theme-card/70 backdrop-blur-xl shrink-0">
            <button
              type="button"
              onClick={closeAddPanelModal}
              className="py-2.5 px-4 rounded-squircle border border-theme-border text-xs font-semibold text-theme-text hover:bg-theme-card-subtle transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="py-2.5 px-5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 transition-all flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>立即创建面板</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
