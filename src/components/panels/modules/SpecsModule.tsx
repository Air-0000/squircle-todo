import React from 'react';
import { Sliders } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';

interface SpecsModuleProps {
  title?: string;
  fields?: { label: string; value: string }[];
}

const DEFAULT_FIELDS = [
  { label: '常用画布', value: 'A4 (2480 × 3508 px)' },
  { label: '输出分辨率', value: '300 DPI' },
  { label: '色彩标准', value: 'RGB (sRGB IEC61966)' },
  { label: '参考规范', value: '统一 2px 描边与图层分级' },
];

export const SpecsModule: React.FC<SpecsModuleProps> = ({
  title = '规格与技术规范',
  fields = DEFAULT_FIELDS,
}) => {
  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-2.5">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-squircle bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-500 shrink-0">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-theme-text">{title}</h3>
          <p className="text-[10px] text-theme-text-muted mt-0.5">常用规格与技术参考参数</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        {fields.map((field, idx) => (
          <div key={idx} className="p-2.5 rounded-squircle bg-theme-card-subtle border border-theme-border/60">
            <span className="text-[10px] text-theme-text-muted block">{field.label}</span>
            <span className="text-xs font-bold text-theme-text font-mono truncate block mt-0.5">{field.value}</span>
          </div>
        ))}
      </div>
    </SquircleCard>
  );
};
