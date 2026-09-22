import React from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { Ellipse, G, Image } from 'react-native-svg';
import type { GProps } from 'react-native-svg';
import { palette } from '../theme/tokens';
import { svgTransform, svgTransformAdapter } from './svgMotion';
import type { SceneFrame } from './types';
import { strideFor, type EmployeePose } from './walk';

/**
 * The rookie is assembled from generated PNG parts (docs/art/source → scripts/build-rookie-parts.mjs).
 * Coordinates below are source-sheet pixels with the feet on y = 0 and +x the walking direction;
 * ROOKIE_ART.scale maps the 543px-tall assembly onto the shared 200-unit rig height.
 */
export const ROOKIE_ART = Object.freeze({ sourceHeight: 543, scale: 200 / 543, alarmDegrees: 40 });
/** Transparent border build-rookie-parts.mjs adds around every arm PNG for its thickened outline. */
const ARM_PAD = 6;

/** 0 calm, 1 alarmed (tilted at least 40 degrees), 2 hurt (fallen). Display only. */
export function expressionAt(angleRad: number, fallen: boolean): 0 | 1 | 2 {
  'worklet';
  if (fallen) return 2;
  return Math.abs(angleRad) >= 0.6981317007977318 ? 1 : 0;
}

const PART = {
  head: require('../../assets/characters/rookie/head.png'),
  faceCalm: require('../../assets/characters/rookie/face-calm.png'),
  faceAlarm: require('../../assets/characters/rookie/face-alarm.png'),
  faceHurt: require('../../assets/characters/rookie/face-hurt.png'),
  torso: require('../../assets/characters/rookie/torso.png'),
  tail: require('../../assets/characters/rookie/tail.png'),
  legFar: require('../../assets/characters/rookie/leg-far.png'),
  legNear: require('../../assets/characters/rookie/leg-near.png'),
  armHang: require('../../assets/characters/rookie/arm-hang.png'),
  armCoffee: require('../../assets/characters/rookie/arm-coffee.png'),
  armUpLeft: require('../../assets/characters/rookie/arm-up-left.png'),
  armUpRight: require('../../assets/characters/rookie/arm-up-right.png'),
};

const AnimatedG = Animated.createAnimatedComponent(G);

interface RookieSpriteProps {
  frame: SharedValue<SceneFrame>;
  reduceMotion: boolean;
  pose: EmployeePose;
  /** 0..1 fall progress owned by NyangCharacter; used only to lift the head while tumbling. */
  tumble: SharedValue<number>;
}

/** Soft mint outline around the head and body while revive protection is active. */
export function RookieProtectionShape(): React.JSX.Element {
  return <G transform={`scale(${ROOKIE_ART.scale})`} fill="none" stroke={palette.mint} strokeWidth={19}>
    <Ellipse cx={12} cy={-404} rx={176} ry={152} />
    <Ellipse cx={0} cy={-168} rx={132} ry={176} />
  </G>;
}

