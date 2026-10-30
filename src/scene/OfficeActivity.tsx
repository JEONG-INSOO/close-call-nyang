import { memo } from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { palette } from '../theme/tokens';

type Pose = 'typing' | 'copier' | 'presenting' | 'coffee' | 'carrying' | 'running';

/** Static supporting cast: no frame subscriptions or animation timers per worker. */
export const OfficeWorker = memo(function OfficeWorker({ x, y, pose, color = palette.lavender }: {
  x: number; y: number; pose: Pose; color?: string;
}) {
  const arms: Record<Pose, string> = {
    typing: 'M-19 -62L-32 -43L-55 -46 M19 -62L29 -43L-39 -43',
    copier: 'M-19 -62L-32 -38 M19 -62L42 -78L63 -72',
    presenting: 'M-19 -62L-30 -37 M19 -62L45 -83L76 -110',
    coffee: 'M-19 -62L-29 -38 M19 -62L32 -59L21 -83',
    carrying: 'M-19 -62L-28 -43L-7 -35 M19 -62L28 -43L7 -35',
    running: 'M-19 -62L-38 -79L-48 -71 M19 -62L32 -37L48 -46',
  };
  return <G testID={`office-worker-${pose}`} transform={`translate(${x} ${y})`}
    stroke={palette.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d={pose === 'running' ? 'M-12 -14L-34 -1L-47 -8 M12 -14L31 -6L44 -20' : 'M-12 -11L-16 0 M12 -11L16 0'} fill="none" strokeWidth={7} />
    <Path d="M-22 -69Q0 -80 22 -69L20 -12H-20Z" fill={color} />
    <Path d="M-8 -70L0 -51L8 -70" fill={palette.white} />
    <Path d={arms[pose]} fill="none" strokeWidth={7} stroke={color} />
    <Ellipse cy={-99} rx={25} ry={26} fill={palette.cream} />
    <Path d="M-25 -102Q-28 -132 0 -127Q29 -129 25 -100L12 -112L0 -107L-12 -113Z" fill={palette.ink} />
    {pose === 'copier' ? <Path d="M-12 -98L-5 -95 M6 -95L13 -98 M-5 -84Q0 -90 5 -84 M30 -106Q38 -94 30 -94Z" fill="none" />
      : <Path d="M-10 -97H-7 M8 -97H11 M-5 -85Q0 -80 5 -85" fill="none" />}
    {pose === 'coffee' && <G>
      <Rect x={12} y={-89} width={22} height={22} rx={4} fill={palette.white} />
      <Path d="M34 -86Q47 -85 34 -74 M17 -96Q12 -102 18 -108 M26 -97Q21 -104 27 -110" fill="none" />
    </G>}
    {pose === 'carrying' && <G>
      <Rect x={-28} y={-57} width={56} height={25} rx={3} fill={palette.white} />
      <Path d="M-23 -51H24 M-23 -45H24 M-23 -39H24" stroke={palette.lavender} />
    </G>}
    {pose === 'typing' && <Circle cx={29} cy={-43} r={4} fill={palette.cream} />}
    {pose === 'running' && <G>
      <Path d="M-49 -75L-68 -116L-39 -130L-20 -89Z" fill={palette.white} />
      <Path d="M-57 -112L-42 -119 M-53 -104L-38 -111 M-49 -96L-34 -103" stroke={palette.peach} />
      <Path d="M-72 -45H-95 M-67 -28H-86" stroke={palette.lavender} strokeWidth={4} />
    </G>}
  </G>;
});
