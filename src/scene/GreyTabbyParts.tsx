import { memo } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

/** Approved rookie palette. Reward cats deliberately keep their existing palette. */
export const GREY_TABBY_COLORS = Object.freeze({
  outline: '#393535', fur: '#BBB7B4', stripe: '#817C79', muzzle: '#FFF9EC',
  pink: '#EF9696', suit: '#4D5563', lapel: '#5B6573', shirt: '#FFFCF4',
  tie: '#3871A6', lanyard: '#548DC0', iris: '#D7D8B7', pupil: '#302C29',
});
const C = GREY_TABBY_COLORS;

export const GreyTabbyHead = memo(function GreyTabbyHead() {
  return <G>
    <Path testID="head-contour" d="M-67 -164 Q-71 -180 -64 -199 Q-62 -203 -56 -198 L-32 -183 Q0 -191 32 -183 L56 -198 Q62 -203 64 -199 Q71 -180 67 -164 Q79 -149 76 -132 Q75 -110 53 -99 Q31 -90 0 -92 Q-31 -90 -53 -99 Q-75 -110 -76 -132 Q-79 -149 -67 -164Z" fill={C.fur} />
    <Path d="M-60 -190 L-58 -171 L-40 -181Z M60 -190 L58 -171 L40 -181Z" fill={C.pink} stroke="none" />
    <G testID="grey-tabby-stripes" fill={C.stripe} stroke="none">
      <Path d="M-28 -183 Q-17 -174 -13 -157 Q-9 -166 -16 -186Z M-8 -187 Q2 -176 3 -161 Q12 -168 5 -187Z M17 -186 Q27 -176 27 -164 Q36 -170 31 -183Z" />
      <Path d="M-74 -150 Q-56 -153 -49 -143 Q-65 -141 -77 -143Z M-76 -132 Q-57 -139 -49 -128 Q-63 -124 -73 -124Z M74 -150 Q56 -153 49 -143 Q65 -141 77 -143Z M76 -132 Q57 -139 49 -128 Q63 -124 73 -124Z" />
    </G>
    <Path testID="white-muzzle" d="M0 -145 Q-3 -131 -19 -123 Q-32 -112 -47 -103 Q-29 -94 0 -95 Q29 -94 47 -103 Q32 -112 19 -123 Q3 -131 0 -145Z" fill={C.muzzle} stroke="none" />
  </G>;
});

export const GreyTabbyFace = memo(function GreyTabbyFace() {
  return <G testID="face-rookie" stroke={C.outline} strokeWidth={2} fill="none" strokeLinecap="round">
    <G testID="grey-tabby-bright-eyes">
      {[-29, 29].map(x => <G key={x}>
        <Ellipse cx={x} cy={-143} rx={15.5} ry={19.5} fill={C.muzzle} />
        <Ellipse cx={x + 1} cy={-141} rx={11.7} ry={15.8} fill={C.iris} stroke="none" />
        <Ellipse cx={x + 2} cy={-141} rx={9} ry={13.7} fill={C.pupil} stroke="none" />
        <Ellipse testID={`eye-glint-${x < 0 ? 'left' : 'right'}`} cx={x + 5} cy={-149} rx={3.1} ry={3.9} fill={C.shirt} stroke="none" />
      </G>)}
    </G>
    <Path d="M-38 -169 Q-30 -176 -22 -169 M22 -169 Q30 -176 38 -169" stroke={C.stripe} strokeWidth={3} />
    <Path testID="rookie-smile" d="M-12 -118 Q0 -110 12 -118 Q10 -99 0 -99 Q-10 -99 -12 -118Z" fill={C.pink} />
    <Path d="M-5 -109 Q0 -112 5 -109" stroke="#CF7F7C" strokeWidth={1.2} />
    <Path d="M-5 -130 Q0 -133 5 -130 Q5 -127 0 -124 Q-5 -127 -5 -130Z" fill={C.pink} stroke="none" />
    <Path d="M0 -124 V-119 Q-5 -113 -11 -118 M0 -119 Q5 -113 11 -118" />
    <Path d="M-55 -122 L-83 -128 M-55 -116 L-81 -115 M55 -122 L83 -128 M55 -116 L81 -115" strokeWidth={1.5} />
  </G>;
});

