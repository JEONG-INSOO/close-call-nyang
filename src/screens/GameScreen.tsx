import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { CharacterId } from '../characters/catalog';
import { ControlButton } from '../components/ControlButton';
import { GameHud } from '../components/GameHud';
import type { ControllerSnapshot, GameController } from '../game/controller';
import { GameScene } from '../scene/GameScene';
import type { SceneFrame } from '../scene/types';
import { palette, ui } from '../theme/tokens';

export interface GameScreenProps {
  frame: SharedValue<SceneFrame>; snapshot: ControllerSnapshot;
  controller: GameController; characterId?: CharacterId; reduceMotion: boolean;
}

/** Keep the scene mounted while App places title/countdown/pause/result above it. */
export function GameScreen({ frame, snapshot, controller, characterId, reduceMotion }: GameScreenProps) {
  const screen = snapshot.state.screen;
  const visibleHud = screen !== 'title' && screen !== 'result';
  const canPause = screen === 'playing' || screen === 'countdown' || screen === 'ad';
  const controlsEnabled = screen === 'playing';
  const onLeft = useCallback((id: string, down: boolean) => controller.setInput('touch', id, -1, down), [controller]);
  const onRight = useCallback((id: string, down: boolean) => controller.setInput('touch', id, 1, down), [controller]);
  const onPause = useCallback(() => controller.dispatch({ type: 'PAUSE' }), [controller]);
  return (
    <View testID="game-screen" style={styles.root} accessibilityElementsHidden={!canPause}
      importantForAccessibility={canPause ? 'auto' : 'no-hide-descendants'}>
      <GameScene frame={frame} reduceMotion={reduceMotion} characterId={characterId} />
      {visibleHud && <GameHud score={snapshot.score} event={snapshot.state.run?.event ?? null} onPause={onPause} canPause={canPause} />}
      <View pointerEvents="box-none" style={[styles.controls, !visibleHud && styles.hidden]} accessibilityElementsHidden={!controlsEnabled}
        importantForAccessibility={controlsEnabled ? 'auto' : 'no-hide-descendants'}>
        <ControlButton direction={-1} disabled={!controlsEnabled} onChange={onLeft} />
        <ControlButton direction={1} disabled={!controlsEnabled} onChange={onRight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  controls: { position: 'absolute', left: ui.gutter, right: ui.gutter, bottom: ui.gutter, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', zIndex: 2 },
  hidden: { opacity: 0 },
});
