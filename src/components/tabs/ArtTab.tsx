import React, { useState, useMemo } from 'react';
import { 
  Palette, 
  User, 
  Clock,
  Sun,
  Plus,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { TaskItemRow } from '../common/TaskItemRow';
import { useTaskStore } from '../../stores/useTaskStore';
import { TodoItem } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { toast } from '../../stores/useToastStore';

interface ArtTabProps {
  onOpenAddModal: () => void;
  onEditTask: (task: TodoItem) => void;
}

export const ArtTab: React.FC<ArtTabProps> = ({ onOpenAddModal, onEditTask }) => {
  const { tasks, toggleTask, deleteTask, addTask, forceRefreshCycle } = useTaskStore();
  const [dailyArtInput, setDailyArtInput] = useState('');

  const nowHour = new Date().getHours();
  const hoursLeftToday = Math.max(1, 24 - nowHour);

  // Memoized art tasks
  const { dailyArtTasks, commissionArtTasks } = useMemo(() => {
    const allArt = tasks.filter(t => 
      !t.isTemplate && 
      t.category !== 'template' && 
      !t.tags?.includes('预设事项') &&
      (t.persona || t.personaId) === 'art'
    );
    const daily = allArt.filter(t => t.periodType === 'daily' || t.frequency === 'daily' || t.category === 'daily');
    const commission = allArt.filter(t => t.periodType !== 'daily' && t.frequency !== 'daily' && t.category !== 'daily');
    return { artTasks: allArt, dailyArtTasks: daily, commissionArtTasks: commission };
  }, [tasks]);

  const handleAddDailyTask = () => {
    if (!dailyArtInput.trim()) return;
    addTask({
      title: dailyArtInput.trim(),
      persona: 'art',
      personaId: 'art',
      periodType: 'daily',
      frequency: 'daily',
      frequencyDetail: '每日刷新',
      category: 'daily',
      tags: ['绘画日常', '每日练习'],
    });
    setDailyArtInput('');
    nativeBridge.performHapticFeedback('light');
    toast.success('已加入绘画每日打卡清单！');
  };

  const handleManualCycleReset = () => {
    const count = forceRefreshCycle('daily', 'art');
    nativeBridge.performHapticFeedback('medium');
    toast.cycleReset(`已重置绘画每日打卡状态，共 ${count} 项待办已恢复待打卡！`);
  };

  return (
    <div className="space-y-4 pb-40">
      {/* 1. ☀️ 绘画每日打卡 (选择性添加，固定00:00刷新) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-xs font-bold text-theme-text">
              绘画每日打卡 ({dailyArtTasks.length})
            </h3>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-medium flex items-center space-x-0.5">
              <RefreshCw className="w-2.5 h-2.5 inline" />
              <span>00:00刷新 · 距重置{hoursLeftToday}h</span>
            </span>
            <button
              onClick={handleManualCycleReset}
              title="手动重置今日打卡状态"
              className="p-1 rounded-squircle text-theme-text-muted hover:text-theme-accent hover:bg-theme-card-subtle transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 快速内联添加输入框 */}
        <div className="flex items-center space-x-1.5">
          <input
            type="text"
            value={dailyArtInput}
            onChange={(e) => setDailyArtInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDailyTask();
              }
            }}
            placeholder="快速添加今日速写 / 色板 / 人体练习打卡..."
            className="flex-1 text-xs px-3 py-2 rounded-squircle bg-theme-card text-theme-text border border-theme-border/70 placeholder:text-theme-text-muted/60 outline-none focus:border-theme-accent shadow-inner"
          />
          <button
            type="button"
            onClick={handleAddDailyTask}
            className="w-8 h-8 rounded-squircle bg-theme-accent text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform border border-white/25"
            aria-label="添加每日打卡"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 每日任务列表 */}
        <div className="space-y-2">
          {dailyArtTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-theme-text-muted bg-theme-card/40 rounded-squircle-md border border-dashed border-theme-border/60">
              暂无今日绘画打卡，可选择性在上方快速添加（如每日速写、手势练习）
            </div>
          ) : (
            dailyArtTasks.map(task => (
              <TaskItemRow
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onClick={onEditTask}
              />
            ))
          )}
        </div>
      </div>

      {/* 2. 🎨 绘画商单与委托进度 */}
      <div className="space-y-2 pt-2 border-t border-theme-border/50">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <Palette className="w-3.5 h-3.5 text-theme-accent" />
            <h3 className="text-xs font-bold text-theme-text">
              绘画商单与委托进度 ({commissionArtTasks.length})
            </h3>
          </div>
          <span className="text-[10px] text-theme-text-muted">单名/车主名 · 交付时间 · 划掉交付</span>
        </div>

        <div className="space-y-2.5">
          {commissionArtTasks.length === 0 ? (
            <div 
              onClick={onOpenAddModal}
              className="py-10 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle-md border border-dashed border-theme-border/80 cursor-pointer hover:border-theme-accent transition-colors"
            >
              暂无绘画长线项目或商单，点击右下角「+」录入新委托
            </div>
          ) : (
            commissionArtTasks.map(task => {
              const hasClientOrSubmit = task.clientName || task.submitDate || task.endDate;
              return (
                <div key={task.id} className="space-y-1">
                  {hasClientOrSubmit && (
                    <div className="flex items-center justify-between px-2 text-[11px] text-theme-text-secondary">
                      <span className="font-medium text-theme-accent flex items-center space-x-1">
                        <User className="w-3 h-3 inline" />
                        <span>{task.clientName || '委托单'}</span>
                      </span>
                      {(task.submitDate || task.endDate) && (
                        <span className="text-[10px] text-theme-text-muted flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5 inline" />
                          <span>交付: {task.submitDate || task.endDate}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <TaskItemRow
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onClick={onEditTask}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
