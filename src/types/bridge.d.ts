export interface AndroidBridgeInterface {
  setStatusBarTheme(dark: boolean, hexColor: string): void;
  performHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void;
  shareBackupFile(fileName: string, mimeType: string, content: string): void;
  requestHttp?(urlString: string, method: string, headersJson: string, body: string): string;
  requestHttpAsync?(requestId: string, urlString: string, method: string, headersJson: string, body: string, timeoutMs: number): void;
  downloadAndInstallApk?(primaryUrl: string, versionName: string, fallbackUrl?: string, authHeader?: string): void;
  openBrowser?(url: string): void;
  getDisplayRefreshRate?(): number;
  getAppVersion?(): string;
  getNetworkType?(): string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    __onNativeHttpResponse?: (responseJson: string) => void;
    __onNativeUpdateProgress?: (percent: number, readBytes: number, totalBytes: number, statusText: string) => void;
    __onNativeUpdateError?: (errorMsg: string) => void;
  }
}
