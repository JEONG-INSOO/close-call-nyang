import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_CHARACTER_ID, type CharacterId } from './src/characters/catalog';
import { CountdownOverlay } from './src/components/CountdownOverlay';
import { LandscapeGate, useWebPortraitGate } from './src/components/LandscapeGate';
import { PauseOverlay } from './src/components/PauseOverlay';
import { getFeatureFlags } from './src/config/app';
import { useGameController } from './src/game/useGameController';
import { useKeyboardInput } from './src/input/useKeyboardInput';
import { useAppLifecycle } from './src/platform/useAppLifecycle';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { TitleScreen } from './src/screens/TitleScreen';
import { palette } from './src/theme/tokens';

// T05 will connect services. Corresponding buttons are deliberately hidden in T04.
const pendingService = () => undefined;
const flags = getFeatureFlags(__DEV__, process.env.EXPO_PUBLIC_ENABLE_MOCK_AD);

export default function App(): React.JSX.Element {
  const { controller, snapshot, frame } = useGameController(flags);
  const portraitBlocked = useWebPortraitGate();
  const [bestScore, setBestScore] = useState(0);
  const [runCharacter, setRunCharacter] = useState<CharacterId>(DEFAULT_CHARACTER_ID);
  const nextRunId = useRef(0);

  const pause = useCallback(() => {
    controller.clearInput();
    controller.resetFrameClock();
    controller.dispatch({ type: 'PAUSE' });
  }, [controller]);
  useKeyboardInput(controller);
  useAppLifecycle(pause);

  useEffect(() => {
    if (snapshot.state.screen === 'result') {
      setBestScore(previous => Math.max(previous, snapshot.score));
    }
  }, [snapshot.score, snapshot.state.screen]);

  const start = useCallback(() => {
    if (portraitBlocked) return;
    const screen = controller.readState().screen;
    if (screen !== 'title' && screen !== 'result') return;
    // Session identity and ambient randomness belong outside the pure rules.
    const seed = (Math.floor(Math.random() * 0x100000000) ^ (Date.now() >>> 0)) >>> 0;
    nextRunId.current += 1;
    setRunCharacter(DEFAULT_CHARACTER_ID);
    controller.dispatch({ type: 'START', runId: nextRunId.current, seed });
  }, [controller, portraitBlocked]);
  const home = useCallback(() => controller.dispatch({ type: 'HOME' }), [controller]);
  const resume = useCallback(() => {
    if (!portraitBlocked) controller.dispatch({ type: 'RESUME' });
  }, [controller, portraitBlocked]);
  const screen = snapshot.state.screen;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <LandscapeGate blocked={portraitBlocked} onInactive={pause}>
          <GameScreen frame={frame} snapshot={snapshot} controller={controller}
            characterId={runCharacter} reduceMotion={false} />
          {screen === 'title' && <TitleScreen bestScore={bestScore} onStart={start} onSettings={pendingService} />}
          {screen === 'countdown' && <CountdownOverlay seconds={snapshot.state.countdownSeconds} />}
          {screen === 'paused' && <PauseOverlay onResume={resume} onHome={home} />}
          {screen === 'result' && <ResultScreen score={snapshot.score}
            bestScore={Math.max(bestScore, snapshot.score)} canRevive={false}
            onRetry={start} onHome={home} onShare={pendingService} onRevive={pendingService} />}
        </LandscapeGate>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: palette.background,
  },
});
