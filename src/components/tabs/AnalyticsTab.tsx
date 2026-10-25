import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Calendar as CalendarIcon, Check, CheckCircle2, Clock, Copy, Flame, Share2, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { toDateKey } from '../../domain/dates';
import {
  buildActivityMap,
  computeBadges,
  currentStreak,
  heatmapRows,
  longestStreak,
  priorityMix,
  type ActivityMap,
  type Badge,
  type HeatCell,
  type HeatLevel,
} from '../../domain/stats';
import { useTaskStore } from '../../stores/useTaskStore';
import { useFocusStore } from '../../stores/useFocusStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { celebrateMilestone } from '../../utils/confetti';
import { SquircleCard } from '../ui/SquircleCard';
import { SegmentedControl } from '../ui/controls';

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const LEVEL_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-slate-300/40 dark:bg-white/5 border border-slate-300/60 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/20',
  1: 'bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-400',
  2: 'bg-emerald-500/50 border border-emerald-500/60 hover:border-emerald-300',
  3: 'bg-emerald-500/80 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  4: 'bg-emerald-400 border border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.7)]',
};

const HEATMAP_RANGES = [
  { value: 'quarter' as const, label: '近 14 周', activeClassName: 'bg-emerald-500 text-white shadow-2xs' },
  { value: 'year' as const, label: '全年 365 天', activeClassName: 'bg-emerald-500 text-white shadow-2xs' },
];

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <SquircleCard className={`relative overflow-hidden p-4 border border-white/20 dark:border-white/10 shadow-squircle ${className}`}>{children}</SquircleCard>
);

const CardTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }> = ({ icon, children, aside }) => (
  <div className="flex items-center justify-between mb-3 gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0">{icon}</span>
      <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider leading-snug">{children}</h3>
    </div>
    {aside && <span className="text-[10px] text-theme-text-muted shrink-0">{aside}</span>}
  </div>
);

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; unit: string; tone: string }> = ({ icon, label, value, unit, tone }) => (
  <div className="p-2 rounded-xl bg-theme-card-subtle border border-theme-border/50 text-center">
    <div className="text-[10px] text-theme-text-muted flex items-center justify-center gap-0.5">
      {icon}
      <span>{label}</span>
    </div>
    <div className={`text-base font-black mt-0.5 ${tone}`}>
      {value}
      <span className="text-[10px] font-normal ml-0.5 text-theme-text-muted">{unit}</span>
    </div>
  </div>
);

