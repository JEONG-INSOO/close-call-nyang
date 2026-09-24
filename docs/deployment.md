# GitHub Pages 배포 준비

## 대상

- GitHub 저장소: `JEONG-INSOO/close-call-nyang`
- 공개 주소: `https://jeong-insoo.github.io/close-call-nyang/`
- GitHub Actions workflow: `.github/workflows/deploy-pages.yml`
- Expo 웹 base path: `/close-call-nyang/`

## Actions 동작

`main`으로 들어오는 PR은 타입 검사, 단위/ranking 테스트, 로컬 전용 웹 export, export 검사, 브라우저 검사를 수행합니다. PR에는 `pages:write`나 `id-token:write` 권한이 없습니다.

`main` push 및 `workflow_dispatch`는 production 공개 설정을 검증한 뒤 웹을 export합니다. `ranked:check`, `typecheck`, 전체 Jest, ranking 테스트, `ranking:env-check`, Playwright 중 하나라도 실패하면 Pages artifact를 배포하지 않습니다. 배포 job은 build 성공과 main branch를 요구합니다. artifact에는 `dist/`만 들어가며 `output/`의 QA fixture는 올리지 않습니다.

## 공개 변수

GitHub 저장소 Settings → Secrets and variables → Actions → Variables에서 다음 repository variables를 설정합니다.

- `EXPO_PUBLIC_SUPABASE_URL`: 현재 승인 production project의 `https://fgojrxmpxpzdiwsktjsx.supabase.co`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 해당 프로젝트의 `sb_publishable_...` 공개 키

이 값들은 웹 JavaScript에 포함되므로 공개 데이터로 취급합니다. service role/secret key, DB password, JWT signing secret, access token, `RANKING_RATE_LIMIT_SALT`는 Variables·웹 bundle·Git에 넣지 않습니다. Workflow는 승인된 production URL과 publishable key 형식만 허용하며 staging URL로 배포할 수 없습니다.

## 현재 prerequisite

2026-09-24 최신 상태: production migration/catalog/Top-30와 API v1 배포 확인 후 실제 hosted smoke14개가 통과했고 테스트 계정 두 개의 삭제도 확인했습니다. 보고서는 `output/ranking-production-14c82633-59f9-42b2-87d4-f82a739f651b.json`입니다. 별도 폴더 `output/nyang-production-preflight-20260924`에 운영용 공개 설정을 넣은 웹을 export하여 공개 설정 검사10개와 로컬 HTTP index/base path/JS1개/asset17개를 통과했습니다. 기존 `dist`와 서버는 유지했습니다.

최신 GitHub 읽기 전용 조회에서도 공개 저장소/main은 확인되지만 Pages API는404이며 repository variables는 빈 배열입니다. 따라서 위 두 공개 변수 설정과 Pages Source=GitHub Actions가 다음 배포 준비입니다. T03의 실제 브라우저 자동 재전송·Usage·백업/복구 등 남은 운영 검증을 마무리하고 배포 단계에서 진행합니다. 아래 원격 점검 문장은 당시 상태를 보존한 과거 기록입니다.

2026-09-24 원격 점검: GitHub CLI는 `JEONG-INSOO`로 인증되어 있고 저장소는 공개, 기본 브랜치는 `main`입니다. GitHub Pages API는 404(사이트 미설정), production 공개 repository variables는 아직 없습니다. 최신 workflow run `35820751694`은 export 다음 `Configure Pages` 단계에서 실패했고 upload/deploy는 실행되지 않았습니다. 앞선 Supabase preflight에서 production ref `fgojrxmpxpzdiwsktjsx`에 적용된 leaderboard migration과 Edge Function이 없음을 확인했습니다. 따라서 현재는 Pages deploy를 재시도하지 않습니다.

## 결과 해석

- 로컬 `web:export` 성공은 공개 배포를 뜻하지 않습니다.
- Actions workflow 실행/빌드 성공은 deploy job 성공과 구분합니다.
- Deploy 성공은 공개 URL의 HTTP 200 및 브라우저 동작 검증과 구분합니다.
- `ranking:env-check`는 알려진 패턴을 텍스트 파일에서 검사합니다. 임의로 인코딩/분할된 값이나 모든 바이너리 내용을 검사하지 않으며, 런타임 연결·권한을 증명하지 않습니다.
- Mock API가 포함된 `output/online-web`은 테스트 전용이며 Pages에 업로드하지 않습니다.
