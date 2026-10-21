import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Plus, 
  BookTemplate,
  ListChecks,
  Zap,
  Trash2
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { TaskItemRow } from '../common/TaskItemRow';
import { useTaskStore } from '../../stores/useTaskStore';
import { TodoItem } from '../../types';
import { nativeBridge } from '../../utils/bridge';

interface CalendarTabProps {
  onEditTask: (task: TodoItem) => void;
  onOpenAddModal?: () => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ onEditTask, onOpenAddModal }) => {
  const { tasks, toggleTask, deleteTask, addTask, instantiateTemplateToEmergency } = useTaskStore();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState(today.toISOString().slice(0, 10));

  // Quick note/reference input
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  // Single-pass memoized calendar and task indexing
  const {
    monthCompletedCount,
    monthScheduledCount,
    daysStatusMap,
    tasksCompletedOnSelected,
    tasksActiveOnSelected,
    referenceTasks
  } = useMemo(() => {
    let completedCount = 0;
    let scheduledCount = 0;
    const statusMap: Record<number, { hasCompleted: boolean; hasScheduled: boolean }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      statusMap[d] = { hasCompleted: false, hasScheduled: false };
    }

    const completedSelected: TodoItem[] = [];
    const activeSelected: TodoItem[] = [];
    const refTasks: TodoItem[] = [];

    tasks.forEach(t => {
      // Reference tasks
      if (
        t.isTemplate ||
        t.category === 'template' ||
        t.tags?.includes('预设事项') || 
        t.tags?.includes('文件参考') || 
        t.referenceNotes || 
        t.title.includes('【预设】') ||
        t.title.includes('【参考】')
      ) {
        refTasks.push(t);
      }

      // Completed check
      const completedOn = (t.completedAt || '').slice(0, 10);
      const inMonthCompleted = (t.completedAt || '').slice(0, 7) === monthPrefix;
      const historyDates = Array.isArray(t.historyDates) ? t.historyDates : [];
      const hasHistoryInMonth = historyDates.some(hd => hd.startsWith(monthPrefix));

      if (inMonthCompleted || hasHistoryInMonth) {
        completedCount++;
      }

      // Check for day dots in current month
      if (completedOn.startsWith(monthPrefix)) {
        const day = parseInt(completedOn.slice(8, 10), 10);
        if (statusMap[day]) statusMap[day].hasCompleted = true;
      }
      historyDates.forEach(hd => {
        if (hd.startsWith(monthPrefix)) {
          const day = parseInt(hd.slice(8, 10), 10);
          if (statusMap[day]) statusMap[day].hasCompleted = true;
        }
      });

      // Scheduled check
      let inMonthScheduled = false;
      if (t.startDate && t.endDate) {
        inMonthScheduled = (t.startDate.slice(0, 7) <= monthPrefix && t.endDate.slice(0, 7) >= monthPrefix);
      } else if (t.dueDate) {
        inMonthScheduled = t.dueDate.slice(0, 7) === monthPrefix;
      }
      if (inMonthScheduled) {
        scheduledCount++;
      }

      // Day dots for scheduled
      if (t.dueDate && t.dueDate.startsWith(monthPrefix)) {
        const day = parseInt(t.dueDate.slice(8, 10), 10);
        if (statusMap[day]) statusMap[day].hasScheduled = true;
      } else if (t.startDate && t.endDate) {
        for (let d = 1; d <= daysInMonth; d++) {
          const dStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
          if (dStr >= t.startDate && dStr <= t.endDate) {
            if (statusMap[d]) statusMap[d].hasScheduled = true;
          }
        }
      }

      // Selected date match
      const isCompletedOnSelected = completedOn === selectedDateStr || historyDates.includes(selectedDateStr);
      if (isCompletedOnSelected) {
        completedSelected.push(t);
      }

      let isActiveOnSelected = false;
      if (t.startDate && t.endDate) {
        isActiveOnSelected = selectedDateStr >= t.startDate && selectedDateStr <= t.endDate;
      } else if (t.dueDate) {
        isActiveOnSelected = t.dueDate.slice(0, 10) === selectedDateStr;
      }
      if (isActiveOnSelected) {
        activeSelected.push(t);
      }
    });

    return {
      monthCompletedCount: completedCount,
      monthScheduledCount: scheduledCount,
      daysStatusMap: statusMap,
      tasksCompletedOnSelected: completedSelected,
      tasksActiveOnSelected: activeSelected,
      referenceTasks: refTasks
    };
  }, [tasks, currentYear, currentMonth, selectedDateStr, monthPrefix, daysInMonth]);

  // Selected date formatted label
  const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const isSelectedToday = selectedDateStr === today.toISOString().slice(0, 10);
  const selectedDateFormatted = isNaN(selectedDateObj.getTime())
    ? selectedDateStr
    : `${selectedDateObj.getMonth() + 1}月${selectedDateObj.getDate()}日 (${weekDayNames[selectedDateObj.getDay()]})`;

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    nativeBridge.performHapticFeedback('light');
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    nativeBridge.performHapticFeedback('light');
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(now.toISOString().slice(0, 10));
    nativeBridge.performHapticFeedback('light');
  };

  const getDateStatus = (day: number) => {
    return daysStatusMap[day] || { hasCompleted: false, hasScheduled: false };
  };

  const handleAddQuickReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const rawTitle = newNoteTitle.trim();
    const cleanTitle = rawTitle.startsWith('【预设】') || rawTitle.startsWith('【参考】') ? rawTitle : `【预设】${rawTitle}`;

    addTask({
      title: cleanTitle,
      isTemplate: true,
      category: 'template',
      persona: 'security',
      priority: 'medium',
      tags: ['预设事项', '应急预案'],
      subtasks: [],
      checklists: [],
    });

    setNewNoteTitle('');
    nativeBridge.performHapticFeedback('light');
    setActionFeedback(`已创建预设「${cleanTitle}」，点击卡片可进入二级界面添加子任务。`);
  };

  const handleTriggerAsEmergency = (templateId: string, templateTitle: string) => {
    instantiateTemplateToEmergency(templateId, 'urgent');
    nativeBridge.performHapticFeedback('success');
    setActionFeedback(`⚡ 已成功将「${templateTitle}」调用生成为突发事件，并已置顶到工作页面！`);
  };


  return (
    <div className="space-y-4 pb-40">
      {/* 1. 月历中枢卡片 */}
      <SquircleCard elevation={2} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3">
        {/* Month Header & Controls */}
        <div className="flex items-center justify-between pb-2 border-b border-theme-border/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-squircle bg-theme-accent/15 text-theme-accent">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <span className="text-sm font-bold text-theme-text">
                {currentYear}年 {currentMonth + 1}月
              </span>
            </div>
            <div className="text-[10px] text-theme-text-muted mt-0.5 ml-1">
              本月已达成 <span className="text-emerald-500 font-bold">{monthCompletedCount}</span> 项 · 排期待办 <span className="text-amber-500 font-bold">{monthScheduledCount}</span> 项
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="px-2.5 py-1 rounded-squircle text-[11px] font-bold bg-theme-accent text-theme-accent-contrast shadow-sm active:scale-95 transition-transform flex items-center space-x-0.5"
                title="在任意界面添加待办（自动归类分流）"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>记待办</span>
              </button>
            )}
            <button
              onClick={goToToday}
              className="px-2 py-1 rounded-squircle text-[11px] font-medium bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text border border-theme-border/50 active:scale-95 transition-transform"
            >
              今天
            </button>
            <button
              onClick={prevMonth}
              className="p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-muted hover:text-theme-text"
              aria-label="上个月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded-squircle hover:bg-theme-card-subtle text-theme-text-muted hover:text-theme-text"
              aria-label="下个月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-theme-text-muted">
          <span>日</span>
          <span>一</span>
          <span>二</span>
          <span>三</span>
          <span>四</span>
          <span>五</span>
          <span>六</span>
        </div>

        {/* Calendar Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Leading empty days */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Actual Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = selectedDateStr === dStr;
            const isToday = dStr === today.toISOString().slice(0, 10);
            const { hasCompleted, hasScheduled } = getDateStatus(dayNum);

            return (
              <button
                key={dayNum}
                onClick={() => {
                  setSelectedDateStr(dStr);
                  nativeBridge.performHapticFeedback('light');
                }}
                className={`h-9 rounded-squircle flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? 'bg-theme-accent text-theme-accent-contrast font-bold shadow-sm scale-105'
                    : isToday
                    ? 'border border-theme-accent text-theme-accent font-semibold'
                    : 'text-theme-text hover:bg-theme-card-subtle'
                }`}
              >
                <span className="text-xs leading-none">{dayNum}</span>

                {/* Status Dot Markers (打卡标注) */}
                <div className="flex space-x-0.5 mt-0.5">
                  {hasCompleted && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  )}
                  {hasScheduled && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end space-x-3 text-[10px] text-theme-text-muted pt-1 border-t border-theme-border/40">
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>已打卡完成</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>执行期限内</span>
          </div>
        </div>
      </SquircleCard>

      {/* 2. 选定日期详细日程与履历看板 */}
      <SquircleCard elevation={1} radius="lg" className="p-4 bg-theme-card border border-theme-border shadow-squircle space-y-3.5">
        {/* 日期标题与快速操作 */}
        <div className="flex items-center justify-between pb-2 border-b border-theme-border/40">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-theme-text">
              {selectedDateFormatted}
            </span>
            {isSelectedToday ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-accent/20 text-theme-accent border border-theme-accent/30 font-bold">
                今天
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-card-subtle text-theme-text-muted border border-theme-border/50 font-mono">
                {selectedDateStr}
              </span>
            )}
          </div>

          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="px-2 py-0.5 rounded-squircle text-[11px] font-semibold text-theme-accent bg-theme-accent/10 hover:bg-theme-accent/20 border border-theme-accent/25 flex items-center space-x-0.5 active:scale-95 transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>记待办</span>
            </button>
          )}
        </div>

        {/* 当天排期待办 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <h4 className="text-xs font-bold text-theme-text">
                当天排期待办 ({tasksActiveOnSelected.length})
              </h4>
            </div>
            <span className="text-[10px] text-theme-text-muted">在期限范围内的待办</span>
          </div>

          {tasksActiveOnSelected.length === 0 ? (
            <div className="py-3 text-center text-xs text-theme-text-muted bg-theme-card-subtle/50 rounded-squircle border border-dashed border-theme-border/50">
              该日期暂无排期待办
            </div>
          ) : (
            <div className="space-y-2">
              {tasksActiveOnSelected.map(task => (
                <TaskItemRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onClick={onEditTask}
                />
              ))}
            </div>
          )}
        </div>

        {/* 那一天干了什么 · 历史完成足迹 */}
        <div className="space-y-2 pt-2 border-t border-theme-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <h4 className="text-xs font-bold text-theme-text">
                那一天干了什么 ({tasksCompletedOnSelected.length})
              </h4>
            </div>
            <span className="text-[10px] text-theme-text-muted">历史打卡记录归档</span>
          </div>

          {tasksCompletedOnSelected.length === 0 ? (
            <div className="py-3 text-center text-xs text-theme-text-muted bg-theme-card-subtle/50 rounded-squircle border border-dashed border-theme-border/50">
              该日期暂无打卡完成记录
            </div>
          ) : (
            <div className="space-y-2">
              {tasksCompletedOnSelected.map(task => (
                <TaskItemRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onClick={onEditTask}
                />
              ))}
            </div>
          )}
        </div>
      </SquircleCard>
      <section className="space-y-2.5 pt-2 border-t border-theme-border/40">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <BookTemplate className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-theme-text">
              预设事项与预案库 ({referenceTasks.length})
            </h3>
          </div>
          <span className="text-[10px] text-amber-500 font-medium">先建清单 · 免去重复输入</span>
        </div>

        {/* 提示信息 */}
        {actionFeedback && (
          <div className="p-2.5 rounded-squircle bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 text-xs flex items-center justify-between shadow-sm">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-emerald-700 text-xs font-bold">×</button>
          </div>
        )}

        {/* Quick Add Template */}
        <form onSubmit={handleAddQuickReference} className="flex items-center space-x-2 p-1.5 bg-theme-card rounded-squircle border border-theme-border/70 shadow-inner">
          <input
            type="text"
            placeholder="录入可能出现的事情（如：入职流程 / 监控火警预警 / 门禁断电）..."
            value={newNoteTitle}
            onChange={e => setNewNoteTitle(e.target.value)}
            className="flex-1 bg-transparent px-2 text-xs text-theme-text outline-none font-medium placeholder:text-theme-text-muted/60"
          />
          <button
            type="submit"
            disabled={!newNoteTitle.trim()}
            className="px-2.5 py-1 rounded-squircle bg-theme-accent text-theme-accent-contrast disabled:opacity-40 text-xs font-semibold flex items-center space-x-1 shrink-0 border border-white/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加预案</span>
          </button>
        </form>

        {/* 预案列表 (不做划任务功能，点击二级界面添加子任务，一键推送到突发事件) */}
        <div className="space-y-2">
          {referenceTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle border border-dashed border-theme-border/60">
              暂无预设预案，上方输入标题即可快速创建流程模板
            </div>
          ) : (
            referenceTasks.map(task => {
              const subCount = Array.isArray(task.subtasks) 
                ? task.subtasks.length 
                : Array.isArray(task.checklists) 
                ? task.checklists.length 
                : 0;

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-squircle bg-theme-card border border-theme-border/70 hover:border-theme-accent/60 shadow-squircle transition-colors"
                >
                  <div 
                    onClick={() => onEditTask(task)}
                    className="flex-1 min-w-0 pr-2 cursor-pointer"
                  >
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-xs font-bold text-theme-text">
                        {task.title}
                      </span>
                      <span className={`inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                        subCount > 0 
                          ? 'bg-amber-500/15 text-amber-600' 
                          : 'bg-theme-card-subtle text-theme-text-muted'
                      }`}>
                        <ListChecks className="w-2.5 h-2.5" />
                        <span>{subCount > 0 ? `${subCount}个步骤子任务` : '未添加子任务'}</span>
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-theme-text-muted truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Actions: 发起为突发事件 / 编辑子任务 / 删除 */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTriggerAsEmergency(task.id, task.title)}
                      className="flex items-center space-x-1 px-2 py-1 rounded-squircle bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white text-[11px] font-semibold border border-rose-500/30 transition-all"
                      title="立即将此预案发起为工作中的突发事件"
                    >
                      <Zap className="w-3 h-3" />
                      <span>发起到突发</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="px-2 py-1 rounded-squircle bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text text-[11px] font-medium border border-theme-border/60"
                      title="打开二级界面配置子任务清单"
                    >
                      编辑子项
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="p-1 rounded-squircle text-theme-text-muted hover:text-rose-500 hover:bg-theme-card-subtle transition-colors"
                      title="删除预案"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

