import React from 'react';
import { Check, Layers } from 'lucide-react';
import { usePanelStore } from '../../../stores/usePanelStore';
import { haptic } from '../../../utils/bridge';
import { burstConfetti } from '../../../utils/confetti';
import { ModuleCard } from '../../ui/ModuleCard';
import { ProgressBar } from '../../ui/controls';
import type { ModuleProps } from './types';

const DEFAULT_STAGES = ['需求定稿', '概念草图', '精细线稿', '铺色打底', '光影细化', '终稿验收', '交付归档'];

/** Milestone pipeline; the current stage is saved on the panel. */
export const PipelineProgressModule: React.FC<ModuleProps> = ({ panel }) => {
  const updatePanel = usePanelStore(s => s.updatePanel);
  const stages = panel.pipelineStages?.length ? panel.pipelineStages : DEFAULT_STAGES;
  const current = Math.min(panel.pipelineCurrentStage ?? 0, stages.length - 1);
  const ratio = (current + 1) / stages.length;

  const select = (index: number) => {
    updatePanel(panel.id, { pipelineCurrentStage: index });
    haptic('light');
    if (index === stages.length - 1) burstConfetti();
  };

  return (
    <ModuleCard
      icon={Layers}
      iconTone="bg-purple-500 text-white"
      title="阶段流水线"
      subtitle={`第 ${current + 1}/${stages.length} 步 · ${stages[current]}`}
      actions={<span className="text-callout font-semibold text-theme-text-secondary tabular-nums">{Math.round(ratio * 100)}%</span>}
    >
      <ProgressBar ratio={ratio} height="h-1.5" />
      <ol className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
        {stages.map((stage, i) => {
          const passed = i < current;
          const active = i === current;
          return (
            <li key={`${i}-${stage}`}>
              <button
                type="button"
                onClick={() => select(i)}
                aria-current={active ? 'step' : undefined}
                className={`h-9 pl-1.5 pr-3 rounded-full flex items-center gap-1.5 whitespace-nowrap text-footnote font-medium transition-colors ${
                  active ? 'bg-theme-accent text-theme-accent-contrast' : 'bg-theme-card-subtle text-theme-text'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-caption2 font-semibold ${
                    active ? 'bg-white/25' : passed ? 'bg-emerald-500 text-white' : 'bg-theme-card text-theme-text-secondary'
                  }`}
                >
                  {passed ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {stage}
              </button>
            </li>
          );
        })}
      </ol>
    </ModuleCard>
  );
};
