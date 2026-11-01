import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False on the server and while React hydrates the server HTML, true right after (and on every
 * render made in the browser). A control that only works with JavaScript and is invisible until
 * hovered or focused (a copy-link button) can render after hydration instead of being written into
 * the exported HTML once per heading or property.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
