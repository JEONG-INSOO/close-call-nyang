# Task: T03 공개 Pages 사이트 검증

## Status: pending

## Goal

실제 Pages production 사이트가 하위 경로 asset, 핵심 게임 흐름, 랭킹 UI/API 접속을 제공하는지 브라우저에서 검증한다.

## Decision Summary

- 공개 브라우저는 `https://jeong-insoo.github.io/close-call-nyang/`와 같은 production origin만 사용한다.
- UI/API에 실제 사용자 쓰기를 만드는 smoke는 staging test guest 또는 별도 명시 승인을 받은 테스트 identity만 사용하며 기존 사용자를 열거/변경하지 않는다.
- 로그인 token, guest UUID, private API 응답, server secret을 로그/스크린샷에 남기지 않는다.

## Implementation

### I01. Live web validation

- Related Files:
  - `e2e/pages.spec.ts` :: 공개 site test — modify/extend if present
  - `docs/qa-report.md` :: Pages deployment regression and live browser findings; modify
  - `docs/learning-notes.md` :: cache/base-path/CORS troubleshooting; modify
- Details:
  - Desktop Chromium, 844x390 touch emulation, 667x375 touch emulation에서 root route와 bundled JS/assets 요청 성공을 확인한다.
  - root document, game start/input/pause/retry, privacy/support routes (if present), console/page errors, asset 404를 살핀다.
  - Network tab/request instrumentation으로 Supabase request origin, CORS, auth/session error state를 확인하되 credentials/body를 보존하지 않는다.
  - 로그인 없이 공개 top-30 read가 표시되는지 확인한다. 개인별 쓰기 smoke는 T02 production backend approval/config와 test identity cleanup 전제 없이는 skip으로 남긴다.
  - CI local Playwright와 public Pages browser QA를 별도 결과로 기록한다. 서버 offline/reconnect는 별도 task에서 실제 네트워크 차단 및 재연결을 실행한다.

## Acceptance Criteria

- [ ] 실제 Pages 하위 경로 document 및 asset이 성공 응답한다.
- [ ] 핵심 브라우저 게임 조작/정지/재도전이 동작한다.
- [ ] 공개 랭킹 read와 사용자 친화적인 backend outage 상태를 관찰한다.
- [ ] 실행하지 않은 authenticated write/offline/reconnect/native 영역은 명시적으로 not_run으로 기록한다.

## Validation

- Chrome headed/manual or Playwright remote-origin script: desktop + two touch viewport smoke; exact URL and deployment SHA recorded.
- `Invoke-WebRequest -Method Get` (or browser navigation) against root and static privacy/support URLs, if present; verify HTTP status and content types.
- Browser console and failed-request list contains no game asset 404 or uncaught app errors; CORS/auth errors reported separately from page availability.

## Commit Message

```text
test(pages): verify hosted production web

Plan: 2026-09-24-pages-hosted-web
Phase: P01-pages-release
Task: T03-pages-live-smoke
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