export const GreyTabbySuit = memo(function GreyTabbySuit() {
  return <G testID="outfit-rookie" stroke={C.outline} strokeWidth={2.3} strokeLinejoin="round">
    <Path testID="suit-hem" d="M-52 -43 H52 L48 -16 Q31 -7 12 -15 L0 -23 L-12 -15 Q-31 -7 -48 -16Z" fill={C.suit} />
    <Path testID="suit-jacket" d="M-32 -101 Q-53 -100 -58 -80 L-60 -39 Q-31 -20 0 -29 Q31 -20 60 -39 L58 -80 Q53 -100 32 -101Z" fill={C.suit} />
    <Path testID="collared-shirt" d="M-22 -97 H22 L16 -47 L0 -37 L-16 -47Z" fill={C.shirt} />
    <G testID="tie-rookie" fill={C.tie}>
      <Path d="M-5 -85 H5 L8 -79 L4 -73 H-4 L-8 -79Z M-4 -73 H4 L9 -50 L0 -43 L-9 -50Z" />
    </G>
    <Path d="M-24 -98 L0 -87 L-11 -73 L-28 -90Z M24 -98 L0 -87 L11 -73 L28 -90Z" fill={C.shirt} />
    <Path testID="jacket-lapels" d="M-38 -97 L-24 -100 L-5 -48 L-37 -72 L-28 -79 L-43 -87Z M38 -97 L24 -100 L5 -48 L37 -72 L28 -79 L43 -87Z" fill={C.lapel} />
    <Path d="M-48 -51 L-27 -47 L-24 -54 M48 -51 L27 -47 L24 -54" fill="none" />
    <G testID="lanyard-rookie" fill="none" strokeLinecap="round">
      <Path d="M-26 -96 L1 -58 L9 -55 L30 -96" stroke={C.outline} strokeWidth={6} />
      <Path d="M-26 -96 L1 -58 L9 -55 L30 -96" stroke={C.lanyard} strokeWidth={3.2} />
    </G>
    <G testID="employee-badge-rookie">
      <Rect x={-8} y={-60} width={28} height={34} rx={3} fill={C.lanyard} />
      <Rect x={-5} y={-57} width={22} height={28} rx={1.5} fill={C.shirt} stroke="none" />
      <G testID="badge-portrait" transform="translate(6 -48)" strokeWidth={0.6}>
        <Path d="M-7 -3 L-7 -8 L-3 -6 Q0 -7 3 -6 L7 -8 L7 -3 Q10 5 0 6 Q-10 5 -7 -3Z" fill={C.fur} />
        <Path d="M-3 1 Q0 -2 3 1 L5 4 Q0 7 -5 4Z" fill={C.muzzle} stroke="none" />
        <Circle cx={-3} cy={0} r={1.2} fill={C.pupil} stroke="none" /><Circle cx={3} cy={0} r={1.2} fill={C.pupil} stroke="none" />
        <Path d="M-1.5 2 H1.5 L0 3.5Z" fill={C.pink} stroke="none" />
      </G>
      <SvgText testID="badge-text" x={6} y={-33} fontSize={4.5} fontWeight="700" fontFamily="Arial" textAnchor="middle" fill={C.outline} stroke="none">ID: 001</SvgText>
    </G>
  </G>;
});

/** Local shoulder origin; no engine state or clock is accessed by these parts. */
export const GreyTabbyArm = memo(function GreyTabbyArm({ side }: { side: 'left' | 'right' }) {
  return <G strokeWidth={2.3}>
    <Path d="M-12 -7 Q0 -13 12 -7 L15 12 Q11 21 -11 18 L-15 7Z" fill={C.suit} />
    <Path d="M-11 13 Q0 17 11 14 L10 20 Q0 23 -10 19Z" fill={C.shirt} />
    <Ellipse testID={`front-paw-${side}`} cx={0} cy={23} rx={11.5} ry={10.5} fill={C.fur} />
    <Path d="M-4 24 Q-4 29 0 29" fill="none" strokeWidth={1.3} />
  </G>;
});

export const GreyTabbyTail = memo(function GreyTabbyTail() {
  return <G>
    <Path d="M1 1 Q-22 12 -36 -9 Q-43 -20 -43 -37 Q-41 -48 -31 -45 Q-23 -43 -24 -30 Q-23 -10 -5 -17Z" fill={C.fur} />
    <G fill={C.stripe} stroke="none">
      <Path d="M-43 -35 Q-33 -38 -24 -32 L-24 -25 Q-34 -32 -42 -27Z M-39 -16 Q-29 -20 -21 -19 L-16 -13 Q-28 -13 -34 -8Z M-27 -1 Q-23 -8 -16 -13 L-9 -14 Q-18 -5 -19 4Z" />
    </G>
  </G>;
});

export const GreyTabbyWater = memo(function GreyTabbyWater() {
  return <G testID="water-bottle" transform="translate(63 -66) rotate(9)" strokeWidth={2}>
    <Path d="M-7 -25 H7 V-17 Q12 -13 12 -9 V13 Q0 18 -12 13 V-9 Q-12 -13 -7 -17Z" fill="#D8F1F7" />
    <Path d="M-9 -5 Q0 -2 9 -5 V11 Q0 15 -9 11Z" fill="#95CBE4" stroke="none" />
    <Rect x={-8} y={-29} width={16} height={8} rx={2} fill={C.tie} />
    <Line x1={-8} y1={1} x2={8} y2={1} stroke="#BEE4F0" strokeWidth={2} />
    <Ellipse cx={-9} cy={5} rx={9} ry={10} fill={C.fur} />
  </G>;
});

export const GreyTabbyNotes = memo(function GreyTabbyNotes() {
  return <G strokeWidth={2}>
    <Path testID="note-writing-sleeve" d="M-47 -81 Q-29 -86 -8 -82 L0 -65 Q-30 -57 -47 -65Z" fill={C.suit} />
    <G testID="note-pad" transform="translate(39 -67) rotate(8)">
      <Rect x={-16} y={-22} width={32} height={39} rx={2} fill={C.muzzle} />
      {[-9, -3, 3, 9].map(x => <Path key={x} d={`M${x} -19 v-6 q3 -3 4 1 v4`} fill="none" strokeWidth={1.5} />)}
      <Path d="M-10 -7 H9 M-10 0 H6 M-10 7 H10" fill="none" stroke="#BBC2C8" strokeWidth={1.4} />
      <Ellipse cx={15} cy={4} rx={8} ry={10} fill={C.fur} />
    </G>
    <G testID="pencil" transform="translate(10 -74) rotate(-90)">
      <Path d="M-3 -20 H3 V8 L0 15 L-3 8Z" fill="#EAB95C" />
      <Path d="M-3 8 H3 L0 15Z" fill={C.muzzle} /><Path d="M-1 13 H1 L0 15Z" fill={C.pupil} />
      <Rect x={-3} y={-24} width={6} height={7} rx={2} fill={C.pink} />
      <Ellipse cx={0} cy={-16} rx={8} ry={9} fill={C.fur} />
    </G>
  </G>;
});
