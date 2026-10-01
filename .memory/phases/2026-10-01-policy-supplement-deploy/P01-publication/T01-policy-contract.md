# Task: T01 승인 방침 보완 검증·커밋

## Status: done

## Goal
승인한 두 문단/시행일만 바뀌는 소스를 독립적인 계약 검사로 고정하고 Task 전체 로컬 검증 후 범위 한정 커밋한다.

## Decision Summary
- 기존 HTML의 운영자/연락처/삭제·보존/광고 설명/지원 페이지를 유지한다. `store/privacy-approval.json`은 참조하되 T03 승인 전체를 stage하지 않는다.
- 새 계약 JSON은 승인 날짜/출처/정확한 한영 문단만 담으며 계정·토큰·로그 원문은 없다.

## Implementation
### I01. 승인 계약과 재현 검사
- `web-static/privacy/index.html` :: 한영 Providers section/`time` — 승인 두 문단/2026-10-01만 기존 diff 확인; modify.
- `store/policy-supplement-approval.json` :: 독립 게시 계약 — new. `{schemaVersion:1, approvedAt:'2026-10-01', evidenceSource:'user_confirmation', deploymentApproved:true, finalReviewSubmissionApproved:false, policySupplement:{'ko-KR':string,'en-US':string}}`. 두 string은 기존 privacy-approval 원문과 완전일치.
- `scripts/policy-supplement.test.mjs` :: `node:test`/strict assert — new. 승인 schema·각 문단 정확히1회·한영 section 포함·날짜1회·기존 보존7일/90days·삭제/연락처 경계를 검사. `validatePublicPage(html,'privacy')`로 활성 코드/추적·비밀 등 거절. test는 파일 수정 금지.
- `.github/workflows/deploy-pages.yml` :: Public page regression tests 명령에 `scripts/policy-supplement.test.mjs`만 추가; 기존 단계/권한/환경은 유지.
- contract `baselinePrivacySha256:string`은 문단 추가 전 HEAD의 LF 정규화 hash `0be7e56b6b7db7f4a34cd7c17829a309af0f4b0063dd9d1bc9b6ac98507fee98`. 추가 두 문단/날짜만 역변환한 HTML을 이 hash로 대조해 무관한 문구 변경을 막는다.
- `docs/learning-notes/2026-10-01-policy-supplement.md` :: 승인→HTML→export→CI→공식 URL의 상태 분리 — new.
- `docs/learning-notes.md` :: 새 노트 링크만 modify/selective stage; 다른 T03 dirty 문단 제외.
- `.memory/current.md` :: 선행 Plan/Phase/Task 포인터만 modify/selective stage. T03 미완료 기록은 보존/이번 커밋 제외.
### I02. 안전한 빌드/스테이징
1. 테스트 후 `npm.cmd run web:export -- --output-dir output/public-pages-web`로 기존 사용자 dist를 덮어쓰지 않는 isolated export; `node scripts/verify-web.mjs --dist output/public-pages-web` 통과. generated web/fixture는 gitignore 유지, DB/물리 변경 없어 ranked sync 불필요.
2. 정상 network GitHub 읽기 preflight가 sandbox에서 막히면 승인된 elevated 네트워크로 재시도. 토큰 원문 출력 금지.
3. 정확한 소스/새 contract/test/note/선행 memory 파일만 stage. shared current/learning은 HEAD 대비 선행 포인터·링크 hunk만 index 적용, dirty 원본 보존. `git diff --cached --name-only`/`--check` 검사, 아트·debug.log·test·T03 records 제외.
4. 검증 실패는 수정/재검증, broad git restore/reset/delete 금지. T01은 로컬 소스 commit까지 done이지 원격 배포가 아님.

## Acceptance Criteria
- [x] 승인 계약·두 문단·날짜·기존 안전/삭제/보존 경계를 실제 검사했다.
- [x] isolated export의 support/privacy 포함·기존 사용자 dist 보존.
- [x] 학습노트와 Task만 정확히 stage하여 아래 메시지로 소스 commit한다.

## Validation
- `node --test scripts/policy-supplement.test.mjs scripts/verify-web.test.mjs`
- `npm.cmd run test:release`
- `npm.cmd run web:export -- --output-dir output/public-pages-web`
- `node scripts/verify-web.mjs --dist output/public-pages-web`
- `git diff --check` / `git diff --cached --check`

## Learning
- 배울 개념: 승인 문구를 immutable contract로 고정, source/export/public URL의 독립 상태, dirty worktree 선택 stage.
- 디버깅: uncommitted approval에 의존하는 테스트를 CI에 올리면 ENOENT; 별도 최소 계약 파일이 필요. 로컬 env 출력 금지/production 보장은 T02 CI 증거로만.
- 질문3개: export 성공이 배포 성공이 아닌 이유? approval과 처리 로그 원문이 다른 이유? `git add -A`가 이 작업에서 위험한 이유?

## Commit Message
```text
docs(privacy): publish approved provider-log supplement

Plan: 2026-10-01-policy-supplement-deploy
Phase: P01-publication
Task: T01-policy-contract

- Bind bilingual provider-log disclosure to the approved wording.
- Preserve deletion, retention and tracking boundaries with regression tests.
```

## Progress
- Validation: policy/page26/26, release10/10, isolated export/static verification and diff-check passed. Source commit is made below; exact hash is recorded by T02.
- [x] 구현·검증 완료
- commit: f2d9dd1
