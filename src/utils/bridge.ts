/**
 * Thin wrapper over the Android WebView bridge (`window.AndroidBridge`, see
 * android/.../WebAppInterface.java) with browser fallbacks.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 45,
  success: [15, 30, 20],
  error: [30, 40, 30, 40],
};

const native = () => (typeof window !== 'undefined' ? window.AndroidBridge : undefined);

export const nativeBridge = {
  setStatusBarTheme(dark: boolean, hexColor: string): void {
    const bridge = native();
    if (bridge) {
      bridge.setStatusBarTheme(dark, hexColor);
      return;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hexColor);
  },

  haptic(type: HapticType = 'light'): void {
    const bridge = native();
    if (bridge) {
      bridge.performHapticFeedback(type);
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator && navigator.userActivation?.hasBeenActive !== false) {
      // Browsers reject vibrate() before the first user gesture.
      navigator.vibrate(VIBRATION_PATTERNS[type]);
    }
  },

  /** Native share sheet on Android, file download in the browser. */
  shareFile(fileName: string, mimeType: string, content: string): void {
    const bridge = native();
    if (bridge) {
      bridge.shareBackupFile(fileName, mimeType, content);
      return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },

  openUrl(url: string): void {
    const bridge = native();
    if (bridge?.openBrowser) bridge.openBrowser(url);
    else window.open(url, '_blank', 'noopener');
  },

  /** True inside an Android shell that can update itself (see useUpdateStore). */
  canSelfUpdate(): boolean {
    return typeof native()?.checkForUpdate === 'function';
  },

  checkForUpdate(): void {
    native()?.checkForUpdate?.();
  },

  downloadUpdate(): void {
    native()?.downloadUpdate?.();
  },

  cancelUpdateDownload(): void {
    native()?.cancelUpdateDownload?.();
  },

  /** Screen refresh rate reported by the Android shell; null in a plain browser. */
  displayRefreshRate(): number | null {
    try {
      const rate = native()?.getDisplayRefreshRate?.();
      if (typeof rate === 'number' && rate > 0) return Math.round(rate);
    } catch {
      // fall through
    }
    return null;
  },
};

/** Shorthand used by UI event handlers. */
export const haptic = nativeBridge.haptic;
