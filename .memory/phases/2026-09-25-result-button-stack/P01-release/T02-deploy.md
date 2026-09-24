# Task: T02 공식 사이트 재배포
## Status: pending
## Goal
새 결과 버튼과 랭킹등록완료! 문구를 기존 Pages에 배포.
## Implementation
- .github/workflows/deploy-pages.yml read-only 재사용. gh로 JEONG-INSOO/close-call-nyang identity/Pagesworkflow/vars이름 확인, 원격main변경 확인 후 일반push(강제금지).
- docs/deployment.md, docs/qa-report.md, docs/learning-notes.md — runURL/SHA/성공/실제공개결과 기록.
- CI build/deploy success 후 https://jeong-insoo.github.io/close-call-nyang/ HTTP200 및3viewport 결과버튼 실제브라우저 확인. 새브라우저는 개인쓰기 금지, 토큰/키출력 금지.
- 실패시 실제오류 확인, 검사생략 금지. 기능/원격설정 추가변경 없음.
## Acceptance Criteria
- [ ] 승인된 일반push, exactSHA build/deploy success.
- [ ] 공개HTTP/실제결과화면 검증, native/전체PagesT03와 구별.
## Validation
- gh run view 대상run --json status,conclusion,headSha,jobs
- Playwright remote-origin 결과화면3viewport 및 HTTP/JS200
## Learning
질문: push와deploy의 차이? 실제SHA확인의 이유? 캐시때문에 이전UI가 보이면 무엇을 확인할까?
## Commit Message
```text
docs(pages): record result layout redeployment

Plan: 2026-09-25-result-button-stack
Phase: P01-release
Task: T02-deploy
```
## Progress
- commit: pending
