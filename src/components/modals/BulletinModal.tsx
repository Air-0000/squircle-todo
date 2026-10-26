import React from 'react';
import { Pin } from 'lucide-react';
import { useBulletinStore, type Bulletin } from '../../stores/useBulletinStore';
import { useUIStore } from '../../stores/useUIStore';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { nativeBridge } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/List';
import { SquircleButton } from '../ui/SquircleButton';
import { CATEGORY_META, RichText } from './bulletinMeta';

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

  const meta = bulletin ? CATEGORY_META[bulletin.category] ?? CATEGORY_META.important : null;
  const hasAction = bulletin && (bulletin.category === 'update_log' || bulletin.actionText);

  return (
    <Modal
      open={Boolean(bulletin)}
      onClose={close}
      cancelLabel={null}
      zIndex="z-[70]"
      title="公告"
      primary={{ label: '完成', onClick: close }}
      bodyClassName="px-5 pt-3 pb-8 space-y-5"
      footer={
        hasAction ? (
          <SquircleButton
            size="lg"
            className="w-full"
            onClick={() => {
              close();
              runAction(bulletin);
            }}
          >
            {bulletin.actionText || '前往'}
          </SquircleButton>
        ) : undefined
      }
    >
      {bulletin && meta && (
        <article className="space-y-5">
          <header className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {bulletin.level === 'urgent' && <Badge tone="danger">紧急</Badge>}
              {bulletin.pinned && <Pin className="w-3.5 h-3.5 text-theme-text-muted" />}
            </div>
            <h2 className="text-title3 font-bold text-theme-text leading-snug">{bulletin.title}</h2>
            <p className="text-footnote text-theme-text-muted">
              {bulletin.publishedAt}
              {bulletin.author && ` · ${bulletin.author}`}
            </p>
          </header>
          {bulletin.summary && <p className="text-body text-theme-text leading-relaxed">{bulletin.summary}</p>}
          <div className="bg-theme-card rounded-squircle-md shadow-squircle p-4">
            <RichText source={bulletin.content} />
          </div>
          {bulletin.tags && bulletin.tags.length > 0 && <p className="text-footnote text-theme-text-muted">{bulletin.tags.map(t => `#${t}`).join('  ')}</p>}
        </article>
      )}
    </Modal>
  );
};
