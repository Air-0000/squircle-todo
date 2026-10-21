import React, { useState, useMemo } from 'react';
import { Clock, Edit3, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { nativeBridge } from '../../../utils/bridge';
import { toast } from '../../../stores/useToastStore';

interface CountdownModuleProps {
  title?: string;
  targetDate?: string;
  onUpdateTargetDate?: (newDate: string) => void;
}

export const CountdownModule: React.FC<CountdownModuleProps> = ({
  title = '目标里程碑倒计时',
  targetDate = '2026-12-26',
  onUpdateTargetDate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dateInput, setDateInput] = useState(targetDate);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [targetDate]);

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;
    if (onUpdateTargetDate) {
      onUpdateTargetDate(dateInput);
    }
    setIsEditing(false);
    nativeBridge.performHapticFeedback('light');
    toast.success(`目标日期已更新为 ${dateInput}`);
  };

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle relative overflow-hidden group">
      {/* Background soft ambient glow */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-theme-accent/10 blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-theme-accent/15 border border-theme-accent/25 flex items-center justify-center text-theme-accent shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-theme-text">{title}</h3>
            <p className="text-[10px] text-theme-text-muted mt-0.5">目标节点: {targetDate}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-squircle hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text transition-colors"
            title="修改目标日期"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-squircle hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleSaveDate} className="mb-3 p-2.5 rounded-squircle bg-theme-card-subtle border border-theme-border flex items-center space-x-2">
          <input
            type="date"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
            className="flex-1 bg-theme-card px-2.5 py-1.5 rounded-squircle border border-theme-border text-xs text-theme-text focus:outline-none focus:border-theme-accent font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>
        </form>
      )}

      {!isCollapsed && (
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <span className="text-3xl font-black text-theme-accent font-mono tracking-tight">{daysRemaining}</span>
            <span className="text-xs font-bold text-theme-text ml-1.5">天</span>
          </div>
          <span className="text-[11px] text-theme-text-secondary">
            {daysRemaining === 0 ? '🎉 目标日已到达！' : `距离目标还有 ${daysRemaining} 天，保持专注节奏`}
          </span>
        </div>
      )}
    </SquircleCard>
  );
};
