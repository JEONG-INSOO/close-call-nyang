import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useAppLifecycle(onInactive: () => void): void {
  const callback = useRef(onInactive);
  callback.current = onInactive;
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', state => {
      if ((state === 'inactive' || state === 'background') && state !== previous) callback.current();
      previous = state;
    });
    return () => subscription.remove();
  }, []);
}
