# Task: T01 Pages workflow와 공개 설정 gate

## Status: done

## Goal

GitHub Pages workflow가 검증 완료된 production 웹 산출물만 배포하도록 보강하고, 공개 환경 변수만 사용하며 검사 실패 시 deploy job이 실행되지 않는 구조를 만든다.

## Decision Summary

- 기존 `.github/workflows/deploy-pages.yml` 및 Expo `web:export` 하위 경로 `/close-call-nyang/`를 유지한다.
- 공개 설정은 GitHub Actions repository variables의 `EXPO_PUBLIC_SUPABASE_URL`과 `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 사용한다. staging 설정과 server secrets는 workflow에 연결하지 않는다.
- `dist` 빌드 산출물은 로컬 검증 후 Pages artifact로만 업로드한다. `output/online-web` 합성 fixture는 배포 금지다.

## Implementation

### I01. Pages CI gate

- Related Files:
  - `.github/workflows/deploy-pages.yml` :: `build`/`deploy` jobs — build 검증 및 배포 의존성; modify
  - `package.json` :: 기존 script names — 정확한 command 확인; read-only
  - `scripts/export-web.mjs` :: Expo production export wrapper; read-only
  - `scripts/inspect-public-env.mjs` :: 공개 설정/번들 검사; read-only
  - `playwright.config.ts` :: 실제 dist 대상 E2E server; read-only
- Details:
  1. Build job에서 Node 24와 lockfile 기반 `npm ci`를 사용한다.
  2. 순서대로 `npm run ranked:check`, `npm run typecheck`, `npm run test:ci`, `npm run test:ranking`, production 공개 변수 주입, `npm run web:export`, `npm run ranking:env-check`, Playwright 검증을 수행한다. repository variable가 없거나 URL/ref 정책 위반, non-publishable key, 검사 실패가 발생하면 job을 실패시킨다.
  3. workflow PR 검사는 실서비스 쓰기 smoke를 실행하지 않는다. `ranking:verify --allow-test-writes`는 workflow에 넣지 않는다.
  4. fixture 번들/가짜 `.invalid` endpoint는 export 또는 artifact 경로에 복사하지 않는다.
  5. deploy job은 build 성공에 의존하고 `main` push 또는 `workflow_dispatch`에서만 실행하며 `pages: write`, `id-token: write`, `github-pages` environment를 유지한다.
  6. `EXPO_PUBLIC_*` 값은 public JS에 포함됨을 문서화하고, secret/service-role/DB password/JWT signing secret/rate salt가 GitHub Variables나 bundle에 들어가지 않게 한다. 공개 변수 이름이라도 key 값은 publishable 형식만 허용한다.

### I02. 로컬 workflow/config validation

- Related Files:
  - `.github/workflows/deploy-pages.yml` — trigger, job dependency, permissions 검증; modify
  - `docs/deployment.md` — GitHub Pages Variables/Actions setup과 운영 경계; modify/new if absent
  - `docs/qa-report.md` — 검사 범위 및 실행 결과; modify
  - `docs/learning-notes.md` — CI gate와 공개 환경변수 학습; modify
- Details:
  - Workflow 정적 검토에서 pull request 경로는 검사만 수행하고 공개 배포 권한을 받지 않는지 확인한다.
  - production 변수는 실제 production Supabase가 준비된 뒤 연결하며, 그 전에 임시로 staging 값을 설정하거나 공개하지 않는다.
  - `ranking:env-check`는 텍스트 산출물만 검사하며 binary 전체의 비밀 부재나 runtime 연결을 증명하지 않는 한계를 기록한다.

## Acceptance Criteria

- [x] 배포 workflow가 필요한 자동 검증을 실행하고 모두 성공해야만 deploy로 진행한다.
- [x] 배포 대상은 production 설정으로 생성한 `dist`이며 staging/mock fixture가 포함되지 않는다.
- [x] PR 경로는 공개 배포 권한이 없고 production deploy는 main 조건으로 제한된다.
- [x] Git diff와 문서에 공개 설정/서버 비밀 경계가 명확하다.
- [ ] T02 이전에는 실제 Pages 공개 배포를 완료했다고 기록하지 않는다.

## Validation

- `npm.cmd run typecheck` — TypeScript 통과.
- `npm.cmd run test:ci` — 전체 Jest 통과.
- `npm.cmd run test:ranking` — ranking client/replay 통과.
- `npm.cmd run ranked:check` — 앱/서버 canonical rules 동기화.
- production public config로 `npm.cmd run web:export` 후 `npm.cmd run ranking:env-check -- --env-file <production-env-file>` — 공개 URL/key 일치 및 알려진 secret marker 부재.
- `npm.cmd run e2e` — 지정된 Chromium project 전체. 각 Playwright test와 runner exit code를 함께 기록한다.
- Workflow YAML 구조와 branch/trigger/permissions/job dependency를 수동 점검하고 `git diff --check`를 실행한다.

## Commit Message

```text
ci(pages): gate deployment on production web checks

Plan: 2026-09-24-pages-hosted-web
Phase: P01-pages-release
Task: T01-pages-workflow-gate
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: ci(pages): gate deployment on production web checks
