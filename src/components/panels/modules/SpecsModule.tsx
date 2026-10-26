import React from 'react';
import { Ruler } from 'lucide-react';
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
    <ModuleCard icon={Ruler} iconTone="bg-cyan-500 text-white" title="规格参数" subtitle="常用尺寸与技术规范">
      <dl className="divide-y divide-theme-border -mb-1">
        {fields.map(field => (
          <div key={field.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
            <dt className="text-body text-theme-text-secondary shrink-0">{field.label}</dt>
            <dd className="text-body text-theme-text text-right truncate">{field.value}</dd>
          </div>
        ))}
      </dl>
    </ModuleCard>
  );
};
