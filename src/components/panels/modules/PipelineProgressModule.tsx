import React, { useState } from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { nativeBridge } from '../../../utils/bridge';
import { triggerConfetti } from '../../common/ConfettiBurst';

interface PipelineProgressModuleProps {
  title?: string;
  stages?: string[];
  initialActiveStage?: number;
}

const DEFAULT_STAGES = ['需求定稿', '概念草图', '精细线稿', '铺色打底', '光影细化', '终稿验收', '交付归档'];

export const PipelineProgressModule: React.FC<PipelineProgressModuleProps> = ({
  title = '阶段推进流水线',
  stages = DEFAULT_STAGES,
  initialActiveStage = 2,
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(initialActiveStage);

  const progressPercent = Math.round(((currentStageIdx + 1) / stages.length) * 100);

  const handleSelectStage = (idx: number) => {
    setCurrentStageIdx(idx);
    nativeBridge.performHapticFeedback('light');
    if (idx === stages.length - 1) {
      triggerConfetti();
    }
  };

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-500 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-theme-text">{title}</h3>
            <p className="text-[10px] text-theme-text-muted mt-0.5">
              当前阶段: <span className="font-bold text-theme-accent">{stages[currentStageIdx]}</span> ({currentStageIdx + 1}/{stages.length})
            </p>
          </div>
        </div>

        <span className="text-xs font-black text-theme-accent font-mono bg-theme-accent/15 px-2 py-0.5 rounded-full border border-theme-accent/30">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-theme-card-subtle overflow-hidden border border-theme-border/50">
        <div
          className="h-full bg-gradient-to-r from-theme-accent to-purple-500 transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Horizontal Stages Scroll */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
        {stages.map((stage, idx) => {
          const isPassed = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;

          return (
            <button
              key={stage}
              onClick={() => handleSelectStage(idx)}
              className={`px-2.5 py-1 rounded-squircle text-[11px] font-semibold whitespace-nowrap transition-all flex items-center space-x-1 border ${
                isCurrent
                  ? 'bg-theme-accent text-theme-accent-contrast border-theme-accent shadow-sm'
                  : isPassed
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                  : 'bg-theme-card-subtle text-theme-text-muted border-theme-border/60 hover:text-theme-text'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono opacity-60">0{idx + 1}</span>
              )}
              <span>{stage}</span>
            </button>
          );
        })}
      </div>
    </SquircleCard>
  );
};
