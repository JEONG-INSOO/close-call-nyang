# Task: T01 인형형 냥대리와 빠른 균형 구현

## Status: done

## Goal

사용자가 기존 로컬 웹 주소에서 새 짧은 팔다리와 빠르고 크게 기울어지는 조작을 테스트할 수 있다. UI의 실제 회전과65도 실패 기준을 일치시키며 저장/해금/서버 재생의 안전 경계를 보존한다.

## Decision Summary

- 사용자 확정1: 세 캐릭터 공통 짧고 동그란 팔/발, 통통한 몸, 빠른 흔들림/조작, 좌우65도 초기 튜닝. 의상/표정/색 정체성과 저장은 유지.
- 물리 사본은 생성기로 동기화하며 클라우드는 이번에 변경하지 않는다. 새 public-config 없는 로컬 dist를 재빌드한다. 기존 dirty T03 작업은 보존하고 완료로 처리하지 않는다.

## Implementation

### I01. 공통 SVG 체형과 애니메이션

- Related Files:
  - `src/scene/NyangCharacter.tsx` :: `NYANG_RIG`, `Face`, `Outfit`, `NyangCharacter` — modify
  - `src/scene/__tests__/GameScene.test.tsx` :: `GameScene contracts` — modify
  - `e2e/fixtures/SceneFixtures.tsx`, `e2e/fixtures.spec.ts` — new65도 부근 시각검사/기존포즈 유지; modify
  - `src/scene/types.ts`, `src/scene/svgMotion.ts`, `src/theme/tokens.ts`, `src/characters/catalog.ts` — read-only

#### Details

- **Signatures & Types**: `NyangCharacter({frame,reduceMotion,characterId='rookie'}: SceneProps): React.JSX.Element`; `frame: SharedValue<SceneFrame>`, `reduceMotion:boolean`, optional `characterId:'rookie'|'diligent'|'veteran'`. SceneFrame은 distanceM/elapsedSeconds/angleRad/angularVelocity/protectionSeconds/seed:number, hasCoffee/playing/fallen:boolean이며 변경하지 않는다.
- **Data & Schema Fields**: NYANG_RIG의 첫 목표는 height186/headHeight118/torsoHeight50/legHeight18, pivotX/Y0, legLeftX=-23/legRightX=23, cupX=62/cupY=-39. 머리/표정은 기존좌표에서 아래19 이동하면 기존정체성을 지키며 짧아진 발과 연결된다. 몸통은 약폭90의 둥근 크림 바탕+넓은 재킷/셔츠, 다리는18높이의 둥근 크림 발로 바꾸고 긴 바지와 검은 구두를 제거한다. 의상/얼굴3종 ID 불변. 팔은몸에가까운둥근앞발,컵그립접점도새좌표에맞춘다. 실제 시각 검사 후 같은 목표 내 좌표 미세조정은 이유 기록.
- **Execution Flow / Logic**:
  1. 기존 `(270,425)` 발밑 기준/960x540 캔버스 유지. 공통 실루엣·꼬리 접점·보호 윤곽선까지 새 몸에 맞춘다. 이미지 생성/외부 bitmap 도입 없음.
  2. 두 발은 기존 거리/시간 위상으로 교차하되 짧은 보폭(약회전8도/좌우2/들기3)로 종종 걷는다. paused frame 고정/같은노드수 유지.
  3. root angle은 frame.angleRad 그대로, 실패 후82도 tumble240ms 유지. 모션감소가 실제 물리/판정을 바꾸지 않음. 새 각도에서도 원점 보존/잘림 확인.
  4. frame SharedValue 구독 교체/hasCoffee 가독성,3skinsx커피2x좌우 큰각도 검증. 비동기 Reanimated 갱신 테스트는 실제 스케줄 경계를 기다리되 허용기대값으로완화하지않음.

### I02. 빠른 물리 및 법적 재생 기준

