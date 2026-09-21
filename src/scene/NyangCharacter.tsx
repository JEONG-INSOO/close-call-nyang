import React, { memo } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { GProps } from 'react-native-svg';
import { DEFAULT_CHARACTER_ID } from '../characters/catalog';
import type { CharacterId } from '../characters/catalog';
import { palette } from '../theme/tokens';
import type { SceneProps } from './types';
import { svgTransform, svgTransformAdapter } from './svgMotion';

/** All outfits share this visual rig. These are not physics dimensions. */
export const NYANG_RIG = Object.freeze({
  height: 205,
  headHeight: 118,
  torsoHeight: 51,
  legHeight: 36,
  pivotX: 0,
  pivotY: 0,
  legLeftX: -19,
  legRightX: 19,
  cupX: 58,
  cupY: -58,
});

const AnimatedG = Animated.createAnimatedComponent(G);

const Face = memo(function Face({ id }: { id: CharacterId }) {
  return (
    <G testID={`face-${id}`} stroke={palette.ink} strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx={22} cy={-115} rx={25} ry={17} fill={palette.white} stroke="none" />
      {id === 'rookie' ? (
        <G>
          <Path d="M-22 -159 Q-13 -165 -3 -160 M25 -164 Q33 -168 42 -162" fill="none" strokeWidth={3} />
          <Ellipse cx={-11} cy={-141} rx={7} ry={10} fill={palette.ink} stroke="none" />
          <Ellipse cx={33} cy={-142} rx={6} ry={9} fill={palette.ink} stroke="none" />
          <Circle cx={-9} cy={-144} r={2} fill={palette.white} stroke="none" />
          <Circle cx={35} cy={-145} r={1.7} fill={palette.white} stroke="none" />
          <Path d="M16 -108 Q23 -112 29 -108" fill="none" strokeWidth={2.8} />
        </G>
      ) : id === 'diligent' ? (
        <G>
          <Path d="M-23 -159 Q-13 -154 -4 -158 M25 -160 Q34 -156 42 -159" fill="none" strokeWidth={3} />
          <Path d="M-20 -143 Q-12 -151 -4 -143 M27 -144 Q34 -151 40 -143" fill="none" strokeWidth={3.5} />
          <Path d="M-18 -133 L-6 -131 M28 -133 L38 -132" fill="none" stroke={palette.lavender} strokeWidth={2.8} />
          <Path d="M17 -109 Q23 -106 29 -109" fill="none" strokeWidth={2.8} />
        </G>
      ) : (
        <G>
          <Path d="M-22 -157 L-4 -159 M25 -162 Q35 -169 43 -162" fill="none" strokeWidth={3} />
          <Path d="M-21 -144 L-4 -141 M27 -142 L42 -144" fill="none" strokeWidth={3.3} />
          <Ellipse cx={-10} cy={-140} rx={3.1} ry={4.3} fill={palette.ink} stroke="none" />
          <Ellipse cx={34} cy={-141} rx={3} ry={4.1} fill={palette.ink} stroke="none" />
          <Path d="M15 -110 Q23 -102 34 -111 M34 -111 L34 -115" fill="none" strokeWidth={2.8} />
        </G>
      )}
      <Path d="M20 -122 Q25 -126 30 -122 L25 -117 Z" fill="#C88780" stroke="none" />
      <Path d="M25 -117 L25 -113" strokeWidth={2} />
      <Path d="M-28 -123 L-40 -126 M-27 -117 L-40 -115 M48 -124 L58 -128 M49 -118 L60 -118" strokeWidth={1.8} />
      <Ellipse cx={-24} cy={-124} rx={7} ry={3.5} fill={palette.peach} stroke="none" />
    </G>
  );
});

