import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_CHARACTER_ID, type CharacterId } from './src/characters/catalog';
import { CountdownOverlay } from './src/components/CountdownOverlay';
import { LandscapeGate, useWebPortraitGate } from './src/components/LandscapeGate';
import { PauseOverlay } from './src/components/PauseOverlay';
import { getFeatureFlags } from './src/config/app';
import { scoreOf } from './src/game/difficulty';
import type { GameState } from './src/game/types';
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
import { NicknamePanel } from './src/screens/NicknamePanel';
import { NicknameWelcomePanel } from './src/screens/NicknameWelcomePanel';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { PendingRankingPanel } from './src/screens/PendingRankingPanel';
import { useOnlineProfile } from './src/online/useOnlineProfile';
import { useRankedGame } from './src/online/useRankedGame';
import { useGameAudio } from './src/services/audio';
import { playHaptic } from './src/services/haptics';
import { getRewardedAdAvailability } from './src/services/rewardedAds';
import { usePreferences } from './src/services/usePreferences';
import { useNicknameOnboarding } from './src/services/useNicknameOnboarding';
import { clearGameResume, loadGameResume, resumeStateFromGameState, saveGameResume } from './src/services/gameResume';
import { palette } from './src/theme/tokens';

type Panel = 'settings' | 'characters' | 'nickname' | 'nicknameWelcome' | 'leaderboard' | 'diagnostics' | null;
let Diagnostics: (() => React.JSX.Element) | null = null;
if (__DEV__ && process.env.EXPO_PUBLIC_REPLAY_DIAGNOSTICS === 'true') {
  Diagnostics = require('./src/online/__dev__/RankedReplayDiagnostics').RankedReplayDiagnostics;
}

