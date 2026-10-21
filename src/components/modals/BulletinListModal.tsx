import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCheck, 
  RefreshCw, 
  X, 
  ChevronRight, 
  Pin, 
  Trash2, 
  Calendar 
} from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';
import { useBulletinStore } from '../../stores/useBulletinStore';
import { BulletinCategory } from '../../types/bulletin';

type FilterTab = 'all' | 'update_log' | 'important' | 'unread';

export const BulletinListModal: React.FC = () => {
  const { 
    bulletins, 
    readIds, 
    isListModalOpen, 
    closeListModal, 
    openDetail, 
    markAllAsRead, 
    deleteBulletin, 
    fetchBulletins, 
    isFetching,
    getUnreadCount
  } = useBulletinStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  if (!isListModalOpen) return null;

  const unreadCount = getUnreadCount();

  const filteredBulletins = bulletins.filter(b => {
    if (activeTab === 'unread') return !readIds.includes(b.id);
    if (activeTab === 'update_log') return b.category === 'update_log';
    if (activeTab === 'important') return b.category === 'important' || b.level === 'urgent' || b.level === 'important';
    return true;
  });

  const getCategoryBadge = (cat: BulletinCategory) => {
    switch (cat) {
      case 'update_log':
        return { label: '更新日志', class: 'bg-theme-accent/15 text-theme-accent border-theme-accent/30' };
      case 'important':
        return { label: '重要通知', class: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'security':
        return { label: '安全提醒', class: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
      case 'tip':
        return { label: '效率技巧', class: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      default:
        return { label: '公告', class: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/75 backdrop-blur-md">
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
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-squircle bg-theme-accent/20 border border-theme-accent/30 flex items-center justify-center text-theme-accent shadow-sm">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-theme-text leading-tight">
                    通知公告与更新日志
                  </h3>
                  {unreadCount > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                      {unreadCount} 未读
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                      全部已读
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-theme-text-muted mt-0.5">
                  版本更新亮点 · 重要通知 · 系统公告中心
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={closeListModal}
                className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text shrink-0 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Filter Pills */}
          <div className="px-4 py-2.5 border-b border-theme-border/40 flex items-center justify-between bg-theme-card/30">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-theme-accent text-theme-accent-contrast shadow-sm'
                    : 'text-theme-text-secondary hover:bg-theme-card-subtle'
                }`}
              >
                全部 ({bulletins.length})
              </button>
              <button
                onClick={() => setActiveTab('update_log')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'update_log'
                    ? 'bg-theme-accent text-theme-accent-contrast shadow-sm'
                    : 'text-theme-text-secondary hover:bg-theme-card-subtle'
                }`}
              >
                更新日志
              </button>
              <button
                onClick={() => setActiveTab('important')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'important'
                    ? 'bg-theme-accent text-theme-accent-contrast shadow-sm'
                    : 'text-theme-text-secondary hover:bg-theme-card-subtle'
                }`}
              >
                重要通知
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'unread'
                    ? 'bg-theme-accent text-theme-accent-contrast shadow-sm'
                    : 'text-theme-text-secondary hover:bg-theme-card-subtle'
                }`}
              >
                未读 ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-theme-accent font-semibold hover:underline flex items-center space-x-0.5 shrink-0 ml-2"
                title="将当前所有公告标记为已读"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>全部已读</span>
              </button>
            )}
          </div>

          {/* Bulletin List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredBulletins.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Bell className="w-8 h-8 text-theme-text-muted/40 mx-auto" />
                <p className="text-xs text-theme-text-muted font-medium">当前分类暂无通知公告</p>
                <p className="text-[11px] text-theme-text-muted/70">开发者发布更新或通知后将在此展示</p>
              </div>
            ) : (
              filteredBulletins.map(b => {
                const isRead = readIds.includes(b.id);
                const badge = getCategoryBadge(b.category);

                return (
                  <motion.div
                    key={b.id}
                    layout
                    onClick={() => openDetail(b)}
                    className={`p-3 rounded-squircle border transition-all cursor-pointer relative overflow-hidden group select-none active:scale-[0.99] ${
                      !isRead 
                        ? 'bg-theme-card border-theme-accent/40 shadow-sm ring-1 ring-theme-accent/15' 
                        : 'bg-theme-card/70 border-theme-border/60 hover:border-theme-border hover:bg-theme-card'
                    }`}
                  >
                    {/* Top Row: Category, Pinned, Date & Unread Dot */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${badge.class} font-bold`}>
                          {badge.label}
                        </span>
                        {b.pinned && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-accent/15 text-theme-accent border border-theme-accent/30 flex items-center space-x-0.5 font-bold">
                            <Pin className="w-2.5 h-2.5" />
                            <span>置顶</span>
                          </span>
                        )}
                        {!isRead && (
                          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="未读公告" />
                        )}
                      </div>

                      <span className="text-[10px] text-theme-text-muted flex items-center space-x-1 font-mono">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{b.publishedAt}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className={`text-xs font-bold leading-snug mb-1 ${
                      !isRead ? 'text-theme-text' : 'text-theme-text/85 group-hover:text-theme-text'
                    }`}>
                      {b.title}
                    </h4>

                    {/* Summary */}
                    {b.summary && (
                      <p className="text-[11px] text-theme-text-secondary leading-relaxed line-clamp-2">
                        {b.summary}
                      </p>
                    )}

                    {/* Card Footer: Action Hint & Delete */}
                    <div className="mt-2 pt-1.5 border-t border-theme-border/30 flex items-center justify-between text-[10px] text-theme-text-muted">
                      <div className="flex items-center space-x-1.5">
                        {b.author && <span>发布人：{b.author}</span>}
                        {b.tags && b.tags.slice(0, 2).map((tag, tIdx) => (
                          <span key={tIdx} className="px-1.5 py-0.2 rounded-full bg-theme-card-subtle text-theme-text-secondary">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Allow deleting custom non-default bulletins */}
                        {!b.id.startsWith('notice-v135') && !b.id.startsWith('notice-security') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBulletin(b.id);
                            }}
                            className="p-1 rounded hover:bg-rose-500/15 text-theme-text-muted hover:text-rose-500 transition-colors"
                            title="删除此公告"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(b);
                          }}
                          className="flex items-center space-x-0.5 text-theme-accent font-semibold group-hover:translate-x-0.5 transition-transform p-1 hover:underline"
                        >
                          <span>查看详情</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 border-t border-theme-border/60 flex items-center justify-between bg-theme-card/70 backdrop-blur-xl shrink-0">
            <button
              onClick={() => fetchBulletins(false)}
              disabled={isFetching}
              className="py-2 px-3 rounded-squircle border border-theme-border text-xs font-semibold text-theme-text hover:bg-theme-card-subtle transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-theme-accent' : ''}`} />
              <span>{isFetching ? '正在刷新...' : '刷新列表'}</span>
            </button>

            <button
              onClick={closeListModal}
              className="py-2 px-5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 transition-all"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
