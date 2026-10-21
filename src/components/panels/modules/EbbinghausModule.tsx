import React, { useState, useMemo } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { SquircleCard } from '../../common/SquircleCard';
import { useTaskStore } from '../../../stores/useTaskStore';
import { TodoItem } from '../../../types';
import { nativeBridge } from '../../../utils/bridge';
import { toast } from '../../../stores/useToastStore';

interface EbbinghausModuleProps {
  personaId?: string;
  onEditTask?: (task: TodoItem) => void;
}

export const EbbinghausModule: React.FC<EbbinghausModuleProps> = ({
  personaId,
  onEditTask,
}) => {
  const { tasks, toggleTask } = useTaskStore();
  const [filter, setFilter] = useState<'all' | 'due_today' | 'overdue'>('due_today');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter tasks with ebbinghaus / study review schedule
  const reviewTasks = useMemo(() => {
    return tasks.filter(t => {
      if (personaId && (t.persona || t.personaId) !== personaId) return false;
      const isReview = Boolean(
        t.piecewiseConfig?.templateType === 'ebbinghaus' || 
        t.examData?.ebbinghausTracking ||
        t.tags?.includes('艾宾浩斯') || 
        t.tags?.includes('复习')
      );
      if (!isReview) return false;

      const dueDate = t.examData?.ebbinghaus?.nextDue || t.dueDate || t.startDate;
      if (filter === 'due_today') {
        return dueDate === todayStr;
      }
      if (filter === 'overdue') {
        return Boolean(dueDate && dueDate < todayStr && !t.completed && !t.isCompleted);
      }
      return true;
    });
  }, [tasks, personaId, filter, todayStr]);

  const handleToggle = (taskId: string) => {
    nativeBridge.performHapticFeedback('light');
    toggleTask(taskId);
    toast.success('已完成本次艾宾浩斯复习打卡！');
  };

  return (
    <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-500 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-theme-text">艾宾浩斯智能复习排期</h3>
            <p className="text-[10px] text-theme-text-muted mt-0.5">
              1/2/4/7/15 天遗忘周期智能循环
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-theme-card-subtle p-0.5 rounded-full border border-theme-border/60">
          <button
            onClick={() => setFilter('due_today')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
              filter === 'due_today'
                ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            今日需复习
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
              filter === 'overdue'
                ? 'bg-rose-500 text-white shadow-2xs'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            逾期未复习
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
              filter === 'all'
                ? 'bg-theme-accent text-theme-accent-contrast shadow-2xs'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            全部
          </button>
        </div>
      </div>

      {reviewTasks.length === 0 ? (
        <div className="py-5 text-center text-theme-text-muted text-xs bg-theme-card-subtle rounded-squircle border border-theme-border/50">
          <Check className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-70" />
          <span>当前无待复习事项，记忆周期维持良好！</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {reviewTasks.map(task => {
            const isDone = Boolean(task.completed || task.isCompleted);
            return (
              <div
                key={task.id}
                onClick={() => onEditTask && onEditTask(task)}
                className={`p-2.5 rounded-squircle border transition-all flex items-center justify-between cursor-pointer ${
                  isDone 
                    ? 'bg-theme-card-subtle/50 border-theme-border/40 opacity-60' 
                    : 'bg-theme-card hover:bg-theme-card-subtle border-theme-border/70'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(task.id);
                    }}
                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-theme-border hover:border-theme-accent'
                    }`}
                  >
                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <div className="min-w-0">
                    <span className={`text-xs font-semibold block truncate ${isDone ? 'line-through text-theme-text-muted' : 'text-theme-text'}`}>
                      {task.title}
                    </span>
                    <span className="text-[10px] text-theme-text-muted">
                      {task.dueDate ? `下轮复习: ${task.dueDate}` : '艾宾浩斯复习条目'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-500 font-bold shrink-0">
                  复习
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SquircleCard>
  );
};
