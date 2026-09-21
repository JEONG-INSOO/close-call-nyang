# Task: T04 입력·게임 루프와 플레이 화면 연결

## Status: pending

## Goal
제목에서 시작해 손/키보드로 균형을 잡고 넘어지면 기록을 확인·재도전할 수 있는 앱을 구성한다. 수동·자동 정지와 입력 해제를 함께 검증한다.

## Decision Summary
- 가로 화면, 양쪽 하단 지속 입력, ArrowLeft/ArrowRight/A/D, 동시 입력 상쇄. 게이지/튜토리얼 없음.
- 규칙은 순수 엔진, 시각화는 Reanimated shared values. 1/120초 고정 간격과 최대10Hz React 표시로 프레임별 전체 앱 재렌더를 피한다.

## Implementation

### I01. Controller 계약과 시간 처리
- Related Files:
  - `src/game/controller.ts` :: createGameController — new
  - `src/game/useGameController.ts` :: useGameController — new
  - `src/input/inputState.ts` :: InputRegistry — new
  - `src/input/useKeyboardInput.web.ts`, `useKeyboardInput.ts` :: keyboard hook/web no-op boundary — new
  - `src/platform/useAppLifecycle.ts`, `useAppLifecycle.web.ts` :: foreground/visibility — new
  - `src/game/engine.ts`, `types.ts`, `difficulty.ts` :: transition & schema — read-only
  - `src/scene/types.ts`, `GameScene.tsx` :: frame/scene — read-only
#### Details
- **Existing contracts (sufficient to consume without rediscovering)**:
  - `createInitialState():GameState`; `transition(state,action,{mockAdsEnabled}):{state:GameState,effects:GameEffect[]}` from engine.
  - `GameState` has screen title/countdown/playing/paused/ad/result, run nullable, resumeTo playing/countdown/ad/null, countdownSeconds/adSeconds.
  - Run fields: id,seed,rng,distanceM,elapsedSeconds,angleRad,angularVelocity,hasCoffee,reviveUsed,protectionSeconds,event|null,nextEventAt,stepIndex,nextFootstepAt,lastWobbleAt. WorkEvent{id,direction:-1|1,phase:warning|active,remainingSeconds,strength}. `scoreOf`, `stageOf` derive display.
  - Actions START{runId,seed}, TICK{dt,input:{left,right}}, PAUSE,RESUME,HOME,REQUEST_AD,CANCEL_AD. Effects footstep/wobble/coffee/fall/revive{runId} or eventWarning{runId,eventId,direction}.
  - SceneFrame{distanceM,elapsedSeconds,angleRad,angularVelocity,hasCoffee,protectionSeconds,playing,fallen,seed}. GameScene receives `{frame:SharedValue<SceneFrame>,reduceMotion:boolean,characterId?:CharacterId}`; CharacterId from src/characters/catalog.ts is rookie|diligent|veteran and defaults rookie. This is a render-only prop, never an engine field. Score100 color is outside scene.
- **Signatures & Types**:
  ```typescript
  export type ControlAction = Exclude<GameAction, { type: 'TICK' }>;
  export type InputSource = 'touch' | 'keyboard';
  export interface ControllerSnapshot {
    state: GameState; score: number; stage: 'street' | 'office';
  }
  export interface GameController {
    getSnapshot(): ControllerSnapshot;
    readState(): GameState;
    subscribe(listener: () => void): () => void;
    subscribeFrame(listener: (frame: SceneFrame) => void): () => void;
    subscribeEffects(listener: (effects: GameEffect[], state: GameState) => void): () => void;
    dispatch(action: ControlAction): void;
    setInput(source: InputSource, id: string, direction: -1 | 1, down: boolean): void;
    clearInput(): void;
    advanceFrame(timestampMs: number): void;
    resetFrameClock(): void;
    dispose(): void;
  }
  export function createGameController(flags: { mockAdsEnabled: boolean }): GameController;
  export function useGameController(flags: { mockAdsEnabled: boolean }): {
    controller: GameController; snapshot: ControllerSnapshot;
    frame: import('react-native-reanimated').SharedValue<SceneFrame>;
  };
  export interface InputRegistry {
    set(source: InputSource, id: string, direction: -1 | 1, down: boolean): void;
    read(): { left: boolean; right: boolean };
    clear(): void;
  }
  export function createInputRegistry(): InputRegistry;
  export function useKeyboardInput(controller: GameController): void;
  export function useAppLifecycle(onInactive: () => void): void;
  ```
