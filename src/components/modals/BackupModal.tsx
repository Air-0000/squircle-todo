import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, FileJson, FileSpreadsheet, HardDrive, RotateCcw, Upload } from 'lucide-react';
import type { ImportMode } from '../../domain/backup';
import { clearAllData, exportBackup, exportCsv, importBackup, restoreSeedData } from '../../stores/dataActions';
import { useTaskStore } from '../../stores/useTaskStore';
import { useUIStore } from '../../stores/useUIStore';
import { haptic } from '../../utils/bridge';
import { Modal } from '../ui/Modal';
import { SquircleButton } from '../ui/SquircleButton';

type Status = { text: string; type: 'success' | 'error' } | null;

const IMPORT_MODES: { id: ImportMode; label: string; hint: string }[] = [
  { id: 'merge', label: '智能合并 (Merge)', hint: '智能合并：保留现有未冲突任务，遇同 ID 任务更新对应内容，追加新任务。' },
  { id: 'overwrite', label: '完全覆盖 (Overwrite)', hint: '完全覆盖：抹除当前所有待办任务，完全以备份文件中的数据为准。' },
];

const ExportCard: React.FC<{ icon: React.ReactNode; tone: string; title: string; desc: string; onClick: () => void }> = ({
  icon,
  tone,
  title,
  desc,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="p-3 rounded-squircle bg-theme-card border border-theme-border/80 hover:border-theme-accent text-left transition-all active:scale-[0.98] shadow-squircle group"
  >
    <div className={`w-7 h-7 rounded-squircle flex items-center justify-center mb-2 group-hover:scale-105 transition-transform ${tone}`}>{icon}</div>
    <div className="text-xs font-bold text-theme-text">{title}</div>
    <div className="text-[10px] text-theme-text-muted mt-0.5 leading-snug">{desc}</div>
  </button>
);

const BackupPanel: React.FC = () => {
  const taskCount = useTaskStore(s => s.tasks.length);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Runs an action and reports success / failure in the status banner. */
  const run = (action: () => string) => {
    try {
      setStatus({ text: action(), type: 'success' });
      haptic('success');
    } catch (err) {
      setStatus({ text: `操作失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
      haptic('error');
    }
  };

  const restore = (text: string) =>
    run(() => {
      const r = importBackup(text, mode);
      setPasted('');
      setShowPaste(false);
      return mode === 'merge'
        ? `备份恢复成功！新增 ${r.added} 条，更新 ${r.updated} 条，当前总计 ${r.total} 条任务。`
        : `备份恢复成功！已覆盖为 ${r.total} 条任务。`;
    });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then(restore, () => setStatus({ text: '读取文件失败', type: 'error' }));
  };

  const reset = (withSeeds: boolean) =>
    run(() => {
      if (withSeeds) restoreSeedData();
      else clearAllData();
      setConfirmReset(false);
      return withSeeds ? '已恢复出厂预置数据（三大工作流角色）' : '已抹除所有待办数据与专注记录';
    });

  return (
    <div className="space-y-4">
      {status && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className={`p-3 rounded-squircle border text-xs flex items-center gap-2 ${
            status.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{status.text}</span>
        </motion.div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wider">数据导出与备份 (Export)</h4>
          <span className="text-[10px] text-theme-text-muted">当前任务总数: {taskCount}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ExportCard
            icon={<FileJson className="w-4 h-4" />}
            tone="bg-amber-500/15 text-amber-500"
            title="JSON 全量备份"
            desc="包含任务、面板、专注记录及主题设置"
            onClick={() => run(() => `全量 JSON 备份已生成并导出（共 ${exportBackup().taskCount} 条任务）`)}
          />
          <ExportCard
            icon={<FileSpreadsheet className="w-4 h-4" />}
            tone="bg-emerald-500/15 text-emerald-500"
            title="Excel / WPS CSV"
            desc="RFC 4180 + UTF-8 BOM 中文无乱码"
            onClick={() => run(() => `Excel/WPS 兼容 CSV 文件已导出（UTF-8 BOM 编码，共 ${exportCsv().taskCount} 条任务）`)}
          />
        </div>
      </section>

      <section className="space-y-2.5 pt-2 border-t border-theme-border/60">
        <h4 className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wider">数据恢复与导入 (Restore)</h4>
        <div className="p-2.5 rounded-squircle bg-theme-card border border-theme-border space-y-2">
          <div className="text-xs font-semibold text-theme-text">导入模式</div>
          <div className="grid grid-cols-2 gap-1.5">
            {IMPORT_MODES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`py-1.5 px-2 rounded-squircle text-xs font-medium border text-center transition-all ${
                  mode === m.id
                    ? 'border-theme-accent bg-theme-accent-subtle text-theme-accent font-semibold shadow-sm'
                    : 'border-theme-border/60 bg-theme-card-subtle text-theme-text-secondary'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-theme-text-muted leading-relaxed">{IMPORT_MODES.find(m => m.id === mode)?.hint}</p>
        </div>

        <input type="file" ref={fileInput} accept=".json,application/json" onChange={onFile} className="hidden" />
        <div className="flex items-center gap-2">
          <SquircleButton size="sm" icon={<Upload className="w-3.5 h-3.5" />} className="flex-1" onClick={() => fileInput.current?.click()}>
            选择 JSON 备份文件
          </SquircleButton>
          <SquircleButton size="sm" variant="tonal" onClick={() => setShowPaste(v => !v)}>
            {showPaste ? '收起文本粘贴' : '粘贴 JSON 文本'}
          </SquircleButton>
        </div>
        {showPaste && (
          <div className="space-y-2 pt-1">
            <textarea
              rows={4}
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              placeholder="在此粘贴包含 { app: 'SquircleTodo', tasks: [...] } 的 JSON 文本..."
              className="w-full text-[11px] font-mono p-2.5 rounded-squircle bg-theme-card text-theme-text border border-theme-border outline-none focus:border-theme-accent"
            />
            <div className="flex justify-end">
              <SquircleButton size="sm" haptic={false} onClick={() => restore(pasted)} disabled={!pasted.trim()}>
                解析并导入
              </SquircleButton>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2 pt-2 border-t border-theme-border/60">
        <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>危险区域 (Danger Zone)</span>
        </h4>
        {!confirmReset ? (
          <SquircleButton
            size="sm"
            variant="outline"
            className="w-full text-rose-500 border-rose-500/40 hover:bg-rose-500/10"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => setConfirmReset(true)}
          >
            重置与恢复出厂数据
          </SquircleButton>
        ) : (
          <div className="p-3 rounded-squircle bg-rose-500/10 border border-rose-500/30 space-y-2.5">
            <div className="text-xs font-semibold text-rose-500">确认重置数据？此操作将抹除当前待办列表。</div>
            <p className="text-[10px] text-theme-text-muted">建议在重置前先使用「JSON 全量备份」导出您的重要待办事项。</p>
            <div className="flex items-center gap-2 pt-1">
              <SquircleButton size="sm" variant="tonal" onClick={() => setConfirmReset(false)}>
                取消
              </SquircleButton>
              <SquircleButton size="sm" variant="outline" haptic={false} className="text-rose-500 border-rose-500/50" onClick={() => reset(false)}>
                全部清空
              </SquircleButton>
              <SquircleButton size="sm" haptic={false} className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => reset(true)}>
                恢复预置种子数据
              </SquircleButton>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export const BackupModal: React.FC = () => {
  const open = useUIStore(s => s.backupOpen);
  const close = () => useUIStore.getState().close('backupOpen');
  return (
    <Modal
      open={open}
      onClose={close}
      variant="sheet"
      maxWidth="max-w-lg"
      icon={<HardDrive className="w-4 h-4" />}
      title="数据备份与导出恢复"
      subtitle="双层持久化 · JSON/CSV · 无损迁移"
      bodyClassName="p-4"
      footer={
        <div className="w-full flex justify-end">
          <SquircleButton size="sm" variant="ghost" onClick={close}>
            完成
          </SquircleButton>
        </div>
      }
    >
      <BackupPanel />
    </Modal>
  );
};
