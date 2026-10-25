import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, CheckCheck, ChevronRight, Pin, Trash2 } from 'lucide-react';
import { DEFAULT_BULLETINS, useBulletinStore, useUnreadBulletinCount } from '../../stores/useBulletinStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { SquircleButton } from '../ui/SquircleButton';
import { SegmentedControl } from '../ui/controls';
import { CATEGORY_META } from './bulletinMeta';

type Filter = 'all' | 'update_log' | 'important' | 'unread';

const BUILT_IN_IDS = new Set(DEFAULT_BULLETINS.map(b => b.id));

export const BulletinListModal: React.FC = () => {
  const open = useUIStore(s => s.bulletinListOpen);
  const bulletins = useBulletinStore(s => s.bulletins);
  const readIds = useBulletinStore(s => s.readIds);
  const unread = useUnreadBulletinCount();
  const [filter, setFilter] = useState<Filter>('all');
  const close = () => useUIStore.getState().close('bulletinListOpen');

  const visible = bulletins.filter(b => {
    if (filter === 'unread') return !readIds.includes(b.id);
    if (filter === 'update_log') return b.category === 'update_log';
    if (filter === 'important') return b.category === 'important' || b.level !== 'info';
    return true;
  });

  const show = (id: string) => {
    haptic('light');
    useBulletinStore.getState().markRead(id);
    useUIStore.getState().showBulletin(id);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      variant="sheet"
      maxWidth="max-w-lg"
      icon={<Bell className="w-4.5 h-4.5" />}
      title={
        <span className="flex items-center gap-2">
          <span>通知公告与更新日志</span>
          {unread > 0 ? (
            <span className="text-[10px] px-1.5 py-px rounded-full bg-rose-500 text-white font-bold">{unread} 未读</span>
          ) : (
            <span className="text-[10px] px-1.5 py-px rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
              全部已读
            </span>
          )}
        </span>
      }
      subtitle="版本更新亮点 · 重要通知 · 系统公告中心"
      bodyClassName="p-4 space-y-2.5"
      footer={
        <div className="w-full flex justify-end">
          <SquircleButton size="sm" onClick={close}>
            关闭
          </SquircleButton>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <SegmentedControl
          appearance="chips"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `全部 (${bulletins.length})` },
            { value: 'update_log', label: '更新日志' },
            { value: 'important', label: '重要通知' },
            { value: 'unread', label: `未读 (${unread})` },
          ]}
        />
        {unread > 0 && (
          <button
            onClick={() => {
              useBulletinStore.getState().markAllRead();
              haptic('light');
              toast.success('已将所有公告标记为已读');
            }}
            className="text-[11px] text-theme-accent font-semibold hover:underline flex items-center gap-0.5 shrink-0"
            title="将当前所有公告标记为已读"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>全部已读</span>
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Bell className="w-8 h-8 text-theme-text-muted/40 mx-auto" />
          <p className="text-xs text-theme-text-muted font-medium">当前分类暂无通知公告</p>
        </div>
      ) : (
        visible.map(b => {
          const isRead = readIds.includes(b.id);
          const meta = CATEGORY_META[b.category] ?? CATEGORY_META.feature;
          return (
            <motion.div
              key={b.id}
              layout
              onClick={() => show(b.id)}
              className={`p-3 rounded-squircle border transition-all cursor-pointer group select-none active:scale-[0.99] ${
                isRead
                  ? 'bg-theme-card/70 border-theme-border/60 hover:border-theme-border hover:bg-theme-card'
                  : 'bg-theme-card border-theme-accent/40 shadow-sm ring-1 ring-theme-accent/15'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-px rounded-full border font-bold ${meta.badgeClass}`}>{meta.label}</span>
                  {b.pinned && (
                    <span className="text-[10px] px-1.5 py-px rounded-full bg-theme-accent/15 text-theme-accent border border-theme-accent/30 flex items-center gap-0.5 font-bold">
                      <Pin className="w-2.5 h-2.5" />
                      <span>置顶</span>
                    </span>
                  )}
                  {!isRead && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="未读公告" />}
                </div>
                <span className="text-[10px] text-theme-text-muted flex items-center gap-1 font-mono">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{b.publishedAt}</span>
                </span>
              </div>
              <h4 className={`text-xs font-bold leading-snug mb-1 ${isRead ? 'text-theme-text/85 group-hover:text-theme-text' : 'text-theme-text'}`}>{b.title}</h4>
              {b.summary && <p className="text-[11px] text-theme-text-secondary leading-relaxed line-clamp-2">{b.summary}</p>}
              <div className="mt-2 pt-1.5 border-t border-theme-border/30 flex items-center justify-between text-[10px] text-theme-text-muted">
                <div className="flex items-center gap-1.5 min-w-0">
                  {b.author && <span className="truncate">发布人：{b.author}</span>}
                  {b.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="px-1.5 py-px rounded-full bg-theme-card-subtle text-theme-text-secondary">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!BUILT_IN_IDS.has(b.id) && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        useBulletinStore.getState().remove(b.id);
                        toast.success('公告已移除');
                      }}
                      className="p-1 rounded hover:bg-rose-500/15 text-theme-text-muted hover:text-rose-500 transition-colors"
                      title="删除此公告"
                      aria-label="删除此公告"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <span className="flex items-center gap-0.5 text-theme-accent font-semibold group-hover:translate-x-0.5 transition-transform p-1">
                    <span>查看详情</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </Modal>
  );
};
