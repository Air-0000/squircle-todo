import React from 'react';
import { CircleCheck, ListChecks, Loader2, WifiOff } from 'lucide-react';
import { CURRENT_APP_VERSION } from '../../constants/version';
import { useUIStore } from '../../stores/useUIStore';
import { useUpdateStore } from '../../stores/useUpdateStore';
import { Modal } from '../ui/Modal';
import { Section } from '../ui/List';
import { ProgressBar } from '../ui/controls';
import { SquircleButton } from '../ui/SquircleButton';

const formatMB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** "1. 修复…\n2. 新增…" → one entry per line, numbering dropped (the list renders its own). */
const logLines = (log: string) =>
  log
    .split('\n')
    .map(line => line.replace(/^\s*\d+[.、)]\s*/, '').trim())
    .filter(Boolean);

const StatusMessage: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="py-10 flex flex-col items-center text-center gap-2">
    {icon}
    <p className="text-headline font-semibold text-theme-text">{title}</p>
    {children && <div className="text-footnote text-theme-text-secondary max-w-xs">{children}</div>}
  </div>
);

const DownloadControls: React.FC = () => {
  const { phase, update, downloaded, total, message, download, cancel } = useUpdateStore();
  if (!update) return null;

  if (phase === 'downloading') {
    const ratio = total > 0 ? downloaded / total : 0;
    return (
      <div className="space-y-2">
        <ProgressBar ratio={ratio} height="h-1.5" />
        <div className="flex items-center justify-between text-footnote text-theme-text-secondary tabular-nums">
          <span>{total > 0 ? `${formatMB(downloaded)} / ${formatMB(total)}` : `已下载 ${formatMB(downloaded)}`}</span>
          <button type="button" onClick={cancel} className="text-theme-accent font-medium">
            取消
          </button>
        </div>
      </div>
    );
  }

  const hint =
    phase === 'needsPermission'
      ? '请在系统设置里允许本应用「安装未知应用」，返回后点「继续安装」。'
      : phase === 'installing'
        ? '已打开系统安装器。没看到的话可以再点一次。'
        : phase === 'error'
          ? `出错了：${message}`
          : '在系统安装器里确认后即可完成更新，待办数据会保留。';
  const label = phase === 'needsPermission' ? '继续安装' : phase === 'installing' ? '重新打开安装器' : phase === 'error' ? '重试' : '下载并安装';

  return (
    <div className="space-y-2">
      <SquircleButton size="lg" className="w-full" onClick={download}>
        {label}
      </SquircleButton>
      <p className={`text-footnote text-center ${phase === 'error' ? 'text-rose-500' : 'text-theme-text-muted'}`}>{hint}</p>
    </div>
  );
};

const UpdateDetails: React.FC = () => {
  const update = useUpdateStore(s => s.update);
  const currentVersionName = useUpdateStore(s => s.currentVersionName) ?? CURRENT_APP_VERSION.versionName;
  if (!update) return null;
  const lines = logLines(update.updateLog);
  return (
    <>
      <Section variant="card">
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-[14px] bg-theme-accent text-theme-accent-contrast flex items-center justify-center shrink-0">
            <ListChecks className="w-7 h-7" />
          </span>
          <div className="min-w-0">
            <p className="text-headline font-semibold text-theme-text">Squircle To-Do {update.versionName}</p>
            <p className="text-footnote text-theme-text-secondary">
              {[update.apkSize, `当前 v${currentVersionName}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <DownloadControls />
      </Section>
      {lines.length > 0 && (
        <Section title="更新内容" variant="card">
          <ol className="list-decimal pl-5 space-y-1.5 text-callout text-theme-text marker:text-theme-text-muted">
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </Section>
      )}
    </>
  );
};

export const UpdateModal: React.FC = () => {
  const open = useUIStore(s => s.updateOpen);
  const phase = useUpdateStore(s => s.phase);
  const currentVersionName = useUpdateStore(s => s.currentVersionName) ?? CURRENT_APP_VERSION.versionName;
  const check = useUpdateStore(s => s.check);
  const close = () => useUIStore.getState().close('updateOpen');

  let body: React.ReactNode;
  if (phase === 'checking' || phase === 'idle') {
    body = <StatusMessage icon={<Loader2 className="w-8 h-8 text-theme-text-muted animate-spin" />} title="正在检查更新…" />;
  } else if (phase === 'latest') {
    body = (
      <StatusMessage icon={<CircleCheck className="w-10 h-10 text-emerald-500" />} title="已是最新版本">
        Squircle To-Do {currentVersionName}
      </StatusMessage>
    );
  } else if (phase === 'failed') {
    body = (
      <StatusMessage icon={<WifiOff className="w-9 h-9 text-theme-text-muted" />} title="连不上更新服务器">
        <p>局域网、国内中转和公网线路都没有回应，稍后再试。待办功能不受影响，离线也能正常使用。</p>
        <SquircleButton variant="tonal" size="sm" className="mt-4" onClick={() => check()}>
          重试
        </SquircleButton>
      </StatusMessage>
    );
  } else {
    body = <UpdateDetails />;
  }

  return (
    // Above the bulletin sheet (z-[70]): both can open on their own at launch.
    <Modal open={open} onClose={close} title="软件更新" cancelLabel="关闭" zIndex="z-[80]">
      {body}
    </Modal>
  );
};
