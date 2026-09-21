# Task: T06 통합 검증과 웹 조작감 점검

## Status: pending

## Goal
완성된 게임을 실제 production 웹 산출물로 실행해 입력·화면·시간·저장·광고 차단 회귀를 확인하고, 측정 결과와 실기기 미검증 항목을 구분해 기록한다.

## Decision Summary
- 테스트/타입/웹 빌드가 배포 기준. P02에서는 온라인 리더보드를 추가·검증하고, iPhone Expo Go 및 배포 앱 검증은 P03-T03에서 수행한다.
- 물리 초기값을 플레이로 조정할 수 있지만 15/51/100 경계, 즉시 실패, 100까지90초, 상한 없는 증가, 게이지 없음 규칙은 고정한다.

## Implementation

### I01. Production browser harness and regressions
- Related Files:
  - `playwright.config.ts` :: webE2E — new
  - `scripts/serve-web.mjs` :: local static server — new
  - `scripts/export-web.mjs` :: cross-platform production export wrapper — new
  - `e2e/game.spec.ts`, `e2e/layout.spec.ts`, `e2e/storage.spec.ts` :: browser verification — new
  - `package.json`, `package-lock.json` :: e2e/script/deps — modify
  - `app.config.ts` :: conditional web base path — modify if not already configured
  - `src/game/__tests__/regression.test.ts` :: cross-rate/state regressions — new
  - `src/game/balance.ts`, `difficulty.ts` :: measured tuning — modify only when evidence requires
  - `src/components/`, `src/screens/`, `src/input/`, `src/scene/`, `src/services/` :: discovered in-scope behavior fixes — modify targeted files only
#### Details
- **Signatures & Types**:
  ```typescript
  // CLI contract for scripts/serve-web.mjs
  // node scripts/serve-web.mjs --port 4173 --base /close-call-nyang
  // serves dist under explicit base; exits nonzero on invalid/missing dist
  export interface QaCase {
    id: string; surface: 'unit' | 'browser' | 'expo-go' | 'testflight';
    result: 'pass' | 'fail' | 'not-run'; evidence: string; checkedAt: string | null;
  }
  ```
- **Data & Schema Fields**:
  - Playwright dev dependency @playwright/test; scripts `e2e: playwright test`, `web:serve: node scripts/serve-web.mjs --port 4173 --base /close-call-nyang`. Tests use production dist, baseURL http://127.0.0.1:4173/close-call-nyang/.
  - `web:export` script becomes `node scripts/export-web.mjs`. The wrapper resolves Expo CLI with createRequire(import.meta.url).resolve('expo/bin/cli'), runs it through process.execPath with `export --platform web`, inherited stdio, and child env `{...process.env,GITHUB_PAGES:'true'}`; forwards nonzero exit/status. Do not use shell:true. `app.config.ts` adds experiments.baseUrl `/close-call-nyang` only when process.env.GITHUB_PAGES==='true'; otherwise leaves baseUrl unset for Expo Go/native/dev. P02 preserves this contract during ranking integration; P03-T01 consumes it for Pages deployment.
  - Server normalizes requested path within explicit `dist` absolute directory, strips base only for matching prefix, decodes safely, sets proper MIME types for JS/CSS/wasm/WAV/fonts/SVG, and404 for nonexistent paths. No unbounded directory browse/path traversal or returning index.html for missing assets. Root landing redirect to base optional; support/privacy paths later must serve real files.
  - Playwright desktop1280x720 plus landscape phone844x390 touch context and small667x375. Production assertions test absence of mock text/button even if export environment EXPO_PUBLIC_ENABLE_MOCK_AD=true. No dev cheats or skip physical failure in exported app.
