import { useEffect } from 'react';
import { useFocusStore } from '../stores/useFocusStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { findAutoPopupBulletin } from '../stores/useBulletinStore';
import { useUpdateStore } from '../stores/useUpdateStore';
import { nativeBridge } from '../utils/bridge';

const MINUTE = 60_000;
const BULLETIN_POPUP_DELAY_MS = 1800;
const UPDATE_CHECK_DELAY_MS = 3000;

/** All app-wide timers: focus clock tick, cycle resets, theme clock, bulletin popup, update check. */
export function useAppLifecycle(): void {
  // Focus timer
  useEffect(() => {
    const id = setInterval(() => useFocusStore.getState().tick(), 1000);
    return () => clearInterval(id);
  }, []);

  // Cycle refresh + auto theme: on start, every minute and when the app comes back to the foreground.
  useEffect(() => {
    const check = () => {
      useThemeStore.getState().syncWithClock();
      useTaskStore.getState().refreshCycles();
    };
    check();
    const id = setInterval(check, MINUTE);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        check();
        useFocusStore.getState().tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Unread "popup once" / urgent announcements
  useEffect(() => {
    const id = setTimeout(() => {
      const bulletin = findAutoPopupBulletin();
      if (bulletin && !useUIStore.getState().bulletinDetailId) useUIStore.getState().showBulletin(bulletin.id);
    }, BULLETIN_POPUP_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  // Silent update check on start (Android shell only); the update sheet opens if one is found.
  useEffect(() => {
    if (!nativeBridge.canSelfUpdate()) return;
    const id = setTimeout(() => useUpdateStore.getState().check(true), UPDATE_CHECK_DELAY_MS);
    return () => clearTimeout(id);
  }, []);
}
