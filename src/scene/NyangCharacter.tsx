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
  height: 186,
  headHeight: 118,
  torsoHeight: 50,
  legHeight: 18,
  pivotX: 0,
  pivotY: 0,
  legLeftX: -23,
  legRightX: 23,
  cupX: 62,
  cupY: -39,
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
      <Path testID="plush-body" d="M-28 -69 Q-45 -62 -45 -40 Q-45 -19 -23 -17 Q0 -13 23 -17 Q45 -20 45 -41 Q44 -64 28 -69Z" fill={palette.cream} />
      <Path d="M-30 -67 Q-45 -57 -40 -34 Q-33 -22 -13 -22 L0 -27 L14 -22 Q34 -23 40 -35 Q44 -56 29 -67 Q0 -74 -30 -67Z" fill={palette.navy} />
      <Path d="M-15 -66 L16 -66 L13 -29 Q1 -24 -12 -29Z" fill={palette.white} strokeWidth={2} />
      <Path d="M-16 -66 L-3 -53 L-15 -45 L-27 -61 M16 -66 L4 -53 L17 -45 L28 -61" fill="#66758D" strokeWidth={2} />
      {id === 'rookie' ? (
        <Path d="M1 -57 L9 -53 L4 -47 L9 -35 L2 -29 L-3 -36 L1 -47 L-3 -52Z" fill={palette.mint} strokeWidth={1.8} />
      ) : id === 'diligent' ? (
        <G>
          <Path d="M-2 -55 L7 -55 L6 -48 L8 -32 L3 -27 L-2 -32 L0 -48Z" fill={palette.mint} strokeWidth={1.8} />
          <Path d="M0 -60 L5 -60" strokeWidth={1.8} />
        </G>
      ) : (
        <G>
          <Path d="M-2 -60 L7 -60 L5 -52 L8 -36 L3 -31 L-2 -36 L0 -52Z" fill={palette.mint} strokeWidth={1.8} />
          <Path d="M0 -44 L6 -44" stroke="#D3BD7B" strokeWidth={2} />
        </G>
      )}
      <Path d="M28 -54 L28 -48" stroke={palette.mint} strokeWidth={2} />
      <Rect x={21} y={-48} width={15} height={17} rx={2.5} fill={palette.white} strokeWidth={1.5} />
      <Circle cx={26} cy={-42} r={2} fill={palette.lavender} stroke="none" />
      <Path d="M24 -37 L32 -37" strokeWidth={1.2} />
      <Path d="M-30 -34 L-20 -34" stroke="#8B99AD" strokeWidth={2} />
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
    return { transform: svgTransform(stride * 8, NYANG_RIG.legLeftX + stride * 2, -NYANG_RIG.legHeight - Math.max(0, stride) * 3) };
  }, [frame], svgTransformAdapter);
  const rightLegProps = useAnimatedProps<GProps>(() => {
    const stride = -Math.sin(frame.value.distanceM * 5 + frame.value.elapsedSeconds * 0.8);
    return { transform: svgTransform(stride * 8, NYANG_RIG.legRightX + stride * 2, -NYANG_RIG.legHeight - Math.max(0, stride) * 3) };
  }, [frame], svgTransformAdapter);
  const tailProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(-frame.value.angleRad * 18 + Math.sin(frame.value.elapsedSeconds * 4) * 5, -41, -35),
  }), [frame], svgTransformAdapter);
  const coffeeProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.hasCoffee ? 1 : 0 }), [frame]);
  const emptyHandProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.hasCoffee ? 0 : 1 }), [frame]);
  const faceProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(0, Math.max(-2, Math.min(2, frame.value.angleRad * 3)), 0),
  }), [frame], svgTransformAdapter);
  const concernProps = useAnimatedProps<GProps>(() => ({ opacity: Math.min(0.85, Math.abs(frame.value.angleRad) * 1.3) }), [frame]);
  const protectionProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.protectionSeconds > 0 ? 0.5 : 0 }), [frame]);

  return (
    <AnimatedG testID="nyang-root" animatedProps={rootProps} strokeLinecap="round" strokeLinejoin="round">
      <AnimatedG testID="protection-outline" animatedProps={protectionProps}>
        <Path d="M-55 -181 Q-72 -154 -66 -113 Q-64 -79 -45 -65 Q-60 -46 -48 -24 Q-45 -2 -24 3 L26 3 Q47 2 49 -20 L69 -28 Q83 -44 71 -67 Q79 -103 66 -136 Q61 -165 47 -182" fill="none" stroke={palette.mint} strokeWidth={7} />
      </AnimatedG>
      <AnimatedG testID="tail" animatedProps={tailProps}>
        <Path d="M2 0 C-16 3 -34 -2 -38 -16 C-42 -30 -27 -35 -22 -25 C-18 -17 -25 -14 -20 -10 Q-12 -6 -1 -10" fill="none" stroke={palette.ink} strokeWidth={16} />
        <Path d="M2 0 C-16 3 -34 -2 -38 -16 C-42 -30 -27 -35 -22 -25 C-18 -17 -25 -14 -20 -10 Q-12 -6 -1 -10" fill="none" stroke="#BCACA0" strokeWidth={10} />
      </AnimatedG>
      <AnimatedG testID="leg-left" animatedProps={leftLegProps}>
        <Path testID="paw-left" d="M-13 7 Q-13 0 -5 0 L5 0 Q13 1 14 9 Q15 17 6 18 L-6 18 Q-15 17 -13 7Z" fill={palette.cream} stroke={palette.ink} strokeWidth={3} />
        <Path d="M-4 11 L-4 14 M3 11 L3 14" stroke={palette.ink} strokeWidth={1.5} opacity={0.55} />
      </AnimatedG>
      <AnimatedG testID="leg-right" animatedProps={rightLegProps}>
        <Path testID="paw-right" d="M-13 7 Q-13 0 -5 0 L5 0 Q13 1 14 9 Q15 17 6 18 L-6 18 Q-15 17 -13 7Z" fill={palette.cream} stroke={palette.ink} strokeWidth={3} />
        <Path d="M-4 11 L-4 14 M3 11 L3 14" stroke={palette.ink} strokeWidth={1.5} opacity={0.55} />
      </AnimatedG>
      <Path d="M-34 -59 Q-49 -58 -50 -44 Q-50 -34 -39 -34 L-31 -44" fill={palette.navy} stroke={palette.ink} strokeWidth={3} />
      <Outfit id={characterId} />
      {characterId === 'veteran' && <Path d="M-52 -43 L-36 -42 L-36 -35 L-51 -36Z" fill={palette.white} stroke={palette.ink} strokeWidth={2} />}
      <Ellipse testID="front-paw-left" cx={-44} cy={-32} rx={10} ry={10} fill={palette.cream} stroke={palette.ink} strokeWidth={2.5} />
      <Path d="M-48 -31 L-47 -28 M-42 -31 L-41 -28" fill="none" stroke={palette.ink} strokeWidth={1.3} opacity={0.55} />
      <AnimatedG testID="empty-hand" animatedProps={emptyHandProps}>
        <Path d="M32 -59 Q49 -58 50 -44 Q50 -35 39 -34 L31 -44" fill={palette.navy} stroke={palette.ink} strokeWidth={3} />
        {characterId === 'veteran' && <Path d="M36 -43 L51 -42 L50 -35 L36 -36Z" fill={palette.white} stroke={palette.ink} strokeWidth={2} />}
        <Ellipse testID="front-paw-right" cx={43} cy={-32} rx={10} ry={10} fill={palette.cream} stroke={palette.ink} strokeWidth={2.5} />
        <Path d="M39 -31 L40 -28 M45 -31 L46 -28" fill="none" stroke={palette.ink} strokeWidth={1.3} opacity={0.55} />
      </AnimatedG>
      <G testID="plush-head" transform="translate(0 19)">
      <Path d="M-53 -166 Q-62 -182 -55 -201 Q-53 -205 -48 -202 L-25 -183 Q1 -190 22 -183 L44 -203 Q49 -205 51 -199 L58 -172 Q68 -153 64 -130 Q61 -99 31 -89 Q-4 -83 -33 -96 Q-61 -110 -60 -135 Q-60 -153 -53 -166Z" fill={palette.cream} stroke={palette.ink} strokeWidth={3.5} />
      <Path d="M-49 -188 L-46 -174 L-34 -179Z M43 -189 L32 -179 L48 -174Z" fill="#DAB4AD" />
      <Path d="M-52 -150 Q-55 -121 -35 -110" fill="none" stroke="#E1C7A9" strokeWidth={7} />
      <Path d="M-7 -177 Q4 -181 15 -178" fill="none" stroke={palette.white} strokeWidth={4} />
      <AnimatedG animatedProps={faceProps}><Face id={characterId} /></AnimatedG>
      <AnimatedG animatedProps={concernProps}>
        <Path d="M-32 -153 L-28 -157 M-33 -148 L-28 -148" fill="none" stroke={palette.ink} strokeWidth={1.7} />
      </AnimatedG>
      </G>
      <AnimatedG testID="cup-visibility" animatedProps={coffeeProps}>
        <Path d="M33 -58 Q45 -60 47 -47 L55 -46 L55 -32 L42 -31 Q33 -33 29 -44" fill={palette.navy} stroke={palette.ink} strokeWidth={3} />
        {characterId === 'veteran' && <Path d="M44 -46 L52 -46 L52 -33 L44 -32Z" fill={palette.white} stroke={palette.ink} strokeWidth={2} />}
        <G testID="cup" transform={`translate(${NYANG_RIG.cupX} ${NYANG_RIG.cupY})`}>
          <Path d="M-11 -20 L12 -20 L9 9 Q0 13 -8 9Z" fill={palette.white} stroke={palette.ink} strokeWidth={2.5} />
          <Path d="M-10 -9 L11 -9 L10 3 L-9 3Z" fill={palette.peach} />
          <Rect x={-13} y={-23} width={27} height={6} rx={2} fill={palette.mint} stroke={palette.ink} strokeWidth={2.5} />
          <Path d="M-3 -2 Q0 -6 3 -2 Q0 3 -3 -2Z" fill={palette.ink} />
        </G>
        <Ellipse testID="coffee-grip" cx={52} cy={-35} rx={9} ry={9} fill={palette.cream} stroke={palette.ink} strokeWidth={2.5} />
        <Line x1={50} y1={-36} x2={54} y2={-36} stroke={palette.ink} strokeWidth={1.5} />
      </AnimatedG>
    </AnimatedG>
  );
}