const Outfit = memo(function Outfit({ id }: { id: CharacterId }) {
  return (
    <G testID={`outfit-${id}`} stroke={palette.ink} strokeWidth={3} strokeLinejoin="round">
      <Path d="M-23 -87 Q-34 -74 -31 -43 Q0 -32 31 -43 L30 -76 Q18 -87 -23 -87Z" fill={palette.navy} />
      <Path d="M-11 -85 L14 -85 L9 -44 L-7 -44 Z" fill={palette.white} strokeWidth={2} />
      <Path d="M-12 -85 L-2 -72 L-12 -63 L-22 -80 M14 -85 L4 -72 L15 -64 L23 -80" fill="#66758D" strokeWidth={2} />
      {id === 'rookie' ? (
        <Path d="M1 -77 L9 -73 L4 -66 L9 -52 L2 -46 L-3 -53 L1 -66 L-3 -72Z" fill={palette.mint} strokeWidth={1.8} />
      ) : id === 'diligent' ? (
        <G>
          <Path d="M-2 -74 L7 -74 L6 -66 L8 -49 L3 -44 L-2 -49 L0 -66Z" fill={palette.mint} strokeWidth={1.8} />
          <Path d="M0 -79 L5 -79" strokeWidth={1.8} />
        </G>
      ) : (
        <G>
          <Path d="M-2 -79 L7 -79 L5 -71 L8 -53 L3 -48 L-2 -53 L0 -71Z" fill={palette.mint} strokeWidth={1.8} />
          <Path d="M0 -62 L6 -62" stroke="#D3BD7B" strokeWidth={2} />
        </G>
      )}
      <Path d="M18 -73 L18 -67" stroke={palette.mint} strokeWidth={2} />
      <Rect x={12} y={-67} width={14} height={16} rx={2} fill={palette.white} strokeWidth={1.5} />
      <Circle cx={17} cy={-61} r={2} fill={palette.lavender} stroke="none" />
      <Path d="M15 -56 L23 -56" strokeWidth={1.2} />
      <Path d="M-23 -52 L-16 -52" stroke="#8B99AD" strokeWidth={2} />
    </G>
  );
});