export function RookieSprite({ frame, reduceMotion, pose, tumble }: RookieSpriteProps): React.JSX.Element {
  const stepScale = pose === 'run' ? 1.3 : 1;
  const legFarProps = useAnimatedProps<GProps>(() => {
    const s = strideFor(pose, frame.value.distanceM);
    return { transform: svgTransform(22 * stepScale * s, -12, -95 - Math.max(0, s) * 8 * stepScale) };
  }, [frame, pose, stepScale], svgTransformAdapter);
  const legNearProps = useAnimatedProps<GProps>(() => {
    const s = strideFor(pose, frame.value.distanceM);
    return { transform: svgTransform(-22 * stepScale * s, 16, -95 - Math.max(0, -s) * 8 * stepScale) };
  }, [frame, pose, stepScale], svgTransformAdapter);
  // Arms swing against the legs but always stay splayed outward: rotating them inward would tuck
  // the paws behind the jacket. Raised arms replace them once the cat is alarmed or hurt.
  const armLeftProps = useAnimatedProps<GProps>(() => {
    const s = strideFor(pose, frame.value.distanceM);
    const raised = expressionAt(frame.value.angleRad, frame.value.fallen) > 0;
    return { opacity: raised ? 0 : 1, transform: svgTransform(16 - 6 * s, -98, -250) };
  }, [frame, pose], svgTransformAdapter);
  const armRightProps = useAnimatedProps<GProps>(() => {
    const s = strideFor(pose, frame.value.distanceM);
    const raised = expressionAt(frame.value.angleRad, frame.value.fallen) > 0;
    const coffee = pose === 'game' && frame.value.hasCoffee;
    return { opacity: raised || coffee ? 0 : 1, transform: svgTransform(-16 + 8 * s, 100, -250) };
  }, [frame, pose], svgTransformAdapter);
  const coffeeProps = useAnimatedProps<GProps>(() => ({ opacity: pose === 'game' && frame.value.hasCoffee ? 1 : 0 }), [frame, pose]);
  const raisedLeftProps = useAnimatedProps<GProps>(() => ({
    opacity: expressionAt(frame.value.angleRad, frame.value.fallen) > 0 ? 1 : 0,
  }), [frame]);
  const raisedRightProps = useAnimatedProps<GProps>(() => ({
    opacity: expressionAt(frame.value.angleRad, frame.value.fallen) > 0 && !(pose === 'game' && frame.value.hasCoffee) ? 1 : 0,
  }), [frame, pose]);
  const tailProps = useAnimatedProps<GProps>(() => ({
    transform: svgTransform(-frame.value.angleRad * 14 + strideFor(pose, frame.value.distanceM) * 4, -70, -115),
  }), [frame, pose], svgTransformAdapter);
  // The head counter-tilts so the expression stays readable while the body leans or tumbles.
  const headProps = useAnimatedProps<GProps>(() => {
    const side = frame.value.angleRad < 0 ? -1 : 1;
    const alarmTilt = expressionAt(frame.value.angleRad, false) > 0 ? -18 * side : 0;
    const progress = frame.value.fallen ? (reduceMotion ? 1 : tumble.value) : 0;
    return { transform: svgTransform(alarmTilt + (-45 * side - alarmTilt) * progress, 12, -291) };
  }, [frame, reduceMotion, tumble], svgTransformAdapter);
  const calmProps = useAnimatedProps<GProps>(() => ({ opacity: expressionAt(frame.value.angleRad, frame.value.fallen) === 0 ? 1 : 0 }), [frame]);
  const alarmProps = useAnimatedProps<GProps>(() => ({ opacity: expressionAt(frame.value.angleRad, frame.value.fallen) === 1 ? 1 : 0 }), [frame]);
  const hurtProps = useAnimatedProps<GProps>(() => ({ opacity: expressionAt(frame.value.angleRad, frame.value.fallen) === 2 ? 1 : 0 }), [frame]);

  return (
    <G testID="rookie-sprite" transform={`scale(${ROOKIE_ART.scale})`}>
      <AnimatedG testID="tail" animatedProps={tailProps}>
        <Image href={PART.tail} x={-150} y={-96} width={164} height={114} />
      </AnimatedG>
      <AnimatedG testID="leg-left" animatedProps={legFarProps}>
        <Image href={PART.legFar} x={-44} y={-85} width={87} height={180} />
      </AnimatedG>
      <AnimatedG testID="leg-right" animatedProps={legNearProps}>
        <Image href={PART.legNear} x={-48} y={-90} width={103} height={185} />
      </AnimatedG>
      <AnimatedG testID="rookie-arm-left" animatedProps={armLeftProps}>
        <G transform="scale(-1.04 1.04)"><Image href={PART.armHang} x={-34 - ARM_PAD} y={-26 - ARM_PAD} width={68 + 2 * ARM_PAD} height={156 + 2 * ARM_PAD} /></G>
      </AnimatedG>
      <AnimatedG testID="empty-hand" animatedProps={armRightProps}>
        <G testID="rookie-arm-right" transform="scale(1.04)"><Image href={PART.armHang} x={-34 - ARM_PAD} y={-26 - ARM_PAD} width={68 + 2 * ARM_PAD} height={156 + 2 * ARM_PAD} /></G>
      </AnimatedG>
      <AnimatedG testID="cup-visibility" animatedProps={coffeeProps}>
        <G testID="cup" transform="translate(88 -248) scale(1.04)"><Image href={PART.armCoffee} x={-30 - ARM_PAD} y={-22 - ARM_PAD} width={153 + 2 * ARM_PAD} height={108 + 2 * ARM_PAD} /></G>
      </AnimatedG>
      <Image testID="outfit-rookie" href={PART.torso} x={-112} y={-337} width={225} height={282} />
      <AnimatedG testID="plush-head" animatedProps={headProps}>
        <G transform="translate(-158 -252) scale(1.3)">
          <Image testID="head-contour" href={PART.head} x={0} y={0} width={243} height={214} />
          <G testID="face-rookie">
            <AnimatedG testID="face-calm" animatedProps={calmProps}><Image href={PART.faceCalm} x={0} y={0} width={243} height={214} /></AnimatedG>
            <AnimatedG testID="face-alarm" animatedProps={alarmProps}><Image href={PART.faceAlarm} x={0} y={0} width={243} height={214} /></AnimatedG>
            <AnimatedG testID="face-hurt" animatedProps={hurtProps}><Image href={PART.faceHurt} x={0} y={0} width={243} height={214} /></AnimatedG>
          </G>
        </G>
      </AnimatedG>
      <AnimatedG testID="raised-arm-left" animatedProps={raisedLeftProps}>
        <G transform="translate(-96 -236) scale(0.936)"><Image href={PART.armUpLeft} x={-96 - ARM_PAD} y={-76 - ARM_PAD} width={114 + 2 * ARM_PAD} height={95 + 2 * ARM_PAD} /></G>
      </AnimatedG>
      <AnimatedG testID="raised-arm-right" animatedProps={raisedRightProps}>
        <G transform="translate(98 -236) scale(0.936)"><Image href={PART.armUpRight} x={-22 - ARM_PAD} y={-76 - ARM_PAD} width={121 + 2 * ARM_PAD} height={93 + 2 * ARM_PAD} /></G>
      </AnimatedG>
    </G>
  );
}
