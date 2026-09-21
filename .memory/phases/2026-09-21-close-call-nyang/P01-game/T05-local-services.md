# Task: T05 로컬 설정·소리·공유와 개발용 부활

## Status: done

## Goal
기록·설정·3종 캐릭터 해금/선택이 기기에 남고 소리/햅틱/공유가 동작하며, 개발에서만5초 가상 광고를 통해 한 번 부활할 수 있게 완성한다.

## Decision Summary
- 이 Task는 로컬 최고 기록·설정을 AsyncStorage에 저장한다. 후속 P02-leaderboard에서 익명 세션·닉네임·온라인 기록 저장을 별도 키/서비스로 추가한다. 분석/추적/실제 광고 SDK는 제외한다. 음악/효과음/진동/화면 흔들림 줄이기는 독립 설정이다.
- 웹 클립보드, iPhone Share. 자체 제작 출근 음악과 발걸음/휘청임/넘어짐 소리. 100% 전용 효과 없음.

## Implementation

### I01. Storage/settings and sharing adapters
- Related Files:
  - `src/services/preferences.ts` :: parsePreferences/loadPreferences/savePreferences/updateBest — new
  - `src/services/usePreferences.ts` :: usePreferences — new
  - `src/services/share.ts`, `share.web.ts` :: shareScore — new
  - `src/screens/SettingsPanel.tsx` :: SettingsPanel — new
  - `src/screens/ResultScreen.tsx`, `TitleScreen.tsx` :: settings/share integration — modify
  - `App.tsx`, `src/i18n/ko.ts` :: service composition/messages — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export interface Settings {
    musicEnabled: boolean; sfxEnabled: boolean; hapticsEnabled: boolean; reduceMotion: boolean;
  }
  export interface CollectionState {
    completedRuns: number; selectedCharacter: CharacterId;
  }
  export interface Preferences {
    schemaVersion: 1; bestScore: number; settings: Settings; collection: CollectionState;
  }
  export type StorageStatus = 'loading' | 'ready' | 'memoryOnly';
  export interface PreferencesResult { value: Preferences; status: 'ready' | 'memoryOnly' }
  export function parsePreferences(raw: string | null): Preferences;
  export function loadPreferences(): Promise<PreferencesResult>;
  export function savePreferences(value: Preferences): Promise<boolean>;
  export function updateBest(value: Preferences, score: number): Preferences;
  export function usePreferences(): {
    value: Preferences; status: StorageStatus;
    setSettings(patch: Partial<Settings>): void; recordScore(score: number): void;
    beginAttempt(eligible: boolean): number;
    observeAttempt(attemptId: number, score: number): void;
    selectCharacter(id: CharacterId): boolean;
    newlyUnlocked: readonly CharacterId[];
    clearUnlockNotice(): void;
  };
  export type ShareResult = { status: 'shared' | 'copied' | 'cancelled' | 'manual'; text: string };
  export function formatShareText(score: number): string;
  export function shareScore(score: number): Promise<ShareResult>;
  export interface SettingsPanelProps {
    visible: boolean; settings: Settings;
    onChange(patch: Partial<Settings>): void; onClose(): void;
  }
  ```
- **Data & Schema Fields**:
  - Single key `close-call-nyang.preferences.v1`; defaults schemaVersion1,bestScore0,musicEnabled true,sfxEnabled true,hapticsEnabled true,reduceMotion false,collection{completedRuns:0,selectedCharacter:'rookie'}. No identity, authentication token, input history, score upload or active-run persistence. The local aggregate collection is not a server-verified ranking record.
  - Only recognized fields loaded; malformed JSON/unknown schema return safe defaults; missing fields backfill individually. best finite nonnegative integer, invalid→0. Collection count finite number→floor/clamp0..10; invalid→0. CharacterId comes from src/characters/catalog.ts (rookie|diligent|veteran); unknown/locked selection→rookie. Old v1 preferences without collection retain best/settings and get count0/rookie; do not infer10 wins or any past count from bestScore. Do not trust arbitrary stored property names.
  - Persistence sequential/coalesced writer prevents older result overwriting newer best/settings. Best is monotonic max(current,incoming); load merges best if gameplay began during async hydration. User settings edits during hydration take priority over older stored values for touched fields.
- **Execution Flow / Logic**:
  1. Load asynchronously at root; title can appear immediately with stable defaults, do not trap game behind spinner. Failure gives in-memory session and unobtrusive Korean notice when relevant. Failed read must not immediately overwrite stored data with defaults automatically.
  2. Persist on settings changes and result/highest update or pause; avoid per-physics-tick disk writes. Settings change visible immediately even if write fails; status memoryOnly and retry on subsequent intentional save, no network/analytics reporting.
  3. Opening settings while playing first PAUSE; close returns paused overlay, not automatic play. Toggle labels accessible and values announced. Reduced motion affects rendering only; audio toggles immediately affect current players. UI avoids a secret dev ad toggle in production settings.
  4. Format share score as finite int: `아슬아슬 냥대리 프로젝트 성공률 {N}%!\nhttps://jeong-insoo.github.io/close-call-nyang/`. PUBLIC_WEB_URL comes from src/config/app.ts, currently planned URL and only becomes live after user Pages setup.
  5. Native uses React Native Share.share({message}); cancellation silent. Web uses expo-clipboard or browser clipboard from direct user click. Rejection/unavailable/insecure context → selectable text dialog and `복사해서 공유해 주세요`. Never claim successful copy on failure. No file or image share permissions.

