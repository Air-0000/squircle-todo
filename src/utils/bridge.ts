export const isNativeAndroid = (): boolean => {
  return typeof window !== 'undefined' && typeof window.AndroidBridge !== 'undefined';
};

export interface HttpResponse {
  status: number;
  data: string;
  ok: boolean;
  error?: string;
}

export interface NativeBridgeWrapper {
  setStatusBarTheme: (dark: boolean, hexColor: string) => void;
  performHapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
  shareBackupFile: (fileName: string, mimeType: string, content: string) => void;
  requestHttp: (urlString: string, method: string, headersJson: string, body: string) => string;
  requestHttpAsync: (urlString: string, method?: string, headersJson?: string, body?: string, timeoutMs?: number) => Promise<HttpResponse>;
  downloadAndInstallApk: (primaryUrl: string, versionName: string, fallbackUrl?: string, authHeader?: string) => void;
  openBrowser: (url: string) => void;
  getDisplayRefreshRate: () => number;
  getAppVersion: () => { versionCode: number; versionName: string } | null;
  getNetworkType: () => 'wifi' | 'cellular' | 'none' | 'unknown';
}

const pendingHttpMap = new Map<string, {
  resolve: (res: HttpResponse) => void;
  timer: any;
}>();

if (typeof window !== 'undefined') {
  window.__onNativeHttpResponse = (responseJson: string) => {
    try {
      const parsed = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;
      const { requestId, status, data, ok, error } = parsed;
      const pending = pendingHttpMap.get(requestId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingHttpMap.delete(requestId);
        pending.resolve({
          status: status || 0,
          data: data || '',
          ok: Boolean(ok),
          error: error || undefined,
        });
      }
    } catch (e) {
      console.error('[Bridge] Failed to handle native HTTP response callback:', e);
    }
  };
}

export const nativeBridge: NativeBridgeWrapper = {
  setStatusBarTheme: (dark: boolean, hexColor: string) => {
    if (isNativeAndroid() && window.AndroidBridge?.setStatusBarTheme) {
      window.AndroidBridge.setStatusBarTheme(dark, hexColor);
    } else {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', hexColor);
      }
    }
  },

  performHapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    if (isNativeAndroid() && window.AndroidBridge?.performHapticFeedback) {
      window.AndroidBridge.performHapticFeedback(type);
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      switch (type) {
        case 'light': navigator.vibrate(10); break;
        case 'medium': navigator.vibrate(25); break;
        case 'heavy': navigator.vibrate(45); break;
        case 'success': navigator.vibrate([15, 30, 20]); break;
        case 'error': navigator.vibrate([30, 40, 30, 40]); break;
      }
    }
  },

  shareBackupFile: (fileName: string, mimeType: string, content: string) => {
    if (isNativeAndroid() && window.AndroidBridge?.shareBackupFile) {
      window.AndroidBridge.shareBackupFile(fileName, mimeType, content);
    } else if (typeof document !== 'undefined') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  },

  requestHttp: (urlString: string, method: string, headersJson: string, body: string): string => {
    if (isNativeAndroid() && window.AndroidBridge?.requestHttp) {
      return window.AndroidBridge.requestHttp(urlString, method, headersJson, body);
    }
    return '';
  },

  requestHttpAsync: (
    urlString: string,
    method: string = 'GET',
    headersJson: string = '{}',
    body: string = '',
    timeoutMs: number = 2500
  ): Promise<HttpResponse> => {
    // 1. Preferred Non-blocking Asynchronous Android Bridge
    if (isNativeAndroid() && typeof window.AndroidBridge?.requestHttpAsync === 'function') {
      return new Promise<HttpResponse>((resolve) => {
        const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const timer = setTimeout(() => {
          pendingHttpMap.delete(requestId);
          resolve({
            status: 0,
            data: '',
            ok: false,
            error: `连接超时 (${timeoutMs}ms)`,
          });
        }, timeoutMs + 400);

        pendingHttpMap.set(requestId, { resolve, timer });

        try {
          window.AndroidBridge!.requestHttpAsync!(
            requestId,
            urlString,
            method,
            headersJson,
            body,
            timeoutMs
          );
        } catch (e: any) {
          clearTimeout(timer);
          pendingHttpMap.delete(requestId);
          resolve({
            status: 0,
            data: '',
            ok: false,
            error: e?.message || '调用原生网络接口失败',
          });
        }
      });
    }

    // 2. Fallback to synchronous bridge if async is not available in older wrapper
    if (isNativeAndroid() && typeof window.AndroidBridge?.requestHttp === 'function') {
      try {
        const raw = window.AndroidBridge.requestHttp(urlString, method, headersJson, body);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Promise.resolve({
            status: parsed.status || 0,
            data: parsed.data || '',
            ok: Boolean(parsed.ok),
            error: parsed.error || undefined,
          });
        }
      } catch (e: any) {}
    }

    return Promise.resolve({
      status: 0,
      data: '',
      ok: false,
      error: 'Native HTTP bridge unavailable',
    });
  },

  getNetworkType: (): 'wifi' | 'cellular' | 'none' | 'unknown' => {
    if (isNativeAndroid() && typeof window.AndroidBridge?.getNetworkType === 'function') {
      try {
        const type = window.AndroidBridge.getNetworkType();
        if (type === 'wifi' || type === 'cellular' || type === 'none') {
          return type;
        }
      } catch (e) {}
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'none';
    }
    return 'unknown';
  },

  downloadAndInstallApk: (
    primaryUrl: string, 
    versionName: string, 
    fallbackUrl: string = '', 
    authHeader: string = ''
  ) => {
    if (isNativeAndroid() && window.AndroidBridge?.downloadAndInstallApk) {
      try {
        (window.AndroidBridge as any).downloadAndInstallApk(primaryUrl, fallbackUrl, authHeader, versionName);
      } catch (e) {
        window.AndroidBridge.downloadAndInstallApk(primaryUrl, versionName);
      }
    } else if (typeof window !== 'undefined') {
      // Browser fallback: download directly
      const a = document.createElement('a');
      a.href = primaryUrl;
      a.download = `squircle_todo_${versionName || 'latest'}.apk`;
      a.target = '_blank';
      a.click();
    }
  },

  openBrowser: (url: string) => {
    if (isNativeAndroid() && (window.AndroidBridge as any)?.openBrowser) {
      (window.AndroidBridge as any).openBrowser(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  },

  getDisplayRefreshRate: (): number => {
    if (isNativeAndroid() && (window.AndroidBridge as any)?.getDisplayRefreshRate) {
      try {
        const rate = (window.AndroidBridge as any).getDisplayRefreshRate();
        if (typeof rate === 'number' && rate > 0) return Math.round(rate);
      } catch (e) {}
    }
    return 120;
  },

  getAppVersion: () => {
    if (isNativeAndroid() && window.AndroidBridge?.getAppVersion) {
      try {
        const json = window.AndroidBridge.getAppVersion();
        return JSON.parse(json);
      } catch (e) {
        // Fallback
      }
    }
    return null;
  }
};
