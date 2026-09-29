import React, { useId } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { ClipPath, Defs, Ellipse, G, Image, Path, Rect } from 'react-native-svg';
import type { GProps } from 'react-native-svg';
import { palette } from '../theme/tokens';
import { expressionAt } from './RookieSprite';
import { svgTransform, svgTransformAdapter } from './svgMotion';
import type { SceneFrame } from './types';
import { walkPhaseAt, type EmployeePose } from './walk';

export const VETERAN_ART = Object.freeze({ width: 380, height: 425, feetY: 415, scale: 200 / 387.5 });
// Slots 0..3 preserve the user's exact 01 → 02 → 03 → 04 order, including the repeated right paw.
const ATLAS = require('../../assets/characters/veteran/walk-atlas-v1.png');
const AnimatedG = Animated.createAnimatedComponent(G);

export function veteranFrameIndexAt(pose: EmployeePose, distanceM: number): 0 | 1 | 2 | 3 {
  'worklet';
  if (pose !== 'game') return 0;
  return Math.min(3, Math.floor(walkPhaseAt(distanceM) * (2 / Math.PI))) as 0 | 1 | 2 | 3;
}

export function VeteranProtectionShape(): React.JSX.Element {
  return <G fill="none" stroke={palette.mint} strokeWidth={7}>
    <Ellipse cx={0} cy={-146} rx={82} ry={64} />
    <Ellipse cx={-4} cy={-61} rx={85} ry={59} />
  </G>;
}

export function VeteranSprite({ frame, pose }: { frame: SharedValue<SceneFrame>; pose: EmployeePose }): React.JSX.Element {
  const clipId = `veteran-frame-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const atlasProps = useAnimatedProps<GProps>(() => {
    const expression = expressionAt(frame.value.angleRad, frame.value.fallen);
    const slot = expression === 2 ? 5 : expression === 1 ? 4 : veteranFrameIndexAt(pose, frame.value.distanceM);
    return { transform: svgTransform(0, -slot * VETERAN_ART.width, 0) };
  }, [frame, pose], svgTransformAdapter);
  const coffeeProps = useAnimatedProps<GProps>(() => ({
    opacity: pose === 'game' && frame.value.hasCoffee ? 1 : 0,
  }), [frame, pose]);

  const x = -VETERAN_ART.width * VETERAN_ART.scale / 2;
  const y = -VETERAN_ART.feetY * VETERAN_ART.scale;
  return <G testID="veteran-sprite">
    <G transform={`translate(${x} ${y}) scale(${VETERAN_ART.scale})`}>
      <Defs><ClipPath id={clipId}><Rect x={0} y={0} width={VETERAN_ART.width} height={VETERAN_ART.height} /></ClipPath></Defs>
      <G clipPath={`url(#${clipId})`}>
        <AnimatedG testID="veteran-atlas-shift" animatedProps={atlasProps}>
          <Image testID="veteran-atlas" href={ATLAS} x={0} y={0} width={VETERAN_ART.width * 6} height={VETERAN_ART.height} />
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
