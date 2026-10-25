import React, { useState } from 'react';
import { BellRing, Bold, Heading, Lightbulb, List, Megaphone, Pin, Radio, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { useBulletinStore, type BulletinCategory, type BulletinLevel } from '../../stores/useBulletinStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { SquircleButton } from '../ui/SquircleButton';

const FORM_ID = 'publish-bulletin-form';

const CATEGORIES: { id: BulletinCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'update_log', label: '更新日志', icon: Sparkles },
  { id: 'important', label: '重要通知', icon: Megaphone },
  { id: 'security', label: '安全提醒', icon: ShieldAlert },
  { id: 'tip', label: '效率技巧', icon: Lightbulb },
];

const SNIPPETS = [
  { label: '项目列表', icon: List, text: '\n- 🌟 **核心要点**：' },
  { label: '标题', icon: Heading, text: '\n### 模块标题\n' },
  { label: '粗体', icon: Bold, text: '**加粗文字**' },
];

const field = 'w-full bg-theme-card-subtle px-3 py-2 rounded-squircle border border-theme-border/70 text-theme-text text-xs focus:border-theme-accent outline-none';

const PublishForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BulletinCategory>('update_log');
  const [level, setLevel] = useState<BulletinLevel>('important');
  const [author, setAuthor] = useState('系统发布');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [pinned, setPinned] = useState(false);
  const [popupOnce, setPopupOnce] = useState(true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('请输入公告标题');
    if (!content.trim()) return toast.error('请输入公告正文内容');
    const tagList = tags.split(/[,，、\s]+/).map(t => t.trim()).filter(Boolean);
    useBulletinStore.getState().publish({
      title: title.trim(),
      category,
      level,
      author: author.trim() || '系统发布',
      summary: summary.trim() || title.trim(),
      content: content.trim(),
      tags: tagList.length > 0 ? tagList : undefined,
      pinned,
      popupOnce,
    });
    haptic('success');
    toast.success('📢 公告已发布！');
    onDone();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-3.5">
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-theme-text flex items-center justify-between">
          <span>公告类别</span>
          <span className="text-[10px] text-theme-text-muted font-normal">选择呈现徽标与主题色彩</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`py-2 px-1.5 rounded-squircle border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                category === id
                  ? 'bg-theme-accent/15 border-theme-accent text-theme-accent font-bold shadow-2xs'
                  : 'bg-theme-card border-theme-border/60 text-theme-text-secondary hover:bg-theme-card-subtle'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-theme-text">
          公告标题 <span className="text-rose-500">*</span>
        </span>
        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="如：v1.3.5 全系统弹窗主题深度同步升级 / 考研冲刺提分通知..." className={field} />
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="space-y-1">
          <span className="text-[11px] font-bold text-theme-text">提醒级别</span>
          <select value={level} onChange={e => setLevel(e.target.value as BulletinLevel)} className={field}>
            <option value="important">⭐ 重要信息</option>
            <option value="urgent">🚨 紧急置顶提醒</option>
            <option value="info">📢 常规公告</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-bold text-theme-text">发布署名</span>
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="如：Squircle 团队 / 管理员" className={field} />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-theme-text flex items-center justify-between">
          <span>一句话摘要亮点</span>
          <span className="text-[10px] text-theme-text-muted font-normal">列表与弹窗前置高光卡片呈现</span>
        </span>
        <input type="text" value={summary} onChange={e => setSummary(e.target.value)} placeholder="简要概括核心要点（选填，不填自动截取标题）..." className={field} />
      </label>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-theme-text">
            正文详细内容 <span className="text-rose-500">*</span>
          </span>
          <div className="flex items-center gap-1 text-[10px] text-theme-text-muted">
            <span>插入：</span>
            {SNIPPETS.map(({ label, icon: Icon, text }) => (
              <button
                key={label}
                type="button"
                onClick={() => setContent(c => c + text)}
                className="px-1.5 py-0.5 rounded bg-theme-card border border-theme-border/60 hover:text-theme-accent"
              >
                <Icon className="w-2.5 h-2.5 inline mr-0.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          required
          rows={5}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="输入公告正文或更新日志，支持项目列表（- 内容）、粗体（**内容**）、标题（### 标题）等格式..."
          className={`${field} resize-none`}
        />
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-theme-text">标签分类（空格或逗号分隔）</span>
        <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="如：更新日志 液态玻璃 体验优化" className={field} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        {[
          { checked: pinned, set: setPinned, icon: <Pin className="w-3 h-3 text-theme-accent" />, label: '置顶显示', hint: '固定在公告列表最顶部' },
          { checked: popupOnce, set: setPopupOnce, icon: <BellRing className="w-3 h-3 text-amber-500" />, label: '打开时自动强弹窗', hint: '下次进入应用时弹窗提示' },
        ].map(opt => (
          <label
            key={opt.label}
            className="p-2.5 rounded-squircle bg-theme-card border border-theme-border/60 flex items-center gap-2 cursor-pointer hover:bg-theme-card-subtle"
          >
            <input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)} className="rounded accent-theme-accent" />
            <span className="text-[11px]">
              <span className="font-semibold text-theme-text flex items-center gap-1">
                {opt.icon}
                <span>{opt.label}</span>
              </span>
              <span className="text-[9px] text-theme-text-muted">{opt.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="p-2.5 rounded-squircle bg-theme-card/60 border border-theme-border/50 text-[10px] text-theme-text-secondary flex items-start gap-2">
        <Radio className="w-3.5 h-3.5 text-theme-accent shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-theme-text">本地公告与更新日志：</span>
          发布后保存在本机的公告中心，并在首页铃铛徽标与设置中心展示，重要通知支持首页自动弹窗触达。
        </div>
      </div>
    </form>
  );
};

export const PublishBulletinModal: React.FC = () => {
  const open = useUIStore(s => s.publishBulletinOpen);
  const close = () => useUIStore.getState().close('publishBulletinOpen');
  return (
    <Modal
      open={open}
      onClose={close}
      variant="sheet"
      maxWidth="max-w-lg"
      zIndex="z-[60]"
      icon={<Send className="w-4.5 h-4.5" />}
      title="发布公告与更新日志"
      subtitle="保存在本机公告中心 · 支持首页弹窗"
      footer={
        <div className="w-full flex items-center justify-end gap-2">
          <SquircleButton size="sm" variant="tonal" onClick={close}>
            取消
          </SquircleButton>
          <SquircleButton size="sm" type="submit" form={FORM_ID} haptic={false} icon={<Send className="w-3.5 h-3.5" />}>
            立即发布公告
          </SquircleButton>
        </div>
      }
    >
      <PublishForm onDone={close} />
    </Modal>
  );
};
