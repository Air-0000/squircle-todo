import React, { useState, useMemo } from 'react';
import { 
  Sun, 
  CalendarDays, 
  CalendarRange, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  RefreshCw, 
  RotateCcw, 
  BookTemplate 
} from 'lucide-react';
import { TaskItemRow } from '../common/TaskItemRow';
import { useTaskStore } from '../../stores/useTaskStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { TodoItem } from '../../types';
import { nativeBridge } from '../../utils/bridge';
import { toast } from '../../stores/useToastStore';

interface WorkTabProps {
  onOpenAddModal: (defaultPeriod?: 'daily' | 'weekly' | 'monthly' | 'emergency') => void;
  onEditTask: (task: TodoItem) => void;
}

export const WorkTab: React.FC<WorkTabProps> = ({ onOpenAddModal, onEditTask }) => {
  const { 
    tasks, 
    toggleTask, 
    deleteTask, 
    addTask, 
    addEmergencyTask, 
    forceRefreshCycle,
    instantiateTemplateToEmergency 
  } = useTaskStore();
  const { showDailyWork, showWeeklyWork, showMonthlyWork, showEmergencyWork } = useSettingsStore();

  // Calculate cycle countdown (e.g. hours to 00:00 midnight)
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hoursLeftToday = Math.max(1, Math.round((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)));

  // Memoized emergency tasks
  const { activeEmergencies, resolvedEmergencies } = useMemo(() => {
    const allEm = tasks.filter(t => 
      !t.isTemplate && 
      t.category !== 'template' && 
      !t.tags?.includes('预设事项') &&
      (t.isEmergency || t.periodType === 'emergency' || t.category === 'emergency')
    );
    return {
      activeEmergencies: allEm.filter(t => !t.completed && !t.isCompleted),
      resolvedEmergencies: allEm.filter(t => t.completed || t.isCompleted),
    };
  }, [tasks]);

  // Collapsible sections (default to collapsed when 0 emergencies)
  const [emergencyCollapsed, setEmergencyCollapsed] = useState(activeEmergencies.length === 0);
  const [showResolvedEmergencies, setShowResolvedEmergencies] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [dailyCollapsed, setDailyCollapsed] = useState(false);
  const [weeklyCollapsed, setWeeklyCollapsed] = useState(false);
  const [monthlyCollapsed, setMonthlyCollapsed] = useState(false);

  // Quick inline add inputs
  const [quickEmergencyTitle, setQuickEmergencyTitle] = useState('');
  const [quickDailyTitle, setQuickDailyTitle] = useState('');
  const [quickWeeklyTitle, setQuickWeeklyTitle] = useState('');
  const [quickMonthlyTitle, setQuickMonthlyTitle] = useState('');

  // Available pre-defined templates (from 预设事项库, memoized)
  const availableTemplates = useMemo(() => tasks.filter(t => 
    t.isTemplate ||
    t.category === 'template' ||
    t.tags?.includes('预设事项') || 
    t.tags?.includes('文件参考') || 
    t.title.includes('【预设】') ||
    t.title.includes('【参考】')
  ), [tasks]);

  // Memoized periodic work tasks
  const { dailyTasks, weeklyTasks, monthlyTasks } = useMemo(() => {
    const wt = tasks.filter(t => 
      !t.isEmergency && 
      t.periodType !== 'emergency' && 
      t.category !== 'emergency' &&
      !t.isTemplate &&
      t.category !== 'template' &&
      (t.persona || t.personaId) !== 'exam' &&
      (t.persona || t.personaId) !== 'art' &&
      (t.persona === 'security' || t.persona === 'general' || t.persona === 'custom' || !t.persona || Boolean(t.periodType))
    );

    const dt = wt.filter(t => 
      t.periodType === 'daily' || 
      t.category === 'daily' || 
      t.frequency === 'daily' || 
      (!t.periodType && !t.category && t.frequency !== 'weekly' && t.frequency !== 'monthly')
    );
    const wkt = wt.filter(t => t.periodType === 'weekly' || t.category === 'weekly' || t.frequency === 'weekly');
    const mt = wt.filter(t => t.periodType === 'monthly' || t.category === 'monthly' || t.frequency === 'monthly');

    return { workTasks: wt, dailyTasks: dt, weeklyTasks: wkt, monthlyTasks: mt };
  }, [tasks]);

  const handleQuickAdd = (title: string, periodType: 'daily' | 'weekly' | 'monthly', clearFn: () => void) => {
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      persona: 'security',
      periodType,
      category: periodType,
      priority: 'high',
      tags: [periodType === 'daily' ? '日常' : periodType === 'weekly' ? '周常' : '月常'],
      frequency: periodType === 'daily' ? 'daily' : periodType === 'weekly' ? 'weekly' : 'monthly',
      frequencyDetail: periodType === 'daily' ? '每日刷新' : periodType === 'weekly' ? '每周刷新' : '每月刷新',
    });

    clearFn();
    nativeBridge.performHapticFeedback('light');
  };

  const handleManualCycleReset = (type: 'daily' | 'weekly' | 'monthly') => {
    const count = forceRefreshCycle(type, 'work');
    const label = type === 'daily' ? '日常' : type === 'weekly' ? '周常' : '月常';
    nativeBridge.performHapticFeedback('medium');
    toast.cycleReset(`已重置${label}周期状态，共 ${count} 项待办已恢复为待打卡！`);
  };

  return (
    <div className="space-y-4 pb-40">
      {/* 0. 🚨 突发事件栏目 (Emergencies / Incidents) */}
      {showEmergencyWork && (
        <section className={`p-2.5 transition-all ${
          activeEmergencies.length > 0 
            ? 'bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/35 rounded-squircle-md shadow-squircle space-y-2'
            : 'bg-theme-card/60 border border-white/25 dark:border-white/10 rounded-squircle-md'
        }`}>
          {/* 顶栏：标题 + 高优置顶标签 + 折叠按钮 */}
          <div 
            onClick={() => {
              setEmergencyCollapsed(!emergencyCollapsed);
              nativeBridge.performHapticFeedback('light');
            }}
            className="flex items-center justify-between gap-2 cursor-pointer select-none"
          >
            <div className="flex items-center space-x-1.5 min-w-0">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${activeEmergencies.length > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
              <span className={`text-xs font-bold truncate ${activeEmergencies.length > 0 ? 'text-rose-500' : 'text-theme-text'}`}>
                {activeEmergencies.length > 0 
                  ? `🚨 突发事件 (${activeEmergencies.length} 待处置)`
                  : '🚨 突发事件 (0 待处置) · 运行正常'}
              </span>
              {activeEmergencies.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 font-bold border border-rose-500/30 whitespace-nowrap shrink-0">
                  高优置顶
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/25 shrink-0">
                  安保正常
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <span className="text-[10px] text-theme-text-secondary">
                {emergencyCollapsed ? '展开' : '收起'}
              </span>
              <button
                type="button"
                className="p-1 rounded-full text-theme-text-secondary"
                aria-label={emergencyCollapsed ? '展开突发事件' : '收起突发事件'}
              >
                {emergencyCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {!emergencyCollapsed && (
            <div className="space-y-2 pt-2 border-t border-rose-500/20">
              {/* 操作行：从预案库选择 + 登记新突发 两个大触控药丸按钮 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTemplatePicker(!showTemplatePicker);
                    nativeBridge.performHapticFeedback('light');
                  }}
                  className={`py-1.5 px-2.5 rounded-squircle text-[11px] font-bold flex items-center justify-center space-x-1.5 border transition-all active:scale-95 shadow-2xs ${
                    showTemplatePicker
                      ? 'bg-rose-500 text-white border-rose-600 shadow-md'
                      : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border-rose-500/35'
                  }`}
                >
                  <BookTemplate className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">从预案库一键选择</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddModal('emergency');
                    nativeBridge.performHapticFeedback('light');
                  }}
                  className="py-1.5 px-2.5 rounded-squircle bg-white/70 dark:bg-white/10 hover:bg-white/90 text-rose-600 border border-rose-500/30 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">登记新突发</span>
                </button>
              </div>

              {/* Template Picker Popup Panel (预设事件一键调用，免去重复输入) */}
              {showTemplatePicker && (
                <div className="p-2.5 rounded-squircle bg-theme-card border border-rose-400/60 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-theme-text flex items-center space-x-1">
                      <BookTemplate className="w-3.5 h-3.5 text-rose-500" />
                      <span>从预设库一键选择突发事项:</span>
                    </span>
                    <button 
                      onClick={() => setShowTemplatePicker(false)}
                      className="text-theme-text-muted hover:text-theme-text text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {availableTemplates.length === 0 ? (
                    <div className="py-2.5 text-center text-[11px] text-theme-text-muted bg-theme-card-subtle rounded-squircle">
                      预设库暂无事项，可在「日历参考」页底部预先添加预案与子任务
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {availableTemplates.map(tpl => {
                        const subCount = tpl.subtasks?.length || tpl.checklists?.length || 0;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              instantiateTemplateToEmergency(tpl.id, 'urgent');
                              setShowTemplatePicker(false);
                              nativeBridge.performHapticFeedback('success');
                            }}
                            className="w-full text-left p-2 rounded-squircle bg-theme-card-subtle hover:bg-rose-500/10 border border-theme-border/60 hover:border-rose-400 flex items-center justify-between transition-all group"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-theme-text group-hover:text-rose-600 truncate block">
                                {tpl.title}
                              </span>
                              <span className="text-[10px] text-theme-text-muted">
                                {subCount > 0 ? `内置 ${subCount} 个执行子任务` : '未配置子任务'}
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/15 px-2 py-0.5 rounded-squircle shrink-0">
                              立即发起
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Inline Emergency Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quickEmergencyTitle.trim()) return;
                  addEmergencyTask(quickEmergencyTitle.trim(), 'urgent');
                  setQuickEmergencyTitle('');
                  nativeBridge.performHapticFeedback('heavy');
                }}
                className="flex items-center space-x-2 p-1.5 bg-theme-card rounded-squircle border border-rose-400/50 shadow-inner"
              >
                <input
                  type="text"
                  placeholder="快速登记突发紧急事项（如：监控报警 / 消防门异常 / 车辆堵塞）..."
                  value={quickEmergencyTitle}
                  onChange={e => setQuickEmergencyTitle(e.target.value)}
                  className="flex-1 bg-transparent px-2 text-xs text-theme-text outline-none placeholder:text-rose-400/60"
                />
                <button
                  type="submit"
                  disabled={!quickEmergencyTitle.trim()}
                  className="px-2.5 py-1 rounded-squircle bg-rose-500 text-white text-xs font-bold disabled:opacity-40 flex items-center space-x-1 shadow-sm active:scale-95 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>登记</span>
                </button>
              </form>

              {/* Active Emergency Tasks */}
              {activeEmergencies.length === 0 && resolvedEmergencies.length === 0 ? (
                <div className="py-3 text-center text-xs text-rose-400/80 bg-rose-500/5 rounded-squircle border border-dashed border-rose-400/30">
                  当前无待处置突发事件，安保与运行一切正常
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeEmergencies.map(task => (
                    <TaskItemRow
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onClick={onEditTask}
                    />
                  ))}

                  {/* Resolved Emergency Collapsible Section */}
                  {resolvedEmergencies.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => setShowResolvedEmergencies(!showResolvedEmergencies)}
                        className="text-[10px] text-theme-text-muted hover:text-theme-text flex items-center space-x-1"
                      >
                        <span>已妥善处置归档 ({resolvedEmergencies.length})</span>
                        {showResolvedEmergencies ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </button>
                      {showResolvedEmergencies && (
                        <div className="space-y-1.5 pt-1 opacity-70">
                          {resolvedEmergencies.map(task => (
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
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 1. ☀️ 日常栏目 (Daily) */}
      {showDailyWork && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setDailyCollapsed(!dailyCollapsed)}
              className="flex items-center space-x-1.5 text-xs font-bold text-theme-text hover:text-theme-accent transition-colors"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>日常任务 ({dailyTasks.length})</span>
              {dailyCollapsed ? <ChevronDown className="w-3 h-3 text-theme-text-muted" /> : <ChevronUp className="w-3 h-3 text-theme-text-muted" />}
            </button>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-medium flex items-center space-x-0.5">
                <RefreshCw className="w-2.5 h-2.5 inline" />
                <span>00:00刷新 · 距重置{hoursLeftToday}h</span>
              </span>
              <button
                onClick={() => handleManualCycleReset('daily')}
                title="手动重置今日完成状态"
                className="p-1 rounded-squircle text-theme-text-muted hover:text-theme-accent hover:bg-theme-card-subtle transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => onOpenAddModal('daily')}
                className="text-[11px] text-theme-accent hover:underline flex items-center space-x-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>新建</span>
              </button>
            </div>
          </div>

          {!dailyCollapsed && (
            <div className="space-y-2">
              {/* Quick Inline Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickAdd(quickDailyTitle, 'daily', () => setQuickDailyTitle(''));
                }}
                className="flex items-center space-x-2 p-1.5 bg-theme-card rounded-squircle border border-theme-border/80 shadow-inner"
              >
                <input
                  type="text"
                  placeholder="快速添加日常事项..."
                  value={quickDailyTitle}
                  onChange={e => setQuickDailyTitle(e.target.value)}
                  className="flex-1 bg-transparent px-2 text-xs text-theme-text outline-none"
                />
                <button
                  type="submit"
                  disabled={!quickDailyTitle.trim()}
                  className="p-1 rounded-squircle bg-theme-accent text-theme-accent-contrast disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {dailyTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle-md border border-dashed border-theme-border/60">
                  暂无日常任务，输入上方内容快速添加
                </div>
              ) : (
                dailyTasks.map(task => (
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
          )}
        </section>
      )}

      {/* 2. 📅 周常栏目 (Weekly) */}
      {showWeeklyWork && (
        <section className="space-y-2 pt-1 border-t border-theme-border/40">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setWeeklyCollapsed(!weeklyCollapsed)}
              className="flex items-center space-x-1.5 text-xs font-bold text-theme-text hover:text-theme-accent transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              <span>周常任务 ({weeklyTasks.length})</span>
              {weeklyCollapsed ? <ChevronDown className="w-3 h-3 text-theme-text-muted" /> : <ChevronUp className="w-3 h-3 text-theme-text-muted" />}
            </button>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 font-medium flex items-center space-x-0.5">
                <RefreshCw className="w-2.5 h-2.5 inline" />
                <span>每周一刷新</span>
              </span>
              <button
                onClick={() => handleManualCycleReset('weekly')}
                title="手动重置本周完成状态"
                className="p-1 rounded-squircle text-theme-text-muted hover:text-theme-accent hover:bg-theme-card-subtle transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => onOpenAddModal('weekly')}
                className="text-[11px] text-theme-accent hover:underline flex items-center space-x-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>新建</span>
              </button>
            </div>
          </div>

          {!weeklyCollapsed && (
            <div className="space-y-2">
              {/* Quick Inline Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickAdd(quickWeeklyTitle, 'weekly', () => setQuickWeeklyTitle(''));
                }}
                className="flex items-center space-x-2 p-1.5 bg-theme-card rounded-squircle border border-theme-border/80 shadow-inner"
              >
                <input
                  type="text"
                  placeholder="快速添加每周常办事项..."
                  value={quickWeeklyTitle}
                  onChange={e => setQuickWeeklyTitle(e.target.value)}
                  className="flex-1 bg-transparent px-2 text-xs text-theme-text outline-none"
                />
                <button
                  type="submit"
                  disabled={!quickWeeklyTitle.trim()}
                  className="p-1 rounded-squircle bg-theme-accent text-theme-accent-contrast disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {weeklyTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle-md border border-dashed border-theme-border/60">
                  暂无周常任务，输入上方内容快速添加
                </div>
              ) : (
                weeklyTasks.map(task => (
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
          )}
        </section>
      )}

      {/* 3. 🌕 月常栏目 (Monthly) */}
      {showMonthlyWork && (
        <section className="space-y-2 pt-1 border-t border-theme-border/40">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setMonthlyCollapsed(!monthlyCollapsed)}
              className="flex items-center space-x-1.5 text-xs font-bold text-theme-text hover:text-theme-accent transition-colors"
            >
              <CalendarRange className="w-3.5 h-3.5 text-purple-500" />
              <span>月常任务 ({monthlyTasks.length})</span>
              {monthlyCollapsed ? <ChevronDown className="w-3 h-3 text-theme-text-muted" /> : <ChevronUp className="w-3 h-3 text-theme-text-muted" />}
            </button>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 font-medium flex items-center space-x-0.5">
                <RefreshCw className="w-2.5 h-2.5 inline" />
                <span>每月1日刷新</span>
              </span>
              <button
                onClick={() => handleManualCycleReset('monthly')}
                title="手动重置本月完成状态"
                className="p-1 rounded-squircle text-theme-text-muted hover:text-theme-accent hover:bg-theme-card-subtle transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => onOpenAddModal('monthly')}
                className="text-[11px] text-theme-accent hover:underline flex items-center space-x-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>新建</span>
              </button>
            </div>
          </div>

          {!monthlyCollapsed && (
            <div className="space-y-2">
              {/* Quick Inline Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickAdd(quickMonthlyTitle, 'monthly', () => setQuickMonthlyTitle(''));
                }}
                className="flex items-center space-x-2 p-1.5 bg-theme-card rounded-squircle border border-theme-border/80 shadow-inner"
              >
                <input
                  type="text"
                  placeholder="快速添加每月例行事项..."
                  value={quickMonthlyTitle}
                  onChange={e => setQuickMonthlyTitle(e.target.value)}
                  className="flex-1 bg-transparent px-2 text-xs text-theme-text outline-none"
                />
                <button
                  type="submit"
                  disabled={!quickMonthlyTitle.trim()}
                  className="p-1 rounded-squircle bg-theme-accent text-theme-accent-contrast disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {monthlyTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-theme-text-muted bg-theme-card-subtle rounded-squircle-md border border-dashed border-theme-border/60">
                  暂无月常任务，输入上方内容快速添加
                </div>
              ) : (
                monthlyTasks.map(task => (
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
          )}
        </section>
      )}
    </div>
  );
};
