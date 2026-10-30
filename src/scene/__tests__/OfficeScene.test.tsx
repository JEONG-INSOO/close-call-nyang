import { act, render, screen, waitFor } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { OfficeScene } from '../OfficeScene';
import { getScrollOffset } from '../layout';
import type { SceneFrame } from '../types';

jest.mock('react-native-svg', () => {
  const svg = jest.requireActual('react-native-reanimated/src/mock-svg');
  return { ...svg, default: svg.Svg };
});

test('six situations remain a fixed pair of tiles across scrolling and the wrap seam', async () => {
  const frame = makeMutable<SceneFrame>({ distanceM: 51, elapsedSeconds: 60, angleRad: 0,
    angularVelocity: 0, hasCoffee: true, protectionSeconds: 0, playing: true, fallen: false, seed: 42 });
  const view = await render(<Svg><OfficeScene frame={frame} /></Svg>);
  const countNodes = (node: unknown): number => {
    if (!node || typeof node !== 'object') return 0;
    if (Array.isArray(node)) return node.reduce((count, child) => count + countNodes(child), 0);
    return 1 + countNodes((node as { children?: unknown }).children);
  };
  const count = countNodes(view.toJSON());
  for (const distance of [51, 60, 51 + 2400 / 86.4 - 0.001, 51 + 2400 / 86.4 + 0.001, 10000]) {
    await act(() => { frame.value = { ...frame.value, distanceM: distance }; });
    for (const situation of ['typing', 'copier', 'presentation', 'break', 'documents', 'conversation']) {
      expect(screen.getAllByTestId(`office-situation-${situation}`)).toHaveLength(2);
    }
    await waitFor(() => {
      const props = screen.getByTestId('office-tiles').props.jestAnimatedProps.value;
      expect(props.matrix ?? props.transform).toEqual([1, 0, -0, 1, -getScrollOffset(distance - 51, 0.72, 2400), 0]);
    });
    expect(countNodes(view.toJSON())).toBe(count);
  }
  for (const direction of [-1, 1] as const) {
    await act(() => { frame.value = { ...frame.value, resignationDirection: direction, resignationProgress: 0.25 }; });
    await waitFor(() => {
      const props = screen.getByTestId('office-resignation-runner').props.jestAnimatedProps.value;
      expect(props.opacity).toBe(1);
      const matrix = props.matrix ?? props.transform;
      expect(matrix[0]).toBe(direction);
      expect(matrix[4]).toBe(direction === 1 ? 200 : 760);
    });
  }
});