### I02. Original audio and mobile feedback
- Related Files:
  - `scripts/generate-audio.mjs` :: reproducible original PCM generator — new
  - `assets/audio/commute-loop.wav`, `step.wav`, `wobble.wav`, `fall.wav`, `coffee.wav` :: generated assets — new
  - `assets/audio/README.md` :: source/license/generation notes — new
  - `src/services/audio.ts` :: useGameAudio — new
  - `src/services/haptics.ts` :: playHaptic — new
  - `package.json` :: assets:audio script — modify
  - `src/game/useGameController.ts`, `App.tsx` :: effect subscriber — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export type AudioCue = 'footstep' | 'wobble' | 'fall' | 'coffee';
  export function useGameAudio(settings: Settings): {
    unlock(): void; setPlaying(playing: boolean): void; cue(cue: AudioCue): void;
  };
  export function playHaptic(cue: 'wobble' | 'fall' | 'coffee', enabled: boolean): Promise<void>;
  ```
- Generator via Node buffers outputs deterministic 44.1kHz16-bit mono WAV, short amplitude envelopes and no clipping. Create original12s seamless bright loop at100BPM/5bars, light chord+melody pattern (no copied tune), music target playback volume0.15; effects <0.8sec volume<=0.4. Versioned score/timbre data in generator permits reproducibility. Generator is future implementation; current planning does not write assets.
- Use `expo-audio` players/hooks at stable component lifetime, local require asset map. `useAudioPlayer` cleans own resources; do not create a new native player for every footstep. Preload once where SDK supports; replay seeks to0 before play, catch errors. Cap overlapping cues/cooldowns; thousands of steps must not grow listeners/players.
- Unlock from start/retry/resume press to respect browser policies, do not request microphone access. Music only playing active run and enabled; pause during overlays/background/results. Re-enable/resume safely; playback failure never blocks gameplay. Stop on headphone/audio interruption if signaled, clear runtime audio error for next user gesture.
- Native `expo-haptics` light/notification feedback for coffee/fall and throttled wobble, no game dependence on vibration support. Disabled/unsupported/web no-op; catch rejected promises. Never request web vibration permission nor make it necessary to play.
- Effect contracts already exist: `GameEffect` type footstep,wobble,coffee,fall,revive or eventWarning with runId. Use controller.subscribeEffects once, unsubscribe cleanup. Effects from old run ignored if runId != current run.id. `fall` saves max score and feedback; coffee cue/haptic; footsteps/wobble throttled; revive/countdown may be visual only. No100 effect or inference that creates one at score change.

### I03. Mock reward presentation and tests
- Related Files:
  - `src/screens/MockAdScreen.tsx` :: MockAdScreen — new
  - `src/services/rewardedAds.ts` :: getRewardedAdAvailability — new
  - `src/screens/ResultScreen.tsx`, `App.tsx` :: mock ad wiring — modify
  - `src/services/__tests__/preferences.test.ts`, `share.test.ts`, `feedback.test.ts`, `rewardedAds.test.ts` :: adapter tests — new
  - `src/screens/__tests__/settings-and-ad.test.tsx` :: screen flows — new
  - `docs/learning-notes.md` :: persistence/feedback/flags — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export type AdAvailability = 'disabled' | 'mock';
  export function getRewardedAdAvailability(flags: {mockAdsEnabled:boolean}): AdAvailability;
  export interface MockAdScreenProps { secondsRemaining: number; onCancel(): void }
  ```
