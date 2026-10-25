import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheckBig, Copy, Flame, PartyPopper, Timer, Trophy } from 'lucide-react';
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
import { Row, RowIcon, Section } from '../ui/List';
import { SegmentedControl } from '../ui/controls';

const DAY_LABELS = ['一', '', '三', '', '五', '', '日'];

const LEVEL_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-theme-card-subtle',
  1: 'bg-theme-accent/25',
  2: 'bg-theme-accent/50',
  3: 'bg-theme-accent/75',
  4: 'bg-theme-accent',
};

const StatTile: React.FC<{ icon: React.ComponentType<{ className?: string }>; tone: string; label: string; value: React.ReactNode; unit: string }> = ({
  icon: Icon,
  tone,
  label,
  value,
  unit,
}) => (
  <div className="bg-theme-card rounded-squircle-md shadow-squircle p-4">
    <div className={`flex items-center gap-1.5 text-footnote font-semibold ${tone}`}>
      <Icon className="w-4 h-4" />
      {label}
    </div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-title1 font-bold text-theme-text tabular-nums">{value}</span>
      <span className="text-footnote text-theme-text-secondary">{unit}</span>
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
    <Section title="打卡记录" variant="card">
      <SegmentedControl
        value={range}
        onChange={setRange}
        options={[
          { value: 'quarter', label: '近 14 周' },
          { value: 'year', label: '近一年' },
        ]}
      />
      <div ref={scroller} className="overflow-x-auto no-scrollbar">
        <div className="min-w-fit flex gap-1.5">
          <div className="flex flex-col gap-[3px] pr-0.5 text-[9px] text-theme-text-muted select-none">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-3.5 leading-[14px]">
                {label}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-[3px]">
            {rows.map((row, r) => (
              <div key={r} className="flex gap-[3px]">
                {row.map(cell => (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => {
                      setSelected(cell);
                      haptic('light');
                    }}
                    className={`w-3.5 h-3.5 rounded-[3px] ${LEVEL_CLASSES[cell.level]} ${selected?.dateKey === cell.dateKey ? 'ring-2 ring-theme-text ring-offset-1 ring-offset-theme-card' : ''}`}
                    aria-label={`${cell.dateKey}：完成 ${cell.taskCount} 项，专注 ${cell.focusMinutes} 分钟`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 text-caption2 text-theme-text-muted">
        少
        {([0, 1, 2, 3, 4] as HeatLevel[]).map(level => (
          <span key={level} className={`w-2.5 h-2.5 rounded-[2px] ${LEVEL_CLASSES[level]}`} />
        ))}
        多
      </div>
      {selected && (
        <div className="border-t border-theme-border pt-3 space-y-1">
          <p className="text-callout text-theme-text">
            <span className="font-semibold">{selected.dateKey}</span>
            <span className="text-theme-text-secondary">
              {' '}
              · 完成 {selected.taskCount} 项 · 专注 {selected.focusMinutes} 分钟
            </span>
          </p>
          {titles.length > 0 && <p className="text-footnote text-theme-text-secondary">{titles.join('、')}</p>}
        </div>
      )}
    </Section>
  );
};

const BadgeWall: React.FC<{ badges: Badge[] }> = ({ badges }) => {
  const [selected, setSelected] = useState<Badge | null>(null);
  const unlocked = badges.filter(b => b.unlocked).length;
  return (
    <Section title={`勋章 ${unlocked}/${badges.length}`} variant="card">
      <div className="grid grid-cols-4 gap-y-4">
        {badges.map(b => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setSelected(selected?.id === b.id ? null : b);
              haptic('light');
            }}
            className={`flex flex-col items-center gap-1 ${b.unlocked ? '' : 'opacity-35 grayscale'}`}
          >
            <span className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${selected?.id === b.id ? 'bg-theme-accent-subtle' : 'bg-theme-card-subtle'}`}>
              {b.icon}
            </span>
            <span className="text-caption text-theme-text truncate max-w-full">{b.title}</span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="border-t border-theme-border pt-3 text-callout text-theme-text-secondary">
          <span className="font-semibold text-theme-text">{selected.title}</span> · {selected.desc} ·{' '}
          <span className={selected.unlocked ? 'text-emerald-600 dark:text-emerald-400' : ''}>{selected.progressText}</span>
        </p>
      )}
    </Section>
  );
};

/** "成就" tab: streaks, heatmap, completion mix, badges and a shareable report. */
export const AnalyticsTab: React.FC = () => {
  const tasks = useTaskStore(s => s.tasks);
  const history = useFocusStore(s => s.history);
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
      mix: priorityMix(tasks),
      badges: computeBadges({ completedCount, streak: longest, focusMinutes }),
    };
  }, [tasks, history]);

  const { activity, streak, longest, completedCount, focusHours, mix, badges } = stats;

  const copyReport = async () => {
    const report = [
      `圆润灵动待办 · ${todayKey}`,
      `连续打卡 ${streak} 天，累计完成 ${completedCount} 项，专注 ${focusHours} 小时，解锁勋章 ${badges.filter(b => b.unlocked).length}/${badges.length}。`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      haptic('success');
      toast.success('战报已复制');
    } catch {
      haptic('error');
      toast.error('当前环境不支持复制');
    }
  };

  const verdict =
    mix.total === 0
      ? '完成第一项待办后，这里会显示你的完成构成。'
      : streak >= 7
        ? `已经连续 ${streak} 天保持节奏，继续加油。`
        : mix.urgentPct > 40
          ? '最近紧急事项比较多，记得给长期目标留出时间。'
          : '节奏稳定，重点明确。';

  const mixRows = [
    { label: '紧急', count: mix.urgent, pct: mix.urgentPct, bar: 'bg-rose-500' },
    { label: '重要', count: mix.high, pct: mix.highPct, bar: 'bg-amber-500' },
    { label: '日常', count: mix.routine, pct: mix.routinePct, bar: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Flame} tone="text-orange-500" label="连续打卡" value={streak} unit="天" />
        <StatTile icon={Trophy} tone="text-amber-500" label="最长记录" value={longest} unit="天" />
        <StatTile icon={CircleCheckBig} tone="text-theme-accent" label="累计完成" value={completedCount} unit="项" />
        <StatTile icon={Timer} tone="text-purple-500" label="专注时长" value={focusHours} unit="小时" />
      </div>

      <Heatmap activity={activity} />

      <Section title="完成构成" variant="card" footer={verdict}>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-theme-card-subtle">
          {mixRows.map(r => (
            <div key={r.label} className={`${r.bar} transition-all duration-500`} style={{ width: `${r.pct}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-3">
          {mixRows.map(r => (
            <div key={r.label}>
              <div className="flex items-center gap-1.5 text-footnote text-theme-text-secondary">
                <span className={`w-2 h-2 rounded-full ${r.bar}`} />
                {r.label}
              </div>
              <div className="text-headline font-semibold text-theme-text tabular-nums">
                {r.count}
                <span className="text-footnote font-normal text-theme-text-muted"> · {r.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <BadgeWall badges={badges} />

      <Section>
        <Row leading={<RowIcon icon={Copy} className="bg-blue-500 text-white" />} title="复制今日战报" onClick={copyReport} />
        <Row
          leading={<RowIcon icon={PartyPopper} className="bg-pink-500 text-white" />}
          title="为自己喝彩"
          onClick={() => {
            haptic('success');
            celebrateMilestone();
          }}
        />
      </Section>
    </div>
  );
};
