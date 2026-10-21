import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Sparkles, 
  GraduationCap, 
  Palette, 
  Briefcase, 
  Award, 
  Share2, 
  Copy, 
  Check, 
  Target,
  Zap
} from 'lucide-react';
import { SquircleCard } from '../common/SquircleCard';
import { useTaskStore } from '../../stores/useTaskStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useToastStore } from '../../stores/useToastStore';
import { triggerMilestoneCelebration } from '../common/ConfettiBurst';
import { nativeBridge } from '../../utils/bridge';

interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  taskCount: number;
  focusMinutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface BadgeItem {
  id: string;
  title: string;
  icon: string;
  desc: string;
  unlocked: boolean;
  progressText: string;
  unlockedAt?: string;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const LEVEL_COLOR_MAP: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-slate-300/40 dark:bg-white/5 border border-slate-300/60 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/20',
  1: 'bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:border-emerald-400',
  2: 'bg-emerald-500/50 border border-emerald-500/60 text-emerald-200 hover:border-emerald-300',
  3: 'bg-emerald-500/80 border border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  4: 'bg-emerald-400 border border-emerald-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(52,211,153,0.7)]',
};

export const AnalyticsTab: React.FC = () => {
  const { tasks } = useTaskStore();
  const { focusHistory } = useFocusStore();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();

  // Heatmap View Mode: 14-week (quarter) vs 365-day (year)
  const [heatmapMode, setHeatmapMode] = useState<'quarter' | 'year'>('quarter');
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [heatmapMode]);

  // Selected Badge modal
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  // Report Card copied state
  const [hasCopiedReport, setHasCopiedReport] = useState(false);

  // Memoized 365-day aggregation, streaks, heatmap grid, domains, and badges
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const {
    dateActivityMap,
    currentStreak,
    longestStreak,
    totalCompletedCount,
    totalFocusHours,
    todayCompletedCount,
    todayActive,
    rows,
    examCompleted,
    artCompleted,
    workCompleted,
    totalDomainCompleted,
    examPct,
    artPct,
    workPct,
    badges,
    unlockedBadgesCount
  } = useMemo(() => {
    // 1. Gather all activity dates
    const dateActivityMap: Record<string, { taskCount: number; focusMinutes: number; titles: string[] }> = {};

    tasks.forEach((t) => {
      if (t.completed || t.isCompleted) {
        const d = (t.completedAt || t.updatedAt || '').slice(0, 10);
        if (d) {
          if (!dateActivityMap[d]) dateActivityMap[d] = { taskCount: 0, focusMinutes: 0, titles: [] };
          dateActivityMap[d].taskCount += 1;
          if (!dateActivityMap[d].titles.includes(t.title)) {
            dateActivityMap[d].titles.push(t.title);
          }
        }
      }
      if (Array.isArray(t.historyDates)) {
        t.historyDates.forEach((hd) => {
          if (hd) {
            if (!dateActivityMap[hd]) dateActivityMap[hd] = { taskCount: 0, focusMinutes: 0, titles: [] };
            dateActivityMap[hd].taskCount += 1;
            if (!dateActivityMap[hd].titles.includes(hd)) {
              dateActivityMap[hd].titles.push(t.title);
            }
          }
        });
      }
    });

    focusHistory.forEach((fh) => {
      const d = fh.date;
      if (d) {
        if (!dateActivityMap[d]) dateActivityMap[d] = { taskCount: 0, focusMinutes: 0, titles: [] };
        dateActivityMap[d].focusMinutes += fh.durationMinutes;
        if (fh.taskTitle && !dateActivityMap[d].titles.includes(fh.taskTitle)) {
          dateActivityMap[d].titles.push(`[专注 ${fh.durationMinutes}m] ${fh.taskTitle}`);
        }
      }
    });

    // 2. Streaks calculation
    const today = new Date();
    let currentStreak = 0;
    let checkDate = new Date(today);
    const todayActive = Boolean(
      dateActivityMap[todayStr] &&
      (dateActivityMap[todayStr].taskCount > 0 || dateActivityMap[todayStr].focusMinutes > 0)
    );
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

    const completedTasks = tasks.filter(t => t.completed || t.isCompleted);
    const totalCompletedCount = completedTasks.length;
    const totalFocusMinutes = focusHistory.reduce((acc, f) => acc + f.durationMinutes, 0);
    const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);
    const longestStreak = currentStreak;
    const todayCompletedCount = dateActivityMap[todayStr]?.taskCount || 0;

    // 3. Grid Generation: 14 Weeks vs 52 Weeks (364 Days)
    const totalWeeks = heatmapMode === 'quarter' ? 14 : 52;
    const totalDays = totalWeeks * 7;
    const daysGrid: DayActivity[] = [];

    const endDay = new Date(today);
    const dayOfWeek = endDay.getDay(); // 0 is Sunday
    const offsetToSunday = (7 - dayOfWeek) % 7;
    endDay.setDate(endDay.getDate() + offsetToSunday);

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(endDay);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const act = dateActivityMap[dateStr] || { taskCount: 0, focusMinutes: 0, titles: [] };

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

    const rows: DayActivity[][] = [[], [], [], [], [], [], []];
    daysGrid.forEach((d) => {
      const rowIndex = d.dayOfWeek === 0 ? 6 : d.dayOfWeek - 1;
      rows[rowIndex].push(d);
    });

    // 4. Energy Distribution across 3 Domains: Exam, Art, Work
    const examCompleted = tasks.filter(t => (t.completed || t.isCompleted) && (t.persona === 'exam' || t.category === 'exam')).length;
    const artCompleted = tasks.filter(t => (t.completed || t.isCompleted) && (t.persona === 'art' || t.category === 'art')).length;
    const workCompleted = tasks.filter(t => (t.completed || t.isCompleted) && (t.persona === 'security' || t.persona === 'general' || t.category === 'daily' || t.category === 'emergency')).length;

    const totalDomainCompleted = examCompleted + artCompleted + workCompleted;
    const examPct = totalDomainCompleted > 0 ? Math.round((examCompleted / totalDomainCompleted) * 100) : 0;
    const artPct = totalDomainCompleted > 0 ? Math.round((artCompleted / totalDomainCompleted) * 100) : 0;
    const workPct = totalDomainCompleted > 0 ? Math.max(0, 100 - examPct - artPct) : 0;

    // 5. Badges Wall Data
    const resolvedEmergencies = tasks.filter(t => (t.isEmergency || t.periodType === 'emergency') && (t.completed || t.isCompleted)).length;
    const badges: BadgeItem[] = [
      {
        id: 'first_step',
        title: '初露锋芒',
        icon: '🌟',
        desc: '顺利完成人生待办清单中的第 1 项任务',
        unlocked: totalCompletedCount >= 1,
        progressText: totalCompletedCount >= 1 ? '已达成' : `${totalCompletedCount}/1 项`,
        unlockedAt: '初始里程碑',
      },
      {
        id: 'seven_days',
        title: '七日流光',
        icon: '🔥',
        desc: '连续 7 天不间断保持任务打卡或专注',
        unlocked: currentStreak >= 7 || longestStreak >= 7,
        progressText: (currentStreak >= 7 || longestStreak >= 7) ? '已达成' : `${currentStreak}/7 天`,
        unlockedAt: '连续打卡卓越',
      },
      {
        id: 'deep_flow',
        title: '心流探索者',
        icon: '⏳',
        desc: '累计深度番茄钟专注时长超过 60 分钟',
        unlocked: totalFocusMinutes >= 60,
        progressText: totalFocusMinutes >= 60 ? '已达成' : `${totalFocusMinutes}/60 分钟`,
        unlockedAt: '专注达人认证',
      },
      {
        id: 'emergency_shield',
        title: '敏捷防线',
        icon: '🚨',
        desc: '成功响应并闭环处置至少 1 起工作突发事件',
        unlocked: resolvedEmergencies >= 1,
        progressText: resolvedEmergencies >= 1 ? '已达成' : `${resolvedEmergencies}/1 起突发`,
        unlockedAt: '突发处置专家',
      },
      {
        id: 'art_creator',
        title: '灵感造物',
        icon: '🎨',
        desc: '推进或完成绘画商业画稿企划',
        unlocked: artCompleted >= 1,
        progressText: artCompleted >= 1 ? '已达成' : `${artCompleted}/1 企划`,
        unlockedAt: '艺术灵感认证',
      },
      {
        id: 'exam_scholar',
        title: '研途破浪',
        icon: '📚',
        desc: '完成考研核心背诵或真题模拟练习',
        unlocked: examCompleted >= 2,
        progressText: examCompleted >= 2 ? '已达成' : `${examCompleted}/2 项备考`,
        unlockedAt: '上岸先锋',
      },
      {
        id: 'zenith_master',
        title: '知行合一',
        icon: '👑',
        desc: '在考研、绘画、工作中实现多维精力全面推进',
        unlocked: examCompleted >= 1 && artCompleted >= 1 && workCompleted >= 1,
        progressText: (examCompleted >= 1 && artCompleted >= 1 && workCompleted >= 1) ? '已达成' : '需各领域各完成 1 项',
        unlockedAt: '全能自律大师',
      },
      {
        id: 'hundred_tasks',
        title: '百炼成钢',
        icon: '🏆',
        desc: '累计完成超过 20 项待办事项',
        unlocked: totalCompletedCount >= 20,
        progressText: totalCompletedCount >= 20 ? '已达成' : `${totalCompletedCount}/20 项`,
        unlockedAt: '坚韧不拔荣耀',
      },
    ];

    const unlockedBadgesCount = badges.filter(b => b.unlocked).length;

    return {
      dateActivityMap,
      currentStreak,
      longestStreak,
      totalCompletedCount,
      totalFocusHours,
      todayCompletedCount,
      todayActive,
      rows,
      examCompleted,
      artCompleted,
      workCompleted,
      totalDomainCompleted,
      examPct,
      artPct,
      workPct,
      badges,
      unlockedBadgesCount
    };
  }, [tasks, focusHistory, heatmapMode, todayStr]);

  // Handle Share / Copy Report Card
  const handleCopyReport = () => {
    const reportText = `✨ 圆润灵动待办 · 成就战报 ✨\n📅 日期: ${todayStr}\n🔥 连续打卡: ${currentStreak} 天\n⏳ 累计专注: ${totalFocusHours} 小时\n✅ 累计达成: ${totalCompletedCount} 项待办\n🏅 解锁勋章: ${unlockedBadgesCount}/${badges.length} 枚\n💡 寄语: 保持专注，心流所向，素履以往！`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText).then(() => {
        setHasCopiedReport(true);
        setTimeout(() => setHasCopiedReport(false), 2500);
      });
    }
    nativeBridge.performHapticFeedback('success');
    triggerMilestoneCelebration(theme);
    showToast('已复制今日打卡成就战报！可分享至微信或朋友圈 ✨', 'success');
  };

  return (
    <div className="space-y-4 pb-40">
      {/* 1. 顶部总览：连续打卡与核心指标卡片 (Streak Hero Banner) */}
      <SquircleCard className="relative overflow-hidden p-4 border border-theme-border/80 shadow-squircle bg-gradient-to-br from-theme-card via-theme-card to-theme-accent/10">
        {/* Specular Edge Top Reflection */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent" 
        />

        <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-squircle bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-500 shadow-sm">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="text-base font-black text-theme-text tracking-tight">
                  连续打卡 {currentStreak} 天
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold">
                  燃力心流
                </span>
              </div>
              <p className="text-[11px] text-theme-text-muted mt-0.5">
                {todayActive ? `今日已完成打卡 · 达成 ${todayCompletedCount} 项待办` : '今日尚未完成打卡，快来开启新的一天'}
              </p>
            </div>
          </div>
        </div>

        {/* 4 核心量化指标格 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
            <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
              <Flame className="w-2.5 h-2.5 text-amber-500" />
              <span>当前连击</span>
            </div>
            <div className="text-base font-black text-amber-500 mt-0.5">
              {currentStreak}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">天</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
            <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
              <Trophy className="w-2.5 h-2.5 text-emerald-500" />
              <span>最长记录</span>
            </div>
            <div className="text-base font-black text-emerald-500 mt-0.5">
              {longestStreak}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">天</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
            <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-blue-500" />
              <span>累计达成</span>
            </div>
            <div className="text-base font-black text-blue-500 mt-0.5">
              {totalCompletedCount}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">项</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
            <div className="text-[10px] text-theme-text-muted flex items-center justify-center space-x-0.5">
              <Clock className="w-2.5 h-2.5 text-purple-500" />
              <span>深度专注</span>
            </div>
            <div className="text-base font-black text-purple-500 mt-0.5">
              {totalFocusHours}<span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">h</span>
            </div>
          </div>
        </div>
      </SquircleCard>

      {/* 2. 翡翠微光热力图中心 (Interactive Heatmap Studio) */}
      <SquircleCard className="relative overflow-hidden p-4 border border-white/20 dark:border-white/10 shadow-squircle">
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" 
        />

        {/* Heatmap Top Switcher */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
              打卡热力图谱 · 历史心流沉淀
            </h3>
          </div>

          <div className="flex items-center space-x-1 p-0.5 bg-theme-card-subtle rounded-full border border-theme-border/60">
            <button
              onClick={() => {
                setHeatmapMode('quarter');
                nativeBridge.performHapticFeedback('light');
              }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                heatmapMode === 'quarter'
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
            >
              近 14 周
            </button>
            <button
              onClick={() => {
                setHeatmapMode('year');
                nativeBridge.performHapticFeedback('light');
              }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                heatmapMode === 'year'
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
            >
              全年 365 天
            </button>
          </div>
        </div>

        {/* 7 Days of the week row matrix */}
        <div ref={scrollContainerRef} className="overflow-x-auto pb-1 scrollbar-none">
          <div className="min-w-fit flex space-x-1.5 items-start">
            {/* Row Day Labels */}
            <div className="flex flex-col space-y-1 pt-0.5 pr-1 text-[9px] text-theme-text-muted select-none font-mono">
              {DAY_LABELS.map((lbl, idx) => (
                <div key={idx} className="h-3 leading-3 text-center">
                  {idx % 2 === 0 ? lbl : ''}
                </div>
              ))}
            </div>

            {/* Matrix Grid */}
            <div className="flex flex-col space-y-1">
              {rows.map((row, rIdx) => (
                <div key={rIdx} className="flex space-x-1">
                  {row.map((day) => {
                    const isSelected = selectedDay?.dateStr === day.dateStr;
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          nativeBridge.performHapticFeedback('light');
                        }}
                        className={`w-3 h-3 rounded-[3px] transition-all transform active:scale-125 ${
                          LEVEL_COLOR_MAP[day.level]
                        } ${isSelected ? 'ring-2 ring-emerald-400 scale-125 z-10' : ''}`}
                        title={`${day.dateStr}: 完成 ${day.taskCount} 项, 专注 ${day.focusMinutes} 分钟`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend & Guide */}
        <div className="flex items-center justify-between text-[10px] text-theme-text-muted pt-2.5 border-t border-white/10 mt-2">
          <span>点击任意晶格查看当日完成明细</span>
          <div className="flex items-center space-x-1">
            <span>少</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white/5 border border-white/5" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/25 border border-emerald-500/30" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/50 border border-emerald-500/60" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/80 border border-emerald-400" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300" />
            <span>多</span>
          </div>
        </div>

        {/* Selected Day Floating Inspector */}
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2.5 rounded-squircle bg-emerald-500/10 border border-emerald-500/30 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{selectedDay.dateStr} 打卡档案</span>
              </span>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[11px] text-theme-text-muted hover:text-theme-text font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-theme-text">
              <span>完成待办: <strong className="text-emerald-400">{selectedDay.taskCount}</strong> 项</span>
              <span>深度专注: <strong className="text-purple-400">{selectedDay.focusMinutes}</strong> 分钟</span>
            </div>
            {dateActivityMap[selectedDay.dateStr]?.titles?.length > 0 ? (
              <div className="pt-1 border-t border-emerald-500/20 space-y-0.5">
                <span className="text-[10px] text-theme-text-muted block">当日打卡事项:</span>
                <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1">
                  {dateActivityMap[selectedDay.dateStr].titles.map((title, i) => (
                    <div key={i} className="text-[11px] text-theme-text bg-white/5 px-2 py-0.5 rounded flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-theme-text-muted pt-0.5">当日未登记具体事项详情</p>
            )}
          </motion.div>
        )}
      </SquircleCard>

      {/* 3. 三大方向精力分配与平衡图表 (Tri-Persona Energy Balance) */}
      <SquircleCard className="relative overflow-hidden p-4 border border-white/20 dark:border-white/10 shadow-squircle">
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" 
        />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-theme-accent" />
            <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
              多维精力平衡 · 考研 / 绘画 / 工作
            </h3>
          </div>
          <span className="text-[10px] text-theme-text-muted">基于已打卡任务与工时</span>
        </div>

        {/* 综合进度条 */}
        <div className="h-3 w-full bg-theme-card-subtle rounded-full overflow-hidden flex border border-white/10 p-0.5 mb-3">
          <div 
            style={{ width: `${examPct}%` }} 
            className="h-full bg-blue-500 rounded-l-full transition-all duration-500 shadow-sm" 
            title={`考研: ${examPct}%`} 
          />
          <div 
            style={{ width: `${artPct}%` }} 
            className="h-full bg-purple-500 transition-all duration-500 shadow-sm" 
            title={`绘画: ${artPct}%`} 
          />
          <div 
            style={{ width: `${workPct}%` }} 
            className="h-full bg-emerald-500 rounded-r-full transition-all duration-500 shadow-sm" 
            title={`工作: ${workPct}%`} 
          />
        </div>

        {/* 三大方向明细小卡 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-center space-x-1 text-[11px] font-bold text-blue-400">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>考研研途</span>
            </div>
            <div className="text-sm font-black text-theme-text mt-1">{examCompleted} 项</div>
            <span className="text-[10px] text-theme-text-muted">{examPct}% 精力</span>
          </div>

          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-center space-x-1 text-[11px] font-bold text-purple-400">
              <Palette className="w-3.5 h-3.5" />
              <span>商业绘画</span>
            </div>
            <div className="text-sm font-black text-theme-text mt-1">{artCompleted} 项</div>
            <span className="text-[10px] text-theme-text-muted">{artPct}% 精力</span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-center space-x-1 text-[11px] font-bold text-emerald-400">
              <Briefcase className="w-3.5 h-3.5" />
              <span>日常工作</span>
            </div>
            <div className="text-sm font-black text-theme-text mt-1">{workCompleted} 项</div>
            <span className="text-[10px] text-theme-text-muted">{workPct}% 精力</span>
          </div>
        </div>

        {/* 智能心流评语 */}
        <div className="mt-3 p-2 rounded-squircle bg-theme-card-subtle border border-theme-border/60 flex items-start space-x-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-theme-text-secondary leading-relaxed">
            {totalDomainCompleted === 0
              ? '当前暂无打卡数据，创建并完成你的第一项待办即可开始积累心流！'
              : examPct > 40 
              ? '当前精力高度倾斜在考研冲刺，各学科复习节奏扎实，继续保持高强度心流！' 
              : artPct > 40 
              ? '当前绘画商单推进热烈，灵感处于峰值阶段，注意合理穿插休息！'
              : '考研备考、艺术创作与工作交接保持平稳节奏，知行合一，多点开花！'}
          </p>
        </div>
      </SquircleCard>

      {/* 5. 里程碑成就勋章墙 (Milestone Badges Wall) */}
      <SquircleCard className="relative overflow-hidden p-4 border border-white/20 dark:border-white/10 shadow-squircle">
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" 
        />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
              里程碑勋章墙 ({unlockedBadgesCount}/{badges.length} 已解锁)
            </h3>
          </div>
          <span className="text-[10px] text-theme-text-muted">点按查看达成条件</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {badges.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setSelectedBadge(b);
                nativeBridge.performHapticFeedback('light');
              }}
              className={`p-2 rounded-squircle flex flex-col items-center justify-center text-center transition-all active:scale-95 border ${
                b.unlocked
                  ? 'bg-amber-500/15 border-amber-500/35 text-theme-text shadow-sm'
                  : 'bg-white/5 border-dashed border-white/10 text-theme-text-muted opacity-50'
              }`}
            >
              <span className="text-2xl mb-1 filter drop-shadow">{b.icon}</span>
              <span className="text-[10px] font-bold truncate w-full block">{b.title}</span>
              <span className="text-[8px] text-theme-text-muted mt-0.5">{b.unlocked ? '已解锁' : '未解锁'}</span>
            </button>
          ))}
        </div>

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 p-3 rounded-squircle bg-theme-card border border-amber-400/50 shadow-xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{selectedBadge.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-theme-text flex items-center space-x-1.5">
                    <span>{selectedBadge.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedBadge.unlocked ? 'bg-amber-500/20 text-amber-500' : 'bg-white/10 text-theme-text-muted'
                    }`}>
                      {selectedBadge.unlocked ? '已获得勋章' : '探索中'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-theme-text-muted">{selectedBadge.unlockedAt}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBadge(null)}
                className="text-xs font-bold text-theme-text-muted hover:text-theme-text"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-theme-text-secondary leading-relaxed">
              {selectedBadge.desc}
            </p>
            <div className="text-[10px] text-theme-text-muted pt-1 border-t border-white/10 flex justify-between">
              <span>当前进度: <strong className="text-theme-text">{selectedBadge.progressText}</strong></span>
              {selectedBadge.unlocked && <span className="text-amber-500 font-bold">✨ 荣耀加冕</span>}
            </div>
          </motion.div>
        )}
      </SquircleCard>

      {/* 6. 战报卡片生成与分享 (Report Card Poster) */}
      <SquircleCard className="relative overflow-hidden p-4 border border-white/20 dark:border-white/10 shadow-squircle bg-gradient-to-br from-theme-card/90 to-purple-500/10">
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" 
        />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-theme-accent" />
            <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
              每日心流打卡战报
            </h3>
          </div>
          <span className="text-[10px] text-theme-text-muted font-mono">{todayStr}</span>
        </div>

        <p className="text-xs text-theme-text-secondary leading-relaxed mb-3">
          将今天的专注足迹与达成事项一键整理成战报，分享给研友或创作社群，见证每一次坚持。
        </p>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyReport}
            className="flex-1 py-2 px-3 rounded-squircle bg-theme-accent text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all"
          >
            {hasCopiedReport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{hasCopiedReport ? '战报文本已复制！' : '复制打卡成就战报'}</span>
          </button>
          <button
            onClick={() => {
              nativeBridge.performHapticFeedback('success');
              triggerMilestoneCelebration(theme);
              showToast('🎉 愿你每一天都在心流中熠熠发光！', 'success');
            }}
            className="py-2 px-3 rounded-squircle bg-white/20 dark:bg-white/10 hover:bg-white/30 text-theme-text text-xs font-bold flex items-center space-x-1 border border-white/20 transition-all active:scale-95"
            title="放礼花庆祝"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>为自己喝彩</span>
          </button>
        </div>
      </SquircleCard>
    </div>
  );
};
