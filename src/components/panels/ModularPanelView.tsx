import React from 'react';
import { Settings2, Trash2 } from 'lucide-react';
import { TEMPLATE_LABELS, type Panel, type PanelModuleType } from '../../domain/panels';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { panelIcon } from '../ui/icons';
import type { ModuleProps } from './modules/types';
import { CountdownModule } from './modules/CountdownModule';
import { PomodoroFocusModule } from './modules/PomodoroFocusModule';
import { EbbinghausModule } from './modules/EbbinghausModule';
import { PipelineProgressModule } from './modules/PipelineProgressModule';
import { EmergencyModule } from './modules/EmergencyModule';
import { CyclesModule } from './modules/CyclesModule';
import { SpecsModule } from './modules/SpecsModule';
import { CalendarModule } from './modules/CalendarModule';
import { TaskListModule } from './modules/TaskListModule';

const MODULES: Record<PanelModuleType, React.ComponentType<ModuleProps>> = {
  countdown: CountdownModule,
  pomodoro: PomodoroFocusModule,
  ebbinghaus: EbbinghausModule,
  pipeline: PipelineProgressModule,
  emergency: EmergencyModule,
  cycles: CyclesModule,
  specs: SpecsModule,
  calendar: CalendarModule,
  tasklist: TaskListModule,
};

export function confirmDeletePanel(panel: Panel): void {
  toast.confirm({
    title: `删除面板「${panel.name}」？`,
    message: '仅移除该面板展示，该面板下的待办任务仍保留在全局待办中，不会丢失。确认删除？',
    confirmText: '确认删除',
    danger: true,
    onConfirm: () => {
      usePanelStore.getState().deletePanel(panel.id);
      const ui = useUIStore.getState();
      if (ui.activeTab === panel.id) ui.setActiveTab('tasks');
      haptic('light');
      toast.info(`已移除「${panel.name}」`);
    },
  });
}

export const ModularPanelView: React.FC<{ panel: Panel }> = ({ panel }) => {
  const Icon = panelIcon(panel.icon);

  return (
    <div className="space-y-3 pb-8">
      <div className="p-3.5 rounded-squircle-xl bg-theme-card/85 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-squircle flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-squircle bg-theme-accent/20 border border-theme-accent/30 flex items-center justify-center text-theme-accent shrink-0 shadow-2xs">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-theme-text truncate leading-tight">{panel.name}</h2>
              <span className="text-[9px] px-1.5 py-px rounded-full bg-theme-accent/15 text-theme-accent font-bold shrink-0">
                {TEMPLATE_LABELS[panel.templateId]}
              </span>
            </div>
            <p className="text-[10px] text-theme-text-muted truncate mt-0.5">{panel.description || '自定义专属工作流看板'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              haptic('light');
              useUIStore.getState().configurePanel(panel.id);
            }}
            title="配置模块"
            className="py-1 px-2.5 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/80 text-theme-text text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs active:scale-95"
          >
            <Settings2 className="w-3.5 h-3.5 text-theme-accent" />
            <span className="text-[11px]">模块管理 ({panel.enabledModules.length})</span>
          </button>
          <button
            onClick={() => confirmDeletePanel(panel)}
            title="删除此面板"
            aria-label="删除此面板"
            className="p-1.5 rounded-squircle hover:bg-rose-500/10 text-theme-text-muted hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {panel.enabledModules.map(type => {
        const Module = MODULES[type];
        return <Module key={type} panel={panel} />;
      })}
    </div>
  );
};