export default function App(): React.JSX.Element {
  const [flags] = useState(() => getFeatureFlags(__DEV__, process.env.EXPO_PUBLIC_ENABLE_MOCK_AD));
  const { controller, snapshot, frame } = useGameController(flags);
  const portraitBlocked = useWebPortraitGate();
  const preferences = usePreferences();
  const onboarding = useNicknameOnboarding();
  const online = useOnlineProfile();
  const audio = useGameAudio(preferences.value.settings);
  const [runCharacter, setRunCharacter] = useState<CharacterId>(DEFAULT_CHARACTER_ID);
  const [panel, setPanel] = useState<Panel>(null);
  const [resumeState, setResumeState] = useState<GameState | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const panelRef = useRef<Panel>(null);
  const welcomePresented = useRef(false);
  const attempt = useRef<{ id: number; runId: number } | null>(null);
  const services = useRef({ preferences, audio });
  services.current = { preferences, audio };
  const changePanel = useCallback((next: Panel) => {
    panelRef.current = next;
    setPanel(next);
  }, []);
  const closePanel = useCallback(() => changePanel(null), [changePanel]);
  const ranking = useRankedGame({
    controller, online, eligible: !__DEV__ && !flags.mockAdsEnabled,
    canStart: () => !portraitBlocked && panelRef.current === null,
    onAcceptedStart: runId => {
      setRunCharacter(services.current.preferences.value.collection.selectedCharacter);
      attempt.current = { id: services.current.preferences.beginAttempt(!flags.mockAdsEnabled), runId };
    },
  });

  useEffect(() => {
    if (onboarding.status !== 'ready' || onboarding.handled) return;
    if (online.status === 'ready' && online.profile) {
      onboarding.markHandled();
      if (panelRef.current === 'nicknameWelcome') changePanel(null);
      return;
    }
    if (welcomePresented.current || online.status !== 'guest' || online.profile || online.isBusy || online.deletionPending ||
        portraitBlocked || resumeLoading || ranking.startBusy || ranking.pendingChoice || panelRef.current !== null ||
        controller.readState().screen !== 'title') return;
    welcomePresented.current = true;
    ranking.cancelStart();
    changePanel('nicknameWelcome');
  }, [onboarding.status, onboarding.handled, onboarding.markHandled, online.status, online.profile,
    online.isBusy, online.deletionPending, portraitBlocked, resumeLoading, ranking.startBusy,
    ranking.pendingChoice, ranking.cancelStart, panel, snapshot.state.screen, controller, changePanel]);

  const deferNickname = useCallback(() => {
    onboarding.markHandled();
    changePanel(null);
  }, [onboarding.markHandled, changePanel]);
  const setupNickname = useCallback(() => {
    onboarding.markHandled();
    changePanel('nickname');
  }, [onboarding.markHandled, changePanel]);

  useEffect(() => {
    let active = true;
    void loadGameResume().then(saved => {
      if (!active) return;
      setResumeState(saved);
      setResumeLoading(false);
    });
    return () => { active = false; };
  }, []);

  const persistResume = useCallback(() => {
    const saved = resumeStateFromGameState(controller.readState());
    if (!saved) return;
    setResumeState(saved);
    void saveGameResume(saved);
  }, [controller]);

  const clearResume = useCallback(() => {
    setResumeState(null);
    void clearGameResume();
  }, []);

  const pause = useCallback(() => {
    ranking.cancelStart();
    controller.clearInput();
    controller.resetFrameClock();
    controller.dispatch({ type: 'PAUSE' });
    persistResume();
  }, [controller, persistResume, ranking.cancelStart]);
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
        if (effect.type === 'footstep' || effect.type === 'coffee' || effect.type === 'fall') {
          services.current.audio.cue(effect.type);
        }
        if (effect.type === 'wobble' || effect.type === 'coffee' || effect.type === 'fall') {
          void playHaptic(effect.type, services.current.preferences.value.settings.hapticsEnabled);
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
    services.current.audio.unlock();
    clearResume();
    void ranking.start();
  }, [clearResume, controller, ranking.start, portraitBlocked]);
  const home = useCallback(() => {
    const current = controller.readState();
    if (current.screen === 'paused' || current.screen === 'playing' || current.screen === 'countdown' || current.screen === 'ad') {
      persistResume();
    } else {
      clearResume();
    }
    ranking.leaveRun();
    controller.dispatch({ type: 'HOME' });
  }, [clearResume, controller, persistResume, ranking.leaveRun]);
  const resumeSaved = useCallback(() => {
    if (!resumeState || portraitBlocked || panelRef.current !== null) return;
    if (!controller.restore(resumeState)) return;
    controller.dispatch({ type: 'RESUME' });
    setResumeState(null);
    void clearGameResume();
  }, [controller, portraitBlocked, resumeState]);
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
    ranking.cancelStart(); changePanel('characters');
  }, [changePanel, controller, portraitBlocked, ranking.cancelStart]);
  const openOnline = useCallback((next: 'nickname' | 'leaderboard') => {
    if (portraitBlocked) return;
    if (next === 'nickname' && (online.profile !== null || online.status === 'loading' || online.status === 'deleting')) return;
    pause(); changePanel(next);
  }, [changePanel, online.profile, online.status, pause, portraitBlocked]);
  useEffect(() => {
    if (panel === 'nickname' && online.profile) changePanel(null);
  }, [changePanel, online.profile, panel]);
  const deleteOnline = useCallback(() => ranking.deleteProfile(online.deleteProfile), [ranking.deleteProfile, online.deleteProfile]);
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
            onSettings={openSettings} onCharacters={openCharacters} startBusy={ranking.startBusy}
            onResume={resumeSaved} resumeAvailable={!resumeLoading && resumeState !== null}
            onLeaderboard={() => openOnline('leaderboard')}
            onlineNotice={ranking.localNotice ?? (online.status === 'unconfigured' ? '랭킹 연결을 준비 중이에요. 지금은 기기에 기록됩니다.' : online.error)} />}
          {screen === 'countdown' && <CountdownOverlay seconds={snapshot.state.countdownSeconds} />}
          {screen === 'paused' && <PauseOverlay onResume={resume} onHome={home} onSettings={openSettings} />}
          {screen === 'ad' && <MockAdScreen secondsRemaining={snapshot.state.adSeconds} onCancel={cancelAd} />}
          {screen === 'result' && <ResultScreen score={snapshot.score}
            bestScore={Math.max(preferences.value.bestScore, snapshot.score)} canRevive={canRevive}
            onRetry={start} onHome={home} onRevive={revive} newlyUnlocked={preferences.newlyUnlocked}
            startBusy={ranking.startBusy} />}
          {showStorageStatus && <View pointerEvents="none" style={styles.storageNotice}>
            <Text accessibilityLiveRegion="polite" style={styles.storageText}>
              {preferences.status === 'loading' ? ko.storageLoading : ko.storageMemoryOnly}
            </Text>
          </View>}
          {Diagnostics && screen === 'title' && <Pressable testID="replay-diagnostics-open" accessibilityRole="button"
            onPress={() => { ranking.cancelStart(); changePanel('diagnostics'); }} style={styles.diagnosticsButton}>
            <Text>재현 검사 (개발용)</Text>
          </Pressable>}
        </LandscapeGate>
        <SettingsPanel visible={panel === 'settings'} settings={preferences.value.settings}
          onChange={preferences.setSettings} onClose={closePanel} nickname={online.profile?.nickname}
          onEditNickname={!online.profile && !online.isBusy && (online.status === 'guest' || online.status === 'offline' || online.status === 'unconfigured')
            ? () => openOnline('nickname') : undefined}
          onDeleteProfile={online.userId ? deleteOnline : undefined}
          deleting={online.isBusy} onlineError={ranking.localNotice ?? online.error} />
        <CharacterSelectPanel visible={panel === 'characters'} collection={preferences.value.collection}
          onSelect={selectCharacter} onClose={closePanel} />
        <NicknamePanel visible={panel === 'nickname'} profile={online.profile} onClose={closePanel}
          onSave={online.saveNickname} busy={online.isBusy || online.deletionPending}
          disabled={online.status === 'unconfigured' || online.profile !== null}
          error={online.status === 'unconfigured' ? '랭킹 연결 전입니다. 닉네임 없이도 바로 플레이할 수 있어요.' : online.error} />
        <NicknameWelcomePanel visible={panel === 'nicknameWelcome' && !portraitBlocked}
          onSetup={setupNickname} onLater={deferNickname} />
        <LeaderboardScreen visible={panel === 'leaderboard'} api={online.api} myProfile={online.profile}
          onClose={closePanel} refreshKey={ranking.refreshKey} />
        <PendingRankingPanel visible={ranking.pendingChoice} busy={ranking.startBusy} error={ranking.pendingError}
          onRetry={() => { void ranking.retryPending(); }} onStartLocal={ranking.startLocal}
          onDiscardAndStart={() => { void ranking.discardAndStart(); }} onClose={ranking.closePending} />
        {Diagnostics && <Modal visible={panel === 'diagnostics'} onRequestClose={closePanel}>
          <Diagnostics /><Pressable accessibilityRole="button" onPress={closePanel}><Text>닫기</Text></Pressable>
        </Modal>}
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
  diagnosticsButton: { position: 'absolute', left: 8, bottom: 8, padding: 12, backgroundColor: palette.paper, zIndex: 100 },
});
