import React from 'react';
import { 
  GraduationCap, 
  Palette, 
  Briefcase, 
  Calendar, 
  FolderPlus, 
  Sliders, 
  Layers, 
  Settings2,
  Trash2
} from 'lucide-react';
import { CustomPanelConfig, usePanelStore } from '../../stores/usePanelStore';
import { CountdownModule } from './modules/CountdownModule';
import { PomodoroFocusModule } from './modules/PomodoroFocusModule';
import { EbbinghausModule } from './modules/EbbinghausModule';
import { PipelineProgressModule } from './modules/PipelineProgressModule';
import { EmergencyModule } from './modules/EmergencyModule';
import { CyclesModule } from './modules/CyclesModule';
import { SpecsModule } from './modules/SpecsModule';
import { CalendarModule } from './modules/CalendarModule';
import { TaskListModule } from './modules/TaskListModule';
import { TodoItem } from '../../types';
import { toast } from '../../stores/useToastStore';

interface ModularPanelViewProps {
  panel: CustomPanelConfig;
  onEditTask: (task: TodoItem) => void;
  onOpenAddModal?: () => void;
  onNavigateHome?: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Palette,
  Briefcase,
  Calendar,
  FolderPlus,
  Sliders,
  Layers,
};

export const ModularPanelView: React.FC<ModularPanelViewProps> = ({
  panel,
  onEditTask,
  onOpenAddModal,
  onNavigateHome,
}) => {
  const { openConfigureModal, updatePanel, deletePanel } = usePanelStore();
  const Icon = ICON_MAP[panel.icon] || FolderPlus;

  const handleDeletePanel = () => {
    toast.confirm({
      title: `删除面板「${panel.name}」？`,
      message: '仅移除该面板展示，该面板下的待办任务仍保留在全局待办中，不会丢失。确认删除？',
      confirmText: '确认删除',
      danger: true,
      onConfirm: () => {
        deletePanel(panel.id);
        if (onNavigateHome) onNavigateHome();
      }
    });
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Panel Top Header Banner */}
      <div className="p-3.5 rounded-squircle-xl bg-theme-card/85 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-squircle flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
          <div className="w-9 h-9 rounded-squircle bg-theme-accent/20 border border-theme-accent/30 flex items-center justify-center text-theme-accent shrink-0 shadow-2xs">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-sm font-black text-theme-text truncate leading-tight">
                {panel.name}
              </h2>
              {panel.templateId && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-theme-accent/15 text-theme-accent font-bold shrink-0">
                  {panel.templateId === 'exam' ? '考研' : panel.templateId === 'art' ? '绘画' : panel.templateId === 'work' ? '工作' : '自定义'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-theme-text-muted truncate mt-0.5">
              {panel.description || '自定义专属工作流看板'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => openConfigureModal(panel.id)}
            className="py-1 px-2.5 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/80 text-theme-text text-xs font-semibold flex items-center space-x-1 transition-colors shadow-2xs active:scale-95"
            title="配置模块"
          >
            <Settings2 className="w-3.5 h-3.5 text-theme-accent" />
            <span className="text-[11px]">模块管理 ({panel.enabledModules.length})</span>
          </button>

          <button
            onClick={handleDeletePanel}
            className="p-1.5 rounded-squircle hover:bg-rose-500/10 text-theme-text-muted hover:text-rose-500 transition-colors"
            title="删除此面板"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Render Enabled Specific Modules */}
      {panel.enabledModules.map(moduleType => {
        switch (moduleType) {
          case 'countdown':
            return (
              <CountdownModule
                key="countdown"
                title={panel.countdownTitle || `${panel.name} 倒计时`}
                targetDate={panel.countdownTargetDate || '2026-12-26'}
                onUpdateTargetDate={(newDate) => {
                  updatePanel(panel.id, { countdownTargetDate: newDate });
                }}
              />
            );

          case 'pomodoro':
            return (
              <PomodoroFocusModule
                key="pomodoro"
                personaId={panel.id}
                title={`${panel.name} 专注时钟`}
              />
            );

          case 'ebbinghaus':
            return (
              <EbbinghausModule
                key="ebbinghaus"
                personaId={panel.id}
                onEditTask={onEditTask}
              />
            );

          case 'pipeline':
            return (
              <PipelineProgressModule
                key="pipeline"
                title={`${panel.name} 流水线`}
                stages={panel.pipelineStages}
              />
            );

          case 'emergency':
            return (
              <EmergencyModule
                key="emergency"
                onOpenAddEmergency={onOpenAddModal}
              />
            );

          case 'cycles':
            return (
              <CyclesModule
                key="cycles"
                personaId={panel.id}
                allowedPeriods={panel.cycleTypes || ['daily', 'weekly', 'monthly']}
                onEditTask={onEditTask}
              />
            );

          case 'specs':
            return (
              <SpecsModule
                key="specs"
                title={`${panel.name} 规格参数`}
                fields={panel.specsFields}
              />
            );

          case 'calendar':
            return (
              <CalendarModule
                key="calendar"
                onEditTask={onEditTask}
              />
            );

          case 'tasklist':
            return (
              <TaskListModule
                key="tasklist"
                panelId={panel.id}
                panelName={panel.name}
                subjectCategories={panel.subjectCategories}
                onEditTask={onEditTask}
                onOpenAddModal={onOpenAddModal}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
