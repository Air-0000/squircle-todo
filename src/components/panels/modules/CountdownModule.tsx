import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock, Edit3 } from 'lucide-react';
import { daysBetween, parseDateKey } from '../../../domain/dates';
import { usePanelStore } from '../../../stores/usePanelStore';
import { toast } from '../../../stores/useToastStore';
import { haptic } from '../../../utils/bridge';
import { ModuleCard } from '../../ui/ModuleCard';
import type { ModuleProps } from './types';

const DEFAULT_TARGET = '2026-12-26';

export const CountdownModule: React.FC<ModuleProps> = ({ panel }) => {
  const updatePanel = usePanelStore(s => s.updatePanel);
  const target = panel.countdownTargetDate || DEFAULT_TARGET;
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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

  const iconButton = 'p-1.5 rounded-squircle hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text transition-colors';

  return (
    <ModuleCard
      icon={Clock}
      title={panel.countdownTitle || `${panel.name} 倒计时`}
      subtitle={`目标节点: ${target}`}
      actions={
        <>
          <button onClick={() => setEditing(v => !v)} className={iconButton} title="修改目标日期">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCollapsed(v => !v)} className={iconButton} aria-label={collapsed ? '展开' : '收起'}>
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </>
      }
    >
      {editing && (
        <form onSubmit={save} className="p-2.5 rounded-squircle bg-theme-card-subtle border border-theme-border flex items-center gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
            className="flex-1 bg-theme-card px-2.5 py-1.5 rounded-squircle border border-theme-border text-xs text-theme-text focus:outline-none focus:border-theme-accent font-mono"
          />
          <button type="submit" className="px-3 py-1.5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>
        </form>
      )}
      {!collapsed && (
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-black text-theme-accent font-mono tracking-tight">{daysLeft}</span>
            <span className="text-xs font-bold text-theme-text ml-1.5">天</span>
          </div>
          <span className="text-[11px] text-theme-text-secondary">
            {daysLeft === 0 ? '🎉 目标日已到达！' : `距离目标还有 ${daysLeft} 天，保持专注节奏`}
          </span>
        </div>
      )}
    </ModuleCard>
  );
};
