import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive,
  FileJson
} from 'lucide-react';
import { SPRING_PHYSICS } from '../../constants/themes';
import { SquircleButton } from '../common/SquircleButton';
import { useTaskStore } from '../../stores/useTaskStore';
import { nativeBridge } from '../../utils/bridge';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { tasks, exportJSON, importJSON, exportCSV, resetAllData } = useTaskStore();
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [pastedJSON, setPastedJSON] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    try {
      exportJSON();
      setStatusMessage({
        text: `全量 JSON 备份已生成并导出（共 ${tasks.length} 条任务）`,
        type: 'success',
      });
      nativeBridge.performHapticFeedback('success');
    } catch (err: any) {
      setStatusMessage({
        text: `导出失败: ${err.message}`,
        type: 'error',
      });
      nativeBridge.performHapticFeedback('error');
    }
  };

  const handleExportCSV = () => {
    try {
      exportCSV();
      setStatusMessage({
        text: `Excel/WPS 兼容 CSV 文件已导出（UTF-8 BOM 编码，共 ${tasks.length} 条任务）`,
        type: 'success',
      });
      nativeBridge.performHapticFeedback('success');
    } catch (err: any) {
      setStatusMessage({
        text: `导出失败: ${err.message}`,
        type: 'error',
      });
      nativeBridge.performHapticFeedback('error');
    }
  };

  const executeImport = (jsonContent: string) => {
    try {
      const result = importJSON(jsonContent, importMode);
      setStatusMessage({
        text: `备份恢复成功！${importMode === 'merge' ? '新增导入' : '已覆盖'}: ${result.count} 条，当前总计: ${result.total} 条任务。`,
        type: 'success',
      });
      setPastedJSON('');
      setShowPasteArea(false);
      nativeBridge.performHapticFeedback('success');
    } catch (err: any) {
      setStatusMessage({
        text: `导入失败: ${err.message}`,
        type: 'error',
      });
      nativeBridge.performHapticFeedback('error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        executeImport(content);
      }
    };
    reader.onerror = () => {
      setStatusMessage({ text: '读取文件失败', type: 'error' });
      nativeBridge.performHapticFeedback('error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = (seedDefaults: boolean) => {
    resetAllData({ seedDefaults });
    setShowResetConfirm(false);
    setStatusMessage({
      text: seedDefaults ? '已恢复出厂预置数据（三大工作流角色）' : '已抹除所有待办数据',
      type: 'success',
    });
    nativeBridge.performHapticFeedback('medium');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={SPRING_PHYSICS.defaultCard}
        className="w-full max-w-lg bg-theme-bg/95 backdrop-blur-2xl rounded-t-squircle-xl sm:rounded-squircle-xl border border-black/5 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Grabber Bar for Mobile */}
        <div className="w-10 h-1 rounded-full bg-theme-text-muted/30 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-theme-border/60 flex items-center justify-between shrink-0 bg-theme-card/70 backdrop-blur-xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-squircle bg-theme-accent/15 flex items-center justify-center text-theme-accent">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-text">数据备份与导出恢复</h3>
              <p className="text-[10px] text-theme-text-muted">双层持久化 · JSON/CSV · 无损迁移</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-theme-card-subtle text-theme-text-secondary hover:text-theme-text shrink-0 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Message */}
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-squircle border text-xs flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </motion.div>
          )}

          {/* Section 1: Export Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wider">
                数据导出与备份 (Export)
              </h4>
              <span className="text-[10px] text-theme-text-muted">当前任务总数: {tasks.length}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="p-3 rounded-squircle bg-theme-card border border-theme-border/80 hover:border-theme-accent text-left transition-all active:scale-[0.98] shadow-squircle group"
              >
                <div className="w-7 h-7 rounded-squircle bg-amber-500/15 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FileJson className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-theme-text">JSON 全量备份</div>
                <div className="text-[10px] text-theme-text-muted mt-0.5 leading-snug">
                  包含所有任务、子清单及主题设置
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="p-3 rounded-squircle bg-theme-card border border-theme-border/80 hover:border-theme-accent text-left transition-all active:scale-[0.98] shadow-squircle group"
              >
                <div className="w-7 h-7 rounded-squircle bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-theme-text">Excel / WPS CSV</div>
                <div className="text-[10px] text-theme-text-muted mt-0.5 leading-snug">
                  RFC 4180 + UTF-8 BOM 中文无乱码
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Import Options */}
          <div className="space-y-2.5 pt-2 border-t border-theme-border/60">
            <h4 className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wider">
              数据恢复与导入 (Restore)
            </h4>

            {/* Merge vs Overwrite Mode selector */}
            <div className="p-2.5 rounded-squircle bg-theme-card border border-theme-border space-y-2">
              <div className="text-xs font-semibold text-theme-text">导入模式</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`py-1.5 px-2 rounded-squircle text-xs font-medium border text-center transition-all ${
                    importMode === 'merge'
                      ? 'border-theme-accent bg-theme-accent-subtle text-theme-accent font-semibold shadow-sm'
                      : 'border-theme-border/60 bg-theme-card-subtle text-theme-text-secondary'
                  }`}
                >
                  智能合并 (Merge)
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('overwrite')}
                  className={`py-1.5 px-2 rounded-squircle text-xs font-medium border text-center transition-all ${
                    importMode === 'overwrite'
                      ? 'border-theme-accent bg-theme-accent-subtle text-theme-accent font-semibold shadow-sm'
                      : 'border-theme-border/60 bg-theme-card-subtle text-theme-text-secondary'
                  }`}
                >
                  完全覆盖 (Overwrite)
                </button>
              </div>
              <p className="text-[10px] text-theme-text-muted leading-relaxed">
                {importMode === 'merge'
                  ? '智能合并：保留现有未冲突任务，遇同 ID 任务更新对应内容，追加新任务。'
                  : '完全覆盖：抹除当前所有待办任务，完全以备份文件中的数据为准。'}
              </p>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex items-center space-x-2">
              <SquircleButton
                size="sm"
                variant="filled"
                icon={<Upload className="w-3.5 h-3.5" />}
                className="flex-1 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                选择 JSON 备份文件
              </SquircleButton>

              <SquircleButton
                size="sm"
                variant="tonal"
                className="text-xs"
                onClick={() => setShowPasteArea(!showPasteArea)}
              >
                {showPasteArea ? '收起文本粘贴' : '粘贴 JSON 文本'}
              </SquircleButton>
            </div>

            {/* Paste Area Dropdown */}
            {showPasteArea && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 pt-1"
              >
                <textarea
                  rows={4}
                  value={pastedJSON}
                  onChange={e => setPastedJSON(e.target.value)}
                  placeholder="在此粘贴包含 { app: 'SquircleTodo', tasks: [...] } 的 JSON 文本..."
                  className="w-full text-[11px] font-mono p-2.5 rounded-squircle bg-theme-card text-theme-text border border-theme-border outline-none focus:border-theme-accent"
                />
                <div className="flex justify-end">
                  <SquircleButton
                    size="sm"
                    variant="filled"
                    onClick={() => executeImport(pastedJSON)}
                    disabled={!pastedJSON.trim()}
                  >
                    解析并导入
                  </SquircleButton>
                </div>
              </motion.div>
            )}
          </div>

          {/* Section 3: Safe Factory Reset */}
          <div className="space-y-2 pt-2 border-t border-theme-border/60">
            <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>危险区域 (Danger Zone)</span>
            </h4>

            {!showResetConfirm ? (
              <SquircleButton
                size="sm"
                variant="outline"
                className="w-full text-xs text-rose-500 border-rose-500/40 hover:bg-rose-500/10"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => setShowResetConfirm(true)}
              >
                重置与恢复出厂数据
              </SquircleButton>
            ) : (
              <div className="p-3 rounded-squircle bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                <div className="text-xs font-semibold text-rose-500">
                  确认重置数据？此操作将抹除当前待办列表。
                </div>
                <p className="text-[10px] text-theme-text-muted">
                  建议在重置前先使用「JSON 全量备份」导出您的重要待办事项。
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <SquircleButton
                    size="sm"
                    variant="tonal"
                    className="text-xs"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    取消
                  </SquircleButton>
                  <SquircleButton
                    size="sm"
                    variant="outline"
                    className="text-xs text-rose-500 border-rose-500/50"
                    onClick={() => handleReset(false)}
                  >
                    全部清空
                  </SquircleButton>
                  <SquircleButton
                    size="sm"
                    variant="filled"
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => handleReset(true)}
                  >
                    恢复预置种子数据
                  </SquircleButton>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-theme-border flex items-center justify-end shrink-0 bg-theme-bg">
          <SquircleButton size="sm" variant="ghost" onClick={onClose}>
            完成
          </SquircleButton>
        </div>
      </motion.div>
    </div>
  );
};
