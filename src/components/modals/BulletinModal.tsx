import React from 'react';
import { ArrowRight, Calendar, Check, Pin, Sparkles, User } from 'lucide-react';
import { useBulletinStore, type Bulletin } from '../../stores/useBulletinStore';
import { useUIStore } from '../../stores/useUIStore';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { nativeBridge } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { CATEGORY_META, LEVEL_META, RichText } from './bulletinMeta';

function runAction(b: Bulletin) {
  if (b.category === 'update_log') {
    nativeBridge.openUrl(CURRENT_APP_VERSION.githubRepo);
  } else if (b.actionTab) {
    const ui = useUIStore.getState();
    ui.close('bulletinListOpen');
    ui.setActiveTab(b.actionTab);
    if (b.actionTab === 'settings') ui.open('backupOpen');
  }
}

export const BulletinModal: React.FC = () => {
  const id = useUIStore(s => s.bulletinDetailId);
  const bulletin = useBulletinStore(s => s.bulletins.find(b => b.id === id));

  const close = () => {
    if (bulletin) useBulletinStore.getState().markRead(bulletin.id);
    useUIStore.getState().close('bulletinDetailId');
  };

  const category = bulletin ? CATEGORY_META[bulletin.category] ?? CATEGORY_META.important : null;
  const level = bulletin ? LEVEL_META[bulletin.level] ?? LEVEL_META.info : null;
  const hasAction = bulletin && (bulletin.category === 'update_log' || bulletin.actionText);

  return (
    <Modal
      open={Boolean(bulletin)}
      onClose={close}
      variant="sheet"
      maxWidth="max-w-lg"
      zIndex="z-[70]"
      icon={category?.icon}
      iconClassName={`border ${category?.badgeClass ?? ''}`}
      title={bulletin?.title}
      subtitle={
        bulletin && category && level && (
          <span className="flex items-center gap-1.5">
            <span className={`px-1.5 py-px rounded-full border font-semibold ${category.badgeClass}`}>{category.label}</span>
            <span className={`px-1.5 py-px rounded-full border ${level.className}`}>{level.text}</span>
            {bulletin.pinned && (
              <span className="px-1.5 py-px rounded-full bg-theme-accent/15 text-theme-accent border border-theme-accent/30 flex items-center gap-0.5 font-bold">
                <Pin className="w-2.5 h-2.5" />
                <span>置顶</span>
              </span>
            )}
          </span>
        )
      }
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="flex-1 py-2.5 px-3 rounded-squircle border border-theme-border text-xs font-semibold text-theme-text hover:bg-theme-card-subtle transition-colors flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>我知道了</span>
          </button>
          {hasAction && (
            <button
              type="button"
              onClick={() => {
                close();
                runAction(bulletin);
              }}
              className="flex-[1.4] py-2.5 px-3 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <span>{bulletin.actionText || '立即前往'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      }
    >
      {bulletin && (
        <>
          <div className="flex items-center justify-between text-[11px] text-theme-text-muted px-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-theme-accent" />
              <span>发布时间：{bulletin.publishedAt}</span>
            </span>
            {bulletin.author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-theme-text-secondary" />
                <span>来源：{bulletin.author}</span>
              </span>
            )}
          </div>
          {bulletin.summary && (
            <div className="p-3 rounded-squircle bg-theme-card border border-theme-border/70 text-xs text-theme-text font-medium leading-relaxed shadow-sm flex items-start gap-2">
              <div className="p-1 rounded-squircle-sm bg-theme-accent/15 text-theme-accent shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-theme-accent block text-[10px] uppercase tracking-wider mb-0.5">核心概述</span>
                <span>{bulletin.summary}</span>
              </div>
            </div>
          )}
          <div className="p-3.5 rounded-squircle bg-theme-card-subtle border border-theme-border/60 space-y-1">
            <RichText source={bulletin.content} />
          </div>
          {bulletin.tags && bulletin.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-theme-text-muted">标签:</span>
              {bulletin.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-theme-card border border-theme-border/60 text-theme-text-secondary font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
