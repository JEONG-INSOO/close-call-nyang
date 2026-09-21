import { memo, useId } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { Circle, ClipPath, Defs, G, Line, Path, Rect, type GProps } from 'react-native-svg';
import { palette } from '../theme/tokens';
import { getSceneModel, getScrollOffset } from './layout';
import { Copier, Desk, OfficeConversation, PaperStack, Plant } from './SceneryProps';
import { svgTransform, svgTransformAdapter } from './svgMotion';
import type { SceneFrame } from './types';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const OFFICE_TILES = [0, 1200] as const;

const OfficeTile = memo(function OfficeTile() {
  return <G>
    <G testID="office-arrangement-workstations">
      <G stroke={palette.ink} strokeWidth={2.5}>
        <Rect x={33} y={135} width={247} height={137} rx={9} fill={palette.sky} />
        <Path d="M114 137V270 M198 137V270 M35 204H278" stroke={palette.white} strokeWidth={5} />
        <Path d="M58 249L86 225L118 249L159 214L191 239L239 205L271 233V268H58Z" fill={palette.lavender} stroke="none" opacity={0.4} />
        <Rect x={345} y={153} width={137} height={90} rx={7} fill={palette.peach} />
        <Path d="M362 171H391V193H362Z M401 169H463V185H401Z M398 198H424V225H398Z M436 202H465V225H436Z" fill={palette.background} stroke="none" />
      </G>
      <Desk x={42} y={395} />
      <Plant x={259} y={399} />
      <Copier x={350} y={398} />
      <PaperStack x={456} y={399} />
      <PaperStack x={491} y={401} />
    </G>
    <G testID="office-arrangement-conversation">
      <G stroke={palette.ink} strokeWidth={2.5}>
        <Rect x={684} y={155} width={165} height={111} rx={7} fill={palette.white} />
        <Path d="M704 177H764 M704 193H799 M704 209H784" fill="none" stroke={palette.lavender} strokeWidth={5} />
        <Path d="M746 249L769 222L790 237L821 207" fill="none" stroke={palette.mint} strokeWidth={5} />
        <Circle cx={991} cy={181} r={30} fill={palette.background} />
        <Path d="M991 163V182L1002 189" fill="none" strokeLinecap="round" />
      </G>
      <OfficeConversation x={693} y={399} />
      <Desk x={939} y={396} />
      <Plant x={1150} y={400} />
    </G>
  </G>;
});

/** Two fixed 1,200px tiles; distance changes transforms, never the SVG node count. */
export const OfficeScene = memo(function OfficeScene({ frame }: { frame: SharedValue<SceneFrame> }) {
  const clipId = `office-reveal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rootProps = useAnimatedProps(() => ({ opacity: getSceneModel(frame.value.distanceM).officeBlend }));
  const revealProps = useAnimatedProps(() => {
    const edge = Math.max(0, Math.min(960, getSceneModel(frame.value.distanceM).entranceX));
    return { x: edge, width: 960 - edge };
  });
  const tileProps = useAnimatedProps<GProps>(() => ({ transform: svgTransform(0, -getScrollOffset(Math.max(0, frame.value.distanceM - 51), 0.72, 1200)) }), [frame], svgTransformAdapter);
  const floorProps = useAnimatedProps<GProps>(() => ({ transform: svgTransform(0, -getScrollOffset(Math.max(0, frame.value.distanceM - 51), 1, 160)) }), [frame], svgTransformAdapter);
  return <AnimatedG testID="office-scene" animatedProps={rootProps} clipPath={`url(#${clipId})`}>
    <Defs><ClipPath id={clipId}><AnimatedRect testID="office-reveal" y={0} height={540} animatedProps={revealProps} /></ClipPath></Defs>
    <Rect width={960} height={540} fill={palette.background} />
    <Rect y={305} width={960} height={120} fill={palette.mint} opacity={0.35} />
    <Path d="M0 305H960 M0 65H960" stroke={palette.lavender} strokeWidth={3} opacity={0.6} />
    <AnimatedG testID="office-tiles" animatedProps={tileProps}>
      {OFFICE_TILES.map((x) => <G key={x} transform={`translate(${x} 0)`}><OfficeTile /></G>)}
    </AnimatedG>
    <Rect y={414} width={960} height={126} fill={palette.peach} />
    <Rect y={425} width={960} height={115} fill={palette.background} opacity={0.6} />
    <Line x1={0} y1={425} x2={960} y2={425} stroke={palette.ink} strokeWidth={3} />
    <AnimatedG animatedProps={floorProps} stroke={palette.peach} strokeWidth={2}>
      <Path d="M0 426L-28 493 M160 426L144 493 M320 426L316 493 M480 426L488 493 M640 426L660 493 M800 426L832 493 M960 426L1004 493 M1120 426L1176 493 M-40 463H1180" />
    </AnimatedG>
  </AnimatedG>;
});
