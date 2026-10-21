import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { useTaskStore } from '../../stores/useTaskStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { nativeBridge } from '../../utils/bridge';

interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  taskCount: number;
  focusMinutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export const StreakHeatmapCard: React.FC = () => {
  const { tasks } = useTaskStore();
  const { focusHistory, openFocusModal } = useFocusStore();

  const [activeTooltip, setActiveTooltip] = useState<DayActivity | null>(null);

  // 1. Gather all activity dates
  const dateActivityMap: Record<string, { taskCount: number; focusMinutes: number }> = {};

  // Task completions
  tasks.forEach((t) => {
    if (t.completed || t.isCompleted) {
      const d = (t.completedAt || t.updatedAt || '').slice(0, 10);
      if (d) {
        if (!dateActivityMap[d]) dateActivityMap[d] = { taskCount: 0, focusMinutes: 0 };
        dateActivityMap[d].taskCount += 1;
      }
    }
    if (Array.isArray(t.historyDates)) {
      t.historyDates.forEach((hd) => {
        if (hd) {
          if (!dateActivityMap[hd]) dateActivityMap[hd] = { taskCount: 0, focusMinutes: 0 };
          dateActivityMap[hd].taskCount += 1;
        }
      });
    }
  });

  // Focus history
  focusHistory.forEach((fh) => {
    const d = fh.date;
    if (d) {
      if (!dateActivityMap[d]) dateActivityMap[d] = { taskCount: 0, focusMinutes: 0 };
      dateActivityMap[d].focusMinutes += fh.durationMinutes;
    }
  });

  // 2. Compute Streaks
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Current Streak calculation
  let currentStreak = 0;
  let checkDate = new Date(today);

  // If no activity today, check if yesterday had activity to keep streak alive
  const todayActive = Boolean(dateActivityMap[todayStr] && (dateActivityMap[todayStr].taskCount > 0 || dateActivityMap[todayStr].focusMinutes > 0));
  if (!todayActive) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10);
    const act = dateActivityMap[dStr];
    if (act && (act.taskCount > 0 || act.focusMinutes > 0)) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak & Totals
  const totalCompletedTasks = tasks.filter(t => t.completed || t.isCompleted).length;
  const totalFocusMinutes = focusHistory.reduce((acc, f) => acc + f.durationMinutes, 0);
  const longestStreak = currentStreak;

  // 3. Generate past 14 weeks (98 days) matrix
  const weeksCount = 14;
  const totalDays = weeksCount * 7;
  const daysGrid: DayActivity[] = [];

  // Align ending on this week's Sunday
  const endDay = new Date(today);
  const dayOfWeek = endDay.getDay(); // 0 is Sunday
  const offsetToSunday = (7 - dayOfWeek) % 7;
  endDay.setDate(endDay.getDate() + offsetToSunday);

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(endDay);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const act = dateActivityMap[dateStr] || { taskCount: 0, focusMinutes: 0 };

    // Activity score: task * 2 + (focus / 20)
    const score = act.taskCount * 2 + act.focusMinutes / 20;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (score >= 6) level = 4;
    else if (score >= 4) level = 3;
    else if (score >= 2) level = 2;
    else if (score > 0) level = 1;

    daysGrid.push({
      dateStr,
      dayOfWeek: d.getDay(),
      taskCount: act.taskCount,
      focusMinutes: act.focusMinutes,
      level,
    });
  }

  // Group into 7 rows (Monday through Sunday)
  const rows: DayActivity[][] = [[], [], [], [], [], [], []];
  daysGrid.forEach((d) => {
    // 0 is Sunday -> row 6, 1 is Monday -> row 0
    const rowIndex = d.dayOfWeek === 0 ? 6 : d.dayOfWeek - 1;
    rows[rowIndex].push(d);
  });

  const levelColorMap = {
    0: 'bg-slate-300/40 dark:bg-white/5 border border-slate-300/60 dark:border-white/5',
    1: 'bg-emerald-500/25 border border-emerald-500/30 text-emerald-300',
    2: 'bg-emerald-500/50 border border-emerald-500/60 text-emerald-200',
    3: 'bg-emerald-500/80 border border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    4: 'bg-emerald-400 border border-emerald-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(52,211,153,0.7)]',
  };

  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <SquircleCard className="relative overflow-hidden mb-4 p-4 border border-white/20 dark:border-white/10 shadow-squircle">
      {/* Specular Edge Top Reflection */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" 
      />

      {/* Top Banner: Metric Cards */}
      <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-squircle bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Flame className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-theme-text flex items-center space-x-1.5">
              <span>连续打卡成就榜</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                近14周
              </span>
            </h3>
            <p className="text-[10px] text-theme-text-muted">
              每日任务刷新 · 历史点滴沉淀
            </p>
          </div>
        </div>

        <button
          onClick={() => openFocusModal({ mode: 'pomodoro' })}
          className="px-3 py-1.5 rounded-full bg-theme-accent/15 hover:bg-theme-accent/25 text-theme-accent border border-theme-accent/30 text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs active:scale-95"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>开启专注</span>
        </button>
      </div>

      {/* 4 Core Quantitative Metric Badges */}
      <div className="grid grid-cols-4 gap-2 mb-3.5">
        <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
          <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
            <Flame className="w-2.5 h-2.5 text-amber-500" />
            <span>当前连续</span>
          </div>
          <div className="text-base font-black text-amber-500 mt-0.5">
            {currentStreak}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">天</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
          <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
            <Trophy className="w-2.5 h-2.5 text-emerald-500" />
            <span>最长连续</span>
          </div>
          <div className="text-base font-black text-emerald-500 mt-0.5">
            {longestStreak}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">天</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
          <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
            <CheckCircle2 className="w-2.5 h-2.5 text-blue-500" />
            <span>累计完成</span>
          </div>
          <div className="text-base font-black text-blue-500 mt-0.5">
            {totalCompletedTasks}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">项</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
          <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
            <Clock className="w-2.5 h-2.5 text-purple-500" />
            <span>深度专注</span>
          </div>
          <div className="text-base font-black text-purple-500 mt-0.5">
            {(totalFocusMinutes / 60).toFixed(1)}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">h</span>
          </div>
        </div>
      </div>

      {/* GitHub Contribution Style Heatmap Grid */}
      <div className="p-3 rounded-2xl bg-theme-card/80 border border-theme-border/60 overflow-x-auto">
        <div className="min-w-[340px] flex flex-col space-y-1">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center space-x-1">
              {/* Day of Week Label */}
              <span className="w-4 text-[9px] font-bold text-theme-text-muted text-center select-none">
                {rIdx % 2 === 0 ? dayLabels[rIdx] : ''}
              </span>

              {/* Day Blocks */}
              <div className="flex-1 flex items-center justify-between gap-1">
                {row.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      setActiveTooltip(day);
                      nativeBridge.performHapticFeedback('light');
                    }}
                    onMouseEnter={() => setActiveTooltip(day)}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs transition-transform cursor-pointer hover:scale-125 shrink-0 ${levelColorMap[day.level]}`}
                    title={`${day.dateStr}: 完成 ${day.taskCount} 项, 专注 ${day.focusMinutes} 分钟`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-theme-text-muted pt-2.5 mt-2 border-t border-theme-border/40 select-none">
          <span>少</span>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-white/5 border border-white/10" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/25 border border-emerald-500/30" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/50 border border-emerald-500/60" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/80 border border-emerald-400" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 border border-emerald-300" />
          </div>
          <span>多</span>
        </div>
      </div>

      {/* Floating Active Tooltip Details */}
      {activeTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2.5 p-2 rounded-xl bg-theme-card-subtle border border-theme-border/70 flex items-center justify-between text-xs"
        >
          <div className="flex items-center space-x-1.5 text-theme-text">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{activeTooltip.dateStr}</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-theme-text-secondary">
            <span>打卡完成 <strong className="text-emerald-400 font-bold">{activeTooltip.taskCount}</strong> 项</span>
            <span>·</span>
            <span>专注投入 <strong className="text-purple-400 font-bold">{activeTooltip.focusMinutes}</strong> 分钟</span>
          </div>
        </motion.div>
      )}
    </SquircleCard>
  );
};
