import React from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import { usePanelStore } from '../../../stores/usePanelStore';
import { haptic } from '../../../utils/bridge';
import { burstConfetti } from '../../../utils/confetti';
import { ModuleCard } from '../../ui/ModuleCard';
import type { ModuleProps } from './types';

const DEFAULT_STAGES = ['需求定稿', '概念草图', '精细线稿', '铺色打底', '光影细化', '终稿验收', '交付归档'];

/** Milestone pipeline; the current stage is saved on the panel. */
export const PipelineProgressModule: React.FC<ModuleProps> = ({ panel }) => {
  const updatePanel = usePanelStore(s => s.updatePanel);
  const stages = panel.pipelineStages?.length ? panel.pipelineStages : DEFAULT_STAGES;
  const current = Math.min(panel.pipelineCurrentStage ?? 0, stages.length - 1);
  const percent = Math.round(((current + 1) / stages.length) * 100);

  const select = (index: number) => {
    updatePanel(panel.id, { pipelineCurrentStage: index });
    haptic('light');
    if (index === stages.length - 1) burstConfetti();
  };

  return (
    <ModuleCard
      icon={Layers}
      iconTone="bg-purple-500/15 border-purple-500/25 text-purple-500"
      title={`${panel.name} 流水线`}
      subtitle={
        <>
          当前阶段: <span className="font-bold text-theme-accent">{stages[current]}</span> ({current + 1}/{stages.length})
        </>
      }
      actions={
        <span className="text-xs font-black text-theme-accent font-mono bg-theme-accent/15 px-2 py-0.5 rounded-full border border-theme-accent/30">
          {percent}%
        </span>
      }
    >
      <div className="w-full h-2 rounded-full bg-theme-card-subtle overflow-hidden border border-theme-border/50">
        <div className="h-full bg-gradient-to-r from-theme-accent to-purple-500 transition-all duration-300 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {stages.map((stage, i) => {
          const passed = i < current;
          const active = i === current;
          return (
            <button
              key={`${i}-${stage}`}
              onClick={() => select(i)}
              aria-current={active ? 'step' : undefined}
              className={`px-2.5 py-1 rounded-squircle text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 border ${
                active
                  ? 'bg-theme-accent text-theme-accent-contrast border-theme-accent shadow-sm'
                  : passed
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                    : 'bg-theme-card-subtle text-theme-text-muted border-theme-border/60 hover:text-theme-text'
              }`}
            >
              {passed ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono opacity-60">{String(i + 1).padStart(2, '0')}</span>
              )}
              <span>{stage}</span>
            </button>
          );
        })}
      </div>
    </ModuleCard>
  );
};
