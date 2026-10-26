/**
 * Open overlays (sheets, alerts, the focus clock, popovers) register how to
 * close themselves here; the Android back key closes the one opened last.
 * See useBackHandler and stores/backNavigation.
 */
export interface BackHandler {
  current: () => void;
}

const handlers: BackHandler[] = [];

/** Registers an open overlay; returns the function that unregisters it. */
export function pushBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

/** Closes the most recently opened overlay; false when none is open. */
export function closeTopOverlay(): boolean {
  const top = handlers[handlers.length - 1];
  if (!top) return false;
  top.current();
  return true;
}
