import { Platform } from 'react-native';

export type SvgMatrix = [number, number, number, number, number, number];
const nativeSvg = Platform.OS !== 'web';

/** Rotation around local (0, 0), followed by translation; shared by native/web. */
export function svgTransform(degrees: number, x = 0, y = 0): SvgMatrix {
  'worklet';
  const radians = degrees * Math.PI / 180;
  return [Math.cos(radians), Math.sin(radians), -Math.sin(radians), Math.cos(radians), x, y];
}

// SVG's Fabric host calls this property matrix; SVG web accepts transform.
// Keep this boundary adaptation out of the game rules and coordinate builders.
export function svgTransformAdapter(props: Record<string, unknown>): void {
  'worklet';
  if (nativeSvg && Array.isArray(props.transform)) {
    props.matrix = props.transform;
    delete props.transform;
  }
}
