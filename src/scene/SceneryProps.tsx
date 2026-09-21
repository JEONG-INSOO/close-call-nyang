import { memo } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { palette } from '../theme/tokens';

interface PropPosition {
  x?: number;
  y?: number;
}

// Decorative figures are deliberately smaller and quieter than the playable cat.
export const Plant = memo(function Plant({ x = 0, y = 0 }: PropPosition) {
  return (
    <G testID="scenery-plant" transform={`translate(${x} ${y})`} stroke={palette.ink} strokeWidth={2.5} strokeLinejoin="round">
      <Path d="M0 -18V-71 M0 -43L-17 -57 M0 -34L17 -49" fill="none" />
      <Path d="M0 -53C-23 -51 -29 -68 -24 -77C-7 -75 0 -68 0 -53Z M1 -43C23 -42 31 -60 25 -66C9 -65 1 -55 1 -43Z M0 -63C-11 -78 -5 -88 2 -91C12 -82 13 -72 0 -63Z" fill={palette.mint} />
      <Path d="M-21 -22H21L16 0H-16Z" fill={palette.peach} />
      <Rect x={-24} y={-28} width={48} height={10} rx={4} fill={palette.background} />
    </G>
  );
});

export const PaperStack = memo(function PaperStack({ x = 0, y = 0 }: PropPosition) {
  return (
    <G testID="scenery-papers" transform={`translate(${x} ${y})`} stroke={palette.ink} strokeWidth={2} strokeLinejoin="round">
      <Path d="M-24 -4H23L26 2H-25Z M-21 -10H21L23 -4H-24Z M-24 -16H17L21 -10H-21Z" fill={palette.white} />
      <Path d="M-16 -13H6 M-14 -7H9" fill="none" opacity={0.35} />
    </G>
  );
});

export const Desk = memo(function Desk({ x = 0, y = 0 }: PropPosition) {
  return (
    <G testID="scenery-desk" transform={`translate(${x} ${y})`} stroke={palette.ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
      <G testID="scenery-chair">
        <Rect x={76} y={-93} width={39} height={54} rx={11} fill={palette.lavender} />
        <Path d="M80 -42H122 M100 -38V-7 M83 -4L100 -10L119 -4" fill="none" />
        <Circle cx={82} cy={-3} r={3} fill={palette.ink} />
        <Circle cx={120} cy={-3} r={3} fill={palette.ink} />
      </G>
      <Path d="M7 -61V0 M154 -61V0" fill="none" />
      <Rect x={0} y={-71} width={162} height={12} rx={4} fill={palette.peach} />
      <G testID="scenery-monitor">
        <Rect x={28} y={-127} width={63} height={45} rx={5} fill={palette.navy} />
        <Rect x={34} y={-121} width={51} height={31} rx={2} fill={palette.sky} stroke="none" />
        <Path d="M47 -111H73 M47 -104H65" stroke={palette.white} strokeWidth={4} />
        <Path d="M59 -82V-72 M47 -72H72" fill="none" />
      </G>
      <PaperStack x={132} y={-72} />
    </G>
  );
});

export const Copier = memo(function Copier({ x = 0, y = 0 }: PropPosition) {
  return (
    <G testID="scenery-copier" transform={`translate(${x} ${y})`} stroke={palette.ink} strokeWidth={2.5} strokeLinejoin="round">
      <Rect x={0} y={-90} width={78} height={83} rx={7} fill={palette.white} />
      <Path d="M-4 -88L9 -105H67L82 -88Z" fill={palette.lavender} />
      <Path d="M13 -105L18 -116H70L67 -105Z" fill={palette.background} />
      <Rect x={9} y={-70} width={58} height={12} rx={3} fill={palette.navy} />
      <Path d="M21 -68H58L54 -51H17Z" fill={palette.white} />
      <Path d="M13 -34H65 M31 -24H47" fill="none" />
      <Circle cx={66} cy={-81} r={3} fill={palette.mint} stroke="none" />
      <Path d="M11 -6V0 M67 -6V0" />
    </G>
  );
});

export const OfficeConversation = memo(function OfficeConversation({ x = 0, y = 0 }: PropPosition) {
  return (
    <G testID="scenery-conversation" transform={`translate(${x} ${y})`} stroke={palette.ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
      {/* An open palm and a downcast colleague imply a work discussion, never violence. */}
      <G testID="scenery-manager">
        <Path d="M-18 -11L-20 0 M14 -11L17 0" fill="none" strokeWidth={7} />
        <Path d="M-25 -70Q0 -82 24 -66L23 -10H-23Z" fill={palette.navy} />
        <Path d="M-9 -70L0 -43L9 -70" fill={palette.white} />
        <Path d="M24 -62L43 -48L55 -65" fill="none" strokeWidth={9} stroke={palette.navy} />
        <Path d="M51 -65L58 -72 M53 -65L62 -68 M-25 -61L-31 -37" fill="none" strokeWidth={5} />
        <Circle cy={-97} r={25} fill={palette.cream} />
        <Path d="M-24 -102Q-27 -130 2 -124Q29 -128 25 -101L17 -110L-12 -108Z" fill={palette.ink} />
        <Path d="M-9 -94H-4 M8 -94H13 M0 -81H9" fill="none" />
        <Rect x={-13} y={-98} width={13} height={10} rx={3} fill="none" strokeWidth={1.5} />
        <Rect x={4} y={-98} width={13} height={10} rx={3} fill="none" strokeWidth={1.5} />
        <Line x1={0} y1={-95} x2={4} y2={-95} strokeWidth={1.5} />
      </G>
      <G testID="scenery-colleague" transform="translate(116 0)">
        <Path d="M-13 -9L-17 0 M12 -9L16 0" fill="none" strokeWidth={7} />
        <Path d="M-22 -61Q0 -75 22 -61L20 -9H-20Z" fill={palette.lavender} />
        <Path d="M-7 -62L0 -46L7 -62" fill={palette.white} />
        <Path d="M-21 -54L-17 -30L-2 -34 M22 -54L17 -30L2 -34" fill="none" strokeWidth={6} />
        <Rect x={-11} y={-49} width={24} height={29} rx={3} fill={palette.background} />
        <Ellipse cy={-85} rx={24} ry={25} fill={palette.cream} />
        <Path d="M-24 -91Q-23 -118 1 -114Q27 -117 24 -87L12 -98L3 -94L-6 -100Z" fill={palette.ink} />
        <Path d="M-12 -87L-6 -84 M6 -84L12 -87 M-4 -72Q0 -75 4 -72" fill="none" />
        <Path d="M28 -94Q35 -85 30 -83Q24 -85 28 -94Z" fill={palette.sky} strokeWidth={1.5} />
      </G>
    </G>
  );
});

export const StreetTree = memo(function StreetTree({ x = 0, y = 0 }: PropPosition) {
  return (
    <G testID="scenery-tree" transform={`translate(${x} ${y})`} stroke={palette.ink} strokeWidth={2.5} strokeLinejoin="round">
      <Path d="M-5 -66L-7 0H8L5 -66" fill={palette.peach} />
      <Path d="M0 -146C-39 -144 -43 -116 -35 -105C-64 -91 -46 -59 -22 -63C-14 -44 12 -44 24 -63C51 -57 65 -92 38 -107C45 -132 24 -151 0 -146Z" fill={palette.mint} />
      <Path d="M0 -58V-112 M0 -85L-17 -98 M0 -74L20 -90" fill="none" opacity={0.35} />
    </G>
  );
});