- **Data & Schema Fields**:
  - Mutable engine state private to controller; useSyncExternalStore snapshots must be cached until publish, not new object on every getSnapshot. Frame subscription uses derived render-only values; static zero frame when no run.
  - Input registry Set per source+id+direction. Pressing A and left together counts left held until both released. Touch-left release must not release a still-held keyboard-left. Both signs present gives engine two booleans true→0 force.
  - Controller accumulator seconds, previousTimestamp null initially, maxFrameDelta0.1s, stepDt1/120, max12 steps. lastReactPublishMs controls at most10Hz gameplay snapshots; screen/score milestone/event boundary publishes immediately when needed. Effects drained once per transition.
- **Execution Flow / Logic**:
  1. Hook creates exactly one controller lifetime, useSyncExternalStore subscriber, frame subscription into shared value, rAF loop, cleanup. Frame values are plain finite numbers/booleans. Use updated listener subscriptions to avoid stale settings closures in T05.
  2. First timestamp seeds clock only. Nonfinite/backward timestamps reset clock safely. delta>0.1s clears accumulator/input and dispatches PAUSE if running/countdown/ad; do not fast-forward physics or award ad after a delayed frame. At ordinary30/60/120Hz, consume fixed steps and retain substep remainder. Do not round away remainder each frame.
  3. After transition, replace state, publish necessary snapshot and SceneFrame, notify effects one time. Stop this frame's remaining simulation once state changes to result/paused/countdown after ad; discard remainder to avoid duplicate result events. START/RESUME also reset frame clock/input.
  4. On pointer/touch cancel, release that source. On pause, background, window blur, visibility hidden, orientation gate or unmount, clear all sources and reset clock. Never resume automatically on focus/foreground. PAUSE semantics preserve prior screen from engine.
  5. Keyboard only web: keydown/up ArrowLeft,ArrowRight,KeyA,KeyD; prevent page scrolling for recognized keys while active controls; ignore text fields and modals where relevant; key repeats idempotent. Optional Escape toggles manual pause/resume only if eligible; no undocumented key grants reward. Hooks remove all listeners.
  6. Native AppState inactive/background invokes onInactive. Web document.visibilitychange and window.blur invoke it, browser-only globals never evaluated on native. Native landscape lock via expo-screen-orientation on mount with catch→nonfatal hint; standalone orientation in config remains landscape. Web lock cannot be assumed available, show rotation gate if width<height and freeze gameplay.
  7. Do not access audio/storage here; subscribeEffects contract enables T05 services independently. No static implementation tests alone: exercise time/event sequences.

