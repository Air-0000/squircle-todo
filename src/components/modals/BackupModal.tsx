import React, { useRef, useState } from 'react';
import { ClipboardPaste, FileJson, FileSpreadsheet, FolderOpen, Sparkles, Trash2 } from 'lucide-react';
import type { ImportMode } from '../../domain/backup';
import { clearAllData, exportBackup, exportCsv, importBackup, restoreSeedData } from '../../stores/dataActions';
import { useTaskStore } from '../../stores/useTaskStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from '../../stores/useToastStore';
import { haptic } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { Row, RowIcon, Section } from '../ui/List';
import { SegmentedControl } from '../ui/controls';

type Status = { text: string; type: 'success' | 'error' } | null;

const MODE_HINT: Record<ImportMode, string> = {
  merge: '合并：保留现有数据，同 ID 的条目以备份为准，其余追加。',
  overwrite: '覆盖：清空现有待办，完全以备份为准。',
};

const BackupPanel: React.FC = () => {
  const taskCount = useTaskStore(s => s.tasks.length);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Runs an action and reports success / failure in the status banner. */
  const run = (action: () => string) => {
    try {
      setStatus({ text: action(), type: 'success' });
      haptic('success');
    } catch (err) {
      setStatus({ text: `操作失败：${err instanceof Error ? err.message : String(err)}`, type: 'error' });
      haptic('error');
    }
  };

  const restore = (text: string) =>
    run(() => {
      const r = importBackup(text, mode);
      setPasted('');
      setShowPaste(false);
      return mode === 'merge' ? `已恢复：新增 ${r.added} 条，更新 ${r.updated} 条，共 ${r.total} 条。` : `已恢复：共 ${r.total} 条。`;
    });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then(restore, () => setStatus({ text: '读取文件失败', type: 'error' }));
  };

  const confirmReset = (withSeeds: boolean) =>
    toast.confirm({
      title: withSeeds ? '替换为示例数据？' : '清空所有数据？',
      message: withSeeds ? '现有待办会被示例待办替换。建议先导出备份。' : '待办与专注记录将被清空，面板和主题设置会保留。建议先导出备份。',
      confirmText: withSeeds ? '替换' : '清空',
      danger: true,
      onConfirm: () =>
        run(() => {
          if (withSeeds) restoreSeedData();
          else clearAllData();
          return withSeeds ? '已载入示例数据' : '已清空待办与专注记录';
        }),
    });

  return (
    <>
      {status && (
        <div
          role="status"
          className={`px-4 py-3 rounded-squircle-md text-callout ${
            status.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}
        >
          {status.text}
        </div>
      )}

      <Section title="导出" footer={`当前共 ${taskCount} 条待办。`}>
        <Row
          leading={<RowIcon icon={FileJson} className="bg-amber-500 text-white" />}
          title="完整备份 (JSON)"
          subtitle="待办、面板、专注记录与主题"
          chevron
          onClick={() => run(() => `已导出 JSON 备份（${exportBackup().taskCount} 条待办）`)}
        />
        <Row
          leading={<RowIcon icon={FileSpreadsheet} className="bg-emerald-500 text-white" />}
          title="表格 (CSV)"
          subtitle="Excel / WPS 可直接打开"
          chevron
          onClick={() => run(() => `已导出 CSV（${exportCsv().taskCount} 条待办）`)}
        />
      </Section>

      <Section title="恢复" footer={MODE_HINT[mode]}>
        <div className="p-3 border-b border-theme-border">
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: 'merge', label: '合并' },
              { value: 'overwrite', label: '覆盖' },
            ]}
          />
        </div>
        <input type="file" ref={fileInput} accept=".json,application/json" onChange={onFile} className="hidden" />
        <Row leading={<RowIcon icon={FolderOpen} className="bg-blue-500 text-white" />} title="从文件恢复" chevron onClick={() => fileInput.current?.click()} />
        <Row
          leading={<RowIcon icon={ClipboardPaste} className="bg-slate-500 text-white" />}
          title="粘贴 JSON 文本"
          onClick={() => setShowPaste(v => !v)}
          trailing={<span className="text-callout text-theme-text-secondary">{showPaste ? '收起' : ''}</span>}
        >
          {showPaste && (
            <div className="px-4 pb-4 space-y-2">
              <textarea
                rows={5}
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                placeholder='{ "app": "SquircleTodo", "tasks": [...] }'
                className="w-full p-3 rounded-squircle bg-theme-card-subtle text-footnote font-mono text-theme-text placeholder:text-theme-text-muted outline-none resize-none"
              />
              <button
                type="button"
                disabled={!pasted.trim()}
                onClick={() => restore(pasted)}
                className="w-full h-11 rounded-squircle bg-theme-accent text-theme-accent-contrast text-body font-semibold disabled:opacity-40"
              >
                解析并恢复
              </button>
            </div>
          )}
        </Row>
      </Section>

      <Section title="重置">
        <Row leading={<RowIcon icon={Sparkles} className="bg-purple-500 text-white" />} title="载入示例数据" onClick={() => confirmReset(true)} chevron />
        <Row leading={<RowIcon icon={Trash2} className="bg-rose-500 text-white" />} title="清空所有数据" tone="danger" onClick={() => confirmReset(false)} />
      </Section>
    </>
  );
};

export const BackupModal: React.FC = () => {
  const open = useUIStore(s => s.backupOpen);
  const close = () => useUIStore.getState().close('backupOpen');
  return (
    <Modal open={open} onClose={close} cancelLabel={null} title="备份与恢复" primary={{ label: '完成', onClick: close }}>
      <BackupPanel />
    </Modal>
  );
};
