import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { toDateKey } from '../../../domain/dates';
import type { Task } from '../../../domain/task';
import { useTaskStore } from '../../../stores/useTaskStore';
import { haptic } from '../../../utils/bridge';
import { CardList } from '../../ui/List';
import { ModuleCard } from '../../ui/ModuleCard';
import { EmptyState } from '../../ui/controls';
import { TaskRow } from '../../tasks/TaskRow';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** A task's day on the calendar: its due date, otherwise the day it was created. */
const dayOf = (t: Task) => t.dueDate ?? toDateKey(new Date(t.createdAt));

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

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.isTemplate) continue;
      const key = dayOf(t);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [tasks]);
  const dayTasks = byDay.get(selected) ?? [];

  const shiftMonth = (delta: number) => {
    setMonth(new Date(year, monthIndex + delta, 1));
    haptic('light');
  };
  const navButton = 'w-8 h-8 rounded-full flex items-center justify-center text-theme-accent active:bg-theme-card-subtle';

  return (
    <ModuleCard
      icon={CalendarDays}
      iconTone="bg-blue-500 text-white"
      title={`${year}年${monthIndex + 1}月`}
      subtitle="按截止日查看待办"
      actions={
        <>
          <button onClick={() => shiftMonth(-1)} className={navButton} aria-label="上个月">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => shiftMonth(1)} className={navButton} aria-label="下个月">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      }
    >
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-caption2 font-semibold text-theme-text-muted pb-1">
            {w}
          </div>
        ))}
        {Array.from({ length: month.getDay() }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const key = toDateKey(new Date(year, monthIndex, i + 1));
          const isSelected = key === selected;
          const isToday = key === today;
          const hasTasks = byDay.has(key);
          return (
            <button
              key={key}
              onClick={() => {
                setSelected(key);
                haptic('light');
              }}
              aria-pressed={isSelected}
              className="h-11 flex flex-col items-center justify-center gap-0.5"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-callout tabular-nums transition-colors ${
                  isSelected
                    ? 'bg-theme-accent text-theme-accent-contrast font-semibold'
                    : isToday
                      ? 'text-theme-accent font-semibold'
                      : 'text-theme-text'
                }`}
              >
                {i + 1}
              </span>
              <span className={`w-1 h-1 rounded-full ${hasTasks && !isSelected ? 'bg-theme-text-muted' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
      {dayTasks.length === 0 ? (
        <EmptyState className="!py-3 border-t border-theme-border -mx-4 -mb-4">{selected === today ? '今天' : selected.slice(5)} 没有待办</EmptyState>
      ) : (
        <CardList>
          {dayTasks.map(t => (
            <TaskRow key={t.id} task={t} showPanel />
          ))}
        </CardList>
      )}
    </ModuleCard>
  );
};