### I02. Responsive screens and UI assembly
- Related Files:
  - `App.tsx` :: app composition — modify
  - `src/screens/TitleScreen.tsx`, `GameScreen.tsx`, `ResultScreen.tsx` :: screens — new
  - `src/components/ControlButton.tsx`, `GameHud.tsx`, `PauseOverlay.tsx`, `CountdownOverlay.tsx`, `LandscapeGate.tsx` :: controls/overlays — new
  - `src/i18n/ko.ts` :: visible text/events — modify
  - `src/theme/tokens.ts` :: readable component tokens — modify
  - `src/__tests__/App.test.tsx` :: start screen test — modify
  - `src/game/__tests__/controller.test.ts`, `src/input/__tests__/inputState.test.ts`, `src/screens/__tests__/flow.test.tsx` :: behavior — new
  - `docs/learning-notes.md` :: controller/state UI explanation — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export interface TitleScreenProps { bestScore: number; onStart(): void; onSettings(): void }
  export interface ResultScreenProps {
    score: number; bestScore: number; canRevive: boolean;
    onRetry(): void; onHome(): void; onShare(): void; onRevive(): void;
  }
  export interface ControlButtonProps {
    direction: -1 | 1; disabled: boolean;
    onChange(id: string, down: boolean): void;
  }
  export interface GameHudProps {
    score: number; event: WorkEvent | null; onPause(): void; canPause: boolean;
  }
  ```
- UI defaults during T04 before services: in-memory best record, reduceMotion false; share/settings callbacks either receive wired read-only basic settings panel or remain deliberately hidden until T05, never show a button that silently does nothing. canRevive false until actual mock screen integration T05 even if flag true.
- Character default is rookie (user option2). T05 adds local unlocks/selection; do not show a nonfunctional character button here. A chosen character is frozen at accepted START and passed only to the scene; never change it during countdown/playing/paused/ad/result. Publish a controller snapshot immediately on the first crossing from score<100 to score>=100 and on result so T05 can observe the achievement without any100 audio/haptic/GameEffect. This is state notification, not a gameplay effect.
- App keeps GameScene mounted behind relevant overlays; one state switch shows Title/Game/Result. Korean title and one `업무 시작` CTA, highest score. No tutorial. START runId increments in app, seed from local time/random outside pure engine; fixtures inject fixed values.
- GameHud: top score `프로젝트 성공률 N%`, accessible text; color ink until score<100, accent teal thereafter. No score100 sound/animation/vibration. Top right pause44pt+. Event warning centered near top with directional arrow and event label; after warning active treatment brief but no balance bar.
- Controls: both lower corners translucent pads minimum72pt for play, safe area padding plus16; on press in/out/cancel provide persistent input. Multi-touch on different pads must work simultaneously; if RN Pressable responder exclusivity interferes, implement per-touch responder IDs and test device, not assumption. No background props over buttons, zIndex overlays above.
- 16:9 canvas contained in available window; screen text/buttons remain readable on844x390 and667x375. Do not simply scale all accessible tap targets below44pt. Browser portrait rotation card; resize back to landscape requires resume, preserves progress.
- Countdown displays ceil(seconds)3→2→1 without timer independent of engine. Pause overlay offers resume/home and settings entry for T05. Title/result settings show modal in T05. Result freezes run score and displays max score; retry creates new run and clears one-time revive status.
- Tests: START countdown→play→instant result using injected engine fixture; retry resets; paused frame does not tick; left+A release cases; opposite cancel; cancel/unmount clears; long delta auto pause; app resume doesn't auto-play; production no revive; score100 color/no gauge. Use dependency injection in tests, not production URL cheats. T05 wires share/settings before overall game acceptance.

## Acceptance Criteria
- [ ] Browser runs a complete balance/retry loop with held keys and touch controls.
- [ ] Pause/app lifecycle/portrait transitions freeze time and release all inputs.
- [ ] rAF fixed steps feed pure engine, animation shared values avoid full scene React updates each frame.
- [ ] Touch pads remain usable at landscape phone widths, no balance gauge or tutorial.
- [ ] Display100 only changes color; game continues beyond100.

## Validation
- `npm.cmd test -- --runInBand src/game/__tests__/controller.test.ts src/input/__tests__ src/screens/__tests__ src/__tests__/App.test.tsx` — behavior passes.
- `npm.cmd run test:ci` — existing rules/scene tests pass.
- `npm.cmd run typecheck` — clean.
- `npm.cmd run web:export` — playable bundle generated (full browser QA T06).
- `git diff --check` — clean.

## Commit Message
```text
feat(play): connect controls, fixed-step loop and game screens

Plan: 2026-09-21-close-call-nyang
Phase: P01-game
Task: T04-playable-app

- Add held touch and keyboard inputs with lifecycle pause handling
- Wire title, countdown, gameplay and results without a balance gauge
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