- Runtime flag `getFeatureFlags(__DEV__, process.env.EXPO_PUBLIC_ENABLE_MOCK_AD)` from src/config/app.ts; guard requires both dev and exact true. Availability disabled when false. canRevive only result+run+!reviveUsed+availability mock. Production both JSX button and dispatch permission disabled; cannot reopen by stale callback.
- View clearly labels `개발용 가상 광고`, harmless fictional coffee/office text, ceil(secondsRemaining), close button always available. No real business logo/click-through/external video. Text says reward after5sec, cancellation none. Count read from GameState.adSeconds, do not add setTimeout reward path.
- `REQUEST_AD` enters5sec; engine completion sets same run/distance,reviveUsed true,angle/velocity0,countdown3,protection1.5. App background triggers PAUSE with resumeTo ad; resume by user continues remaining seconds. Auto callback/skip/rapid repeated click never grants more than1 reward.
- Future SDK integration seam documented: replace mock provider with explicit result from network SDK, but preserve one-time engine eligibility and validate on native build; **do not implement real provider now**. Current engine requires later intentional API change for external reward, not hidden auto-switch when ad happens to arrive.
- Tests: corrupt prefs, partial bools, refused storage, load/edit races, monotonic scores and serialized writes; clipboard reject/cancel/no copied lie; audio setup/unmount/toggle no duplicate players; no haptic when disabled/web; reduced motion unchanged run results; ad completes at5 active seconds, cancels early, pauses in background, repeats rejected; __DEV__ false+env true cannot enable ad; 100 produces no new cue.

### I04. Three-character local collection
- Related Files:
  - `src/characters/catalog.ts` :: CharacterId/CHARACTERS/getUnlockedCharacterIds — read-only from T03
  - `src/services/characterProgress.ts` :: normalizeCollection/applyCompletion — new
  - `src/services/preferences.ts`, `usePreferences.ts` :: collection persistence and exactly-once active attempt — modify
  - `src/screens/CharacterSelectPanel.tsx` :: original character previews/locks/selection — new
  - `src/screens/TitleScreen.tsx`, `ResultScreen.tsx`, `App.tsx`, `src/i18n/ko.ts` :: buttons/notice/render prop — modify
  - `src/services/__tests__/characterProgress.test.ts`, `src/screens/__tests__/character-collection.test.tsx` :: progress/selection/integration — new
  - `docs/learning-notes.md` :: appearance versus physics, duplicate prevention, local-data limits — modify
#### Details
- **Signatures & Types**:
  ```typescript
  // CharacterId from ../characters/catalog; CollectionState/Preferences as above.
  export function normalizeCollection(raw: unknown): CollectionState;
  export function applyCompletion(value: Preferences): {
    value: Preferences; unlocked: readonly CharacterId[];
  };
  export interface CharacterSelectPanelProps {
    visible: boolean; collection: CollectionState;
    onSelect(id: CharacterId): void; onClose(): void;
  }
  ```
- **Data & Schema Fields**: rookie=option2/default, diligent=option1/unlocks1 completion, veteran=option3/unlocks10 completions. Names are 허둥대는 냥대리/성실한 냥대리/베테랑 냥대리. selectedCharacter changes only on explicit unlocked selection, not auto-grant. completedRuns saturates10 solely for collection; score/best has no100/10 cap. No backend fields or account requirement.
- **Execution Flow / Logic**:
  1. Accepted new START (not ignored repeated taps) calls beginAttempt(!flags.mockAdsEnabled) exactly once and captures selectedCharacter for that entire run. beginAttempt creates a monotonic in-memory attempt number independent of engine/server run IDs, stores {id,eligible,counted:false}, and clears only the previous result notice. Rejected START, pause/resume, ad/revive, rerender and restored visibility never create a new attempt. There is no active-game resume after application restart.
  2. Subscribe to cached controller snapshots and always read actual engine score. At first score>=100, observeAttempt requires current attempt ID, eligible and !counted, marks counted synchronously before any await, then applies one completion. Ignore stale attempts, nonfinite/negative score, repeated snapshots/results and score200+. Also observe result as a fallback. The controller's100 crossing notification must not trigger an audio/haptic or physics event.
  3. applyCompletion increments min(10,count+1), computes newly available IDs by comparing old/new catalog availability, preserves selectedCharacter/best/settings and has no side effects. Persist at this milestone through the existing serialized writer, not every frame and not delayed solely until fall. Loss/rejection leaves visible in-memory progress with the existing storage-failure notice; never promise crash-proof persistence before a write resolves.
  4. Hydration race: before load resolves, journal successful current-session completion deltas (bounded at10) instead of overwriting a stored count with defaults. On success merge loaded count plus delta once, then compute new unlock notices against the loaded baseline; apply touched selection only if unlocked after merge. On read failure keep session progress in memory without immediately overwriting unread data. Clearing/redelivering snapshots must not replay the completion journal twice.
  5. Title/result show 캐릭터 button and a three-card panel with name, preview, 획득/선택됨 or required count1/10 and progress. Locked cards cannot select. Panels are not available during an active run; subsequent scene receives selection only on new START. After a new award, result shows a short unlocked-name notice and 캐릭터 선택 button; no automatic equip, modal interruption, mid-run transformation, extra100 audio, haptic or confetti.
  6. Offline ordinary games count; leaderboard validation/network/profile state does not gate collection. Production never has mock ads. Development runs with mockAdsEnabled true are collection-ineligible; unit tests can inject eligibility without production cheat UI. Deleting online profile keeps local best/settings/collection. Clearing app/browser storage removes collection; no cross-device sync or anti-tamper guarantee is claimed.
  7. All three characters use exactly the same physics/controller/score and original collision threshold. Never pass skin stats into engine or ranked replay. Record design rationale and actual test results in learning notes when implemented, not now.
