import { memo } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { Circle, G, Line, Path, Rect, type GProps } from 'react-native-svg';
import { palette } from '../theme/tokens';
import { getSceneModel, getScrollOffset } from './layout';
import { Plant, StreetTree } from './SceneryProps';
import { svgTransform, svgTransformAdapter } from './svgMotion';
import type { SceneFrame } from './types';

const AnimatedG = Animated.createAnimatedComponent(G);
interface ScrollingProps { frame: SharedValue<SceneFrame> }
const CITY_TILES = [0, 960] as const;
const STREET_TILES = [0, 640, 1280] as const;

const Skyline = memo(function Skyline() {
  return <G fill={palette.lavender} opacity={0.3}>
    <Path d="M0 320V176H102V320 M127 320V131H222V320 M250 320V194H344V320 M385 320V146H500V320 M533 320V183H648V320 M680 320V121H790V320 M824 320V170H933V320" />
    <Path d="M148 153H166V173H148Z M182 153H200V173H182Z M148 192H166V212H148Z M182 192H200V212H182Z M704 145H723V169H704Z M746 145H765V169H746Z M704 190H723V214H704Z M746 190H765V214H746Z" fill={palette.white} />
  </G>;
});

const StreetTile = memo(function StreetTile() {
  return <G stroke={palette.ink} strokeWidth={2.5} strokeLinejoin="round">
    <Rect x={27} y={222} width={181} height={170} rx={8} fill={palette.peach} />
    <Path d="M17 226L45 197H189L220 226Z" fill={palette.lavender} />
    <Path d="M48 251H89V288H48Z M112 251H153V288H112Z M48 309H89V349H48Z M112 309H153V349H112Z" fill={palette.sky} />
    <Path d="M68 252V287 M132 252V287 M68 310V348 M132 310V348" fill="none" opacity={0.3} />
    <Rect x={315} y={248} width={198} height={144} rx={6} fill={palette.background} />
    <Path d="M306 249L328 227H501L522 249Z" fill={palette.mint} />
    <Rect x={338} y={271} width={58} height={76} rx={5} fill={palette.sky} />
    <Rect x={415} y={269} width={73} height={123} rx={5} fill={palette.peach} />
    <Rect x={426} y={280} width={51} height={66} rx={3} fill={palette.sky} />
    <Circle cx={477} cy={362} r={3} fill={palette.ink} />
    <StreetTree x={571} y={402} />
    <G testID="scenery-transit-sign" transform="translate(265 392)">
      <Path d="M0 -89V0" fill="none" strokeWidth={4} />
      <Rect x={-19} y={-130} width={38} height={44} rx={12} fill={palette.lavender} />
      <Rect x={-10} y={-122} width={20} height={25} rx={5} fill={palette.white} />
      <Path d="M-7 -113H7 M-5 -99V-94 M5 -99V-94" />
    </G>
  </G>;
});

const CafeArtwork = memo(function CafeArtwork() {
  return <G stroke={palette.ink} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
    <Rect x={-107} y={202} width={214} height={197} rx={9} fill={palette.peach} />
    <Rect x={-87} y={275} width={92} height={94} rx={7} fill={palette.sky} />
    <Path d="M-40 278V365 M-83 316H1" fill="none" opacity={0.35} />
    <Rect x={23} y={274} width={62} height={125} rx={6} fill={palette.background} />
    <Rect x={33} y={286} width={42} height={65} rx={5} fill={palette.sky} />
    <Circle cx={73} cy={368} r={3} fill={palette.ink} />
    <Path d="M-116 268L-103 242H104L117 268Z" fill={palette.mint} />
    <Path d="M-74 244L-80 266 M-32 244L-35 266 M11 244V266 M53 244L57 266 M94 244L104 266" stroke={palette.background} strokeWidth={13} />
    <Rect x={-51} y={180} width={102} height={52} rx={18} fill={palette.background} />
    <Path d="M-15 196H14L11 214H-11Z M14 199H21Q28 207 13 210 M-21 219H21" fill={palette.peach} />
    <Path d="M-6 192Q-11 186 -5 181 M6 192Q1 186 7 181" fill="none" strokeWidth={2} />
    <Plant x={-108} y={408} />
    <G testID="scenery-cafe-board" transform="translate(106 404)">
      <Path d="M-17 0L-12 -54H17L23 0 M-14 -44H17V-10H-16Z" fill={palette.navy} />
      <Path d="M-6 -33H11 M-6 -25H6" stroke={palette.white} strokeWidth={2} />
    </G>
  </G>;
});

