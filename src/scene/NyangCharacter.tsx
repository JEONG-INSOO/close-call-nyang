import React, { memo } from 'react';
import Animated, {
  cancelAnimation, Easing, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { GProps } from 'react-native-svg';
import { DEFAULT_CHARACTER_ID, type CharacterId } from '../characters/catalog';
import { BALANCE } from '../game/balance';
import { palette } from '../theme/tokens';
import type { SceneProps } from './types';
import { svgTransform, svgTransformAdapter } from './svgMotion';
import { GREY_TABBY_COLORS, GreyTabbyArm, GreyTabbyFace, GreyTabbyHead,
  GreyTabbyNotes, GreyTabbySuit, GreyTabbyTail, GreyTabbyWater } from './GreyTabbyParts';

/** Presentation-only poses. The engine continues to supply the unmodified frame. */
export type EmployeePose = 'game' | 'walk' | 'water' | 'run' | 'notes';
export interface NyangCharacterProps extends SceneProps { pose?: EmployeePose }

/** Cosmetic coordinates only; every skin shares the same two-head rig. */
export const NYANG_RIG = Object.freeze({
  height: 200, headHeight: 104, torsoHeight: 78, legHeight: 18,
  pivotX: 0, pivotY: 0, legLeftX: -25, legRightX: 25, cupX: 64, cupY: -60,
});

/** Unchanged reward-cat palette; the approved rookie has its own suited palette. */
export const NYANG_COLORS = Object.freeze({
  outline: '#61463C', fur: '#F3D4A9', white: '#FFF9EE', pink: '#E8A3AD',
  tie: '#91CAB6', badge: '#C6B7DC', cupBand: '#EAB89D',
});
const OUTLINE = 4.5;
const DETAIL = 2;

/** One left/right cycle is two initial footstep intervals; distance speeds it up. */
export const NYANG_WALK = Object.freeze({
  metersPerCycle: 2 * BALANCE.baseSpeedMps * BALANCE.footstepBaseSeconds,
  strideDegrees: 11, lateralTravel: 2, lift: 5,
});

export function walkPhaseAt(distanceM: number): number {
  'worklet';
  if (!Number.isFinite(distanceM) || distanceM <= 0) return 0;
  // Bound before multiplying so long runs never send infinity into SVG props.
  return (distanceM % NYANG_WALK.metersPerCycle) / NYANG_WALK.metersPerCycle * Math.PI * 2;
}

/** Rookie sole visibility: hidden while planted, softly revealed near peak lift. */
export function soleRevealAt(stride: number, fallen: boolean): number {
  'worklet';
  if (fallen) return 1;
  if (!Number.isFinite(stride) || stride <= 0.1) return 0;
  const progress = Math.min(1, (stride - 0.1) / 0.9);
  const eased = progress * progress * (3 - 2 * progress);
  return eased * 0.82;
}

// Worklet dependencies must be initialized before capture (do not move above walkPhaseAt).
function strideFor(pose: EmployeePose, distance: number): number {
  'worklet';
  return pose === 'run' ? 1 : pose === 'walk' ? 0.85
    : pose === 'water' || pose === 'notes' ? 0 : Math.sin(walkPhaseAt(distance));
}

const AnimatedG = Animated.createAnimatedComponent(G);

const Face = memo(function Face({ id }: { id: CharacterId }) {
  return (
    <G testID={`face-${id}`} stroke={NYANG_COLORS.outline} strokeWidth={DETAIL} strokeLinecap="round" fill="none">
      <Ellipse testID="white-muzzle" cx={0} cy={-117} rx={25} ry={14} fill={NYANG_COLORS.white} stroke="none" />
      {id === 'rookie' ? <G>
        <Path d="M-35 -161 Q-25 -167 -16 -162 M17 -164 Q26 -170 35 -162" />
        <Ellipse cx={-25} cy={-145} rx={6} ry={9} fill={NYANG_COLORS.outline} stroke="none" />
        <Ellipse cx={25} cy={-146} rx={6} ry={8} fill={NYANG_COLORS.outline} stroke="none" />
        <Path d="M-8 -110 Q-3 -114 1 -110 Q5 -107 9 -111" />
      </G> : id === 'diligent' ? <G>
        <Path d="M-35 -159 L-17 -158 M17 -159 L35 -160" />
        <Path d="M-34 -147 Q-25 -141 -16 -147 M16 -147 Q25 -141 34 -147" strokeWidth={3} />
        <Path d="M-8 -110 Q0 -113 8 -110" />
      </G> : <G>
        <Path d="M-35 -160 L-17 -159 M17 -161 Q27 -166 35 -162" />
        <Path d="M-34 -146 L-17 -143" strokeWidth={3} />
        <Ellipse cx={25} cy={-145} rx={5} ry={6} fill={NYANG_COLORS.outline} stroke="none" />
        <Path d="M-8 -111 Q2 -105 12 -113" />
      </G>}
      <Path d="M-5 -126 Q0 -129 5 -126 Q4 -121 0 -119 Q-4 -121 -5 -126Z" fill={NYANG_COLORS.pink} stroke="none" />
      <Path d="M0 -119 V-115" />
      <Path d="M-48 -124 L-57 -125 M48 -124 L57 -125" />
      <Ellipse cx={-41} cy={-130} rx={6} ry={3} fill={NYANG_COLORS.pink} stroke="none" />
      <Ellipse cx={41} cy={-130} rx={6} ry={3} fill={NYANG_COLORS.pink} stroke="none" />
    </G>
  );
});

/** The historical outfit ID now contains exactly a tie and an employee badge. */
const Outfit = memo(function Outfit({ id }: { id: CharacterId }) {
  return (
    <G testID={`outfit-${id}`} stroke={NYANG_COLORS.outline} strokeWidth={DETAIL} strokeLinejoin="round">
      <G testID={`tie-${id}`} transform={id === 'rookie' ? 'rotate(-8 0 -92)' : undefined}>
        <Path d="M-6 -96 L6 -96 L5 -87 L-5 -87Z" fill={NYANG_COLORS.tie} />
        <Path d={id === 'diligent' ? 'M-4 -87 L4 -87 L8 -55 L0 -47 L-8 -55Z' : 'M-4 -87 L4 -87 L9 -58 L0 -50 L-9 -58Z'} fill={NYANG_COLORS.tie} />
        {id === 'veteran' && <Path d="M-5 -70 H5" fill="none" />}
      </G>
      <G testID={`employee-badge-${id}`}>
        <Path d="M23 -96 L27 -77" fill="none" />
        <Rect x={16} y={-77} width={23} height={24} rx={4} fill={NYANG_COLORS.white} />
        <Circle cx={24} cy={-68} r={3} fill={NYANG_COLORS.badge} stroke="none" />
        <Path d="M21 -59 H33 M30 -68 H34" fill="none" />
      </G>
    </G>
  );
});

const PawPads = memo(function PawPads({ side, color = NYANG_COLORS.pink, rookie = false }: { side: 'left' | 'right'; color?: string; rookie?: boolean }) {
  return <G fill={color} stroke="none">
    <Ellipse testID={`paw-pad-${side}`} cx={0} cy={12} rx={rookie ? 7 : 6} ry={rookie ? 4.8 : 4} />
    <Ellipse testID={`paw-bean-${side}-1`} cx={-7} cy={5} rx={rookie ? 3 : 2.5} ry={rookie ? 2.6 : 2.2} />
    <Ellipse testID={`paw-bean-${side}-2`} cx={0} cy={4} rx={rookie ? 3 : 2.5} ry={rookie ? 2.6 : 2.2} />
    <Ellipse testID={`paw-bean-${side}-3`} cx={7} cy={5} rx={rookie ? 3 : 2.5} ry={rookie ? 2.6 : 2.2} />
  </G>;
});

export function NyangCharacter({ frame, reduceMotion, characterId = DEFAULT_CHARACTER_ID, pose = 'game' }: NyangCharacterProps): React.JSX.Element {
  const rookie = characterId === 'rookie';
  const artPose = rookie ? pose : 'game';
  const fur = rookie ? GREY_TABBY_COLORS.fur : NYANG_COLORS.fur;
  const pink = rookie ? GREY_TABBY_COLORS.pink : NYANG_COLORS.pink;
  const gameStrideDegrees = rookie ? 18 : NYANG_WALK.strideDegrees;
  const gameLateralTravel = rookie ? 3 : NYANG_WALK.lateralTravel;
  const gameLift = rookie ? 8 : NYANG_WALK.lift;
  // This local finish never writes to frame, elapsed time, scored distance or rank.
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
    const stride = strideFor(artPose, frame.value.distanceM);
    return { transform: svgTransform(stride * (artPose === 'run' ? 25 : artPose === 'walk' ? 20 : gameStrideDegrees), NYANG_RIG.legLeftX + stride * gameLateralTravel, -NYANG_RIG.legHeight - Math.max(0, stride) * (artPose === 'run' ? 12 : artPose === 'walk' ? 10 : gameLift)) };
  }, [frame, artPose, gameStrideDegrees, gameLateralTravel, gameLift], svgTransformAdapter);
  const rightLegProps = useAnimatedProps<GProps>(() => {
    const stride = -strideFor(artPose, frame.value.distanceM);
    return { transform: svgTransform(stride * (artPose === 'run' ? 25 : artPose === 'walk' ? 20 : gameStrideDegrees), NYANG_RIG.legRightX + stride * gameLateralTravel, -NYANG_RIG.legHeight - Math.max(0, stride) * (artPose === 'run' ? 12 : artPose === 'walk' ? 10 : gameLift)) };
  }, [frame, artPose, gameStrideDegrees, gameLateralTravel, gameLift], svgTransformAdapter);
  const leftSoleLegProps = useAnimatedProps<GProps>(() => {
    const stride = strideFor(artPose, frame.value.distanceM);
    return { transform: svgTransform(stride * (artPose === 'run' ? 25 : artPose === 'walk' ? 20 : gameStrideDegrees), NYANG_RIG.legLeftX + stride * gameLateralTravel, -NYANG_RIG.legHeight - Math.max(0, stride) * (artPose === 'run' ? 12 : artPose === 'walk' ? 10 : gameLift)) };
  }, [frame, artPose, gameStrideDegrees, gameLateralTravel, gameLift], svgTransformAdapter);
  const rightSoleLegProps = useAnimatedProps<GProps>(() => {
    const stride = -strideFor(artPose, frame.value.distanceM);
    return { transform: svgTransform(stride * (artPose === 'run' ? 25 : artPose === 'walk' ? 20 : gameStrideDegrees), NYANG_RIG.legRightX + stride * gameLateralTravel, -NYANG_RIG.legHeight - Math.max(0, stride) * (artPose === 'run' ? 12 : artPose === 'walk' ? 10 : gameLift)) };
  }, [frame, artPose, gameStrideDegrees, gameLateralTravel, gameLift], svgTransformAdapter);
  const leftPadProps = useAnimatedProps<GProps>(() => {
    const stride = strideFor(artPose, frame.value.distanceM);
    if (rookie) {
      const reveal = soleRevealAt(stride, frame.value.fallen);
      return { opacity: reveal, transform: [1, 0, 0, 0.55 + reveal * 0.45, 0, 4 * (1 - reveal)] };
    }
    const exposure = frame.value.fallen ? 1 : 0.62 + 0.38 * Math.max(0, stride);
    return { transform: [1, 0, 0, exposure, 0, 9 * (1 - exposure)] };
  }, [frame, artPose, rookie], svgTransformAdapter);
  const rightPadProps = useAnimatedProps<GProps>(() => {
    const stride = -strideFor(artPose, frame.value.distanceM);
    if (rookie) {
      const reveal = soleRevealAt(stride, frame.value.fallen);
      return { opacity: reveal, transform: [1, 0, 0, 0.55 + reveal * 0.45, 0, 4 * (1 - reveal)] };
    }
    const exposure = frame.value.fallen ? 1 : 0.62 + 0.38 * Math.max(0, stride);
    return { transform: [1, 0, 0, exposure, 0, 9 * (1 - exposure)] };
  }, [frame, artPose, rookie], svgTransformAdapter);
  const tailProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(-frame.value.angleRad * 14 + strideFor(artPose, frame.value.distanceM) * 4, -46, -47),
  }), [frame, artPose], svgTransformAdapter);
  const coffeeProps = useAnimatedProps<GProps>(() => ({ opacity: artPose === 'game' && frame.value.hasCoffee ? 1 : 0 }), [frame, artPose]);
  const emptyHandProps = useAnimatedProps<GProps>(() => ({ opacity: (artPose === 'game' && frame.value.hasCoffee) || artPose === 'water' || artPose === 'notes' ? 0 : 1 }), [frame, artPose]);
  const leftArmProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(artPose === 'notes' ? -38 : -strideFor(artPose, frame.value.distanceM) * 16, -55, -72),
  }), [frame, artPose], svgTransformAdapter);
  const rightArmProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(strideFor(artPose, frame.value.distanceM) * 16, 55, -72),
  }), [frame, artPose], svgTransformAdapter);
  const faceProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(0, Math.max(-2, Math.min(2, frame.value.angleRad * 2)), 0),
  }), [frame], svgTransformAdapter);
  const concernProps = useAnimatedProps<GProps>(() => ({ opacity: Math.min(0.85, Math.abs(frame.value.angleRad) * 1.3) }), [frame]);
  const protectionProps = useAnimatedProps<GProps>(() => ({ opacity: frame.value.protectionSeconds > 0 ? 0.5 : 0 }), [frame]);

  return (
    <AnimatedG testID="nyang-root" animatedProps={rootProps} stroke={rookie ? GREY_TABBY_COLORS.outline : NYANG_COLORS.outline} strokeWidth={rookie ? 3.2 : OUTLINE} strokeLinecap="round" strokeLinejoin="round">
      <AnimatedG testID="protection-outline" animatedProps={protectionProps}>
        <Path d="M-67 -204 Q-86 -177 -79 -142 Q-74 -115 -58 -97 L-62 -80 Q-77 -65 -63 -45 Q-63 -18 -41 -9 Q-37 5 -21 5 L25 5 Q42 5 47 -13 Q65 -22 66 -40 L78 -42 Q89 -49 86 -68 L80 -89 Q76 -99 69 -109 Q87 -136 75 -172 Q72 -188 63 -203" fill="none" stroke={palette.mint} strokeWidth={7} />
      </AnimatedG>
      <AnimatedG testID="tail" animatedProps={tailProps}>
        {rookie ? <GreyTabbyTail /> : <Path d="M0 0 C-17 8 -34 2 -42 -10 C-51 -27 -39 -39 -29 -32 C-22 -27 -28 -22 -30 -18 C-28 -11 -16 -12 -2 -16Z" fill={NYANG_COLORS.fur} />}
      </AnimatedG>
      <AnimatedG testID="leg-left" animatedProps={leftLegProps}>
        <Path testID="paw-left" d="M-15 8 Q-15 0 -6 0 H6 Q15 0 15 8 Q16 18 6 19 H-6 Q-16 18 -15 8Z" fill={fur} />
        {!rookie && <AnimatedG testID="paw-pads-left" animatedProps={leftPadProps}><PawPads side="left" color={pink} /></AnimatedG>}
      </AnimatedG>
      <AnimatedG testID="leg-right" animatedProps={rightLegProps}>
        <Path testID="paw-right" d="M-15 8 Q-15 0 -6 0 H6 Q15 0 15 8 Q16 18 6 19 H-6 Q-16 18 -15 8Z" fill={fur} />
        {!rookie && <AnimatedG testID="paw-pads-right" animatedProps={rightPadProps}><PawPads side="right" color={pink} /></AnimatedG>}
      </AnimatedG>
      {rookie && artPose !== 'notes' && <AnimatedG testID="rookie-arm-left" animatedProps={leftArmProps}><GreyTabbyArm side="left" /></AnimatedG>}
      {rookie && <AnimatedG testID="empty-hand" animatedProps={emptyHandProps}>
        <AnimatedG testID="rookie-arm-right" animatedProps={rightArmProps}><GreyTabbyArm side="right" /></AnimatedG>
      </AnimatedG>}
      {rookie && <AnimatedG testID="coffee-sleeve-visibility" animatedProps={coffeeProps}>
        <Path testID="coffee-arm" d="M43 -78 Q61 -85 66 -68 Q65 -57 53 -50 L40 -56" fill={GREY_TABBY_COLORS.suit} />
      </AnimatedG>}
      <Ellipse testID="plush-body" cx={0} cy={-57} rx={rookie ? 62 : 52} ry={rookie ? 45 : 39} fill={fur} />
      {rookie ? <GreyTabbySuit /> : <>
        <Ellipse testID="white-belly" cx={0} cy={-54} rx={33} ry={29} fill={NYANG_COLORS.white} stroke="none" />
        <Ellipse testID="front-paw-left" cx={-51} cy={-59} rx={11} ry={13} fill={NYANG_COLORS.fur} />
      </>}
      {!rookie && <AnimatedG testID="empty-hand" animatedProps={emptyHandProps}>
        <Ellipse testID="front-paw-right" cx={51} cy={-59} rx={11} ry={13} fill={NYANG_COLORS.fur} />
      </AnimatedG>}
      {rookie && <>
        <AnimatedG testID="sole-overlay-left" animatedProps={leftSoleLegProps}>
          <AnimatedG testID="paw-pads-left" animatedProps={leftPadProps}>
            <Ellipse testID="paw-sole-left" cx={0} cy={10} rx={12} ry={7} fill={GREY_TABBY_COLORS.muzzle} stroke="none" />
            <PawPads side="left" color={pink} rookie />
          </AnimatedG>
        </AnimatedG>
        <AnimatedG testID="sole-overlay-right" animatedProps={rightSoleLegProps}>
          <AnimatedG testID="paw-pads-right" animatedProps={rightPadProps}>
            <Ellipse testID="paw-sole-right" cx={0} cy={10} rx={12} ry={7} fill={GREY_TABBY_COLORS.muzzle} stroke="none" />
            <PawPads side="right" color={pink} rookie />
          </AnimatedG>
        </AnimatedG>
      </>}
      {!rookie && <Outfit id={characterId} />}
      <G testID="plush-head">
        {rookie ? <>
          <GreyTabbyHead />
          <AnimatedG animatedProps={faceProps}><GreyTabbyFace /></AnimatedG>
        </> : <>
        <Path testID="head-contour" d="M-63 -167 Q-70 -181 -62 -198 Q-60 -203 -55 -198 L-35 -182 Q0 -193 35 -182 L55 -198 Q60 -203 62 -198 Q70 -181 63 -167 Q74 -152 68 -132 Q62 -107 40 -100 Q0 -92 -40 -100 Q-62 -107 -68 -132 Q-74 -152 -63 -167Z" fill={NYANG_COLORS.fur} />
        <Path d="M-57 -187 L-54 -170 L-42 -178Z M57 -187 L54 -170 L42 -178Z" fill={NYANG_COLORS.pink} stroke="none" />
        <AnimatedG animatedProps={faceProps}><Face id={characterId} /></AnimatedG>
        <AnimatedG animatedProps={concernProps}>
          <Path d="M-45 -156 L-42 -160 M-45 -151 H-41" fill="none" strokeWidth={DETAIL} />
        </AnimatedG>
        </>}
      </G>
      <AnimatedG testID="cup-visibility" animatedProps={coffeeProps}>
        {!rookie && <Path testID="coffee-arm" d="M43 -78 Q60 -83 63 -68 Q63 -59 53 -52 L42 -56" fill={NYANG_COLORS.fur} />}
        <G testID="cup" transform={`translate(${NYANG_RIG.cupX} ${NYANG_RIG.cupY})`}>
          <Path d="M-11 -20 H12 L9 10 Q0 13 -8 10Z" fill={NYANG_COLORS.white} />
          <Path d="M-10 -8 H11 L10 3 H-9Z" fill={NYANG_COLORS.cupBand} stroke="none" />
          <Rect x={-13} y={-24} width={27} height={6} rx={2} fill={NYANG_COLORS.tie} />
        </G>
        <Ellipse testID="coffee-grip" cx={53} cy={-55} rx={11} ry={12} fill={fur} />
        <Line x1={51} y1={-54} x2={55} y2={-54} strokeWidth={DETAIL} />
      </AnimatedG>
      {artPose === 'water' && <GreyTabbyWater />}
      {artPose === 'notes' && <GreyTabbyNotes />}
    </AnimatedG>
  );
}