- **Tests**: zero→rookie;0→1 unlocks onlydiligent;8→9 none;9→10 onlyveteran;10→11 remains10;99.99 not counted;100/101/200 in same attempt total1; ten distinct eligible attempts unlockveteran; pause/result/retry/rerender/stale callbacks cannot duplicate; mock-enabled attempts excluded; selection cannot equip locked IDs; no auto-equip; preference missing/corrupt/invalid/hydration/write failure; saved selection and unlocks restore; online deletion preserves collection; same input/seed with three cosmetic IDs has identical score/fall state.

## Acceptance Criteria
- [x] Default rookie, first100 diligent and tenth distinct qualifying run veteran; local count/selection restore and duplicate awards are prevented (real App/hooks with mocked disk boundary).
- [x] Character selection and result unlock notice work without changing physics or adding mid-run100 celebration. Three skins × reduceMotion on/off produce identical engine outcomes.
- [x] Settings/record survive App remount; storage failure leaves usable game with accurate notice (automated storage boundary; physical-device persistence QA remains pending).
- [x] Original loop/effects/optional haptics obey independent toggles and lifecycle in adapter tests. Actual listening/device feedback is not yet verified.
- [x] Share uses native sheet/web clipboard adapters with cancellation/failure fallback; actual OS sheet/browser clipboard QA remains pending.
- [x] Dev-only5sec ad grants one revive; production cannot display or activate it (automated flow/guard tests).
- [x] No automatic analytics/ranking data transmission or native advertising/microphone permissions were added; explicit user-initiated text sharing and local asset loading are separate. P02's scoped API is not implemented here.

## Validation
- `npm.cmd test -- --runInBand src/services/__tests__/characterProgress.test.ts src/screens/__tests__/character-collection.test.tsx` — exact-once/local restore/selection/threshold tests pass.
- `npm.cmd run assets:audio` — deterministic valid WAVs generated, no clipping/header mismatch.
- `npm.cmd test -- --runInBand src/services/__tests__ src/screens/__tests__/settings-and-ad.test.tsx` — adapters and screen behavior pass.
- `npm.cmd run typecheck` — clean.
- `npm.cmd run test:ci` — full unit/screen suite passes.
- `npm.cmd run web:export` — all local sounds bundled successfully.
- `git diff --check` — clean.

## Commit Message
```text
feat(experience): add local settings, audio, sharing and mock revive

Plan: 2026-09-21-close-call-nyang
Phase: P01-game
Task: T05-local-services

- Persist local records and settings with resilient platform feedback
- Add original audio and strictly development-only reward flow
```

## Progress
- [x] 구현 완료
- [x] 지정된 자동 검증 통과; 실제 브라우저/iPhone·청취·공유/저장 장치 QA는 T06/P03에 남김
- Results: character24, service/ad90, full25 suites/355 tests passed; typecheck0errors; generated5 deterministic validated WAVs; web export includes5 local sounds; diff check clean.
- Implementation extensions within T05: audioCore.ts/audio.web.ts isolate common policy and catch HTML media Promise rejection discarded by installed Expo web API; shareText.ts avoids platform self-import; ShareFeedbackPanel.tsx exposes honest manual fallback; usePreferences.test.tsx/service-panels.test.tsx and AsyncStorage Jest setup cover additional boundaries. No dependency versions changed.
- Review fixes: inline modal a11y flags hid the sibling storage-error notice; old play Promise rejection could stop new playback. Accessibility regression and old/current request token tests now pass.
- No push, Pages/iOS deployment, physical-device or actual audio/browser validation claimed.
- commit: pending
