import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { useTaskStore } from '../../../stores/useTaskStore';
import { TodoItem } from '../../../types';
import { nativeBridge } from '../../../utils/bridge';

interface CalendarModuleProps {
  onEditTask?: (task: TodoItem) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const CalendarModule: React.FC<CalendarModuleProps> = ({ onEditTask }) => {
  const { tasks } = useTaskStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState(new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    nativeBridge.performHapticFeedback('light');
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    nativeBridge.performHapticFeedback('light');
  };

  const selectedDayTasks = useMemo(() => {
    return tasks.filter(t => {
      const d = t.dueDate || (t.createdAt ? t.createdAt.split('T')[0] : '');
      return d === selectedDayStr;
    });
  }, [tasks, selectedDayStr]);

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-theme-text">月度全景日历</h3>
            <p className="text-[10px] text-theme-text-muted mt-0.5">{year}年 {month + 1}月</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-secondary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-theme-text-muted">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDayStr;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <button
              key={dateStr}
              onClick={() => {
                setSelectedDayStr(dateStr);
                nativeBridge.performHapticFeedback('light');
              }}
              className={`h-7 rounded-squircle text-xs font-semibold flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs font-bold'
                  : isToday
                  ? 'border border-theme-accent text-theme-accent font-bold'
                  : 'text-theme-text hover:bg-theme-card-subtle'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected Day Task Summary */}
      <div className="pt-2 border-t border-theme-border/50 text-xs">
        <div className="flex items-center justify-between text-[11px] text-theme-text-secondary mb-1">
          <span>{selectedDayStr} 待办 ({selectedDayTasks.length})</span>
        </div>
        {selectedDayTasks.length === 0 ? (
          <div className="py-2 text-[11px] text-theme-text-muted text-center">当日暂无待办事项</div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedDayTasks.map(t => (
              <div
                key={t.id}
                onClick={() => onEditTask && onEditTask(t)}
                className="p-1.5 rounded-squircle bg-theme-card-subtle hover:bg-theme-card border border-theme-border/50 flex items-center space-x-2 cursor-pointer text-xs"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${t.completed || t.isCompleted ? 'bg-emerald-500' : 'bg-theme-accent'}`} />
                <span className={`truncate ${t.completed || t.isCompleted ? 'line-through text-theme-text-muted' : 'text-theme-text'}`}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SquircleCard>
  );
};
