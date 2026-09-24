# Task: T02 GitHub Pages 배포

## Status: in_progress

## Goal

GitHub repository Pages 설정을 Actions 방식으로 확인하고 main의 검증된 production artifact를 Pages에 공개한다.

## Decision Summary

- 정확한 repo `JEONG-INSOO/close-call-nyang`와 URL `https://jeong-insoo.github.io/close-call-nyang/`만 대상으로 한다.
- T01 완료, production Supabase rollout 준비, 올바른 production repository variables, 유효한 GitHub 인증을 선행 조건으로 한다.
- staging 공개 값, token, server secret, DB password는 workflow 변수/출력에 넣지 않는다.

## Implementation

### I01. Remote readiness and deployment

- Related Files:
  - `.github/workflows/deploy-pages.yml` :: Pages workflow — inspect/run; read-only
  - `docs/deployment.md` :: 실제 Pages source/Variables/Actions 결과; modify
  - `docs/qa-report.md` :: workflow run URL/status 및 공개 결과; modify
- Details:
  1. GitHub CLI 또는 GitHub UI로 repository identity, visibility, Pages source, Actions variables의 이름(값은 출력 금지), workflow run 상태를 확인한다.
  2. 실제 Supabase production backend가 출시 가능한 상태인지 migration, function, Auth/CORS, API smoke와 운영 체크 증거를 확인한다. 아직 준비되지 않으면 deploy를 실행하지 않고 막힌 이유를 기록한다.
  3. production public URL/publishable key variables가 없으면 정확한 variable names와 필요한 형식만 문서화한다. staging 값을 복사하지 않는다.
  4. T01 workflow 검사를 통과한 main revision을 배포한다. workflow_dispatch는 main만 허용한다. 최초 Pages Actions 활성화가 필요하면 repository Settings에서 Source=GitHub Actions인지 확인한다.
  5. GitHub Actions가 성공적으로 공개한 뒤 deployment URL과 commit SHA를 기록한다.

### I02. Learning record

- Related Files:
  - `docs/learning-notes.md` — 배포 요청/승인 흐름, CI deployment 결과, 실패 원인, rollback/재실행; modify
  - `docs/qa-report.md` — 실제 외부 결과; modify
- Details:
  - 성공적인 workflow run과 Pages URL이 실제 확인된 경우에만 `live`로 기록한다. 로컬 export나 workflow trigger는 공개를 뜻하지 않는다.

## Acceptance Criteria

- [ ] repository identity와 Actions Pages source가 확인된다.
- [x] production backend와 공개 변수 준비를 검증했거나, 부족한 prerequisite를 정확하게 기록한다.
- [ ] public deployment는 workflow 성공과 대상 commit SHA로 입증된다.
- [ ] 공개 사이트가 검증되기 전 production-ready로 표시하지 않는다.

## Validation

- `gh auth status` — 유효한 올바른 계정 확인.
- `gh repo view JEONG-INSOO/close-call-nyang --json name,visibility,url,defaultBranchRef` — 대상 확인.
- `gh variable list --repo JEONG-INSOO/close-call-nyang` — 변수 이름만 확인; 공개 값은 출력하지 않는다.
- `gh run list --repo JEONG-INSOO/close-call-nyang --workflow deploy-pages.yml --limit 5` 및 해당 run inspect.
- HTTPS GET `https://jeong-insoo.github.io/close-call-nyang/` — 최종 redirect와 HTTP 200 확인.

## Commit Message

```text
docs(pages): record first hosted deployment

Plan: 2026-09-24-pages-hosted-web
Phase: P01-pages-release
Task: T02-pages-deploy
```

## Progress

- 2026-09-25 read-only preflight: gh authenticated JEONG-INSOO/keyring, correct publicrepo/main. Live remote main adacc499f4a4addf7870fa68e250038ef048bb1d, before memory bookkeeping local5commits ahead including completedbackend4a56230. PagesGET404/unconfigured; repositoryvariables empty. Most recent workflow35820751694 failed at historical adacc499. No push/settings/variable/write/dispatch yet. Await explicit approval to push validated localmain (no force), register only production publicURL/publishablekey, enable Pages Actions and publish. Required variable names/formats already in docs/deployment.md; never send service key.
- Backend prerequisite resolved by4a56230 and docs/ranking-release-handoff.md. Currentdist local-only QA; CI must productionexport after vars set. No public-site success claim. T02 completion commit remains pending actual deployment success/SHA.

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
