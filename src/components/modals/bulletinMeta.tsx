import React from 'react';
import { Flame, Lightbulb, Megaphone, ShieldAlert, Sparkles } from 'lucide-react';
import type { BulletinCategory, BulletinLevel } from '../../stores/useBulletinStore';

export const CATEGORY_META: Record<BulletinCategory, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  update_log: {
    label: '更新日志',
    icon: <Sparkles className="w-4 h-4 text-theme-accent" />,
    badgeClass: 'bg-theme-accent/15 text-theme-accent border-theme-accent/30',
  },
  important: {
    label: '重要通知',
    icon: <Megaphone className="w-4 h-4 text-amber-500" />,
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  security: {
    label: '安全提醒',
    icon: <ShieldAlert className="w-4 h-4 text-blue-500" />,
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  tip: {
    label: '效率贴士',
    icon: <Lightbulb className="w-4 h-4 text-emerald-500" />,
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  feature: {
    label: '功能亮点',
    icon: <Flame className="w-4 h-4 text-purple-500" />,
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
};

export const LEVEL_META: Record<BulletinLevel, { text: string; className: string }> = {
  urgent: { text: '🚨 紧急置顶', className: 'bg-rose-500/20 text-rose-500 border-rose-500/40 font-bold' },
  important: { text: '⭐ 重要', className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold' },
  info: { text: '📢 公告', className: 'bg-theme-accent/15 text-theme-accent border-theme-accent/30' },
};

/** Renders **bold** spans inside a line. */
const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="text-theme-text font-bold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

/** Minimal markdown: `### heading`, `- bullets`, `1. numbered`, **bold**. */
export const RichText: React.FC<{ source: string }> = ({ source }) => (
  <>
    {source.split('\n').map((line, i) => {
      const text = line.trim();
      if (!text) return <div key={i} className="h-2" />;
      if (text.startsWith('### ')) {
        return (
          <h4 key={i} className="text-xs font-bold text-theme-text mt-2 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-3 rounded-full bg-theme-accent shrink-0" />
            <span>{text.slice(4)}</span>
          </h4>
        );
      }
      const bullet = /^[-*]\s+(.*)/.exec(text);
      const numbered = /^(\d+)\.\s+(.*)/.exec(text);
      if (bullet || numbered) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 pl-1 text-[11px] leading-relaxed text-theme-text-secondary">
            {numbered ? (
              <span className="w-4 h-4 rounded-full bg-theme-card-subtle border border-theme-border/60 text-[10px] font-bold text-theme-accent flex items-center justify-center shrink-0 mt-0.5">
                {numbered[1]}
              </span>
            ) : (
              <span className="text-theme-accent font-black mt-0.5 shrink-0">•</span>
            )}
            <div className="flex-1">
              <Inline text={numbered ? numbered[2] : bullet![1]} />
            </div>
          </div>
        );
      }
      return (
        <p key={i} className="text-[11px] text-theme-text-secondary leading-relaxed my-1">
          <Inline text={text} />
        </p>
      );
    })}
  </>
);
