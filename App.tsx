import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_CHARACTER_ID, type CharacterId } from './src/characters/catalog';
import { CountdownOverlay } from './src/components/CountdownOverlay';
import { LandscapeGate, useWebPortraitGate } from './src/components/LandscapeGate';
import { PauseOverlay } from './src/components/PauseOverlay';
import { getFeatureFlags } from './src/config/app';
import { scoreOf } from './src/game/difficulty';
import { useGameController } from './src/game/useGameController';
import { ko } from './src/i18n/ko';
import { useKeyboardInput } from './src/input/useKeyboardInput';
import { useAppLifecycle } from './src/platform/useAppLifecycle';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { TitleScreen } from './src/screens/TitleScreen';
import { CharacterSelectPanel } from './src/screens/CharacterSelectPanel';
import { MockAdScreen } from './src/screens/MockAdScreen';
import { SettingsPanel } from './src/screens/SettingsPanel';
import { ShareFeedbackPanel } from './src/screens/ShareFeedbackPanel';
import { useGameAudio } from './src/services/audio';
import { playHaptic } from './src/services/haptics';
import { getRewardedAdAvailability } from './src/services/rewardedAds';
import { shareScore, type ShareResult } from './src/services/share';
import { usePreferences } from './src/services/usePreferences';
import { palette } from './src/theme/tokens';

type Panel = 'settings' | 'characters' | 'share' | null;

