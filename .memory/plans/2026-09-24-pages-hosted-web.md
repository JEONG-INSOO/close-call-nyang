# Plan: GitHub Pages 웹 배포 및 공개 검증

## Goal

우당탕탕 냥대리를 저장소 하위 경로(`/close-call-nyang/`)로 GitHub Pages에 배포하고, 실제 공개 주소에서 앱과 Supabase 연결을 확인한다. 공개 앱은 production Supabase 설정을 사용하며 Pages/빌드에 서버 비밀값을 포함하지 않는다.

## Decisions and constraints

- 저장소: `JEONG-INSOO/close-call-nyang`; 공개 URL: `https://jeong-insoo.github.io/close-call-nyang/`.
- 기존 `.github/workflows/deploy-pages.yml`를 점검·보강한다. Pages 배포는 검사 성공 뒤 `main`에서만 진행한다.
- production 프로젝트는 준비됐지만 랭킹 migration/API 및 hosted 검증이 완료되지 않았다. staging 값을 공개 배포에 사용하지 않는다.
- 원격 variable/settings 확인은 GitHub 인증이 복구된 뒤 수행한다. 현재 `gh auth status`는 토큰 무효를 보고했으며 API 조회는 네트워크 제한으로 실패했다.
- 실제 공개 배포는 production backend 준비와 비밀 경계 검사 뒤에만 한다. 공개 배포와 App Store 제출은 서로 다른 단계다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Pages workflow·환경 설정·공개 웹 검증 | [P01](../phases/2026-09-24-pages-hosted-web/P01-pages-release/phase.md) |

## Learning outcome

GitHub Actions가 빌드한 산출물을 Pages에 올리는 과정, 공개 환경변수와 서버 비밀의 차이, repository subpath 라우팅, CI 검사와 실제 사이트 확인의 차이를 직접 추적한다.
