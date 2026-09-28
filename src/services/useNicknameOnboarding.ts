import { useCallback, useEffect, useRef, useState } from 'react';
import { loadNicknameOnboarding, saveNicknameOnboardingHandled } from './nicknameOnboarding';

type Status = 'loading' | 'ready' | 'memoryOnly';

export function useNicknameOnboarding(): { handled: boolean; status: Status; markHandled(): void } {
  const [handled, setHandled] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const handledRef = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void loadNicknameOnboarding().then(loaded => {
      if (!active || !mounted.current || handledRef.current) return;
      handledRef.current = loaded.handled;
      setHandled(loaded.handled);
      setStatus(loaded.status);
    });
    return () => { active = false; mounted.current = false; };
  }, []);

  const markHandled = useCallback(() => {
    if (!mounted.current || handledRef.current) return;
    handledRef.current = true;
    setHandled(true);
    void saveNicknameOnboardingHandled().then(saved => {
      if (mounted.current) setStatus(saved ? 'ready' : 'memoryOnly');
    });
  }, []);

  return { handled, status, markHandled };
}
