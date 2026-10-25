import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toDateKey } from '../../../domain/dates';
import { useTaskStore } from '../../../stores/useTaskStore';
import { haptic } from '../../../utils/bridge';
import { ModuleCard } from '../../ui/ModuleCard';
import { openTask } from '../../tasks/taskActions';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** Month grid; a day lists tasks due that day (or created that day when no due date). */
export const CalendarModule: React.FC = () => {
  const tasks = useTaskStore(s => s.tasks);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => toDateKey());
  const today = toDateKey();

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = month.getDay();

  const dayTasks = useMemo(
    () => tasks.filter(t => !t.isTemplate && (t.dueDate ?? toDateKey(new Date(t.createdAt))) === selected),
    [tasks, selected],
  );

  const shiftMonth = (delta: number) => {
    setMonth(new Date(year, monthIndex + delta, 1));
    haptic('light');
  };

  const navButton = 'p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-secondary';

  return (
    <ModuleCard
      icon={CalendarIcon}
      iconTone="bg-blue-500/15 border-blue-500/25 text-blue-500"
      title="月度全景日历"
      subtitle={`${year}年 ${monthIndex + 1}月`}
      actions={
        <>
          <button onClick={() => shiftMonth(-1)} className={navButton} aria-label="上个月">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => shiftMonth(1)} className={navButton} aria-label="下个月">
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-theme-text-muted">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} className="h-7" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const key = toDateKey(new Date(year, monthIndex, i + 1));
          const isSelected = key === selected;
          return (
            <button
              key={key}
              onClick={() => {
                setSelected(key);
                haptic('light');
              }}
              className={`h-7 rounded-squircle text-xs font-semibold flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs font-bold'
                  : key === today
                    ? 'border border-theme-accent text-theme-accent font-bold'
                    : 'text-theme-text hover:bg-theme-card-subtle'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="pt-2 border-t border-theme-border/50 text-xs">
        <div className="text-[11px] text-theme-text-secondary mb-1">
          {selected} 待办 ({dayTasks.length})
        </div>
        {dayTasks.length === 0 ? (
          <div className="py-2 text-[11px] text-theme-text-muted text-center">当日暂无待办事项</div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {dayTasks.map(t => (
              <div
                key={t.id}
                onClick={() => openTask(t.id)}
                className="p-1.5 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/50 flex items-center gap-2 cursor-pointer text-xs"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.completed ? 'bg-emerald-500' : 'bg-theme-accent'}`} />
                <span className={`truncate ${t.completed ? 'line-through text-theme-text-muted' : 'text-theme-text'}`}>{t.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleCard>
  );
};
