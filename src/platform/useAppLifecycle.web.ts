import { useEffect, useRef } from 'react';
import { subscribeWebForeground } from './webForeground';

export function useAppLifecycle(onInactive: () => void): void {
  const callback = useRef(onInactive);
  callback.current = onInactive;
  useEffect(() => subscribeWebForeground(foreground => {
    // Becoming visible permits network work, but never automatically resumes play.
    if (!foreground) callback.current();
  }), []);
}
