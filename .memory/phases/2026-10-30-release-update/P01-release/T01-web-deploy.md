# Task: T01 공식 웹 게시
## Status: done
## Goal
사용자 승인된 최신 게임을 공식 Pages에서 제공한다.
## Implementation
- .github/workflows/deploy-pages.yml read-only: main push의 build→deploy 성공을 정확한 headSha로 확인. 실패는 로그를 읽고 원인 범위만 수정/검증. 강제push/검사비활성화 금지.
- store/web-update-2026-10-30.json new: sourceCommit:string, workflowRunId:number, build/deploy/publicHtml/publicBundle/support/privacy:string status, rulesVersion:string, nativeUpdated:boolean(false). 민감정보 없음.
- docs/learning-notes/2026-10-30-release-update.md new, docs/learning-notes.md 새 링크만 추가. 현재 dirty 역사메모 stage금지.
- git ls-remote 정상9aa47db 이후 커밋만 main push. source 정확한 CI 완료 후 공개 index의 JS를 받아 resignation/신규rules/닉네임v2/가상광고 opt-in 문자열 확인, support/privacy HTTP200와 기존 committed 내용 해시 확인. GET만 사용.
## Validation
- 선행 Jest738/typecheck/브라우저6pass6skip/staticexport 완료. GitHub CI의 unit/type/browser 및 Pages 배포 완료 확인.
- gh run view RUN --json headSha,status,conclusion,jobs, 공개URL GET.
## Acceptance
- [x] GitHub main과 Pages의 정확한 소스 일치
- [x] 공개 번들/지원·개인정보 정상
## Results
d3b83d2 정상push→41010800526 build/deploy성공. Chromium63pass/15의도적skip. 공개index-371c90ba00881886945c51f32fdf2278.js에서rules/닉네임v2/resignation/DEXCONSULTING확인. support/privacy200/소스SHA256일치. iOS아직미변경.
## Learning
push와 CI build/deploy의 차이, 공개 HTML이 참조하는 JS 해시 확인, 서버 배포와 정적웹 배포의 독립성. 질문: push 성공이 배포 성공인가? 웹만 바꾸면 IPA가 바뀌나? 해시로 무엇을 입증하나?
## Commit Message
```text
docs(release): record verified web update deployment

Plan: 2026-10-30-release-update
Phase: P01-release
Task: T01-web-deploy
```
