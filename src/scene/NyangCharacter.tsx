import React from 'react';
import Animated, {
  cancelAnimation, Easing, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { G } from 'react-native-svg';
import type { GProps } from 'react-native-svg';
import { DEFAULT_CHARACTER_ID } from '../characters/catalog';
import { DiligentProtectionShape, DiligentSprite } from './DiligentSprite';
import { RookieProtectionShape, RookieSprite } from './RookieSprite';
import { VeteranProtectionShape, VeteranSprite } from './VeteranSprite';
import { svgTransform, svgTransformAdapter } from './svgMotion';
import type { SceneProps } from './types';
import { NYANG_WALK, type EmployeePose } from './walk';

export { NYANG_WALK, walkPhaseAt, type EmployeePose } from './walk';
export interface NyangCharacterProps extends SceneProps { pose?: EmployeePose }

/** Shared cosmetic coordinate system. This does not control physics or scoring. */
export const NYANG_RIG = Object.freeze({
  height: 200, headHeight: 104, torsoHeight: 78, legHeight: 18,
  pivotX: 0, pivotY: 0, legLeftX: -25, legRightX: 25, cupX: 64, cupY: -60,
});

const AnimatedG = Animated.createAnimatedComponent(G);

export function NyangCharacter({ frame, reduceMotion, characterId = DEFAULT_CHARACTER_ID, pose = 'game' }: NyangCharacterProps): React.JSX.Element {
  // The fall finish is visual only; it never mutates the run frame or rank.
  const tumble = useSharedValue(0);
  useAnimatedReaction(
    () => ({ fallen: frame.value.fallen, reduced: reduceMotion }),
    (current, previous) => {
      if (current.fallen === previous?.fallen && current.reduced === previous?.reduced) return;
      cancelAnimation(tumble);
      tumble.value = current.fallen
        ? current.reduced ? 1 : withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
        : 0;
    },
    [frame, reduceMotion, tumble],
  );
  const rootProps = useAnimatedProps<GProps>(() => {
    const lean = frame.value.angleRad * 180 / Math.PI;
    const finishedLean = (lean < 0 ? -1 : 1) * 82;
    const progress = frame.value.fallen ? (reduceMotion ? 1 : tumble.value) : 0;
    return { transform: svgTransform(lean + (finishedLean - lean) * progress) };
  }, [frame, reduceMotion, tumble], svgTransformAdapter);
  const protectionProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.protectionSeconds > 0 ? 0.5 : 0 }), [frame]);

  return (
    <AnimatedG testID="nyang-root" animatedProps={rootProps}>
      <AnimatedG testID="protection-outline" animatedProps={protectionProps}>
        {characterId === 'rookie' ? <RookieProtectionShape />
          : characterId === 'diligent' ? <DiligentProtectionShape />
          : <VeteranProtectionShape />}
      </AnimatedG>
      {characterId === 'rookie'
        ? <RookieSprite frame={frame} reduceMotion={reduceMotion} pose={pose} tumble={tumble} />
        : characterId === 'diligent'
          ? <DiligentSprite frame={frame} pose={pose} />
          : <VeteranSprite frame={frame} pose={pose} />}
    </AnimatedG>
  );
}
