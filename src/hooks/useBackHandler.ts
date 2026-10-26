import { useEffect, useRef } from 'react';
import { pushBackHandler } from '../utils/backStack';

/**
 * While `active`, the Android back key calls `onBack` (if this is the overlay
 * opened last). Registers once per opening, so re-renders keep the stack order.
 */
export function useBackHandler(active: boolean, onBack: () => void): void {
  const handler = useRef(onBack);
  useEffect(() => {
    handler.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    return pushBackHandler(handler);
  }, [active]);
}
