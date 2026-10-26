import React, { useState } from 'react';
import { Hourglass } from 'lucide-react';
import { daysBetween, parseDateKey } from '../../../domain/dates';
import { usePanelStore } from '../../../stores/usePanelStore';
import { toast } from '../../../stores/useToastStore';
import { haptic } from '../../../utils/bridge';
import { ModuleCard, TextButton } from '../../ui/ModuleCard';
import { inputClass } from '../../ui/controls';
import type { ModuleProps } from './types';

const DEFAULT_TARGET = '2026-12-26';

export const CountdownModule: React.FC<ModuleProps> = ({ panel }) => {
  const updatePanel = usePanelStore(s => s.updatePanel);
  const target = panel.countdownTargetDate || DEFAULT_TARGET;
  const [editing, setEditing] = useState(false);
  const [dateInput, setDateInput] = useState(target);
  const daysLeft = Math.max(0, daysBetween(new Date(), parseDateKey(target)));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;
    updatePanel(panel.id, { countdownTargetDate: dateInput });
    setEditing(false);
    haptic('light');
    toast.success(`目标日期已更新为 ${dateInput}`);
  };

  return (
    <ModuleCard
      icon={Hourglass}
      iconTone="bg-orange-500 text-white"
      title={panel.countdownTitle || `${panel.name} 倒计时`}
      subtitle={`目标日 ${target}`}
      actions={<TextButton onClick={() => setEditing(v => !v)}>{editing ? '取消' : '编辑'}</TextButton>}
    >
      {editing ? (
        <form onSubmit={save} className="flex items-center gap-2">
          <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className={`${inputClass} flex-1`} />
          <button type="submit" className="h-11 px-4 rounded-squircle bg-theme-accent text-theme-accent-contrast text-body font-semibold">
            保存
          </button>
        </form>
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-[44px] leading-none font-bold tracking-tight text-theme-text tabular-nums">{daysLeft}</span>
          <span className="text-body text-theme-text-secondary">{daysLeft === 0 ? '天 · 就是今天' : '天'}</span>
        </div>
      )}
    </ModuleCard>
  );
};
