import type { SharedValue } from 'react-native-reanimated';
import type { CharacterId } from '../characters/catalog';

/** Display-only sample supplied by the future controller. No actions or storage. */
export interface SceneFrame {
  distanceM: number;
  elapsedSeconds: number;
  angleRad: number;
  angularVelocity: number;
  hasCoffee: boolean;
  protectionSeconds: number;
  playing: boolean;
  fallen: boolean;
  seed: number;
}

export interface Viewport {
  width: number; height: number; scale: number; left: number; top: number;
}

export interface SceneModel {
  cafeX: number; entranceX: number; officeBlend: number; stage: 'street' | 'office';
}

export interface SceneProps {
  frame: SharedValue<SceneFrame>;
  reduceMotion: boolean;
  characterId?: CharacterId;
}