- Related Files:
  - `src/game/balance.ts` :: `BALANCE`, `src/game/difficulty.ts` :: `difficultyAt`; modify
  - `src/game/engine.ts` :: `createRun`, `playingTick`, `tick`; 필요한 관측 문제만 modify
  - `src/game/__tests__/{engine,difficulty,regression,ranked-replay,controller}.test.ts`; 회귀/합법 입력 helper만 modify
  - `src/game/__tests__/balance-feel.test.ts` — new
  - `test-fixtures/ranked-replays.json` :: formatVersion/rulesVersion/cases; regenerate using reviewed legal input
  - `scripts/sync-ranked-engine.mjs` — run, read-only source; generated8files includes src/online/rulesVersion.ts and supabase/functions/_shared/game/*.ts
  - `supabase/functions/_shared/__tests__/proof.test.ts`, `scripts/verify-leaderboard.test.mjs` — hardcoded boundary/ticks only; modify
  - `scripts/generate-ranked-replays.mjs` — optional new reproducible fixture generator, requires explicit --write; no server calls
  - `src/online/__dev__/RankedReplayDiagnostics.tsx`, `src/online/__tests__/replay-diagnostics.test.ts`, `scripts/verify-browser-replay.mjs`, `src/services/preferences.ts` — read-only unless observed fixture coupling; no storage changes

#### Details

- **Signatures & Types**: retain `transition(state:GameState,action:GameAction,flags:Flags):Transition`, `difficultyAt(distanceM:number):Difficulty`. No DTO/schema/private DB migration.
- **Data & Schema Fields**: initial candidate criticalAngleRad=1.134464014 (65deg aligned to1e-9), controlAcceleration9.6, damping2.4; difficulty.instability=4.8+0.9*level, disturbance=0.22+0.16*level. Existing level/speed/event schedule/countdown/fixedDt/numericalquantization unchanged. Before/after same-input numerical comparisons determine if candidate needs bounded refinement; record actual final numbers, not unsupported speed claims.
- **Execution Flow / Logic**:
  1. Compare original/updated response to fixed short input and no input across fixed seeds. New0.2second held-input displacement should exceed old; unassisted same-seed fall earlier despite wider angular allowance. Same held-both = idle trajectory; no immortality.
  2. At±40deg and near60deg withzerooutwardvelocity: not immediately failed; controlled outward motion crosses±critical and clamps/ends exactlyonce. At±50deg+outward.5rad/s, opposite input can recover toward center beforefall.65deg fails immediately; no grace/automatic centering/new menu. Protect same-tick quantization boundary/partialscore correctness.
  3. Keep speedAt unchanged,100%~90seconds,15coffee/51office. Body proportions notphysicsinputs; retain3skinsameoutcome.
  4. Run ranked:sync only afterphysicssettled. Adjust boundary tests relative to BALANCE.criticalAngleRad; preserve rejection/offline semantics. No unconditional snapshot acceptance.
  5. Fixture JSON contains formatVersion1,rulesVersion:string,cases[{name,engineRunId:number,seed:number,spans:{direction:-1|0|1,ticks:positiveinteger}[],expected:{ticks,score,terminal,stateDigest,hasCoffee,eventWarnings}}]. Generate real deterministic legalinputs. Idle/held directions run tofall; office case uses bounded deterministic feedback inputs until>100 thenholdtofall. This is test-only controller, never appautoplay. Check longcase coffee/events/office/score>=100. SHA256 of JSON.stringify finalstate matchesexistingconsumers. CrossruntimeNode/Deno/Chromium allagree; Hermes pending explicitly.

### I03. Integration, evidence, build and handoff

- Related Files:
  - `docs/learning-notes/2026-09-22-plush-cat-and-balance.md` — new self-contained implementation/why/tests/pitfalls note
  - `docs/learning-notes.md`, `docs/art-direction.md`, `docs/qa-report.md` — add latest evidence without discarding previous/uncommittedwork
  - `.memory/current.md`, this Task and parent phase.md/plan — state sync
  - `e2e/*.spec.ts` — only real changed physics assumptions; never soften safety invariants for green tests

#### Details

1. Build normal dist with public ranking vars absent (local-only), then fixture and simulated-online bundles separately. Normal dist never includes fakeAPI/fixture/devdiagnostics. User has local4173 server: do notkill/restart unknown process. Ifneeded use ignored temporary Playwrightconfig reusing onlyverified4173existingapp; avoidpersistentglobalconfigchange. Fullthreeviewport E2E whenavailable; preservefailures.
2. Capture/view actual SVG at neutral,±60deg,terminal for3skins/coffee toggles andphone844x390/667x375; classifyfixtureversusrealplay. Exercise actualbutton/keyboardgamefall/retry, recordwhatwasverified. Do notclaimhumanfunor60fps/Hermeswithoutdeviceevidence.
3. Explain rulehashchanged/client-serverneedsredeploy, oldsupabasecurrenthashremainsold; newcloudvalidationbelongsremainingT03. Preserve existing localdata and dirtyunrelatedfiles. No productiondeploy/GitHubpush.
4. Commit onlythisTask source/tests/newplan/decision/blueprint/evidence; existingpendingT03changes remain uncommitted. If shared docs containolderchanges,stage onlycurrenthunks or keep themuncommittedwithnewselfcontainednoteincommit. AftercompletionreturncurrenttoexistingP02-T03 andmarknewphase/plancomplete withoutmarkingoldTaskdone.

## Acceptance Criteria

- [x] All3skins have shortroundedpaws andcompactarms; cupgrip/pose/footpivot visually verified.
- [x] Faster response measured, exact±65deg failure,40deg recoverywindow, oppositecontrol andheld-both behavior verified; distance/achievementsunchanged.
- [x] Newrulehash/servercopies/3goldens agreeinNode,Deno,Chromium; noignoredmaliciousproof regressions.
- [x] Updated localdist and representative actualbrowserchecks complete; existingstoragekept, screenshotsinspected, limitsdocumented.
- [ ] Learning evidence/commit scoped, originalhostedT03 restoredwithnewruledeploypending.

## Validation

- `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npm.cmd run ranked:check`, `npm.cmd run server:check`, `npm.cmd run test:server-api`, `npm.cmd run test:ranking-tools`, `npm.cmd run ranked:browser`
- `npm.cmd run web:export`, `npm.cmd run fixtures:build`, `npm.cmd run online-fixtures:build`, `npm.cmd run e2e` (ignoredconfigonlyifuser'sserverowns4173)
- `npm.cmd run ranking:env-check -- --allow-unconfigured`, `git diff --check`; viewcapturedPNGandHTTPbuiltJSidentity.

## Commit Message

```text
feat(game): add plush cat proportions and snappier balance

Plan: 2026-09-22-plush-cat-and-balance
Phase: P01-game-feel
Task: T01-plush-and-balance

- Replace long human-like legs with short rounded cat paws
- Tune responsive balance and a visible 65-degree fall boundary
- Synchronize replay rules and verify the updated web build
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending

Final validation: typecheck/server:check, Jest615/41suites, Deno50, tools64, ranked:check/generator--check, Chromium3goldens,3webbuilds,localenvscan,fullE2E28pass/11intentional-skips/0fail/0flaky164.456sec,diffcheck. Exactrules9fc10a2a8fdd4085; local4173distverified. Details/firstfailures/visualevidence/limits in docs/learning-notes/2026-09-22-plush-cat-and-balance.md. No clouddeploy/push/storageclear; phase/current sync follows completion commit.
