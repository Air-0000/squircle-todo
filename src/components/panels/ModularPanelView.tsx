import React from 'react';
import type { Panel, PanelModuleType } from '../../domain/panels';
import { usePanelStore } from '../../stores/usePanelStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
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
    title: `删除「${panel.name}」？`,
    message: '面板里的待办不会被删除，仍可在「待办」中找到。',
    confirmText: '删除',
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

export const ModularPanelView: React.FC<{ panel: Panel }> = ({ panel }) => (
  <div className="space-y-4">
    {panel.enabledModules.map(type => {
      const Module = MODULES[type];
      return <Module key={type} panel={panel} />;
    })}
  </div>
);