/** A finite, single cafe uses story distance, never a repeated tile coordinate. */
export const StreetScene = memo(function StreetScene({ frame }: ScrollingProps) {
  const farProps = useAnimatedProps<GProps>(() => ({ transform: svgTransform(0, -getScrollOffset(frame.value.distanceM, 0.18, 960)) }), [frame], svgTransformAdapter);
  const nearProps = useAnimatedProps<GProps>(() => ({ transform: svgTransform(0, -getScrollOffset(frame.value.distanceM, 0.7, 640)) }), [frame], svgTransformAdapter);
  const cafeProps = useAnimatedProps<GProps>(() => ({ transform: svgTransform(0, getSceneModel(frame.value.distanceM).cafeX) }), [frame], svgTransformAdapter);
  const sidewalkProps = useAnimatedProps<GProps>(() => ({ transform: svgTransform(0, -getScrollOffset(frame.value.distanceM, 1, 160)) }), [frame], svgTransformAdapter);
  return <G testID="street-scene">
    <Rect width={960} height={540} fill={palette.sky} />
    <Circle cx={793} cy={98} r={32} fill={palette.background} />
    <Path d="M72 115Q77 93 99 99Q115 73 137 99Q165 96 170 115Z M515 78Q520 60 538 65Q551 42 572 65Q596 64 600 78Z" fill={palette.white} opacity={0.8} />
    <AnimatedG animatedProps={farProps}>{CITY_TILES.map((x) => <G key={x} transform={`translate(${x} 0)`}><Skyline /></G>)}</AnimatedG>
    <Rect y={373} width={960} height={52} fill={palette.mint} />
    <AnimatedG animatedProps={nearProps}>{STREET_TILES.map((x) => <G key={x} transform={`translate(${x} 0)`}><StreetTile /></G>)}</AnimatedG>
    <AnimatedG testID="cafe" animatedProps={cafeProps}><CafeArtwork /></AnimatedG>
    <Rect y={412} width={960} height={128} fill={palette.background} />
    <Line x1={0} y1={425} x2={960} y2={425} stroke={palette.ink} strokeWidth={3} />
    <Line x1={0} y1={454} x2={960} y2={454} stroke={palette.peach} strokeWidth={2} />
    <AnimatedG animatedProps={sidewalkProps} stroke={palette.peach} strokeWidth={2}>
      <Path d="M0 426V454 M160 426V454 M320 426V454 M480 426V454 M640 426V454 M800 426V454 M960 426V454 M1120 426V454" />
    </AnimatedG>
  </G>;
});

const EntranceArtwork = memo(function EntranceArtwork() {
  return <G stroke={palette.ink} strokeWidth={3} strokeLinejoin="round">
    {/* The near jamb is opaque and straddles the office reveal edge. */}
    <Rect x={-32} y={63} width={58} height={363} rx={5} fill={palette.lavender} />
    <Rect x={-157} y={72} width={126} height={339} rx={6} fill={palette.background} />
    <Rect x={-137} y={127} width={85} height={124} rx={6} fill={palette.sky} />
    <Path d="M-94 128V250 M-136 189H-52" opacity={0.3} />
    <Rect x={-162} y={57} width={312} height={46} rx={8} fill={palette.navy} />
    <Path d="M-132 72H-104V90H-132Z M-118 72V65 M-94 78H-29 M-94 87H-47" fill="none" stroke={palette.white} strokeWidth={3} />
    <Path d="M-16 103V423 M27 111H143" fill="none" stroke={palette.white} opacity={0.7} />
    <Rect x={-35} y={415} width={185} height={10} rx={3} fill={palette.peach} />
    <Rect x={-25} y={270} width={17} height={30} rx={4} fill={palette.mint} />
    <Circle cx={-16} cy={279} r={3} fill={palette.white} stroke="none" />
  </G>;
});

/** Render after OfficeScene: this opaque frame masks its moving reveal boundary. */
export const CompanyEntrance = memo(function CompanyEntrance({ frame }: ScrollingProps) {
  const animatedProps = useAnimatedProps<GProps>(() => ({ transform: svgTransform(0, getSceneModel(frame.value.distanceM).entranceX) }), [frame], svgTransformAdapter);
  return <AnimatedG testID="company-entrance" animatedProps={animatedProps}><EntranceArtwork /></AnimatedG>;
});
