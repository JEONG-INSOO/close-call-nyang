# Task: T01 터치 입력 표시 갱신 최소화
## Status: done
## Goal
좌우 패드의 눌림으로 레이아웃이 변하지 않고, 표시가 같은 물리 snapshot 업데이트로 패드·HUD가 다시 렌더되지 않게 한다.
## Decision Summary
- 사용자선택3: 광고 off 유지. 실제native프레임드랍 원인은 미확정; 코드를 통해 입증 가능한 불필요한 작업부터 제거한다.
- controller/engine/ranking/subscription cadence/SharedValue animation/동시터치/접근성 의미 유지. 새라이브러리/원격쓰기 없음.
## Implementation
### I01. 입력 패드
- Related Files: `src/components/ControlButton.tsx` :: ControlButton — modify; `src/input/__tests__/ControlButton.test.tsx` — modify.
- Signatures & Types: `ControlButtonProps { direction: -1|1; disabled: boolean; onChange(id:string,down:boolean):void }` 유지. export const ControlButton=memo(function ControlButton(props:ControlButtonProps):React.JSX.Element {...}).
- Data & Schema: held Set/ref, captures Map, pressed boolean 기본false 유지; 저장스키마 변경없음.
- Flow: 기본얕은props비교 memo로 동일callback/direction/disabled 렌더 차단. 눌림상태는 색만변경하고 borderWidth2고정. change의 입력콜백 순서·동일touch중복무시·부분해제·장애해제·접근성/webARIA를 그대로 둔다. memo comparator에서 callback을 무시하지 않는다.
### I02. 표시와 물리 snapshot 분리
- Related Files: `src/screens/GameScreen.tsx` :: GameScreen, sameGameScreenPresentation — modify; `src/screens/__tests__/game-screen-rendering.test.tsx` — new.
- Signature: `sameGameScreenPresentation(previous: GameScreenProps, next: GameScreenProps): boolean` exported/testable; 기존 GameScreenProps 유지.
- Compare: frame identity, controller identity, characterId, reduceMotion, snapshot.state.screen, snapshot.score, event optional id/phase/direction만 같은 경우 true. run null/event null 처리. GameScreen이 추후다른필드를읽으면비교도수정. 자체onLayout state변경은memo에도동작.
- Animation: GameScene stays mounted; frame.value updates continue outside React. 비교가 물리 계산이나이벤트판정/랭킹입력을건드리지않는다. 표시용 비교를 엔진snapshot구독에 적용하지 않는다.
- Tests: 동일props부모재렌더100회에서 패드onTouchStart identity유지, 새로운 callback/direction/disabled갱신; 100회 물리값/이벤트remainingSeconds만변한 snapshot에 GameHudmockrender횟수증가0; score/screen/event/character/frame/controller/reduceMotion변경은통과; pause시입력해제/disabled; 누르고손떼기스타일geometry일치; 기존다중터치/웹keyboard전체유지.
### I03. Verification and learning
- Related Files: `e2e/game.spec.ts` — add actualDOM padgeometry assertions toexistingreal touchtest; `docs/learning-notes.md`, `docs/qa-report.md` — append actualresults/limitations.
- First run addedtargetedtests beforefix toobserveexpectedfailures (no fabricated benchmark). Then implement and rerun.
- Export isolated output/touch-performance-web with Expo CLI and process-only EXPO_NO_DOTENV1/GITHUB_PAGEStrue/mockfalse/diagnosticsfalse/backendabsent. Localonly no clouddata. Browser touch test must compare boundingbox +borderWidth +arrowposition before/held/released and existingmultitouch semantics. Use isolatedserverunusedport e.g4186 with dedicated ignored Playwright config ifexisting4173..75serversmustbepreserved; nofixturesneededforthisgame.spec subset.
- RuntimecodechangesrequireeventualnewTestFlightbuild, notwebredeployorEASUpdateclaim. NoactualiPhoneQAavailableinthisTask. ReturnoriginalP03-T03aftercodecommit.
## Acceptance Criteria
- [x] Targeted tests firstfail on oldcode and pass afterfix; stablepadgeometry and redundant Reactrender elimination verified.
- [x] WholeJest/types/ranked:check/browseractualtouch pass; noengine/server/rules/adconfigdiff.
- [x] Learningnote includes limitations and native followup; knownrelease dirtyfiles preserved.
## Validation
- `npm.cmd test -- --runInBand src/input/__tests__/ControlButton.test.tsx src/screens/__tests__/game-screen-rendering.test.tsx`
- `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npm.cmd run ranked:check`, `git -c safe.directory=D:/GrillmeEDU diff --check`
- `npx.cmd expo export --platform web --clear --output-dir output/touch-performance-web` underprocess-onlylocalpublicenv; `npm.cmd run web:verify -- --dist output/touch-performance-web`; `npm.cmd run ranking:env-check -- --dist output/touch-performance-web --allow-unconfigured`.
- `npx.cmd playwright test --config output/touch-performance.playwright.config.cjs` (dedicatedlocal4186/two touchlandscapeviewports/game.spec realtouch test only). BrowserdoesnotmeasureiOSFPS.
## Learning
Concepts: memo props identity, layout vs appearance, animation vs React state, regression vs device performance proof.
Questions: 왜 버튼 두께를 바꾸면 레이아웃 비용이 생기는가? 왜 callback도비교해야하는가? 왜 browser단위검사가iPhone프레임성공의증거가아닌가?
## Commit Message
```text
perf(input): stabilize touch controls and skip redundant presentation renders

Plan: 2026-09-28-touch-performance
Phase: P01-input
Task: T01-touch-rendering

- Preserve input semantics while removing press layout changes
- Verify presentation memoization and touch regressions
```
## Progress
- [x] 구현 완료
- [x] 검증 통과
- Results: targeted16/fullJest672(45suites), types/ranked8, isolated export/static/env8, actual Chromium touch2/exit0, diffcheck passed. Rendering assertions fail on oldcode and pass afterfix. Native FPS remains not_run; not part of local Task acceptance.
- commit: this Task completion commit; hash recorded in parent phase after commit.
