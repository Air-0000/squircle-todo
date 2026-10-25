import React from 'react';
import type { BulletinCategory } from '../../stores/useBulletinStore';

export const CATEGORY_META: Record<BulletinCategory, { label: string; tone: 'accent' | 'danger' | 'neutral' | 'success' }> = {
  update_log: { label: '更新日志', tone: 'accent' },
  important: { label: '重要通知', tone: 'danger' },
  security: { label: '安全提醒', tone: 'neutral' },
  tip: { label: '使用技巧', tone: 'success' },
  feature: { label: '功能介绍', tone: 'accent' },
};

/** Renders **bold** spans inside a line. */
const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold text-theme-text">
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
  <div className="space-y-2 text-body text-theme-text-secondary leading-relaxed">
    {source.split('\n').map((line, i) => {
      const text = line.trim();
      if (!text) return null;
      if (text.startsWith('### ')) {
        return (
          <h4 key={i} className="text-headline font-semibold text-theme-text pt-1">
            {text.slice(4)}
          </h4>
        );
      }
      const bullet = /^[-*]\s+(.*)/.exec(text);
      const numbered = /^(\d+)\.\s+(.*)/.exec(text);
      if (bullet || numbered) {
        return (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-4 shrink-0 text-right text-theme-text-muted tabular-nums">{numbered ? `${numbered[1]}.` : '•'}</span>
            <p className="flex-1">
              <Inline text={numbered ? numbered[2] : bullet![1]} />
            </p>
          </div>
        );
      }
      return (
        <p key={i}>
          <Inline text={text} />
        </p>
      );
    })}
  </div>
);