const Heatmap: React.FC<{ activity: ActivityMap }> = ({ activity }) => {
  const [range, setRange] = useState<'quarter' | 'year'>('quarter');
  const [selected, setSelected] = useState<HeatCell | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => heatmapRows(activity, range === 'quarter' ? 14 : 52), [activity, range]);

  // Show the most recent weeks first.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [range]);

  const titles = selected ? activity[selected.dateKey]?.titles ?? [] : [];

  return (
    <Card>
      <CardTitle
        icon={<CalendarIcon className="w-4 h-4 text-emerald-400" />}
        aside={<SegmentedControl size="xs" value={range} onChange={setRange} options={HEATMAP_RANGES} />}
      >
        打卡热力图谱 · 历史心流沉淀
      </CardTitle>
      <div ref={scroller} className="overflow-x-auto pb-1 no-scrollbar">
        <div className="min-w-fit flex gap-1.5 items-start">
          <div className="flex flex-col gap-1 pt-0.5 pr-1 text-[9px] text-theme-text-muted select-none font-mono">
            {DAY_LABELS.map((label, i) => (
              <div key={label} className="h-3 leading-3 text-center">
                {i % 2 === 0 ? label : ''}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {rows.map((row, r) => (
              <div key={r} className="flex gap-1">
                {row.map(cell => (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => {
                      setSelected(cell);
                      haptic('light');
                    }}
                    className={`w-3 h-3 rounded-[3px] transition-all active:scale-125 ${LEVEL_CLASSES[cell.level]} ${
                      selected?.dateKey === cell.dateKey ? 'ring-2 ring-emerald-400 scale-125 z-10' : ''
                    }`}
                    title={`${cell.dateKey}: 完成 ${cell.taskCount} 项, 专注 ${cell.focusMinutes} 分钟`}
                    aria-label={`${cell.dateKey}: 完成 ${cell.taskCount} 项, 专注 ${cell.focusMinutes} 分钟`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-theme-text-muted pt-2.5 border-t border-white/10 mt-2">
        <span>点击任意晶格查看当日完成明细</span>
        <div className="flex items-center gap-1">
          <span>少</span>
          {([0, 1, 2, 3, 4] as HeatLevel[]).map(level => (
            <div key={level} className={`w-2.5 h-2.5 rounded-[2px] ${LEVEL_CLASSES[level]}`} />
          ))}
          <span>多</span>
        </div>
      </div>
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2.5 rounded-squircle bg-emerald-500/10 border border-emerald-500/30 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{selected.dateKey} 打卡档案</span>
            </span>
            <button onClick={() => setSelected(null)} className="text-[11px] text-theme-text-muted hover:text-theme-text font-bold" aria-label="关闭">
              ✕
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-theme-text">
            <span>
              完成待办: <strong className="text-emerald-400">{selected.taskCount}</strong> 项
            </span>
            <span>
              深度专注: <strong className="text-purple-400">{selected.focusMinutes}</strong> 分钟
            </span>
          </div>
          {titles.length > 0 ? (
            <div className="pt-1 border-t border-emerald-500/20 space-y-0.5">
              <span className="text-[10px] text-theme-text-muted block">当日打卡事项:</span>
              <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1">
                {titles.map((title, i) => (
                  <div key={i} className="text-[11px] text-theme-text bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
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
    </Card>
  );
};

const BadgeWall: React.FC<{ badges: Badge[] }> = ({ badges }) => {
  const [selected, setSelected] = useState<Badge | null>(null);
  const unlocked = badges.filter(b => b.unlocked).length;
  return (
    <Card>
      <CardTitle icon={<Award className="w-4 h-4 text-amber-500" />} aside="点按查看达成条件">
        里程碑勋章墙 ({unlocked}/{badges.length} 已解锁)
      </CardTitle>
      <div className="grid grid-cols-4 gap-2">
        {badges.map(b => (
          <button
            key={b.id}
            onClick={() => {
              setSelected(b);
              haptic('light');
            }}
            className={`p-2 rounded-squircle flex flex-col items-center justify-center text-center transition-all active:scale-95 border ${
              b.unlocked ? 'bg-amber-500/15 border-amber-500/35 text-theme-text shadow-sm' : 'bg-white/5 border-dashed border-white/10 text-theme-text-muted opacity-50'
            }`}
          >
            <span className="text-2xl mb-1 drop-shadow">{b.icon}</span>
            <span className="text-[10px] font-bold truncate w-full block">{b.title}</span>
            <span className="text-[8px] text-theme-text-muted mt-0.5">{b.unlocked ? '已解锁' : '未解锁'}</span>
          </button>
        ))}
      </div>
      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 p-3 rounded-squircle bg-theme-card border border-amber-400/50 shadow-xl space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selected.icon}</span>
              <div>
                <h4 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
                  <span>{selected.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-px rounded-full font-bold ${selected.unlocked ? 'bg-amber-500/20 text-amber-500' : 'bg-white/10 text-theme-text-muted'}`}
                  >
                    {selected.unlocked ? '已获得勋章' : '探索中'}
                  </span>
                </h4>
                <p className="text-[10px] text-theme-text-muted">{selected.unlockedAt}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs font-bold text-theme-text-muted hover:text-theme-text" aria-label="关闭">
              ✕
            </button>
          </div>
          <p className="text-xs text-theme-text-secondary leading-relaxed">{selected.desc}</p>
          <div className="text-[10px] text-theme-text-muted pt-1 border-t border-white/10 flex justify-between">
            <span>
              当前进度: <strong className="text-theme-text">{selected.progressText}</strong>
            </span>
            {selected.unlocked && <span className="text-amber-500 font-bold">✨ 荣耀加冕</span>}
          </div>
        </motion.div>
      )}
    </Card>
  );
};

/** "成就" tab: streaks, heatmap, priority mix, badges and a shareable report. */
export const AnalyticsTab: React.FC = () => {
  const tasks = useTaskStore(s => s.tasks);
  const history = useFocusStore(s => s.history);
  const [copied, setCopied] = useState(false);
  const todayKey = toDateKey();

  const stats = useMemo(() => {
    const activity = buildActivityMap(tasks, history);
    const streak = currentStreak(activity);
    const longest = Math.max(streak, longestStreak(activity));
    const completedCount = tasks.filter(t => t.completed).length;
    const focusMinutes = history.reduce((sum, r) => sum + r.durationMinutes, 0);
    return {
      activity,
      streak,
      longest,
      completedCount,
      focusHours: (focusMinutes / 60).toFixed(1),
      today: activity[todayKey],
      mix: priorityMix(tasks),
      badges: computeBadges({ completedCount, streak: longest, focusMinutes }),
    };
  }, [tasks, history, todayKey]);

  const { activity, streak, longest, completedCount, focusHours, today, mix, badges } = stats;
  const todayActive = Boolean(today && (today.taskCount > 0 || today.focusMinutes > 0));
  const unlocked = badges.filter(b => b.unlocked).length;

  const copyReport = async () => {
    const report = [
      '✨ 圆润灵动待办 · 成就战报 ✨',
      `📅 日期: ${todayKey}`,
      `🔥 连续打卡: ${streak} 天`,
      `⏳ 累计专注: ${focusHours} 小时`,
      `✅ 累计达成: ${completedCount} 项待办`,
      `🏅 解锁勋章: ${unlocked}/${badges.length} 枚`,
      '💡 寄语: 保持专注，心流所向，素履以往！',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      haptic('success');
      celebrateMilestone();
      toast.success('已复制今日打卡成就战报！可分享至微信或朋友圈 ✨');
    } catch {
      haptic('error');
      toast.error('当前环境不支持复制到剪贴板');
    }
  };

  const verdict =
    mix.total === 0
      ? '当前暂无打卡数据，创建并完成你的第一项待办即可开始积累心流！'
      : streak >= 7
        ? `已保持连续 ${streak} 天高质量自律，待办事项按部就班推进，持续保持专注节奏！`
        : mix.urgentPct > 40
          ? '近期突发与紧急事项响应迅速，建议合理平衡长期目标与日常常规事项！'
          : '任务执行节奏稳健，重点明确，知行合一，多点开花！';

  return (
    <div className="space-y-4 pb-40">
      <Card className="bg-gradient-to-br from-theme-card via-theme-card to-theme-accent/10">
        <div className="flex items-center gap-2.5 mb-3.5 pb-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-squircle bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-500 shadow-sm">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-theme-text tracking-tight">连续打卡 {streak} 天</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold">燃力心流</span>
            </div>
            <p className="text-[11px] text-theme-text-muted mt-0.5">
              {todayActive ? `今日已完成打卡 · 达成 ${today?.taskCount ?? 0} 项待办` : '今日尚未完成打卡，快来开启新的一天'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Metric icon={<Flame className="w-2.5 h-2.5 text-amber-500" />} label="当前连击" value={streak} unit="天" tone="text-amber-500" />
          <Metric icon={<Trophy className="w-2.5 h-2.5 text-emerald-500" />} label="最长记录" value={longest} unit="天" tone="text-emerald-500" />
          <Metric icon={<CheckCircle2 className="w-2.5 h-2.5 text-blue-500" />} label="累计达成" value={completedCount} unit="项" tone="text-blue-500" />
          <Metric icon={<Clock className="w-2.5 h-2.5 text-purple-500" />} label="深度专注" value={focusHours} unit="h" tone="text-purple-500" />
        </div>
      </Card>

      <Heatmap activity={activity} />

      <Card>
        <CardTitle icon={<Target className="w-4 h-4 text-theme-accent" />} aside="基于已打卡任务与专注积累">
          全域执行效能 · 优先级与结构分布
        </CardTitle>
        <div className="h-3 w-full bg-theme-card-subtle rounded-full overflow-hidden flex border border-white/10 p-0.5 mb-3">
          <div style={{ width: `${mix.urgentPct}%` }} className="h-full bg-rose-500 rounded-l-full transition-all duration-500" title={`紧急/突发: ${mix.urgentPct}%`} />
          <div style={{ width: `${mix.highPct}%` }} className="h-full bg-amber-500 transition-all duration-500" title={`重要高优: ${mix.highPct}%`} />
          <div style={{ width: `${mix.routinePct}%` }} className="h-full bg-emerald-500 rounded-r-full transition-all duration-500" title={`日常常规: ${mix.routinePct}%`} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: '紧急突发', icon: Zap, count: mix.urgent, pct: mix.urgentPct, box: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-500' },
            { label: '重要核心', icon: Target, count: mix.high, pct: mix.highPct, box: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-500' },
            { label: '日常稳步', icon: CheckCircle2, count: mix.routine, pct: mix.routinePct, box: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-500' },
          ].map(({ label, icon: Icon, count, pct, box, text }) => (
            <div key={label} className={`p-2 rounded-xl border ${box}`}>
              <div className={`flex items-center justify-center gap-1 text-[11px] font-bold ${text}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </div>
              <div className="text-sm font-black text-theme-text mt-1">{count} 项</div>
              <span className="text-[10px] text-theme-text-muted">{pct}% 占比</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 rounded-squircle bg-theme-card-subtle border border-theme-border/60 flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-theme-text-secondary leading-relaxed">{verdict}</p>
        </div>
      </Card>

      <BadgeWall badges={badges} />

      <Card className="bg-gradient-to-br from-theme-card/90 to-purple-500/10">
        <CardTitle icon={<Share2 className="w-4 h-4 text-theme-accent" />} aside={<span className="font-mono">{todayKey}</span>}>
          每日心流打卡战报
        </CardTitle>
        <p className="text-xs text-theme-text-secondary leading-relaxed mb-3">将今天的专注足迹与达成事项一键整理成战报，分享给研友或创作社群，见证每一次坚持。</p>
        <div className="flex items-center gap-2">
          <button
            onClick={copyReport}
            className="flex-1 py-2 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '战报文本已复制！' : '复制打卡成就战报'}</span>
          </button>
          <button
            onClick={() => {
              haptic('success');
              celebrateMilestone();
              toast.success('🎉 愿你每一天都在心流中熠熠发光！');
            }}
            className="py-2 px-3 rounded-squircle bg-white/20 dark:bg-white/10 hover:bg-white/30 text-theme-text text-xs font-bold flex items-center gap-1 border border-white/20 transition-all active:scale-95"
            title="放礼花庆祝"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>为自己喝彩</span>
          </button>
        </div>
      </Card>
    </div>
  );
};
