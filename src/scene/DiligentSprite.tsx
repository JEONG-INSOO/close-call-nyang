import React, { useId } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { ClipPath, Defs, Ellipse, G, Image, Path, Rect } from 'react-native-svg';
import type { GProps } from 'react-native-svg';
import { palette } from '../theme/tokens';
import { expressionAt } from './RookieSprite';
import { svgTransform, svgTransformAdapter } from './svgMotion';
import type { SceneFrame } from './types';
import { walkPhaseAt, type EmployeePose } from './walk';

/** Four supplied poses share a 380×425 canvas and the existing y=415 feet pivot. */
export const DILIGENT_ART = Object.freeze({ width: 380, height: 425, feetY: 415, scale: 200 / 387.5 });
// Playback order follows the user's four photos: 1 → 2 → 4 → 3.
// Slots: walking 1,2,4,3; worried; fallen.
const ATLAS = require('../../assets/characters/diligent/walk-atlas-v4.png');
const AnimatedG = Animated.createAnimatedComponent(G);

interface DiligentSpriteProps {
  frame: SharedValue<SceneFrame>;
  pose: EmployeePose;
}

/** The mint protection cue follows the new round head, cardigan and fluffy tail. */
export function DiligentProtectionShape(): React.JSX.Element {
  return <G fill="none" stroke={palette.mint} strokeWidth={7}>
    <Ellipse cx={0} cy={-146} rx={82} ry={64} />
    <Ellipse cx={-4} cy={-61} rx={85} ry={59} />
  </G>;
}

/** Art-only index; game distance and physics are never changed by the walk cycle. */
export function diligentFrameIndexAt(pose: EmployeePose, distanceM: number): number {
  'worklet';
  return pose === 'game' ? Math.min(3, Math.floor(walkPhaseAt(distanceM) * (2 / Math.PI))) : 0;
}

export function DiligentSprite({ frame, pose }: DiligentSpriteProps): React.JSX.Element {
  const clipId = `diligent-frame-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const atlasProps = useAnimatedProps<GProps>(() => {
    const expression = expressionAt(frame.value.angleRad, frame.value.fallen);
    const slot = expression === 2 ? 5 : expression === 1 ? 4 : diligentFrameIndexAt(pose, frame.value.distanceM);
    return { transform: svgTransform(0, -slot * DILIGENT_ART.width, 0) };
  }, [frame, pose], svgTransformAdapter);
  const coffeeProps = useAnimatedProps<GProps>(() => ({
    opacity: pose === 'game' && frame.value.hasCoffee ? 1 : 0,
  }), [frame, pose]);

  const x = -DILIGENT_ART.width * DILIGENT_ART.scale / 2;
  const y = -DILIGENT_ART.feetY * DILIGENT_ART.scale;
  return <G testID="diligent-sprite">
    <G transform={`translate(${x} ${y}) scale(${DILIGENT_ART.scale})`}>
      <Defs><ClipPath id={clipId}><Rect x={0} y={0} width={DILIGENT_ART.width} height={DILIGENT_ART.height} /></ClipPath></Defs>
      <G clipPath={`url(#${clipId})`}>
        <AnimatedG testID="diligent-atlas-shift" animatedProps={atlasProps}>
          <Image testID="diligent-atlas" href={ATLAS} x={0} y={0} width={DILIGENT_ART.width * 6} height={DILIGENT_ART.height} />
        </AnimatedG>
      </G>
    </G>
    <AnimatedG testID="cup-visibility" animatedProps={coffeeProps}>
      <G testID="cup" transform="translate(64 -60)" stroke="#54372C" strokeWidth={2.5} strokeLinejoin="round">
        <Path d="M-10 -17 H11 L8 11 Q0 14 -8 11Z" fill="#FFF7E7" />
        <Path d="M-10 -7 H10 L9 2 H-9Z" fill="#A9C7C3" stroke="none" />
        <Rect x={-12} y={-21} width={25} height={6} rx={2} fill="#72544A" />
      </G>
    </AnimatedG>
  </G>;
}
