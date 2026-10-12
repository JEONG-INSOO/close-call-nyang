# Task: T01 웹 프레임 지연 구분

## Status: done

## Goal
보이는 웹 playing/countdown 화면의 100ms 초과~500ms 이하 지연이 정지창을 열지 않는다.

## Decision Summary
- 렌더 지연과 이탈은 다른 신호. 소리 구현/물리 규칙은 변경하지 않는다.
- default(native)와 ad는 기존 100ms 초과 자동 정지 유지.

## Implementation
### I01. 타이밍 정책 주입
- `src/game/controller.ts` :: createGameController modify. 두 번째 선택 인자 `timing: { isPageVisible?: () => boolean } = {}`; 별도 schema/storage 없음. 한계 `MAX_VISIBLE_FRAME_DELAY_MS = 500`.
- advanceFrame의 delta >100 분기에서 (playing 또는 countdown) && delta<=500 && callback===true면 accumulator=0 후 return. previousTimestamp는 이미 현재값, 입력/상태/효과/틱 변경 없음. 그 밖에는 기존 clearInput/resetClock/PAUSE 유지. 정상 다음 프레임만 적산.
- `src/game/useGameController.ts` :: hook modify. Platform.OS web일 때만 document 존재 && visibilityState==='visible'를 읽는 콜백을 전달. native는 콜백 없이 기존 처리.
- 오류 시 통과를 가정하지 않는다. DOM 없음/visible 아님은 false. game 엔진/서버 복사본/rulesVersion 변경 없음.
### I02. 검증
- `src/game/__tests__/controller.test.ts` :: harness/playing 선택 timing 인자와 테스트. 100.1/250/500 복구, 500.1 긴 중단, hidden, countdown, 수동 정지, 지연시간 무득점/무틱/무효과, 입력 유지, 다음 틱 순수 engine 동일, ads 기존 보호.
- `e2e/game.spec.ts` :: 실제 브라우저 main thread 180ms 막은 뒤 no-overlay/계속 조작, hidden 즉시 pause/visible 돌아와도 수동 resume 요구. 기존 blur/portrait/ad 회귀 함께 실행. iPhone 오디오 실측 아님.
- `docs/learning-notes/2026-10-12-visible-frame-delay.md` 신규 + `docs/learning-notes.md` 링크. 현상/추정/수정/검증/한계 기록.

## Acceptance Criteria
- [x] visible short delay 계속/시간 건너뜀/입력 유지
- [x] hidden/manual/long-gap/native/ad 보호 유지
- [x] 타입/Jest/engine parity/실제 브라우저 검사 통과

## Validation
- `npm.cmd run typecheck`
- `npm.cmd run test:ci`
- `npm.cmd run ranked:check` (8개 일치; 규칙 생성 불필요)
- public env mock=true diagnostics=false Supabase빈값 지정 후 `npm.cmd run web:export -- --output-dir output/public-links-web` (검증 전 생성 완료)
- `npx.cmd playwright test e2e/game.spec.ts --project phone-landscape` with PLAYWRIGHT_WEB_DIR=output/public-links-web. 필요 기존 두 fixture 폴더 사용, 소스 변경 없으면 재생성 불필요.
- `git diff --check`

## 배우는 개념
벽시계 시간과 고정 물리 틱 시간의 차이. 지연된 프레임을 버리면 순간이동/소급 광고 보상을 피할 수 있다. foreground callback을 주입하여 플랫폼 없는 순수 controller 테스트를 유지한다.
## 학습 질문 3개
1. 화면이 보인다는 정보와 프레임 간격이 왜 다른가?
2. 버린 시간을 다음 프레임에 누적하면 무슨 일이 생기는가?
3. 기본 정책과 광고 보호를 테스트로 따로 남기는 이유는?

## Commit Message
```text
fix(web): tolerate brief visible gameplay frame delays

Plan: 2026-10-12-visible-frame-delay
Phase: P01-web
Task: T01-frame-delay
```
## Progress
- [x] 구현 완료
- [x] 검증 통과: Jest725/50 suites, controller37, Chromium phone-landscape7, 타입/parity8/diff-check.
- commit: 783f1ce097dfebd0615de8367570d4cad5689091
