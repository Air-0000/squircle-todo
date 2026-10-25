import React, { useState } from 'react';
import { useBulletinStore, type BulletinCategory, type BulletinLevel } from '../../stores/useBulletinStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { Row, Section } from '../ui/List';
import { SegmentedControl, Switch } from '../ui/controls';

const FORM_ID = 'publish-bulletin-form';

const CATEGORIES: { value: BulletinCategory; label: string }[] = [
  { value: 'update_log', label: '更新日志' },
  { value: 'important', label: '通知' },
  { value: 'security', label: '提醒' },
  { value: 'tip', label: '技巧' },
];

const LEVELS: { value: BulletinLevel; label: string; activeClassName?: string }[] = [
  { value: 'info', label: '普通' },
  { value: 'important', label: '重要' },
  { value: 'urgent', label: '紧急', activeClassName: 'text-rose-500' },
];

const SNIPPETS = [
  { label: '列表', text: '\n- ' },
  { label: '小标题', text: '\n### ' },
  { label: '加粗', text: '**加粗**' },
];

const fieldClass = 'w-full px-4 bg-transparent text-body text-theme-text placeholder:text-theme-text-muted outline-none';

const PublishForm: React.FC<{ onDone: () => void; onValidChange: (valid: boolean) => void }> = ({ onDone, onValidChange }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BulletinCategory>('update_log');
  const [level, setLevel] = useState<BulletinLevel>('important');
  const [author, setAuthor] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [pinned, setPinned] = useState(false);
  const [popupOnce, setPopupOnce] = useState(true);

  const update = (nextTitle: string, nextContent: string) => onValidChange(Boolean(nextTitle.trim() && nextContent.trim()));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const tagList = tags.split(/[,，、\s]+/).map(t => t.trim()).filter(Boolean);
    useBulletinStore.getState().publish({
      title: title.trim(),
      category,
      level,
      author: author.trim() || '本机',
      summary: summary.trim() || title.trim(),
      content: content.trim(),
      tags: tagList.length > 0 ? tagList : undefined,
      pinned,
      popupOnce,
    });
    haptic('success');
    toast.success('公告已发布');
    onDone();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-6">
      <Section title="类别" variant="plain">
        <SegmentedControl value={category} onChange={setCategory} options={CATEGORIES} />
      </Section>

      <Section>
        <input
          type="text"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            update(e.target.value, content);
          }}
          placeholder="标题"
          className={`${fieldClass} h-12 text-headline font-semibold border-b border-theme-border`}
        />
        <input type="text" value={summary} onChange={e => setSummary(e.target.value)} placeholder="一句话摘要（选填）" className={`${fieldClass} h-12 border-b border-theme-border`} />
        <textarea
          rows={6}
          value={content}
          onChange={e => {
            setContent(e.target.value);
            update(title, e.target.value);
          }}
          placeholder="正文，支持「- 列表」「### 小标题」「**加粗**」"
          className={`${fieldClass} py-3 resize-none`}
        />
        <div className="flex gap-2 px-4 pb-3">
          {SNIPPETS.map(s => (
            <button key={s.label} type="button" onClick={() => setContent(c => c + s.text)} className="h-7 px-2.5 rounded-full bg-theme-card-subtle text-caption text-theme-text">
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="级别" variant="plain">
        <SegmentedControl value={level} onChange={setLevel} options={LEVELS} />
      </Section>

      <Section footer="公告只保存在这台设备的公告中心。">
        <Row title="署名" trailing={<input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="本机" className="w-40 bg-transparent text-body text-right text-theme-text-secondary outline-none" />} />
        <Row title="标签" trailing={<input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="空格分隔" className="w-40 bg-transparent text-body text-right text-theme-text-secondary outline-none" />} />
        <Row title="置顶" trailing={<Switch checked={pinned} onChange={setPinned} label="置顶" />} />
        <Row title="下次打开时弹出" trailing={<Switch checked={popupOnce} onChange={setPopupOnce} label="下次打开时弹出" />} />
      </Section>
    </form>
  );
};

export const PublishBulletinModal: React.FC = () => {
  const open = useUIStore(s => s.publishBulletinOpen);
  const [valid, setValid] = useState(false);
  const close = () => {
    useUIStore.getState().close('publishBulletinOpen');
    setValid(false);
  };
  return (
    <Modal open={open} onClose={close} zIndex="z-[60]" title="发布公告" primary={{ label: '发布', form: FORM_ID, disabled: !valid }}>
      <PublishForm onDone={close} onValidChange={setValid} />
    </Modal>
  );
};
