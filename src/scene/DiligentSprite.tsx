import React from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { Ellipse, G, Image, Path, Rect } from 'react-native-svg';
import type { GProps } from 'react-native-svg';
import { palette } from '../theme/tokens';
import type { SceneFrame } from './types';
import { strideFor, type EmployeePose } from './walk';

/** The 380×425 frames have the same 415px feet baseline and a 387.5px visible height. */
export const DILIGENT_ART = Object.freeze({ width: 380, height: 425, feetY: 415, scale: 200 / 387.5 });
const FRAME = {
  a: require('../../assets/characters/diligent/step-a.png'),
  b: require('../../assets/characters/diligent/step-b.png'),
};
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

export function DiligentSprite({ frame, pose }: DiligentSpriteProps): React.JSX.Element {
  const stepAProps = useAnimatedProps<GProps>(() => ({
    opacity: strideFor(pose, frame.value.distanceM) >= 0 ? 1 : 0,
  }), [frame, pose]);
  const stepBProps = useAnimatedProps<GProps>(() => ({
    opacity: strideFor(pose, frame.value.distanceM) < 0 ? 1 : 0,
  }), [frame, pose]);
  const coffeeProps = useAnimatedProps<GProps>(() => ({
    opacity: pose === 'game' && frame.value.hasCoffee ? 1 : 0,
  }), [frame, pose]);

  const x = -DILIGENT_ART.width * DILIGENT_ART.scale / 2;
  const y = -DILIGENT_ART.feetY * DILIGENT_ART.scale;
  return <G testID="diligent-sprite">
    <G transform={`translate(${x} ${y}) scale(${DILIGENT_ART.scale})`}>
      <AnimatedG testID="diligent-step-a" animatedProps={stepAProps}>
        <Image href={FRAME.a} x={0} y={0} width={DILIGENT_ART.width} height={DILIGENT_ART.height} />
      </AnimatedG>
      <AnimatedG testID="diligent-step-b" animatedProps={stepBProps}>
        <Image href={FRAME.b} x={0} y={0} width={DILIGENT_ART.width} height={DILIGENT_ART.height} />
      </AnimatedG>
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
