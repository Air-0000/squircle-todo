import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useFeedbackStore, type FeedbackType } from '../../stores/useFeedbackStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { haptic, nativeBridge } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { Row, Section } from '../ui/List';
import { EmptyState, SegmentedControl } from '../ui/controls';

const FORM_ID = 'feedback-form';
const ISSUES_URL = `${CURRENT_APP_VERSION.githubRepo}/issues`;

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'suggestion', label: '建议' },
  { value: 'bug', label: '问题' },
  { value: 'feature', label: '体验' },
  { value: 'other', label: '其他' },
];

const typeLabel = (t: FeedbackType) => FEEDBACK_TYPES.find(f => f.value === t)?.label ?? '其他';

const fieldClass = 'w-full px-4 bg-transparent text-body text-theme-text placeholder:text-theme-text-muted outline-none';

const ComposeForm: React.FC<{ onSubmitted: () => void; onValidChange: (valid: boolean) => void }> = ({ onSubmitted, onValidChange }) => {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    useFeedbackStore.getState().submit({ type, title, content, contact });
    haptic('success');
    toast.success('已记录，谢谢你的反馈');
    onSubmitted();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-6">
      <Section title="类型" variant="plain">
        <SegmentedControl value={type} onChange={setType} options={FEEDBACK_TYPES} />
      </Section>
      <Section footer="反馈只保存在这台设备上，不会自动上传。想让开发者看到，请到 GitHub Issues 提交。">
        <input
          type="text"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            onValidChange(Boolean(e.target.value.trim() && content.trim()));
          }}
          placeholder="一句话概括"
          className={`${fieldClass} h-12 border-b border-theme-border`}
        />
        <textarea
          rows={5}
          value={content}
          onChange={e => {
            setContent(e.target.value);
            onValidChange(Boolean(title.trim() && e.target.value.trim()));
          }}
          placeholder="详细描述使用场景、建议或复现步骤"
          className={`${fieldClass} py-3 resize-none border-b border-theme-border`}
        />
        <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="联系方式（选填）" className={`${fieldClass} h-12`} />
      </Section>
      <Section>
        <Row title="打开 GitHub Issues" tone="accent" onClick={() => nativeBridge.openUrl(ISSUES_URL)} trailing={<ExternalLink className="w-4 h-4 text-theme-text-muted" />} />
      </Section>
    </form>
  );
};

const FeedbackHistory: React.FC = () => {
  const feedbacks = useFeedbackStore(s => s.feedbacks);
  if (feedbacks.length === 0) return <EmptyState>还没有反馈记录</EmptyState>;
  return (
    <Section>
      {feedbacks.map(item => (
        <Row
          key={item.id}
          title={item.title}
          subtitle={
            <>
              <span className="line-clamp-2">{item.content}</span>
              <span className="text-caption text-theme-text-muted">
                {typeLabel(item.type)} · {item.createdAt} · {item.appVersion}
              </span>
            </>
          }
        />
      ))}
    </Section>
  );
};

export const FeedbackModal: React.FC = () => {
  const open = useUIStore(s => s.feedbackOpen);
  const count = useFeedbackStore(s => s.feedbacks.length);
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const [valid, setValid] = useState(false);
  const close = () => {
    useUIStore.getState().close('feedbackOpen');
    setValid(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      zIndex="z-[60]"
      title="意见反馈"
      subtitle={`v${CURRENT_APP_VERSION.versionName}`}
      primary={tab === 'compose' ? { label: '保存', form: FORM_ID, disabled: !valid } : { label: '完成', onClick: close }}
    >
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'compose', label: '写反馈' },
          { value: 'history', label: count > 0 ? `我的记录 ${count}` : '我的记录' },
        ]}
      />
      {tab === 'compose' ? (
        <ComposeForm
          onSubmitted={() => {
            setValid(false);
            setTab('history');
          }}
          onValidChange={setValid}
        />
      ) : (
        <FeedbackHistory />
      )}
    </Modal>
  );
};
