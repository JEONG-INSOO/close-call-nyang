# Task: T01 Connected Rookie Gait

## Status: done

## Goal
실제 게임에서 기본 회색 태비가 승인 시트의 왼쪽 위 첫 번째 걷기 포즈처럼 통통하고 한 몸으로 보이며, 걸을 때 그 앞발 내딛기 자세를 좌우로 교대하고 든 발의 젤리만 보인다.

## Decision Summary
- 승인 원본 네 포즈 중 왼쪽 위 첫 번째 걷기 캐릭터의 실루엣/표정/통통한 정장 몸체/들린 발이 최우선. 기존 SVG의 항목 일치만으로 완료 판단하지 않는다.
- rookie 렌더링만 다듬고 보상·물리·규칙은 보존한다.

## Implementation

### I01. 연결된 실루엣과 보행 위상
- Related Files:
  - `src/scene/GreyTabbyParts.tsx` :: GreyTabbyHead/Face/Suit/Arm/Tail — modify proportions and hidden joints
  - `src/scene/NyangCharacter.tsx` :: rookie branch/leg and paw animated props — modify draw order and sole reveal
  - `src/scene/__tests__/GreyTabby.test.tsx` :: gait/connection contracts — modify
  - `src/scene/__tests__/GameScene.test.tsx` :: existing reward and engine display regressions — retain/update exact rookie assumptions only

#### Details
- **Signatures & Types**: `NyangCharacterProps`, `EmployeePose`, `SceneFrame` unchanged. Add pure `soleRevealAt(stride:number,fallen:boolean):number` returning0 grounded, small bounded value while lifted,1 only fallen if useful. No new state/storage fields.
- **Data & Schema Fields**: none. `frame.value.distanceM` remains the only walking phase source in game mode.
- **Execution Flow / Logic**:
  1. Increase rookie torso silhouette from ~104px to ~120px wide and visually connect it to the head; jacket bottom overlaps leg roots. Keep total height/crop compatible.
  2. Reduce eye dominance slightly while preserving bright open eyes and smile. Match warmer softer grey/navy palette of the approved image without gradients or texture.
  3. Render rookie sleeves behind jacket; move shoulder origins inward so jacket covers top seams. Keep paws attached to cuffs with no double outline at wrist. Coffee sleeve also starts behind the jacket edge.
  4. Render legs behind body. Grounded foot has fur top only. Put cream sole and pink pad/beans in one animated group whose opacity is0 for stride<=0 and rises only on positive lifted phase; max game reveal should be partial/subtle, not a full front-facing sole. Fallen pose can reveal soles fully.
  5. Increase rookie-only foot roll/lift just enough for the sole reveal. Reward cats keep old11deg/5unit gait. Sheet walk/run may be more expressive but use same connected parts.
  6. Keep actual root lean/82deg fall, pause freeze, frame replacement subscriptions, coffee state and node count behavior.

### I02. Visual and regression verification
- Related Files:
  - `e2e/fixtures/SceneFixtures.tsx` — add explicit rookie gait phases if existing walk cards insufficient
  - `e2e/fixtures.spec.ts` — assert grounded pads opacity0 and exactly one lifted sole visible in each phase
  - `e2e/layout.spec.ts` — actual picker/game silhouette and bounds
  - `docs/learning-notes/2026-09-22-reference-faithful-gait.md` — new evidence and before/after reasoning
  - `docs/art/grey-tabby-connected-gait-v2.png` — actual SVG browser capture

#### Details
- Test neutral/quarter/three-quarter phases, coffee and ±60/±82. Capture at844×390 and667×375. Inspect body/arm/leg seams and sole timing manually, not only DOM attributes.
- Rebuild dist/fixture/online fixture sequentially and run full Jest/Playwright. Verify rules hash remains `nyang-v1-f7245064c9459310` and4173 bytes match dist.
- Commit only this corrective task; preserve all earlier dirty work and do not deploy/push.

## Acceptance Criteria
- [x] Grounded foot shows no sole; one lifted foot briefly shows a subtle sole, alternating correctly.
- [x] Arms/legs visually overlap under the jacket and no longer read as detached pieces.
- [x] Rookie proportion/mood is recognizably closer to approved first image at actual game scale.
- [x] Rewards, physics, coffee, saves and ranking rules unchanged; full checks pass.

## Validation
- `npm.cmd run typecheck`
- `npm.cmd run test:ci`
- `npm.cmd run ranked:check`
- `node scripts/generate-ranked-replays.mjs --check`
- `npm.cmd run web:export`
- `npm.cmd run fixtures:build`
- `npm.cmd run online-fixtures:build`
- `npm.cmd run e2e -- --config output/plush-playwright.config.ts`
- `npm.cmd run ranking:env-check -- --allow-unconfigured`
- `git diff --check`; actual PNG and4173 identity inspection

## Commit Message
```text
fix(art): connect the rookie silhouette and foot roll

Plan: 2026-09-22-reference-faithful-gait
Phase: P01-art
Task: T01-connected-gait

- Match the approved image with a fuller connected suit silhouette
- Hide paw pads on planted feet and reveal them only while lifted
- Remove detached shoulder and hip seams from the rookie
- Verify gait phases and preserve gameplay rules
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
