import { useEffect } from 'react';
import { useThemeStore } from '../stores/useThemeStore';

/**
 * Hook to automatically schedule and maintain theme synchronization
 * based on system clock (06:00 - 18:00) and window visibility.
 */
export function useThemeScheduler() {
  const { autoSwitch, syncWithClock, applyTheme } = useThemeStore();

  useEffect(() => {
    // Initial sync
    if (autoSwitch) {
      syncWithClock();
    } else {
      applyTheme();
    }

    if (!autoSwitch) return;

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      syncWithClock();
    }, 60000);

    // Refresh on app resume / tab visibility change
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncWithClock();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [autoSwitch, syncWithClock, applyTheme]);
}

export default useThemeScheduler;
