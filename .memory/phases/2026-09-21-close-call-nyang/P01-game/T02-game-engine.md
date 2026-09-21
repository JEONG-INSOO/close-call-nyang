# Task: T02 결정론적 게임 규칙과 상태 머신

## Status: done

## Goal
React나 장치 없이 테스트할 수 있는 보행·균형·사건·실패·부활 규칙을 만들고, 거리/시간 경계와 모든 화면 전환을 자동 검증한다.

## Decision Summary
- 1m=1%, 정수 내림, 15%부터 커피/속도·난이도 상승, 51% 실내, 약 90초에100%, 이후 상한 없음. 위험 각도 즉시 실패.
- 개발 광고 5초 완료 때만 1회 부활; 3초 카운트다운과 1.5초 보호. 100%는 숫자 색상만. 고정 물리 간격 1/120초.

## Implementation

### I01. 공유 스키마·난이도·입력
- Related Files:
  - `src/game/types.ts` :: GameState/RunState/GameAction/GameEffect — new
  - `src/game/balance.ts` :: BALANCE — new
  - `src/game/difficulty.ts` :: scoreOf/stageOf/speedAt/difficultyAt — new
  - `src/game/random.ts` :: nextRandom — new
  - `src/config/app.ts` :: FeatureFlags — read-only (type {mockAdsEnabled:boolean})
#### Details
- **Signatures & Types**:
  ```typescript
  export type Direction = -1 | 1; // left/right force, radians negative/positive
  export type Stage = 'street' | 'office';
  export type Screen = 'title' | 'countdown' | 'playing' | 'paused' | 'ad' | 'result';
  export type InputState = Readonly<{ left: boolean; right: boolean }>;
  export type EventId = 'coffeeRush' | 'lateCommute' | 'urgentEdit' | 'bossCall' | 'longMeeting';
  export interface WorkEvent {
    id: EventId; direction: Direction; phase: 'warning' | 'active';
    remainingSeconds: number; strength: number;
  }
  export interface RunState {
    id: number; seed: number; rng: number; distanceM: number; elapsedSeconds: number;
    angleRad: number; angularVelocity: number; hasCoffee: boolean; reviveUsed: boolean;
    protectionSeconds: number; event: WorkEvent | null; nextEventAt: number;
    stepIndex: number; nextFootstepAt: number; lastWobbleAt: number;
  }
  export interface GameState {
    screen: Screen; run: RunState | null;
    resumeTo: 'playing' | 'countdown' | 'ad' | null;
    countdownSeconds: number; adSeconds: number;
  }
  export type GameAction =
    | { type: 'START'; runId: number; seed: number }
    | { type: 'TICK'; dt: number; input: InputState }
    | { type: 'PAUSE' } | { type: 'RESUME' } | { type: 'HOME' }
    | { type: 'REQUEST_AD' } | { type: 'CANCEL_AD' };
  export type GameEffect =
    | { type: 'footstep' | 'wobble' | 'coffee' | 'fall' | 'revive'; runId: number }
    | { type: 'eventWarning'; runId: number; eventId: EventId; direction: Direction };
  export interface Transition { state: GameState; effects: GameEffect[] }
  export interface Difficulty {
    level: number; speedMps: number; instability: number; disturbance: number;
    eventStrength: number; eventIntervalSeconds: number;
  }
  export function scoreOf(distanceM: number): number;
  export function stageOf(distanceM: number): Stage;
  export function speedAt(distanceM: number): number;
  export function difficultyAt(distanceM: number): Difficulty;
  export function nextRandom(state: number): { state: number; value: number };
  ```
