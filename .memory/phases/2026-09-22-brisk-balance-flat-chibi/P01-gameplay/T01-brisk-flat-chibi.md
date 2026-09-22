# Task: T01 긴장감과 평면 찌비 냥대리

## Status: done

## Goal

기존4173 로컬 주소에서 더 빠르게 흐르는 배경, 첫3초 이후 능동적 균형 조작, 넥타이와 사원증만 착용한 둥근2등신 맨발 고양이를 직접 플레이할 수 있다.90초 점수 진행과 저장은 그대로다.

## Decision Summary

- 사용자 선택:100%약90초 유지/첫3초 적응 후 긴장·15% 추가상승/넥타이+사원증만. 굵은 일정한 선, 평면 색, 약2등신, 짧은 팔다리·분홍 젤리. 광택/음영/정장 제거.
- 이번 요청은 계획 저장과 구현을 모두 포함한다. 물리/아트/배경은 파일별 병렬 가능하나 하나의Task로 통합 검증한다. 클라우드와 기존 서버T03 완료는 이번 범위가 아니다.

## Implementation

### I01. 결정적인 난이도 변화와 재생

- Related Files:
  - src/game/balance.ts :: BALANCE — modify
  - src/game/difficulty.ts :: difficultyAt, new adaptationAt/balanceDrift helpers — modify
  - src/game/engine.ts :: playingTick, recordMilestones — modify
  - src/game/__tests__/{balance-feel,difficulty,engine,regression,ranked-replay,controller}.test.ts — update verified tuning assumptions
  - src/game/__tests__/brisk-balance.test.ts — new or consolidate balance-feel with explicit comparison
  - scripts/generate-ranked-replays.mjs, test-fixtures/ranked-replays.json — lawful fixtures regenerate
  - scripts/sync-ranked-engine.mjs — run only; generated supabase/functions/_shared/game/*.ts and src/online/rulesVersion.ts
  - supabase/functions/_shared/__tests__/proof.test.ts, src/online/__tests__/replay-diagnostics.test.ts — mathematical boundary assumptions only
  - scripts/verify-leaderboard.test.mjs — old T03 untracked tool; adjust actual held ticks only, keep outside this commit
  - scripts/measure-balance.mjs — optional read-only measurement tool; never app autopilot or network

#### Details

- **Signatures & Types**: transition(state:GameState,action:GameAction,flags:Readonly<{mockAdsEnabled:boolean}>):Transition unchanged. difficultyAt(distanceM:number):Difficulty unchanged. Proposed helpers adaptationAt(elapsedSeconds:number):number in[0,1], balanceDrift(elapsedSeconds:number,seed:number):number bounded[-1,1]. Names can be refined but exact final API documented/tested. Keep six pure modules types/balance/deterministicMath/difficulty/random/engine so all existing kernel loaders remain valid.
- **Data & Schema Fields**: no GameState/RunState/DTO/DB fields added. RunState already has seed/rng/distanceM/elapsedSeconds/angleRad/angularVelocity/protectionSeconds/nextEventAt/stepIndex/nextFootstepAt/lastWobbleAt:number, hasCoffee/reviveUsed:boolean, event:WorkEvent|null. WorkEvent has id/EventId,direction:-1|1,phase:warning|active,remainingSeconds/strength:number. Reuse elapsedSeconds for adaptation; NEVER protectionSeconds.
- **Execution Flow / Logic**:
  1. Fixed1/120 ticks,1e-9 quantization,65deg critical1.134464014,controlAcceleration9.6,baseSpeedMps/speedAt/countdown remain unchanged. First3 active seconds gentle, smoothly ramp to full pressure over3..5seconds. Initial candidate: instability interpolate2.2→7.0 plus distancelevel*.9, disturbance interpolate.18→1.4 plus level*.22, damping2.0. Keep elapsed active time frozen while paused/countdown. Early phase is not immunity and held input can still cause a fall.
  2. Replace the two predictable sine forces with bounded seeded smoothly interpolated noise or bounded seed-varied frequencies in difficulty.ts using existing random/stable math. Prefer deterministic integer hash of seed and sample index with smoothstep interpolation at~.8..1.2sec knots; do not consume run.rng used by events; no Math.random/wall clock/native timers. Combined drift stays bounded and continuous across knots. Input force stays immediate; same seed/inputs replays exactly.
  3. Calculate time pressure at each internal substep. Distance difficulty/speed remains consistent with existing tick math. If a helper uses optional time do not accidentally let Array.map index act as elapsed time. Event flags/error handling/checkpoint clamping remain strict.
  4. After15% only, firstEventDelaySeconds2; eventStrength initial1.6+.5*level, eventIntervalSeconds max(4,6/(1+.2*level)); existing warning1.2sec/active.7sec/nonoverlap unchanged. Do not add unseen precoffee event force. Footstep cadence candidate base.30/min.12 with faster short walk animation; settle final coherent cadence with art/root before sync.
  5. Values above are concrete start candidates, not untested claims. Bounded tuning may adjust full-pressure instability6..8/disturbance.9..1.8/damping1.7..2.4/noise interval.7..1.3 to satisfy evidence. Record final formulas and why. Keep first3gentle/65/90sec/user scope fixed. Avoid forcing outcomes to make tests green.
  6. Compare old9fc10a2a8fdd4085 kernel with new under at least seeds1,42,241,7654,98765. Measure passive/held/both, fixed periodic alternating input, and a bounded feedback controller with a human-like reaction interval (e.g.100ms) separately from full-rate test controller. Report actual survival, corrections/control effort/peak angle; don't infer fun or player survival from bot results. Require same input both=idle, viable recovery±50deg outward.5 at representative post-adaptation seeds, full-rate legal driver100%~90sec and >100, no unavoidable post3 instantaneous defeat. Full-range long-distance difficulty still grows;1000m regression preserved by lawful helper retuning only if necessary.
  7. Update old feel assertions that explicitly test the superseded constant ease, but retain strong-control responsiveness, exact ±critical, partial tick score, no auto-centering, numerical same-tick finalization, challenge/proof/security tests. Test first3/ramp endpoints/continuity/seed variation/boundedness/pause, event timing/nonoverlap, first event at coffee+2+1.2.
  8. Run ranked:sync after final math/cadence; generate-ranked-replays --write only to regenerate real legal inputs, then --check. Golden formatVersion1/rulesVersion/cases[{name,engineRunId,seed,spans:[{direction:-1|0|1,ticks:int}],expected:{ticks,score,terminal,stateDigest,hasCoffee,eventWarnings}}] unchanged. Keep3cases, longcase>=101/coffee/events/office. SHA256(JSON.stringify(finalstate)); Node/Deno/Chromium agree. No cloud deploy.

### I02. 약2등신 평면 고양이와 짧은 걸음

- Related Files:
  - src/scene/NyangCharacter.tsx :: NYANG_RIG, Face, Outfit, NyangCharacter — redesign SVG
  - src/scene/__tests__/GameScene.test.tsx — new visual contracts + retained subscriptions
  - src/screens/CharacterSelectPanel.tsx :: preview only if crop needs adjustment
  - src/screens/__tests__/character-collection.test.tsx — only actual visual assumptions; storage/achievements unchanged
  - src/scene/types.ts, src/characters/catalog.ts, src/services/preferences.ts, src/theme/tokens.ts — read-only

#### Details

- **Signatures & Types**: NyangCharacter({frame,reduceMotion,characterId='rookie'}:SceneProps):React.JSX.Element. frame SharedValue<SceneFrame>; SceneFrame distanceM/elapsedSeconds/angleRad/angularVelocity/protectionSeconds/seed:number, hasCoffee/playing/fallen:boolean unchanged. characterId rookie|diligent|veteran. Keep IDs and0/1/10 completion conditions.
- **Data & Schema Fields**: first rig goal height200/headHeight104/torsoHeight78/legHeight18, feet pivot(0,0), legs±25, cup~(64,-60). Shared round head width~138 and plump bodywidth~104, cream fur/white muzzle-white belly, muted pink pads. Outer warm dark stroke~4.5 uniform, interior~2 minimal. Existing palette can be overridden by local character palette without changing entire game's colors. Exact coordinates may be visually refined within this rig/design goal and recorded.
- **Execution Flow / Logic**:
  1. Completely redraw head and face/body contour, not old head translated with shorter legs. Approx head from-200..-96, rounded body from-100..-18, two18-high round feet. Wide cheeks, simple centered muzzle/nose/mouth, no forehead streak/shadow/sparkle/gradient. Flat single fill faces; no detailed eyelid shading. Distinguish3 expressions (flustered/tired/wry) and tie details without preserving old face coordinates.
  2. Only tie and name badge. No jacket/vest/shirt/pants/shoes/cuffs/sleeves including paths outside Outfit. Keep outfit-* testIDs for accessory groups if useful; face-* and existing root/leg/cup/protection hooks stable. Tail same flat fur/outline style.
  3. Front paws short ovals close to sides; coffee held by a short forward paw, no disconnected cup. Foot soles have recognizable pink central pad+toe beans, exposed more on lifted foot and fallen poses. Geometry/opacity/rotation show the sole; no actual ground physics or frame writes. Inspect both direction turns/cup states and feet clipping.
  4. Faster short walk from distance/time with amplitude~10..12deg/lift4..5 and stride frequency coherently~.30sec step at initial speed; exact smooth phase coefficient may follow matching footstep period. Keep paused frame fixed, SharedValue replacement subscriptions [frame], constant node counts. ReduceMotion does not change true tilt or engine. Root uses actualangle; local82deg tumble240ms unchanged, no visual fake-angle gain.
  5. Test exact new rig/flat body/pads/accessory-only presence, all3 variants, cup, root pivot/±60/terminal±82, animation paused and SharedValue replaced, skin/reducedMotion no physics effect. Check character picker preview crop with real UI, not only fixtures. Existing persisted selections/unlocks untouched.

### I03. 빠른 배경 및 실제 화면 검증

- Related Files:
  - src/scene/layout.ts :: getSceneModel/getScrollOffset/shared pixelsPerMeter — modify
  - src/scene/StreetScene.tsx, OfficeScene.tsx :: parallax/subscriptions/testIDs only as needed
  - src/scene/__tests__/layout.test.ts, GameScene.test.tsx background expectations — update coordinated with art owner
  - e2e/fixtures/SceneFixtures.tsx, e2e/fixtures.spec.ts, e2e/game.spec.ts, e2e/layout.spec.ts — visual speed/pose/picker QA only
  - docs/learning-notes/2026-09-22-brisk-balance-flat-chibi.md — new standalone learning evidence
  - docs/learning-notes.md, docs/art-direction.md, docs/qa-report.md, .memory/current.md — retain previous dirty history, latest additions

#### Details

- **Signatures & Types**: getSceneModel(distanceM:number):SceneModel, getScrollOffset(distanceM:number,parallax:number,tileWidth:number):number, getViewport(width:number,height:number):Viewport unchanged. SceneModel{cafeX,entranceX,officeBlend:number,stage:'street'|'office'}.
- **Data & Schema Fields**: visual PIXELS_PER_METER40→120 first target (3x), exported from scene/layout or scene-only constant for fixtures. Keep sceneryparallax .18/.7/.72/1 initially to preserve depth, 960x540/anchor270,425/tiles unchanged. Existing unused theme.pixelsPerMeter40 remains read-only legacy; do not duplicate it in new code. No speedAt change.
- **Execution Flow / Logic**:
  1. Both storyX and repeated scroll use the same120 visualconstant. Story15 alignedx270, door50.5 alignedx270, street50/office51/blend50..51 unchanged. Number.MAX_VALUE overflow guard and half-open wrapping remain. Distant layer stays slower than near, no camera shake/flashing. First target 3x may be reduced to2.5x if real small-screen inspection shows poor readability, with tests/evidence updated.
  2. Tests cover exact landmark numbers, wraps/huge values, 3x derivative without modulo boundary and pause. Scene existing specs40hardcodes use newconstant explicitly or independent expected120 numbers. Add actual-browser physicalSVG movement measurement with independently expected delta when possible. No production debug setters.
  3. Retain existing42pose fixture cases and add 2 walking states per coffee/skin for pad/step view; neutral must use truly zero phase rather than existing1.37sec label. Use same renderer. Inspect3skins×coffee×±60 andterminal±82; capture actual667/844game andpicker. Mark synthetic vs actual play. No raster/imagegen needed because existing asset is SVG code.
  4. Rebuild dist (local-only), scene fixtures, simulatedonline fixtures sequentially. Verify user's4173 server HTTPmatches currentdist and leave it running. Existing ignored output/plush-playwright.config.ts can reuse only verified4173; other QA servers remain self-owned, no unknownprocesskill. Full3viewport browser run, actualheld input/fall/retry/two-touch/storage/pause/portrait checks. >100ms pause safety must not be weakened. Original localdata not cleared; tests use isolatedbrowser contexts.
  5. Document actual measurements/newhash/failures/fixes/visualreview; distinguish untestedHermes/iPhone/subjectivefun/cloud. Stage only newTask source/tests/newdoc/newplan/decision, not olddirtyT03/shared docs whole. Commit thenphase/currentadvance backoldP02-T03 with fresh rules deploy still pending. No push/deploy.

## Acceptance Criteria

- [x] Three flat 2-head chibi cats wear tie+badge only, no shine/shadow/clothing; pads/coffee/picker/large-angle poses visually checked.
- [x] First3seconds gentle, active pressure after3, strongercoffeeevents;65deg/90sec/recovery/pause/both-cancel/determinism remain; old/new measured with more than idle falls.
- [x] Background visibly3x faster with15/51landmarks aligned; steps coherent; storage/IDs/unlocks intact.
- [x] Source/servercopies/newrule/goldens agree; finaltypes/Jest/Deno/browser/build pass.
- [x] Learning evidence recorded; scopedcommit and phase/current sync in completion workflow; no external deployment or user data loss.

## Validation

- npm.cmd run typecheck
- npm.cmd run test:ci
- npm.cmd run ranked:check
- node scripts/generate-ranked-replays.mjs --check
- npm.cmd run server:check
- npm.cmd run test:server-api
- npm.cmd run test:ranking-tools
- npm.cmd run ranked:browser
- npm.cmd run web:export
- npm.cmd run fixtures:build
- npm.cmd run online-fixtures:build
- npm.cmd run e2e -- --config output/plush-playwright.config.ts (verified4173only; default ifnoexistingserver)
- npm.cmd run ranking:env-check -- --allow-unconfigured
- git diff --check; inspect actualPNG and HTTPbundleidentity

## Commit Message

    feat(game): add brisk balance and flat chibi cats

    Plan: 2026-09-22-brisk-balance-flat-chibi
    Phase: P01-gameplay
    Task: T01-brisk-flat-chibi

    - Add a three-second adaptation curve and seeded balance pressure
    - Speed up scenery while preserving the ninety-second score progression
    - Redraw flat barefoot cats with ties, badges and paw pads
    - Synchronize replay rules and verify local web gameplay

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: this Task's Commit Message / Plan header identifies the scoped implementation commit.

## Completion Evidence

- Final tuning7.6/.9L instability,1.8/.22L drift,damping1.8; smooth seeded .8/1.15sec interpolation; adaptation0..3 gentle,3..5 ramp. Footstep.30/.12. Actual65deg and90sec unchanged.
- Visual120units/m(3x),200/104/78/18 flat rig, tie+badge only;54poses×two screens,36representativePNG+actualphone/picker reviewed. Testcrop480x350 preserves gameplay scale.
- Jest639/42suites,typecheck,Deno check,Deno50,tools64,ranked:check/generator--check,Chromium3goldens,3builds,localenvscan,diffcheck passed. Fullbrowser34pass/11intentional-skips/0fail/0flaky193.261sec.
- Rules `nyang-v1-f7245064c9459310`; localHTTPHTML/JSidentityconfirmed. Original4173server preserved. No push/cloud/data deletion. iPhone/Hermes/human feel remain unverified.
- [Full learning evidence](../../../../docs/learning-notes/2026-09-22-brisk-balance-flat-chibi.md), including original failures and measured policy comparison.
- Return to incomplete originalP02-T03; staging still2093a8b42d416f8a and needs explicit newrules deploy+remaining hosted verification before client rollout.
