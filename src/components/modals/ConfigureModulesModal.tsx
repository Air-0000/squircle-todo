import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings2, 
  Clock, 
  Timer, 
  BookOpen, 
  Layers, 
  AlertTriangle, 
  RotateCcw, 
  Sliders, 
  Calendar, 
  ListChecks,
  Check
} from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';
import { usePanelStore, AVAILABLE_MODULES } from '../../stores/usePanelStore';
import { nativeBridge } from '../../utils/bridge';

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock,
  Timer,
  BookOpen,
  Layers,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Calendar,
  ListChecks,
};

export const ConfigureModulesModal: React.FC = () => {
  const { 
    isConfigureModalOpen, 
    closeConfigureModal, 
    activeConfiguringPanelId, 
    panels, 
    toggleModule 
  } = usePanelStore();

  if (!isConfigureModalOpen || !activeConfiguringPanelId) return null;

  const panel = panels.find(p => p.id === activeConfiguringPanelId);
  if (!panel) return null;

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
                <Settings2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-theme-text leading-tight">
                  「{panel.name}」功能模块配置
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">
                  开启或关闭特定功能模块，按需定制专属界面
                </p>
              </div>
            </div>

            <button
              onClick={closeConfigureModal}
              className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 space-y-2.5 overflow-y-auto text-xs">
            <p className="text-[11px] text-theme-text-secondary leading-relaxed">
              勾选启用该面板需要展示的功能卡片，随时可增减调整：
            </p>

            <div className="space-y-2 pt-1">
              {AVAILABLE_MODULES.map(mod => {
                const Icon = MODULE_ICONS[mod.icon] || ListChecks;
                const isEnabled = panel.enabledModules.includes(mod.type);

                return (
                  <div
                    key={mod.type}
                    onClick={() => {
                      toggleModule(panel.id, mod.type);
                      nativeBridge.performHapticFeedback('light');
                    }}
                    className={`p-3 rounded-squircle border cursor-pointer transition-all flex items-center justify-between ${
                      isEnabled
                        ? 'bg-theme-accent/10 border-theme-accent/40 shadow-2xs'
                        : 'bg-theme-card hover:bg-theme-card-subtle border-theme-border/60 opacity-70'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0 pr-3">
                      <div className={`w-8 h-8 rounded-squircle flex items-center justify-center shrink-0 border ${
                        isEnabled
                          ? 'bg-theme-accent text-theme-accent-contrast border-theme-accent'
                          : 'bg-theme-card-subtle text-theme-text-muted border-theme-border'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-theme-text">{mod.name}</span>
                          {isEnabled && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-theme-accent/20 text-theme-accent font-bold">
                              已启用
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-theme-text-secondary mt-0.5 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Checkbox Switch */}
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      isEnabled 
                        ? 'bg-theme-accent border-theme-accent text-theme-accent-contrast' 
                        : 'border-theme-border bg-theme-card-subtle'
                    }`}>
                      {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 border-t border-theme-border/60 flex items-center justify-end bg-theme-card/70 backdrop-blur-xl shrink-0">
            <button
              type="button"
              onClick={closeConfigureModal}
              className="py-2.5 px-6 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 transition-all"
            >
              完成配置
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
