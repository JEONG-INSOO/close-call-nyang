import { useEffect, useMemo } from 'react';
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useAudioCoordinator, type AudioPort } from './audioCore';
import type { Settings } from './preferences';
export type { AudioCue } from './audioCore';

const OPTIONS = { updateInterval: 200, keepAudioSessionActive: false };
function port(player: AudioPlayer): AudioPort {
  return {
    configure(loop, volume) { player.loop = loop; player.volume = volume; },
    mute(value) { player.muted = value; },
    play: () => player.play(), pause: () => player.pause(), seek: () => player.seekTo(0),
    subscribe(listener) {
      const subscription = player.addListener('playbackStatusUpdate', status => listener({
        playing: status.playing, loaded: status.isLoaded, buffering: status.isBuffering,
        ended: status.didJustFinish, error: status.error, interrupted: status.mediaServicesDidReset,
      }));
      return () => subscription.remove();
    },
  };
}

export function useGameAudio(settings: Settings) {
  // Each hook loads its local asset once and releases its native player on unmount.
  const music = useAudioPlayer(require('../../assets/audio/commute-loop.wav'), OPTIONS);
  const footstep = useAudioPlayer(require('../../assets/audio/step.wav'), OPTIONS);
  const wobble = useAudioPlayer(require('../../assets/audio/wobble.wav'), OPTIONS);
  const fall = useAudioPlayer(require('../../assets/audio/fall.wav'), OPTIONS);
  const coffee = useAudioPlayer(require('../../assets/audio/coffee.wav'), OPTIONS);
  const ports = useMemo(() => ({ music: port(music), footstep: port(footstep), wobble: port(wobble), fall: port(fall), coffee: port(coffee) }),
    [music, footstep, wobble, fall, coffee]);
  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false,
      shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);
  return useAudioCoordinator(settings, ports, false);
}
