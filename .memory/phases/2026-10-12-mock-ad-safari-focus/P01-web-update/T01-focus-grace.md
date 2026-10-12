# Task: T01 Safari 포커스 유예

## Status: done

## Goal
visible blur만 500ms 유예하고 hidden/pagehide는 즉시 정지하며, 게임과 온라인 시작의 판정을 일치시킨다.

## Implementation
- `src/platform/webForeground.ts` new: `WEB_BLUR_GRACE_MS = 500`, `subscribeWebForeground(callback: (foreground:boolean)=>void):()=>void`.
- `src/platform/useAppLifecycle.web.ts` modify: 공유 구독에서 false일 때 최신 ref callback만 실행. native 파일 read-only.
- `src/online/useRankedGame.ts` modify: 웹 foreground effect가 공유 구독 사용. inactive cancelStart 유지, 실제 게임 자동 재개 금지.
- `src/input/__tests__/browserFixture.ts` modify: `hasFocus: jest.Mock<boolean,[]>`, 테스트가 실제 focus 상태를 설정.
- `src/input/__tests__/lifecycle.test.tsx` modify: fake timer 499/500ms, focus 취소, hasFocus만 복귀, 반복 blur 유예 연장 금지, hidden/pagehide 즉시 정지, initial hidden, 최신 callback, cleanup 검사.
- `src/online/__tests__/useRankedGame.test.tsx` modify: 웹의 서버 시작 응답이 짧은 blur로 취소되지 않음, 실제 hidden 취소 회귀.
- `e2e/game.spec.ts` modify: 기존 즉시 blur 기대를 500ms로 변경하고 blur/focus 짧은 이탈에 pause overlay가 안 나타나는 실제 UI 회귀 추가.
- `docs/learning-notes/2026-10-12-safari-focus.md` new, main 노트는 링크 hunk만 추가.

## Details
구독은 nullable timer/마지막 foreground/pagehide 상태를 closure에 보관한다. blur 500ms callback은 hidden 또는 아직 blur 상태이고 `document.hasFocus()`가 false면 publish false. focus는 timer 취소/foreground true이나 게임 hook은 false만 전달하므로 재개되지 않는다. hidden/pagehide는 timer 취소·false 즉시 전달, visible/pageshow는 foreground 복귀. 같은 false 연속 발생은 중복 callback하지 않는다. SSR이면 no-op 구독. 해제 시 timer와 모든 이벤트 제거. 키보드/터치 blur 입력 해제와 controller 긴 프레임 보호는 수정 금지.

## Acceptance Criteria
- [x] Jest28/28·휴대폰 가로 Chromium 실제 UI2/2, typecheck, ranked parity8 통과
- [x] native pause/수동 재개/입력 해제 유지, 실제 iPhone 검증은 별도 pending
- [x] Task 범위 커밋과 학습 기록

## Validation
- `npm.cmd run typecheck`
- `npm.cmd test -- --runInBand src/input/__tests__/lifecycle.test.tsx src/online/__tests__/useRankedGame.test.tsx`
- `npm.cmd run ranked:check`
- 실제 production export + `npx.cmd playwright test e2e/game.spec.ts --project=phone-landscape` (T02에서 새 번들로 통합 검증)
- `git diff --check`

## Learning
blur는 포커스 상실, hidden은 탭 비노출. timer 취소와 cleanup, foreground와 자동 재개를 구분한다. 질문: 499ms/500ms 경계는? hidden을 기다리지 않는 이유는? 화면 재개와 업로드 재시도는 왜 다른가?

## Commit Message
```text
fix(web): debounce transient focus loss without delaying hidden-page pauses

Plan: 2026-10-12-mock-ad-safari-focus
Phase: P01-web-update
Task: T01-focus-grace
```
