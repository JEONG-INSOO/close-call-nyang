import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { createGameController } from './controller';
import type { SceneFrame } from '../scene/types';

const INITIAL_FRAME: SceneFrame = {
  distanceM: 0, elapsedSeconds: 0, angleRad: 0, angularVelocity: 0,
  hasCoffee: false, protectionSeconds: 0, playing: false, fallen: false, seed: 1,
};

/** One controller for this mounted app; feature flags are startup configuration. */
export function useGameController(flags: { mockAdsEnabled: boolean }) {
  const [controller] = useState(() => createGameController(flags));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const frame = useSharedValue<SceneFrame>(INITIAL_FRAME);
  const lease = useRef(0);

  useEffect(() => {
    const currentLease = ++lease.current;
    let active = true;
    const unsubscribe = controller.subscribeFrame(nextFrame => { frame.value = nextFrame; });
    const tick = (timestampMs: number) => {
      if (!active) return;
      controller.advanceFrame(timestampMs);
      if (active) requestId = requestAnimationFrame(tick);
    };
    let requestId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(requestId);
      unsubscribe();
      controller.clearInput();
      controller.resetFrameClock();
      // React StrictMode rehearses cleanup/setup on the same controller.
      // Defer final disposal one microtask, cancelling it if setup renews the lease.
      lease.current = currentLease + 1;
      const releasedLease = lease.current;
      void Promise.resolve().then(() => {
        if (lease.current === releasedLease) controller.dispose();
      });
    };
  }, [controller, frame]);

  return { controller, snapshot, frame };
}