- **Data & Schema Fields**:
  - All number fields finite. Angles radians, elapsed/dt seconds, distance meters. No storage/DB fields or nullable values except declared nulls.
  - Score: `Math.floor(max(0,distanceM))`; stage office only distanceM>=51. hasCoffee false initially, true exactly when crossing15; never lost on revive.
  - Initial run: distance/time/velocity/stepIndex/protection0; small deterministic angle ±0.025 from first PRNG draw; reviveUsed false; event null; nextEventAt Number.MAX_VALUE until coffee (finite unscheduled sentinel); nextFootstepAt0.45; lastWobbleAt -1.5. START accepts integer uint32 seed; zero normalizes to1 for stored seed as well as PRNG initialization, rng stores the state after choosing initial lean. runId is a positive safe integer. No Date.now/Math.random inside rules.
  - BALANCE proposed tunable defaults: fixedDt1/120, criticalAngleRad0.70, controlAcceleration4.8, damping3.2, countdown3, mockAd5, protection1.5, warning1.2, activeEvent0.7, wobbleCooldown1.5. These are engineering defaults, not verbatim user-selected values.
  - For distance `m`, let `x=max(0,m-15)`, `L=ln(1+x/35)`; `speedAt(m)=0.9193552309022899*(1+0.7*ln(1+x/85))` m/s. This yields 0→100 about90 active seconds including initial constant speed; initial15 about16.3sec. Speed after100 continues increasing.
  - Difficulty: level L, instability `2.2+0.9L`, disturbance `0.12+0.16L`, eventStrength `0.8+0.5L`, eventIntervalSeconds `max(5,10/(1+0.2L))`. L and strength have no gameplay upper bound. Interval floor preserves readable warnings; no overlapping events.
  - PRNG unsigned32 xorshift32: bit shifts13,17,5 in that order, coerce final uint32; value=state/4294967296. Zero input becomes1 before shift. Seed controls small starting lean and event choices/directions; no random values each render.
- **Execution Flow / Logic**:
  1. Helpers reject nonfinite arguments safely (score/stage use safe zero, engine invalid inputs preserve state). Clamp no **gameplay** score/difficulty cap. Numerical representability errors return a recoverable result, not NaN in UI.
  2. Repeated held input uses signed control `(right?1:0)-(left?1:0)`; both=0. Screen renderer and phone orientation do not influence rules.
  3. Exact15,51,100 tests use explicit fixtures; no approximate threshold based on sprite coordinates. Renderer chooses score color and T05's local collection observes100% outside this kernel; there is no hundred-percent GameEffect or character-specific physics.

