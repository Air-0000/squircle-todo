import React from 'react';
import { Sliders } from 'lucide-react';
import type { SpecField } from '../../../domain/panels';
import { ModuleCard } from '../../ui/ModuleCard';
import type { ModuleProps } from './types';

const DEFAULT_FIELDS: SpecField[] = [
  { label: '常用画布', value: 'A4 (2480 × 3508 px)' },
  { label: '输出分辨率', value: '300 DPI' },
  { label: '色彩标准', value: 'RGB (sRGB IEC61966)' },
  { label: '参考规范', value: '统一 2px 描边与图层分级' },
];

export const SpecsModule: React.FC<ModuleProps> = ({ panel }) => {
  const fields = panel.specsFields?.length ? panel.specsFields : DEFAULT_FIELDS;
  return (
    <ModuleCard
      icon={Sliders}
      iconTone="bg-cyan-500/15 border-cyan-500/25 text-cyan-500"
      title={`${panel.name} 规格参数`}
      subtitle="常用规格与技术参考参数"
    >
      <div className="grid grid-cols-2 gap-2">
        {fields.map(field => (
          <div key={field.label} className="p-2.5 rounded-squircle bg-theme-card-subtle border border-theme-border/60">
            <span className="text-[10px] text-theme-text-muted block">{field.label}</span>
            <span className="text-xs font-bold text-theme-text font-mono truncate block mt-0.5">{field.value}</span>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
};
