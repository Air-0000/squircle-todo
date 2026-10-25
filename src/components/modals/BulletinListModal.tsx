import React, { useState } from 'react';
import { DEFAULT_BULLETINS, useBulletinStore, useUnreadBulletinCount } from '../../stores/useBulletinStore';
import { useUIStore } from '../../stores/useUIStore';
import { haptic } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { Section } from '../ui/List';
import { TextButton } from '../ui/ModuleCard';
import { EmptyState, SegmentedControl } from '../ui/controls';
import { CATEGORY_META } from './bulletinMeta';

type Filter = 'all' | 'unread' | 'update_log';

const BUILT_IN_IDS = new Set(DEFAULT_BULLETINS.map(b => b.id));

export const BulletinListModal: React.FC = () => {
  const open = useUIStore(s => s.bulletinListOpen);
  const bulletins = useBulletinStore(s => s.bulletins);
  const readIds = useBulletinStore(s => s.readIds);
  const unread = useUnreadBulletinCount();
  const [filter, setFilter] = useState<Filter>('all');
  const close = () => useUIStore.getState().close('bulletinListOpen');

  const visible = bulletins.filter(b => (filter === 'unread' ? !readIds.includes(b.id) : filter === 'update_log' ? b.category === 'update_log' : true));

  const show = (id: string) => {
    haptic('light');
    useBulletinStore.getState().markRead(id);
    useUIStore.getState().showBulletin(id);
  };

  return (
    <Modal open={open} onClose={close} cancelLabel={null} title="通知公告" primary={{ label: '完成', onClick: close }}>
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: '全部' },
          { value: 'unread', label: unread > 0 ? `未读 ${unread}` : '未读' },
          { value: 'update_log', label: '更新日志' },
        ]}
      />

      <Section
        action={
          unread > 0 && (
            <TextButton className="h-auto px-0 text-footnote" onClick={() => useBulletinStore.getState().markAllRead()}>
              全部标为已读
            </TextButton>
          )
        }
      >
        {visible.length === 0 ? (
          <EmptyState>{filter === 'unread' ? '没有未读公告' : '暂无公告'}</EmptyState>
        ) : (
          visible.map(b => {
            const isRead = readIds.includes(b.id);
            const meta = CATEGORY_META[b.category] ?? CATEGORY_META.feature;
            return (
              <div key={b.id} className="flex items-start gap-3 pl-4">
                <span className={`mt-[19px] w-2 h-2 rounded-full shrink-0 ${isRead ? 'bg-transparent' : 'bg-theme-accent'}`} />
                <button type="button" onClick={() => show(b.id)} className="row-sep flex-1 min-w-0 text-left pr-4 py-3 border-b border-theme-border">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`text-body truncate ${isRead ? 'text-theme-text' : 'text-theme-text font-semibold'}`}>{b.title}</p>
                    <span className="text-footnote text-theme-text-muted shrink-0">{b.publishedAt.slice(5, 10)}</span>
                  </div>
                  <p className="text-footnote text-theme-text-secondary line-clamp-2 mt-0.5">
                    {meta.label} · {b.summary}
                  </p>
                  {!BUILT_IN_IDS.has(b.id) && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => {
                        e.stopPropagation();
                        useBulletinStore.getState().remove(b.id);
                      }}
                      className="inline-block mt-1 text-footnote text-rose-500"
                    >
                      删除
                    </span>
                  )}
                </button>
              </div>
            );
          })
        )}
      </Section>
    </Modal>
  );
};
