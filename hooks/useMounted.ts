import { useSyncExternalStore } from 'react';

// This function never changes, so it's safe to define outside the hook
function subscribe() {
  return () => {};
}

export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,  // Client: returns true
    () => false  // Server: returns false
  );
}