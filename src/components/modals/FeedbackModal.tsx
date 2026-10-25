import React, { useState } from 'react';
import { Bug, ExternalLink, History, Info, Lightbulb, MessageCircle, MessageSquarePlus, Send, Smartphone, Zap } from 'lucide-react';
import { useFeedbackStore, type FeedbackType } from '../../stores/useFeedbackStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { haptic, nativeBridge } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { SquircleButton } from '../ui/SquircleButton';
import { SegmentedControl } from '../ui/controls';

const FORM_ID = 'feedback-form';
const ISSUES_URL = `${CURRENT_APP_VERSION.githubRepo}/issues`;

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'suggestion', label: '功能建议', icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'text-amber-500 bg-amber-500/15 border-amber-500/30' },
  { id: 'bug', label: '缺陷反馈', icon: <Bug className="w-3.5 h-3.5" />, color: 'text-rose-500 bg-rose-500/15 border-rose-500/30' },
  { id: 'feature', label: '体验优化', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-blue-500 bg-blue-500/15 border-blue-500/30' },
  { id: 'other', label: '其他留言', icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-purple-500 bg-purple-500/15 border-purple-500/30' },
];

const field = 'w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none';

const ComposeForm: React.FC<{ onSubmitted: () => void }> = ({ onSubmitted }) => {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('请输入反馈标题');
    if (!content.trim()) return toast.error('请详细描述您的建议或遇到的问题');
    useFeedbackStore.getState().submit({ type, title, content, contact });
    haptic('success');
    toast.success('💡 已记录在本机，感谢支持！也欢迎到 GitHub Issues 交流');
    onSubmitted();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-3.5">
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-theme-text">反馈类别</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FEEDBACK_TYPES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={`p-2 rounded-squircle border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === item.id ? `${item.color} shadow-sm` : 'bg-theme-card-subtle/70 border-theme-border/60 text-theme-text-secondary hover:border-theme-border'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-theme-text">反馈标题 *</span>
        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="简明概括建议或问题（如：日历希望增加农历显示）" className={field} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-theme-text">详细描述 *</span>
        <textarea
          required
          rows={4}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="请详细描述您的使用场景、改进建议或复现步骤..."
          className={`${field} resize-none`}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-theme-text">
          联系方式 <span className="text-[10px] text-theme-text-muted font-normal">(选填)</span>
        </span>
        <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="微信号 / 邮箱 / 手机号" className={`${field} py-1.5`} />
      </label>
      <div className="p-2.5 rounded-squircle bg-theme-card border border-theme-border/60 text-[10px] text-theme-text-secondary flex items-start gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-theme-accent" />
        <div className="leading-relaxed space-y-1">
          <p>
            <span className="font-bold text-theme-text">仅保存在本机：</span>
            应用完全离线，反馈不会自动上传。如需让开发者看到，请到 GitHub Issues 提交。
          </p>
          <button
            type="button"
            onClick={() => nativeBridge.openUrl(ISSUES_URL)}
            className="inline-flex items-center gap-1 text-theme-accent font-semibold hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            <span>打开 GitHub Issues</span>
          </button>
        </div>
      </div>
    </form>
  );
};

const FeedbackHistory: React.FC = () => {
  const feedbacks = useFeedbackStore(s => s.feedbacks);
  if (feedbacks.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-theme-text-muted bg-theme-card-subtle/50 rounded-squircle border border-dashed border-theme-border/60">
        您尚未记录过反馈建议，欢迎随时提出新需求！
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {feedbacks.map(item => {
        const meta = FEEDBACK_TYPES.find(t => t.id === item.type) ?? FEEDBACK_TYPES[0];
        return (
          <div key={item.id} className="p-3 rounded-squircle bg-theme-card border border-theme-border/70 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[10px] px-1.5 py-px rounded-full border font-bold shrink-0 ${meta.color}`}>{meta.label}</span>
                <span className="text-xs font-bold text-theme-text truncate">{item.title}</span>
              </div>
              <span className="text-[10px] text-theme-text-muted font-mono shrink-0">{item.createdAt}</span>
            </div>
            <p className="text-xs text-theme-text-secondary leading-relaxed bg-theme-card-subtle p-2 rounded-squircle-sm">{item.content}</p>
            <div className="text-[10px] text-theme-text-muted pt-1">记录版本: {item.appVersion}</div>
          </div>
        );
      })}
    </div>
  );
};

export const FeedbackModal: React.FC = () => {
  const open = useUIStore(s => s.feedbackOpen);
  const count = useFeedbackStore(s => s.feedbacks.length);
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const close = () => useUIStore.getState().close('feedbackOpen');

  return (
    <Modal
      open={open}
      onClose={close}
      variant="sheet"
      maxWidth="max-w-lg"
      zIndex="z-[60]"
      icon={<MessageSquarePlus className="w-4.5 h-4.5" />}
      title="意见与需求反馈"
      subtitle={
        <span className="flex items-center gap-1">
          <Smartphone className="w-3 h-3" />
          <span>当前版本 v{CURRENT_APP_VERSION.versionName}</span>
        </span>
      }
      footer={
        tab === 'compose' ? (
          <div className="w-full flex items-center justify-end gap-2">
            <SquircleButton size="sm" variant="tonal" onClick={close}>
              取消
            </SquircleButton>
            <SquircleButton size="sm" type="submit" form={FORM_ID} haptic={false} icon={<Send className="w-3.5 h-3.5" />}>
              保存反馈
            </SquircleButton>
          </div>
        ) : undefined
      }
    >
      <SegmentedControl
        value={tab}
        onChange={setTab}
        stretch
        options={[
          { value: 'compose', label: '撰写反馈' },
          { value: 'history', label: `我的反馈记录${count > 0 ? ` (${count})` : ''}`, icon: History },
        ]}
      />
      {tab === 'compose' ? <ComposeForm onSubmitted={() => setTab('history')} /> : <FeedbackHistory />}
    </Modal>
  );
};
