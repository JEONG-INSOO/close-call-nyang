import { useEffect, useRef } from 'react';

export function useAppLifecycle(onInactive: () => void): void {
  const callback = useRef(onInactive);
  callback.current = onInactive;
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const inactive = () => callback.current();
    const visibility = () => { if (document.visibilityState === 'hidden') inactive(); };
    window.addEventListener('blur', inactive);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
      window.removeEventListener('blur', inactive);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
}