export function NyangCharacter({ frame, reduceMotion, characterId = DEFAULT_CHARACTER_ID }: SceneProps): React.JSX.Element {
  // This local finish never writes to the frame, elapsed time, or scored distance.
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
  const leftLegProps = useAnimatedProps<GProps>(() => {
    const stride = Math.sin(frame.value.distanceM * 5 + frame.value.elapsedSeconds * 0.8);
    return { transform: svgTransform(stride * 12, NYANG_RIG.legLeftX + stride * 3, -36 - Math.max(0, stride) * 5) };
  }, [frame], svgTransformAdapter);
  const rightLegProps = useAnimatedProps<GProps>(() => {
    const stride = -Math.sin(frame.value.distanceM * 5 + frame.value.elapsedSeconds * 0.8);
    return { transform: svgTransform(stride * 12, NYANG_RIG.legRightX + stride * 3, -36 - Math.max(0, stride) * 5) };
  }, [frame], svgTransformAdapter);
  const tailProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(-frame.value.angleRad * 18 + Math.sin(frame.value.elapsedSeconds * 4) * 5, -30, -48),
  }), [frame], svgTransformAdapter);
  const coffeeProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.hasCoffee ? 1 : 0 }));
  const emptyHandProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.hasCoffee ? 0 : 1 }));
  const faceProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(0, Math.max(-2, Math.min(2, frame.value.angleRad * 3)), 0),
  }), [frame], svgTransformAdapter);
  const concernProps = useAnimatedProps<GProps>(() => ({ opacity: Math.min(0.85, Math.abs(frame.value.angleRad) * 1.3) }));
  const protectionProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.protectionSeconds > 0 ? 0.5 : 0 }));

  return (
    <AnimatedG testID="nyang-root" animatedProps={rootProps} strokeLinecap="round" strokeLinejoin="round">
      <AnimatedG testID="protection-outline" animatedProps={protectionProps}>
        <Path d="M-55 -200 Q-72 -173 -66 -132 Q-64 -98 -39 -83 L-37 -34 Q-39 -6 -23 -3 L34 -3 Q49 -17 39 -43 L57 -71 Q80 -114 66 -155 Q61 -184 47 -201" fill="none" stroke={palette.mint} strokeWidth={7} />
      </AnimatedG>
      <AnimatedG testID="tail" animatedProps={tailProps}>
        <Path d="M2 -1 C-29 0 -47 -16 -38 -35 C-32 -47 -20 -39 -26 -29 C-31 -20 -19 -13 -1 -15" fill="none" stroke={palette.ink} strokeWidth={16} />
        <Path d="M2 -1 C-29 0 -47 -16 -38 -35 C-32 -47 -20 -39 -26 -29 C-31 -20 -19 -13 -1 -15" fill="none" stroke="#BCACA0" strokeWidth={10} />
      </AnimatedG>
      <AnimatedG testID="leg-left" animatedProps={leftLegProps}>
        <Path d="M-8 0 L8 0 L7 25 L-8 25Z" fill="#46546B" stroke={palette.ink} strokeWidth={3} />
        <Path d="M-8 23 Q0 21 8 25 L14 29 Q17 36 9 36 L-10 36 Q-15 31 -8 23Z" fill={palette.ink} />
        <Path d="M-6 29 L5 29" stroke="#A6B6BF" strokeWidth={2} />
      </AnimatedG>
      <AnimatedG testID="leg-right" animatedProps={rightLegProps}>
        <Path d="M-8 0 L8 0 L7 25 L-8 25Z" fill={palette.navy} stroke={palette.ink} strokeWidth={3} />
        <Path d="M-8 23 Q0 21 8 25 L14 29 Q17 36 9 36 L-10 36 Q-15 31 -8 23Z" fill={palette.ink} />
        <Path d="M-6 29 L5 29" stroke="#A6B6BF" strokeWidth={2} />
      </AnimatedG>
      <Path d="M-26 -79 Q-42 -72 -40 -55 Q-38 -48 -29 -49 L-23 -70" fill={palette.navy} stroke={palette.ink} strokeWidth={3} />
      {characterId === 'veteran' && <Path d="M-41 -59 L-29 -56 L-29 -50 L-40 -52Z" fill={palette.white} stroke={palette.ink} strokeWidth={2} />}
      <Ellipse cx={-34} cy={-48} rx={7} ry={8} fill={palette.cream} stroke={palette.ink} strokeWidth={2.5} />
      <Outfit id={characterId} />
      <AnimatedG animatedProps={emptyHandProps}>
        <Path d="M28 -79 Q45 -68 41 -53 L31 -53 L24 -70" fill={palette.navy} stroke={palette.ink} strokeWidth={3} />
        {characterId === 'veteran' && <Path d="M32 -61 L43 -60 L42 -53 L31 -54Z" fill={palette.white} stroke={palette.ink} strokeWidth={2} />}
        <Ellipse cx={36} cy={-49} rx={7} ry={8} fill={palette.cream} stroke={palette.ink} strokeWidth={2.5} />
      </AnimatedG>
      <Path d="M-53 -166 Q-62 -182 -55 -201 Q-53 -205 -48 -202 L-25 -183 Q1 -190 22 -183 L44 -203 Q49 -205 51 -199 L58 -172 Q68 -153 64 -130 Q61 -99 31 -89 Q-4 -83 -33 -96 Q-61 -110 -60 -135 Q-60 -153 -53 -166Z" fill={palette.cream} stroke={palette.ink} strokeWidth={3.5} />
      <Path d="M-49 -188 L-46 -174 L-34 -179Z M43 -189 L32 -179 L48 -174Z" fill="#DAB4AD" />
      <Path d="M-52 -150 Q-55 -121 -35 -110" fill="none" stroke="#E1C7A9" strokeWidth={7} />
      <Path d="M-7 -177 Q4 -181 15 -178" fill="none" stroke={palette.white} strokeWidth={4} />
      <AnimatedG animatedProps={faceProps}><Face id={characterId} /></AnimatedG>
      <AnimatedG animatedProps={concernProps}>
        <Path d="M-32 -153 L-28 -157 M-33 -148 L-28 -148" fill="none" stroke={palette.ink} strokeWidth={1.7} />
      </AnimatedG>
      <AnimatedG testID="cup-visibility" animatedProps={coffeeProps}>
        <Path d="M29 -78 Q42 -77 42 -65 L54 -65 L54 -53 L37 -52 Q30 -54 27 -64" fill={palette.navy} stroke={palette.ink} strokeWidth={3} />
        {characterId === 'veteran' && <Path d="M42 -66 L49 -66 L49 -54 L42 -53Z" fill={palette.white} stroke={palette.ink} strokeWidth={2} />}
        <G testID="cup" transform={`translate(${NYANG_RIG.cupX} ${NYANG_RIG.cupY})`}>
          <Path d="M-11 -20 L12 -20 L9 9 Q0 13 -8 9Z" fill={palette.white} stroke={palette.ink} strokeWidth={2.5} />
          <Path d="M-10 -9 L11 -9 L10 3 L-9 3Z" fill={palette.peach} />
          <Rect x={-13} y={-23} width={27} height={6} rx={2} fill={palette.mint} stroke={palette.ink} strokeWidth={2.5} />
          <Path d="M-3 -2 Q0 -6 3 -2 Q0 3 -3 -2Z" fill={palette.ink} />
        </G>
        <Ellipse cx={49} cy={-56} rx={6} ry={7} fill={palette.cream} stroke={palette.ink} strokeWidth={2.5} />
        <Line x1={48} y1={-57} x2={51} y2={-57} stroke={palette.ink} strokeWidth={1.5} />
      </AnimatedG>
    </AnimatedG>
  );
}