### I02. Pure transition and physics
- Related Files:
  - `src/game/engine.ts` :: createInitialState/transition — new
  - `src/game/__tests__/engine.test.ts`, `difficulty.test.ts`, `random.test.ts` :: behavior verification — new
  - `docs/learning-notes.md` :: pure functions/fixed steps/difficulty explanation — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export function createInitialState(): GameState;
  export function transition(state: GameState, action: GameAction,
    flags: Readonly<{ mockAdsEnabled: boolean }>): Transition;
  ```
- **Execution Flow / Logic**:
  1. Initial state title, run null, resumeTo null, countdown/ad0. START only from title/result creates run and countdown3; repeated START during a game does nothing. HOME from non-playing overlays returns initial state. Reject invalid runId/seed with unchanged state, no side effects.
  2. TICK dt must be finite positive <=1/30; controller will pass exactly1/120. Nonactive title/result/paused ignore ticks. Countdown decrements without run time/score; remaining<=1e-9 means0→playing, discard overshoot. Ad uses the same epsilon and counts active foreground ticks only without run progress; cancel only in ad returns result with reward unused.
  3. Playing tick: if previous `abs(angle)>=critical` and protection0, fail immediately before distance gain. Otherwise sample difficulty, process scheduled event, signed controls. Disturbance acceleration = `difficulty.disturbance * (sin(1.7*t+seedPhase)+0.35*sin(3.11*t+seedPhase))`; seedPhase=(seed%6283)/1000. Event force only active phase and signed as warning. Acceleration = instability*sin(angle) - damping*angularVelocity + controlAcceleration*signedInput + disturbance + activeEventForce.
  4. Semi-implicit integration: new angularVelocity from acceleration*dt then new angle from newVelocity*dt. If threshold crossed at protection0, interpolate fraction to crossing angle for distance/time in that final step, switch to result, emit fall once and no later coffee/step effects beyond crossing. Hold critical pose for renderer's visual fall; no 0.4sec grace.
  5. Survivors increment run elapsed/distance with sampled speed*dt, stepIndex+1, protection countdown. On crossing15 set hasCoffee and emit coffee once; schedule first warning elapsed+6. Next physics tick samples increased difficulty continuously.
  6. At event time, create warning1.2 and choose stage-appropriate ID (street coffeeRush/lateCommute; office urgentEdit/bossCall/longMeeting) and seeded direction. Emit eventWarning once. At warning expiry apply active force for0.7, respecting partial tick boundary; remove on expiry and set nextEventAt=elapsed+interval. No two events overlap and protection suppresses new events. All event clocks freeze outside playing.
  7. Footstep every 0.45/(speed/baseSpeed) active seconds (minimum0.18 audio spacing); wobble only at abs(angle)>=critical*0.70 and cooldown elapsed. These effects give atmosphere; never show an extra balance meter. No effect for reaching100.
  8. REQUEST_AD only if result+run exists+flag true+reviveUsed false; enter ad5. At ad0, consume once: reviveUsed true, angle/velocity0, same distance/elapsed/seed/coffee, event null, nextEventAt elapsed+6, protection1.5, enter countdown3, emit revive. Repeated completion ticks or stale callbacks cannot reward again (there is no unconditional external reward action).
  9. During protection, do not fail, suppress event forces and gently stabilize/clamp angle to ±critical*0.5; active distance still progresses. At end normal instant threshold resumes. Explain that this is the selected short protection exception. Difficulty is always computed from current distance, never reset on revive.
  10. PAUSE from playing/countdown/ad sets resumeTo to previous screen; clocks unchanged. RESUME from paused restores screen and clears resumeTo; automatic lifecycle only pauses, never auto-resumes. Input reset is controller's responsibility. All illegal actions no-op.
  11. Pure transition never mutates its input object/flags, calls platform APIs, persists data, or reads ambient time. Return effects only once from an actual transition; the controller owns consumption.
- **Test scenarios**: held left/right and simultaneous cancel; identical seed+fixed-tick input timeline produces identical states; no-input falls; just-below critical survives if velocity away, exact critical fails; boundary crossing distance interpolation; score floor; coffee once; stage51; no100 effect; paused clocks; illegal state actions; ad early cancel no reward; five active seconds; duplicate requests; one revive; same distance and protection; foreground count only; corrupted inputs finite; event warning precedes force and matches direction. Actual30/60/120Hz frame-delivery comparisons belong to T04/T06 after the controller exists; do not import a future controller here.
- Speed-only integration (without balancing) reaches100 at90±0.5sec. Sampling m15/50/100/200/1000 shows monotonic velocity and difficulty above15 and no100/200 ceiling. Do not write a test asserting inexperienced humans must survive90sec.

## Acceptance Criteria
- [x] All approved boundaries and immediate failure hold in pure tests.
- [x] Distance/time freeze whenever not playing; countdown/ad freeze when paused.
- [x] One foreground-completed mock ad gives one protected revive at unchanged distance.
- [x] No100% celebration effect and no presentation/accessibility dependence in physics.
- [x] Curves are documented initial tuning values; speed target validated numerically.

## Validation
- `npm.cmd test -- --runInBand src/game/__tests__` — all rule cases pass.
- `npm.cmd run typecheck` — zero errors.
- `npm.cmd run test:ci` — foundation regressions also pass.
- `git diff --check` — clean.

## Commit Message
```text
feat(game): implement deterministic balance and run rules

Plan: 2026-09-21-close-call-nyang
Phase: P01-game
Task: T02-game-engine

- Add distance-driven difficulty, cafe and office milestones
- Verify instant falls, pauses and one-time mock-ad revival
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- validation: game rules73/73; full Jest85/85 across5suites; typecheck0errors; git diff --check passed.
- regression: a14,000-tick live replay exposed an event-expiry floating point tail; discard remaining substeps <=timerEpsilon to prevent false numeric-failure falls. Long replay beyond100% now passes without weakening physics.
- limitation: controller/rendering/device QA and cross-runtime replay remain future Tasks.
- commit: f09b6d1
