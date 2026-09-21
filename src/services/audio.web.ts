import { useEffect, useMemo } from 'react';
import { Asset } from 'expo-asset';
import { AUDIO_KEYS, useAudioCoordinator, type AudioKey, type AudioPort, type AudioPorts, type FeedbackStatus } from './audioCore';
import type { Settings } from './preferences';
export type { AudioCue } from './audioCore';

const SOURCES: Record<AudioKey, number> = {
  music: require('../../assets/audio/commute-loop.wav'), footstep: require('../../assets/audio/step.wav'),
  wobble: require('../../assets/audio/wobble.wav'), fall: require('../../assets/audio/fall.wav'), coffee: require('../../assets/audio/coffee.wav'),
};
interface WebPort extends AudioPort { load(): void; dispose(): void }
function webPort(source: number): WebPort {
  let media: HTMLAudioElement | null = null;
  const listeners = new Set<(status: FeedbackStatus) => void>();
  const notify = () => {
    if (media) for (const listener of listeners) listener({ playing: !media.paused,
      loaded: media.readyState >= 2, buffering: media.readyState < 3, ended: media.ended,
      error: media.error ? `Media error ${media.error.code}` : null });
  };
  const events = ['play', 'pause', 'ended', 'error', 'waiting', 'canplay'];
  return {
    load() {
      if (typeof Audio === 'undefined') return;
      media = new Audio(Asset.fromModule(source).uri);
      media.preload = 'auto';
      events.forEach(event => media!.addEventListener(event, notify));
      media.load();
    },
    configure(loop, volume) { if (media) { media.loop = loop; media.volume = volume; } },
    mute(value) { if (media) media.muted = value; },
    play() { return media ? media.play() : Promise.reject(new Error('Audio unavailable')); },
    pause() { media?.pause(); },
    async seek() { if (media) media.currentTime = 0; },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() {
      if (!media) return;
      const previous = media;
      media = null;
      events.forEach(event => previous.removeEventListener(event, notify));
      previous.pause(); previous.removeAttribute('src'); previous.load(); listeners.clear();
    },
  };
}

/** Own media promises on web: SDK 57's web player discards play() rejections. */
export function useGameAudio(settings: Settings) {
  const ports = useMemo(() => Object.fromEntries(AUDIO_KEYS.map(key => [key, webPort(SOURCES[key])])) as Record<AudioKey, WebPort>, []);
  useEffect(() => {
    for (const key of AUDIO_KEYS) { try { ports[key].load(); } catch { /* Missing browser audio is nonfatal. */ } }
    return () => { for (const key of AUDIO_KEYS) { try { ports[key].dispose(); } catch { /* Already disposed. */ } } };
  }, [ports]);
  return useAudioCoordinator(settings, ports as AudioPorts, true);
}
