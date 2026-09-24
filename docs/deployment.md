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

production Supabase 프로젝트는 만들어졌지만 leaderboard migration/API와 hosted 검증은 아직 적용·완료되지 않았습니다. 따라서 공개 variables를 등록하고 workflow를 통과시켜도 실제 온라인 랭킹 서비스가 준비됐다는 뜻은 아닙니다. Production backend 준비, GitHub Pages의 Source=GitHub Actions 설정, 유효한 GitHub 인증을 확인하고 배포 Task에서 별도로 진행해야 합니다.

현재 GitHub CLI credential은 무효 상태였습니다. 다시 인증할 때는 PowerShell에서 `gh auth login -h github.com -p https -w`를 실행하고, 브라우저에서 표시된 일회용 코드를 입력합니다. 토큰이나 일회용 코드는 채팅에 보내지 않습니다.

## 결과 해석

- 로컬 `web:export` 성공은 공개 배포를 뜻하지 않습니다.
- Actions workflow 실행/빌드 성공은 deploy job 성공과 구분합니다.
- Deploy 성공은 공개 URL의 HTTP 200 및 브라우저 동작 검증과 구분합니다.
- `ranking:env-check`는 알려진 패턴을 텍스트 파일에서 검사합니다. 임의로 인코딩/분할된 값이나 모든 바이너리 내용을 검사하지 않으며, 런타임 연결·권한을 증명하지 않습니다.
- Mock API가 포함된 `output/online-web`은 테스트 전용이며 Pages에 업로드하지 않습니다.
