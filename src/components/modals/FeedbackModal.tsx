import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquarePlus, 
  Lightbulb, 
  Bug, 
  Zap, 
  MessageCircle, 
  Send, 
  X, 
  History, 
  CheckCircle2, 
  Clock, 
  Smartphone
} from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';
import { useFeedbackStore } from '../../stores/useFeedbackStore';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { FeedbackType } from '../../types/feedback';
import { toast } from '../../stores/useToastStore';

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'suggestion', label: '功能建议', icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'text-amber-500 bg-amber-500/15 border-amber-500/30' },
  { id: 'bug', label: '缺陷反馈', icon: <Bug className="w-3.5 h-3.5" />, color: 'text-rose-500 bg-rose-500/15 border-rose-500/30' },
  { id: 'feature', label: '体验优化', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-blue-500 bg-blue-500/15 border-blue-500/30' },
  { id: 'other', label: '其他留言', icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-purple-500 bg-purple-500/15 border-purple-500/30' },
];

export const FeedbackModal: React.FC = () => {
  const { 
    isFeedbackModalOpen, 
    closeFeedbackModal, 
    submitFeedback, 
    isSubmitting,
    feedbacks 
  } = useFeedbackStore();

  const currentVersion = CURRENT_APP_VERSION.versionName;

  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  if (!isFeedbackModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入反馈标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请详细描述您的建议或遇到的问题');
      return;
    }

    const success = await submitFeedback({
      type,
      title,
      content,
      contact: contact.trim() || undefined,
    });

    if (success) {
      setTitle('');
      setContent('');
      setContact('');
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
          {/* Mobile Grabber */}
          <div className="w-10 h-1 rounded-full bg-theme-text-muted/30 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

          {/* Modal Header */}
          <div className="p-4 border-b border-theme-border/60 flex items-center justify-between shrink-0 bg-theme-card/70 backdrop-blur-xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-squircle bg-theme-accent/20 border border-theme-accent/30 flex items-center justify-center text-theme-accent shadow-sm">
                <MessageSquarePlus className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-theme-text leading-tight">
                  意见与需求反馈直通车
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">
                  您的每条建议直达开发者 · 作为后续版本迭代首要依据
                </p>
              </div>
            </div>

            <button
              onClick={closeFeedbackModal}
              className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text shrink-0 transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="px-4 pt-3 flex items-center justify-between border-b border-theme-border/40 shrink-0 bg-theme-card/40">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className={`pb-2.5 px-2 text-xs font-bold transition-all relative ${
                  activeTab === 'compose'
                    ? 'text-theme-accent'
                    : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                <span>撰写反馈</span>
                {activeTab === 'compose' && (
                  <motion.div
                    layoutId="feedback_tab_underline"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-theme-accent rounded-full"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`pb-2.5 px-2 text-xs font-bold transition-all relative flex items-center space-x-1 ${
                  activeTab === 'history'
                    ? 'text-theme-accent'
                    : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>我的反馈记录</span>
                {feedbacks.length > 0 && (
                  <span className="text-[9px] px-1 rounded-full bg-theme-accent/20 text-theme-accent font-bold">
                    {feedbacks.length}
                  </span>
                )}
                {activeTab === 'history' && (
                  <motion.div
                    layoutId="feedback_tab_underline"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-theme-accent rounded-full"
                  />
                )}
              </button>
            </div>

            <span className="text-[10px] text-theme-text-muted pb-2 flex items-center space-x-1">
              <Smartphone className="w-3 h-3" />
              <span>当前版本 v{currentVersion}</span>
            </span>
          </div>

          {/* Modal Body */}
          <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
            {activeTab === 'compose' ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* 1. Type selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-theme-text">反馈类别</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FEEDBACK_TYPES.map(item => {
                      const isSelected = type === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setType(item.id)}
                          className={`p-2 rounded-squircle border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                            isSelected
                              ? `${item.color} shadow-sm scale-102`
                              : 'bg-theme-card-subtle/70 border-theme-border/60 text-theme-text-secondary hover:border-theme-border'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-theme-text">反馈标题 *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="简明概括建议或问题（如：日历希望增加农历显示）"
                    className="w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none placeholder:text-theme-text-muted/60"
                  />
                </div>

                {/* 3. Detailed Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-theme-text">详细描述 *</label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="请详细描述您的使用场景、改进建议或复现步骤，越详细越能快速在下个版本上线..."
                    className="w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none resize-none leading-relaxed placeholder:text-theme-text-muted/60"
                  />
                </div>

                {/* 4. Contact Info */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-theme-text">
                    联系方式 <span className="text-[10px] text-theme-text-muted font-normal">(选填，方便开发者向您反馈处理进展)</span>
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="微信号 / 邮箱 / 手机号"
                    className="w-full bg-theme-card-subtle px-3 py-1.5 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none placeholder:text-theme-text-muted/60"
                  />
                </div>

                {/* 5. Cloud Delivery Guarantee */}
                <div className="p-2.5 rounded-squircle bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold">私有云自动投递：</span>
                    提交后将加密投递至路由器私有云 <code className="text-emerald-500">/webdav/feedback/feedback.json</code>，开发者即可据此快速迭代发版。
                  </div>
                </div>
              </form>
            ) : (
              /* History Tab */
              <div className="space-y-2.5">
                {feedbacks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-theme-text-muted bg-theme-card-subtle/50 rounded-squircle border border-dashed border-theme-border/60">
                    您尚未提交过反馈建议，欢迎在上方随时提出新需求！
                  </div>
                ) : (
                  feedbacks.map(item => {
                    const typeConfig = FEEDBACK_TYPES.find(t => t.id === item.type) || FEEDBACK_TYPES[0];
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-squircle bg-theme-card border border-theme-border/70 shadow-sm space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full border font-bold ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            <span className="text-xs font-bold text-theme-text">{item.title}</span>
                          </div>
                          <span className="text-[10px] text-theme-text-muted font-mono">{item.createdAt}</span>
                        </div>
                        <p className="text-xs text-theme-text-secondary leading-relaxed bg-theme-card-subtle p-2 rounded-squircle-sm">
                          {item.content}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-theme-text-muted pt-1">
                          <span>提交版本: {item.appVersion}</span>
                          <span className="inline-flex items-center space-x-1 text-emerald-500 font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>已收录，评估进入后续版本更新</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          {activeTab === 'compose' && (
            <div className="p-3 border-t border-theme-border/60 flex items-center justify-end space-x-2 bg-theme-card/70 backdrop-blur-xl shrink-0">
              <button
                type="button"
                onClick={closeFeedbackModal}
                className="py-2.5 px-4 rounded-squircle border border-theme-border text-xs font-semibold text-theme-text hover:bg-theme-card-subtle transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="py-2.5 px-5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? '正在提交...' : '提交反馈并推送私有云'}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
