import { memo, useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';

import { DEFAULT_CHARACTER_ID } from '../characters/catalog';
import { layout, palette } from '../theme/tokens';
import { getViewport } from './layout';
import { NyangCharacter } from './NyangCharacter';
import { OfficeScene } from './OfficeScene';
import { CompanyEntrance, StreetScene } from './StreetScene';
import type { SceneProps } from './types';

/** Decorative, noninteractive canvas. The parent owns HUD, controls and safe areas. */
export const GameScene = memo(function GameScene({
  frame, reduceMotion, characterId = DEFAULT_CHARACTER_ID,
}: SceneProps): React.JSX.Element {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    setSize(previous => previous.width === width && previous.height === height
      ? previous : { width, height });
  }, []);
  const viewport = getViewport(size.width, size.height);

  return (
    <View testID="game-scene" style={styles.container} onLayout={onLayout}
      pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {viewport.scale > 0 && (
        <Svg testID="scene-canvas" width={viewport.width} height={viewport.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', left: viewport.left, top: viewport.top }}>
          <Rect width={layout.width} height={layout.height} fill={palette.background} />
          <StreetScene frame={frame} />
          <OfficeScene frame={frame} />
          <CompanyEntrance frame={frame} />
          <G testID="character-anchor" transform={`translate(${layout.characterX} ${layout.characterY})`}>
            <NyangCharacter frame={frame} reduceMotion={reduceMotion} characterId={characterId} />
          </G>
        </Svg>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: palette.background },
});
