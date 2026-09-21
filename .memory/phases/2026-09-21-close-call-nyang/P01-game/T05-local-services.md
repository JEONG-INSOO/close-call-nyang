# Task: T05 로컬 설정·소리·공유와 개발용 부활

## Status: pending

## Goal
기록과 설정이 기기에 남고 소리/햅틱/공유가 동작하며, 개발에서만 5초 가상 광고를 통해 한 번 부활할 수 있게 완성한다.

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
  export interface Preferences { schemaVersion: 1; bestScore: number; settings: Settings }
  export type StorageStatus = 'loading' | 'ready' | 'memoryOnly';
  export interface PreferencesResult { value: Preferences; status: 'ready' | 'memoryOnly' }
  export function parsePreferences(raw: string | null): Preferences;
  export function loadPreferences(): Promise<PreferencesResult>;
  export function savePreferences(value: Preferences): Promise<boolean>;
  export function updateBest(value: Preferences, score: number): Preferences;
  export function usePreferences(): {
    value: Preferences; status: StorageStatus;
    setSettings(patch: Partial<Settings>): void; recordScore(score: number): void;
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
  - Single key `close-call-nyang.preferences.v1`; defaults schemaVersion1,bestScore0,musicEnabled true,sfxEnabled true,hapticsEnabled true,reduceMotion false. No name, identifier, history, runs, tokens, scores upload or active run storage.
  - Only recognized bool fields loaded; malformed JSON/unknown schema return safe defaults; missing fields backfill individually. best finite nonnegative integer, invalid→0. Do not trust arbitrary stored property names.
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

## Acceptance Criteria
- [ ] Settings/record survive reload; storage failure leaves usable game with accurate notice.
- [ ] Original loop/effects/optional haptics obey independent toggles and lifecycle.
- [ ] Share uses native sheet/web clipboard with cancellation/failure fallback.
- [ ] Dev-only5sec ad grants one revive; production cannot display or activate it.
- [ ] This local-service layer sends no runtime data and adds no native advertising/microphone permissions; P02's explicitly scoped ranking API data is separate.

## Validation
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
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
