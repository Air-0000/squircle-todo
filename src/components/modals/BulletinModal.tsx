import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Megaphone, 
  ShieldAlert, 
  Lightbulb, 
  Flame, 
  X, 
  Check, 
  Calendar, 
  User, 
  ArrowRight,
  Pin
} from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';
import { useBulletinStore } from '../../stores/useBulletinStore';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { BulletinCategory, BulletinLevel } from '../../types/bulletin';

const CATEGORY_CONFIG: Record<BulletinCategory, { label: string; icon: React.ReactNode; badgeClass: string }> = {
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

const LEVEL_BADGE: Record<BulletinLevel, { text: string; className: string }> = {
  urgent: { text: '🚨 紧急置顶', className: 'bg-rose-500/20 text-rose-500 border-rose-500/40 font-bold' },
  important: { text: '⭐ 重要', className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold' },
  info: { text: '📢 公告', className: 'bg-theme-accent/15 text-theme-accent border-theme-accent/30' },
};

export const BulletinModal: React.FC = () => {
  const { 
    isDetailModalOpen, 
    activeModalBulletin, 
    closeDetail 
  } = useBulletinStore();

  if (!activeModalBulletin) return null;

  const catMeta = CATEGORY_CONFIG[activeModalBulletin.category] || CATEGORY_CONFIG.important;
  const levelMeta = LEVEL_BADGE[activeModalBulletin.level] || LEVEL_BADGE.info;

  const handleAction = () => {
    closeDetail();
    if (activeModalBulletin.category === 'update_log') {
      window.open(CURRENT_APP_VERSION.githubRepo, '_blank');
    }
  };

  // Render markdown-like text lines with rich formatting
  const renderFormattedContent = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-bold text-theme-text mt-2 mb-1 flex items-center space-x-1.5">
            <span className="w-1.5 h-3 rounded-full bg-theme-accent shrink-0" />
            <span>{trimmed.replace('### ', '')}</span>
          </h4>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemContent = trimmed.slice(2);
        // Replace bold **text**
        const parts = itemContent.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={idx} className="flex items-start space-x-2 my-1 pl-1 text-[11px] leading-relaxed text-theme-text-secondary">
            <span className="text-theme-accent font-black mt-0.5 shrink-0">•</span>
            <div className="flex-1">
              {parts.map((p, pIdx) => {
                if (p.startsWith('**') && p.endsWith('**')) {
                  return <strong key={pIdx} className="text-theme-text font-bold">{p.slice(2, -2)}</strong>;
                }
                return <span key={pIdx}>{p}</span>;
              })}
            </div>
          </div>
        );
      }

      if (/^\d+\.\s/.test(trimmed)) {
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start space-x-2 my-1 pl-1 text-[11px] leading-relaxed text-theme-text-secondary">
              <span className="w-4 h-4 rounded-full bg-theme-card-subtle border border-theme-border/60 text-[10px] font-bold text-theme-accent flex items-center justify-center shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1">
                {numMatch[2].split(/(\*\*.*?\*\*)/g).map((p, pIdx) => {
                  if (p.startsWith('**') && p.endsWith('**')) {
                    return <strong key={pIdx} className="text-theme-text font-bold">{p.slice(2, -2)}</strong>;
                  }
                  return <span key={pIdx}>{p}</span>;
                })}
              </div>
            </div>
          );
        }
      }

      return (
        <p key={idx} className="text-[11px] text-theme-text-secondary leading-relaxed my-1">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <AnimatePresence>
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={SPRING_PHYSICS.defaultCard}
            className="w-full max-w-lg bg-theme-bg/95 backdrop-blur-2xl rounded-t-squircle-xl sm:rounded-squircle-xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Grabber Bar for Mobile */}
            <div className="w-10 h-1 rounded-full bg-theme-text-muted/30 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="p-4 border-b border-theme-border/60 flex items-center justify-between shrink-0 bg-theme-card/70 backdrop-blur-xl">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-squircle flex items-center justify-center shrink-0 border ${catMeta.badgeClass}`}>
                  {catMeta.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${catMeta.badgeClass} font-semibold shrink-0`}>
                      {catMeta.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${levelMeta.className} shrink-0`}>
                      {levelMeta.text}
                    </span>
                    {activeModalBulletin.pinned && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-accent/15 text-theme-accent border border-theme-accent/30 flex items-center space-x-0.5 font-bold shrink-0">
                        <Pin className="w-2.5 h-2.5" />
                        <span>置顶</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-theme-text leading-tight mt-1 truncate">
                    {activeModalBulletin.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={closeDetail}
                className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text shrink-0 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              {/* Meta bar: Date & Author */}
              <div className="flex items-center justify-between text-[11px] text-theme-text-muted px-1">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-theme-accent" />
                  <span>发布时间：{activeModalBulletin.publishedAt}</span>
                </span>
                {activeModalBulletin.author && (
                  <span className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-theme-text-secondary" />
                    <span>来源：{activeModalBulletin.author}</span>
                  </span>
                )}
              </div>

              {/* Summary Highlights Card */}
              {activeModalBulletin.summary && (
                <div className="p-3 rounded-squircle bg-theme-card border border-theme-border/70 text-xs text-theme-text font-medium leading-relaxed shadow-sm flex items-start space-x-2">
                  <div className="p-1 rounded-squircle-sm bg-theme-accent/15 text-theme-accent shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-theme-accent block text-[10px] uppercase tracking-wider mb-0.5">核心概述</span>
                    <span>{activeModalBulletin.summary}</span>
                  </div>
                </div>
              )}

              {/* Detailed Markdown Content */}
              <div className="p-3.5 rounded-squircle bg-theme-card-subtle border border-theme-border/60 space-y-1">
                {renderFormattedContent(activeModalBulletin.content)}
              </div>

              {/* Tags */}
              {activeModalBulletin.tags && activeModalBulletin.tags.length > 0 && (
                <div className="flex items-center space-x-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-theme-text-muted">标签:</span>
                  {activeModalBulletin.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-theme-card border border-theme-border/60 text-theme-text-secondary font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3.5 border-t border-theme-border/60 flex items-center justify-between space-x-2.5 bg-theme-card/70 backdrop-blur-xl shrink-0">
              <button
                type="button"
                onClick={closeDetail}
                className="flex-1 py-2.5 px-3 rounded-squircle border border-theme-border text-xs font-semibold text-theme-text hover:bg-theme-card-subtle transition-colors flex items-center justify-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>我知道了</span>
              </button>

              {(activeModalBulletin.category === 'update_log' || activeModalBulletin.actionText) && (
                <button
                  type="button"
                  onClick={handleAction}
                  className="flex-[1.4] py-2.5 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>{activeModalBulletin.actionText || '立即前往'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
