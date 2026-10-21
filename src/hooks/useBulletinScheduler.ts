import { useEffect } from 'react';
import { useBulletinStore } from '../stores/useBulletinStore';

/**
 * Hook to automatically check for router announcements,
 * sync bulletins on cold start and periodic intervals,
 * and trigger auto-popup for unread important notices.
 */
export function useBulletinScheduler() {
  const { fetchBulletins, checkAutoPopup } = useBulletinStore();

  useEffect(() => {
    // 1. Initial delayed check after app boots (1.8s)
    const initTimer = setTimeout(async () => {
      try {
        await fetchBulletins(true);
        checkAutoPopup();
      } catch {}
    }, 1800);

    // 2. Periodic poll every 5 minutes (300,000ms)
    const interval = setInterval(async () => {
      try {
        await fetchBulletins(true);
        checkAutoPopup();
      } catch {}
    }, 300000);

    // 3. Check on app resume / tab visibility change
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchBulletins(true).then(() => {
          checkAutoPopup();
        }).catch(() => {});
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [fetchBulletins, checkAutoPopup]);
}

export default useBulletinScheduler;