- **Execution Flow / Logic**:
  1. Export production web then start local test server bound127.0.0.1, verify resource status not just HTTP200 HTML. CI can install browser runtime explicitly; local network/install failures use standard approval flow, not silent mock substitution.
  2. Real browser flow: title/start user gesture; countdown; held right causes visible lean/fall; retry; hold opposite controls simultaneously via supported touch/pointer sequence; keys A/ArrowLeft release individually; pause/resume/blur; resize portrait→gate→landscape, still paused. Capture console/pageerror/resource failures and fail on app errors, exempt known harmless browser unsupported haptics only with reason.
  3. Settings open/toggle/reload restores; result best stored; corrupted storage doesn't crash; clipboard rejection shows manual copy dialog. Browser test may insert invalid localStorage prefs (not simulated success state). Seed/engine behavior can be injected in unit tests only.
  4. Rule tests replay same input at30/60/120Hz through controller and compare same simulated-step states, ensure tabs inactive never award ad/time, malicious production ad request rejected, footsteps bounded/no100 cue, deterministic1000m fixture finite, event warning precedes force. Use whole-flow invariant assertions, not duplicating every formula's source.
  5. Collect visuals from genuine rendered web play at title/initial street, leaning/fall/result and settings. Later distance scenes may use isolated **test fixture render** for art QA but label those images as fixtures, never actual App Store iOS screenshots. No automated player giving impossible100 survival just for release evidence.
  6. Inspect at least0,15,50~51,100 scene fixtures for café/cup/door/office; measure UI safe area/canvas controls. Browser DevTools/performance evidence for prolonged play/listener count if tools available. Do not claim60fps on iPhone from desktop; target smooth60fps and report actual tested device later.
  7. Tune instability, damping, control, disturbance to easy start and increased challenge after15. Preserve critical angle0.70 initially; if changed for playability record rationale/test boundary in both constants and blueprint/notes. Preserve 90±0.5sec speed integration and monotonic growth. Do not reintroduce fall grace/gauge/100 effects or lower revive difficulty.
  8. If an unrelated starter defect is found, report outside scope without changing it. Within-game failures are fixed then relevant tests rerun. Tests passing cannot mark phone tests pass.

### I02. QA evidence and learning checkpoint
- Related Files:
  - `docs/qa-report.md` :: test matrix/commands/results/limitations — new
  - `docs/learning-notes.md` :: integration/tuning findings — modify
  - `docs/development.md` :: repeatable verification commands — modify
  - `.gitignore` :: browser test artifacts — modify
#### Details
- QA report records date, OS/browser/version, viewport, actual commands and exit/results, screenshots paths when available, fixture labels, failures and fixes, remaining native checks. No invented test results or “all platforms” claims.
- Learning checkpoint explains fixed simulated time vs real elapsed time, JS controller/Reanimated rendering split, production flags vs environment-only controls, test fakes vs real device behavior, original audio generation. Reference concise actual code snippets and related commits rather than full diffs.
- Character collection QA: verify0/1/9/10 thresholds, one run200%=one award, ten distinct attempts, no duplicate on pause/result/retry, hydrate/write failure, saved selection, locked selection rejection and same physical outcome for rookie/diligent/veteran in unit/component tests. Browser production test covers defaultrookie, opening/closing collection and legitimate persistence; for already-unlocked state use isolated test-fixture component render clearly labeled synthetic, never a production unlock cheat or fake gameplay evidence. Inspect all3 original faces at actual phone-size game scale with/withoutcoffee and angles±0.55; short legs, tail and cup must remain distinct. No extra100 popups/sounds/haptics and no auto-equip.
- Unexecuted iPhone checks explicitly `not-run`: Expo Go version/account, landscape/native safe areas, true multi-touch, interruptions, silent mode/audio, haptics, native sharing/storage, long-play framerate, production ad absence, screenshot captures. They are required in P03, not waived.
- Record local result as P01 complete only after code/unit/browser criteria pass. App has not been published; GitHub remote/user push and Apple build remain pending.

## Acceptance Criteria
- [ ] Full unit/screen/type checks and actual production browser tests pass.
- [ ] Subpath resources/controls/rendering work without page errors at target viewports.
- [ ] Release flag cannot enable mock ads even with misleading env input.
- [ ] Game rules/90sec curve hold after any documented tuning.
- [ ] QA and learning records distinguish evidence from pending iPhone/release work.

## Validation
- `npm.cmd run typecheck` — zero errors.
- `npm.cmd run test:ci` — complete meaningful suite passes.
- `npm.cmd run web:export` — production assets built for documented base path.
- `npx.cmd playwright install chromium` — browser installed if absent; not rerun unnecessarily.
- `npm.cmd run e2e` — actual browser tests pass, no resource errors.
- `npx.cmd expo install --check` — dependencies remain SDK compatible.
- `git diff --check` — clean.

## Commit Message
```text
test(game): verify production web flows and balance regressions

Plan: 2026-09-21-close-call-nyang
Phase: P01-game
Task: T06-quality-pass

- Exercise real exported web controls, persistence and production ad guards
- Record tuning evidence and remaining iPhone validation separately
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