export default function App(): React.JSX.Element {
  const [flags] = useState(() => getFeatureFlags(__DEV__, process.env.EXPO_PUBLIC_ENABLE_MOCK_AD));
  const { controller, snapshot, frame } = useGameController(flags);
  const portraitBlocked = useWebPortraitGate();
  const preferences = usePreferences();
  const audio = useGameAudio(preferences.value.settings);
  const [runCharacter, setRunCharacter] = useState<CharacterId>(DEFAULT_CHARACTER_ID);
  const [panel, setPanel] = useState<Panel>(null);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const panelRef = useRef<Panel>(null);
  const mounted = useRef(true);
  const sharing = useRef(false);
  const attempt = useRef<{ id: number; runId: number } | null>(null);
  const nextRunId = useRef(0);
  const services = useRef({ preferences, audio });
  services.current = { preferences, audio };
  const changePanel = useCallback((next: Panel) => {
    panelRef.current = next;
    setPanel(next);
  }, []);
  const closePanel = useCallback(() => changePanel(null), [changePanel]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const pause = useCallback(() => {
    controller.clearInput();
    controller.resetFrameClock();
    controller.dispatch({ type: 'PAUSE' });
  }, [controller]);
  useKeyboardInput(controller);
  useAppLifecycle(pause);

  useEffect(() => {
    const observe = () => {
      const state = controller.readState();
      const current = services.current;
      current.audio.setPlaying(state.screen === 'playing' && panelRef.current === null);
      if (!state.run) return;
      const score = scoreOf(state.run.distanceM);
      if (attempt.current?.runId === state.run.id) current.preferences.observeAttempt(attempt.current.id, score);
      if (state.screen === 'result' || state.screen === 'paused') current.preferences.recordScore(score);
    };
    const unsubscribe = controller.subscribe(observe);
    const unsubscribeEffects = controller.subscribeEffects(effects => {
      const state = controller.readState();
      for (const effect of effects) {
        if (effect.runId !== state.run?.id) continue;
        if (effect.type === 'footstep' || effect.type === 'wobble' || effect.type === 'coffee' || effect.type === 'fall') {
          services.current.audio.cue(effect.type);
          if (effect.type !== 'footstep') void playHaptic(effect.type, services.current.preferences.value.settings.hapticsEnabled);
        }
      }
    });
    observe();
    return () => { unsubscribe(); unsubscribeEffects(); };
  }, [controller]);

  const start = useCallback(() => {
    if (portraitBlocked || panelRef.current !== null) return;
    const screen = controller.readState().screen;
    if (screen !== 'title' && screen !== 'result') return;
    // Session identity and ambient randomness belong outside the pure rules.
    const seed = (Math.floor(Math.random() * 0x100000000) ^ (Date.now() >>> 0)) >>> 0;
    const runId = nextRunId.current + 1;
    const selected = services.current.preferences.value.collection.selectedCharacter;
    services.current.audio.unlock();
    controller.dispatch({ type: 'START', runId, seed });
    if (controller.readState().run?.id !== runId || controller.readState().screen !== 'countdown') return;
    nextRunId.current = runId;
    setRunCharacter(selected);
    attempt.current = { id: services.current.preferences.beginAttempt(!flags.mockAdsEnabled), runId };
  }, [controller, flags.mockAdsEnabled, portraitBlocked]);
  const home = useCallback(() => controller.dispatch({ type: 'HOME' }), [controller]);
  const resume = useCallback(() => {
    if (!portraitBlocked && panelRef.current === null && controller.readState().screen === 'paused') {
      services.current.audio.unlock();
      controller.dispatch({ type: 'RESUME' });
    }
  }, [controller, portraitBlocked]);
  const openSettings = useCallback(() => {
    if (portraitBlocked || panelRef.current !== null) return;
    pause();
    changePanel('settings');
  }, [changePanel, pause, portraitBlocked]);
  const openCharacters = useCallback(() => {
    const current = controller.readState().screen;
    if (portraitBlocked || panelRef.current !== null || (current !== 'title' && current !== 'result')) return;
    changePanel('characters');
  }, [changePanel, controller, portraitBlocked]);
  const selectCharacter = useCallback((id: CharacterId) => {
    const current = controller.readState().screen;
    if (panelRef.current === 'characters' && (current === 'title' || current === 'result')) {
      services.current.preferences.selectCharacter(id);
    }
  }, [controller]);
  const revive = useCallback(() => {
    const current = controller.readState();
    if (portraitBlocked || panelRef.current !== null || getRewardedAdAvailability(flags) !== 'mock' ||
        current.screen !== 'result' || !current.run || current.run.reviveUsed) return;
    controller.dispatch({ type: 'REQUEST_AD' });
  }, [controller, flags, portraitBlocked]);
  const cancelAd = useCallback(() => controller.dispatch({ type: 'CANCEL_AD' }), [controller]);
  const share = useCallback(() => {
    const current = controller.readState();
    if (portraitBlocked || panelRef.current !== null || sharing.current || current.screen !== 'result' || !current.run) return;
    const runId = current.run.id;
    sharing.current = true;
    void shareScore(scoreOf(current.run.distanceM)).then(result => {
      if (!mounted.current || controller.readState().run?.id !== runId || controller.readState().screen !== 'result') return;
      if ((result.status === 'copied' || result.status === 'manual') && panelRef.current === null) {
        setShareResult(result);
        changePanel('share');
      }
    }).finally(() => { sharing.current = false; });
  }, [changePanel, controller, portraitBlocked]);
  const screen = snapshot.state.screen;
  const canRevive = screen === 'result' && !!snapshot.state.run && !snapshot.state.run.reviveUsed &&
    getRewardedAdAvailability(flags) === 'mock';
  const showStorageStatus = preferences.status !== 'ready' && (screen === 'title' || screen === 'result' || screen === 'paused');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <LandscapeGate blocked={portraitBlocked} onInactive={pause}>
          <GameScreen frame={frame} snapshot={snapshot} controller={controller}
            characterId={runCharacter} reduceMotion={preferences.value.settings.reduceMotion} />
          {screen === 'title' && <TitleScreen bestScore={preferences.value.bestScore} onStart={start}
            onSettings={openSettings} onCharacters={openCharacters} />}
          {screen === 'countdown' && <CountdownOverlay seconds={snapshot.state.countdownSeconds} />}
          {screen === 'paused' && <PauseOverlay onResume={resume} onHome={home} onSettings={openSettings} />}
          {screen === 'ad' && <MockAdScreen secondsRemaining={snapshot.state.adSeconds} onCancel={cancelAd} />}
          {screen === 'result' && <ResultScreen score={snapshot.score}
            bestScore={Math.max(preferences.value.bestScore, snapshot.score)} canRevive={canRevive}
            onRetry={start} onHome={home} onShare={share} onRevive={revive} onSettings={openSettings}
            onCharacters={openCharacters} newlyUnlocked={preferences.newlyUnlocked} />}
          {showStorageStatus && <View pointerEvents="none" style={styles.storageNotice}>
            <Text accessibilityLiveRegion="polite" style={styles.storageText}>
              {preferences.status === 'loading' ? ko.storageLoading : ko.storageMemoryOnly}
            </Text>
          </View>}
        </LandscapeGate>
        <SettingsPanel visible={panel === 'settings'} settings={preferences.value.settings}
          onChange={preferences.setSettings} onClose={closePanel} />
        <CharacterSelectPanel visible={panel === 'characters'} collection={preferences.value.collection}
          onSelect={selectCharacter} onClose={closePanel} />
        <ShareFeedbackPanel result={panel === 'share' ? shareResult : null} onClose={closePanel} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: palette.background,
  },
  storageNotice: { position: 'absolute', top: 4, left: '15%', right: '15%', alignItems: 'center', zIndex: 90 },
  storageText: { color: palette.ink, backgroundColor: palette.paper, padding: 6, borderRadius: 8, fontSize: 12, textAlign: 'center' },
});
