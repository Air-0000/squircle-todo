/** Methods exposed by android/app/src/main/java/com/squircle/todo/WebAppInterface.java. */
export interface AndroidBridgeInterface {
  setStatusBarTheme(dark: boolean, hexColor: string): void;
  performHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void;
  shareBackupFile(fileName: string, mimeType: string, content: string): void;
  openBrowser?(url: string): void;
  getDisplayRefreshRate?(): number;
  /** In-app update (AppUpdater); results arrive through window.__onUpdateEvent. */
  checkForUpdate?(): void;
  downloadUpdate?(): void;
  cancelUpdateDownload?(): void;
}

export interface NativeVersion {
  versionCode: number;
  versionName: string;
}

export interface NativeUpdateInfo extends NativeVersion {
  apkSize: string;
  updateLog: string;
  forceUpdate: boolean;
}

/** Events sent by AppUpdater.java. */
export type NativeUpdateEvent =
  | { type: 'checked'; status: 'available'; current: NativeVersion; update: NativeUpdateInfo }
  | { type: 'checked'; status: 'latest'; current: NativeVersion }
  | { type: 'checked'; status: 'failed'; current: NativeVersion; message: string }
  | { type: 'progress'; downloaded: number; total: number }
  | { type: 'installing' }
  | { type: 'needs_permission' }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    __onUpdateEvent?: (event: NativeUpdateEvent) => void;
    /** Android back key (MainActivity); false lets the app exit. */
    __onNativeBack?: () => boolean;
  }
}
