/** Methods exposed by android/app/src/main/java/com/squircle/todo/WebAppInterface.java. */
export interface AndroidBridgeInterface {
  setStatusBarTheme(dark: boolean, hexColor: string): void;
  performHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void;
  shareBackupFile(fileName: string, mimeType: string, content: string): void;
  openBrowser?(url: string): void;
  getDisplayRefreshRate?(): number;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
  }
}
