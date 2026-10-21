import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  X, 
  Sparkles, 
  Megaphone, 
  ShieldAlert, 
  Lightbulb, 
  Radio, 
  Pin, 
  BellRing,
  List,
  Heading,
  Bold
} from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';
import { useBulletinStore } from '../../stores/useBulletinStore';
import { BulletinCategory, BulletinLevel } from '../../types/bulletin';
import { toast } from '../../stores/useToastStore';

export const PublishBulletinModal: React.FC = () => {
  const { 
    isPublishModalOpen, 
    closePublishModal, 
    publishBulletin, 
    isPublishing 
  } = useBulletinStore();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BulletinCategory>('update_log');
  const [level, setLevel] = useState<BulletinLevel>('important');
  const [author, setAuthor] = useState('系统发布');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [popupOnce, setPopupOnce] = useState(true);

  if (!isPublishModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入公告标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入公告正文内容');
      return;
    }

    const tags = tagsInput
      .split(/[,，、\s]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const success = await publishBulletin({
      title: title.trim(),
      category,
      level,
      author: author.trim() || '系统发布',
      summary: summary.trim() || title.trim(),
      content: content.trim(),
      tags: tags.length > 0 ? tags : undefined,
      pinned,
      popupOnce,
    });

    if (success) {
      setTitle('');
      setSummary('');
      setContent('');
      setTagsInput('');
    }
  };

  const insertSnippet = (snippet: string) => {
    setContent(prev => prev + snippet);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={SPRING_PHYSICS.defaultCard}
          className="w-full max-w-lg bg-theme-bg/95 backdrop-blur-2xl rounded-t-squircle-xl sm:rounded-squircle-xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Grabber Bar for Mobile */}
          <div className="w-10 h-1 rounded-full bg-theme-text-muted/30 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

          {/* Modal Header */}
          <div className="p-4 border-b border-theme-border/60 flex items-center justify-between shrink-0 bg-theme-card/70 backdrop-blur-xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-squircle bg-theme-accent/20 border border-theme-accent/30 flex items-center justify-center text-theme-accent shadow-sm">
                <Radio className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-theme-text leading-tight">
                  发布通知公告 / 更新日志
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">
                  全设备路由器广播 · 自动弹窗提醒 · 液态玻璃质感呈现
                </p>
              </div>
            </div>

            <button
              onClick={closePublishModal}
              className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text shrink-0 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {/* 1. Category Switcher */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-theme-text flex items-center justify-between">
                <span>公告类别</span>
                <span className="text-[10px] text-theme-text-muted font-normal">选择呈现徽标与主题色彩</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'update_log', label: '更新日志', icon: Sparkles },
                  { id: 'important', label: '重要通知', icon: Megaphone },
                  { id: 'security', label: '安全提醒', icon: ShieldAlert },
                  { id: 'tip', label: '效率技巧', icon: Lightbulb },
                ].map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as BulletinCategory)}
                      className={`py-2 px-1.5 rounded-squircle border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                        isSelected 
                          ? 'bg-theme-accent/15 border-theme-accent text-theme-accent font-bold shadow-2xs' 
                          : 'bg-theme-card border-theme-border/60 text-theme-text-secondary hover:bg-theme-card-subtle'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-theme-text">
                公告标题 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="如：v1.3.5 全系统弹窗主题深度同步升级 / 考研冲刺提分通知..."
                className="w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none font-medium placeholder:text-theme-text-muted/60"
              />
            </div>

            {/* 3. Level & Author */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-theme-text">提醒级别</label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value as BulletinLevel)}
                  className="w-full bg-theme-card-subtle px-2.5 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none font-medium"
                >
                  <option value="important">⭐ 重要信息</option>
                  <option value="urgent">🚨 紧急置顶提醒</option>
                  <option value="info">📢 常规公告</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-theme-text">发布署名</label>
                <input
                  type="text"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="如：Squircle 团队 / 管理员"
                  className="w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none placeholder:text-theme-text-muted/60"
                />
              </div>
            </div>

            {/* 4. Summary Preview */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-theme-text flex items-center justify-between">
                <span>一句话摘要亮点</span>
                <span className="text-[10px] text-theme-text-muted font-normal">列表与弹窗前置高光卡片呈现</span>
              </label>
              <input
                type="text"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="简要概括核心要点（选填，不填自动截取标题）..."
                className="w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none placeholder:text-theme-text-muted/60"
              />
            </div>

            {/* 5. Detailed Content with Markdown Snippet Helpers */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-theme-text">
                  正文详细内容 <span className="text-rose-500">*</span>
                </label>
                {/* Formatting Snippets */}
                <div className="flex items-center space-x-1 text-[10px] text-theme-text-muted">
                  <span>插入：</span>
                  <button
                    type="button"
                    onClick={() => insertSnippet('\n- 🌟 **核心要点**：')}
                    className="px-1.5 py-0.5 rounded bg-theme-card border border-theme-border/60 hover:text-theme-accent"
                  >
                    <List className="w-2.5 h-2.5 inline mr-0.5" />项目列表
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('\n### 模块标题\n')}
                    className="px-1.5 py-0.5 rounded bg-theme-card border border-theme-border/60 hover:text-theme-accent"
                  >
                    <Heading className="w-2.5 h-2.5 inline mr-0.5" />标题
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('**加粗文字**')}
                    className="px-1.5 py-0.5 rounded bg-theme-card border border-theme-border/60 hover:text-theme-accent"
                  >
                    <Bold className="w-2.5 h-2.5 inline mr-0.5" />粗体
                  </button>
                </div>
              </div>

              <textarea
                required
                rows={5}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="输入公告正文或更新日志，支持项目列表（- 内容）、粗体（**内容**）、标题（### 标题）等格式..."
                className="w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none resize-none font-mono leading-relaxed placeholder:text-theme-text-muted/60"
              />
            </div>

            {/* 6. Tags & Options */}
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-theme-text">标签分类（空格或逗号分隔）</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="如：更新日志 液态玻璃 体验优化"
                  className="w-full bg-theme-card-subtle px-3 py-1.5 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none placeholder:text-theme-text-muted/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="p-2.5 rounded-squircle bg-theme-card border border-theme-border/60 flex items-center space-x-2 cursor-pointer hover:bg-theme-card-subtle">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={e => setPinned(e.target.checked)}
                    className="rounded text-theme-accent focus:ring-0"
                  />
                  <div className="text-[11px]">
                    <span className="font-semibold text-theme-text block flex items-center space-x-1">
                      <Pin className="w-3 h-3 text-theme-accent" />
                      <span>置顶显示</span>
                    </span>
                    <span className="text-[9px] text-theme-text-muted">固定在公告列表最顶部</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-squircle bg-theme-card border border-theme-border/60 flex items-center space-x-2 cursor-pointer hover:bg-theme-card-subtle">
                  <input
                    type="checkbox"
                    checked={popupOnce}
                    onChange={e => setPopupOnce(e.target.checked)}
                    className="rounded text-theme-accent focus:ring-0"
                  />
                  <div className="text-[11px]">
                    <span className="font-semibold text-theme-text block flex items-center space-x-1">
                      <BellRing className="w-3 h-3 text-amber-500" />
                      <span>打开时自动强弹窗</span>
                    </span>
                    <span className="text-[9px] text-theme-text-muted">用户首次进入应用立即弹窗提示</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 7. Broadcast Destination Info */}
            <div className="p-2.5 rounded-squircle bg-theme-card/60 border border-theme-border/50 text-[10px] text-theme-text-secondary flex items-start space-x-2">
              <Radio className="w-3.5 h-3.5 text-theme-accent shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-theme-text">本地公告与更新日志：</span>
                发布后将保存在应用公告中心，并在首页铃铛徽标与设置中心实时展示，重要通知支持首页自动弹窗触达。
              </div>
            </div>
          </form>

          {/* Modal Footer */}
          <div className="p-3 border-t border-theme-border/60 flex items-center justify-end space-x-2 bg-theme-card/70 backdrop-blur-xl shrink-0">
            <button
              type="button"
              onClick={closePublishModal}
              className="py-2.5 px-4 rounded-squircle border border-theme-border text-xs font-semibold text-theme-text hover:bg-theme-card-subtle transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPublishing || !title.trim() || !content.trim()}
              className="py-2.5 px-5 rounded-squircle bg-theme-accent text-theme-accent-contrast text-xs font-bold shadow-squircle active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPublishing ? '正在发布...' : '立即发布公告'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
