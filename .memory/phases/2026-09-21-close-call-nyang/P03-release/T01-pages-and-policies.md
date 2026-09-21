# Task: T01 Pages 배포 구성과 공개 문서

## Status: pending

## Goal
온라인 순위표가 통합된 게임을 `/close-call-nyang/` 하위 경로에서 검증하고, 올바른 공개 백엔드 설정과 검사가 통과한 산출물만 GitHub Pages로 배포하는 구성 및 한국어 지원·개인정보 페이지를 준비한다.

## Decision Summary
- P01의 Expo SDK 57 비-Router 앱과 P02에서 검증한 Supabase 익명 인증/Postgres/Edge Functions 순위표를 사용한다. `web.output: single`, Metro, npm lockfile 유지. GitHub 사용자/저장소는 `mocca/close-call-nyang`; 원격 생성·연결·푸시와 최초 Pages 활성화는 사용자 담당이다.
- 회원가입·로그인 화면 없이 기기별 익명 ID/닉네임·검증 점수를 서버에 저장한다. 분석·광고 추적·광고 SDK·서비스 워커는 추가하지 않는다. 공개 지원 연락처는 추측하지 않으며 미입력 초안은 제출에 사용할 수 없다.

## Implementation

### I01. 하위 경로와 정적 문서

- Related Files:
  - `app.config.ts` :: Expo config `experiments.baseUrl`, `web` — P01의 export 경로 계약; read-only
  - `scripts/export-web.mjs` :: GITHUB_PAGES 환경을 명시하는 기존 production export wrapper; read-only
  - `src/config/app.ts` :: `PUBLIC_WEB_URL`, `getFeatureFlags` — 공개 주소/출시 광고 차단 계약; modify/read-only
  - `public/privacy/index.html`, `public/support/index.html`, `public/site.css`, `public/.nojekyll` — 공개 문서; new
  - `src/screens/TitleScreen.tsx` :: 공개 개인정보·지원 링크; modify
  - `docs/deployment.md` :: Pages 설정·지원 연락처 체크리스트; new
  - `docs/leaderboard-operations.md`, `docs/qa-report.md` :: P02의 실제 endpoint/RLS·보존/운영 근거; read-only
  - `.env.example` :: 기존 P02의 공개 Supabase 변수 예시; read-only/문서 보완
  - `docs/learning-notes.md` :: P03-T01 기록; modify

#### Details
- **Signatures & Types**: 아래는 설정 계약이며 이 단계의 청사진 자체를 앱 코드로 실행하지 않는다.
  ```typescript
  const PUBLIC_WEB_URL: 'https://mocca.github.io/close-call-nyang/';
  function getFeatureFlags(isDev: boolean, enableMockAd: string | undefined): { mockAdsEnabled: boolean };
  type WebExportOptions = { directory: string; basePath: '/close-call-nyang/'; release: boolean };
  type LeaderboardPublicConfig = {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  };
  ```
- **Data & Schema Fields**: P01-T06의 `web:export = node scripts/export-web.mjs`를 재사용한다. wrapper는 `spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web'], { env: { ...process.env, GITHUB_PAGES: 'true' }, stdio: 'inherit' })`와 같은 호출 계약으로 Expo CLI의 exit status를 전달한다. config는 `GITHUB_PAGES === 'true'`일 때만 `experiments.baseUrl=/close-call-nyang`(끝 슬래시 없음), 그 외는 baseUrl 미지정이다. `web.output=single`, `web.bundler=metro`를 유지한다. 공개 문서의 `lang=ko`, UTF-8, viewport, 문서 제목·시행일·게임으로 돌아가기 링크를 명시한다. 시행일은 실제 게시일을 기록한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: P01과 P02가 완료되고 실제 hosted backend의 익명 인증·RLS·서버 입력 리플레이·온라인 순위 통합 증거가 있어야 한다. `npm.cmd run typecheck`, `test:ci`, `web:export`, `e2e`가 성공하는 상태에서 시작한다. 기존 config의 이름 `아슬아슬 냥대리`, slug, 가로 방향, iPhone 설정과 앱 entry를 보존한다.
  2. Core Processing: 기존 export wrapper와 조건부 baseUrl을 사용한다. privacy/support는 Router 화면이 아닌 실제 `index.html` 파일이다. CSS는 `../site.css`, 게임 복귀는 `../`를 사용한다. `/close-call-nyang/privacy/`에서 `../../`는 repo 밖 호스트 루트로 나가므로 쓰지 않는다. 개인정보 문서에 로컬 최고 기록/설정·익명 인증 세션·미전송 proof queue, 서버의 익명 Auth UUID/별도 publicId·닉네임·최고점·run seed/checkpoint/digest/receipt·시각, 일시 처리하는 입력 리플레이, 닉네임 신고, 지원 문의, Supabase/웹 호스팅의 요청·보안 로그를 구별한다. 서버는 원시 입력 전체를 영구 보관하지 않는다. UUID에 연결된 기록을 '어떤 데이터도 수집하지 않음' 또는 재식별 불가능하다고 쓰지 않는다. 목적은 공통 순위·기록 검증·운영이며 분석/광고 추적은 없다.
  3. Error & Exception Handling: 공개 연락처를 아직 받지 못했다면 지원 페이지에 `지원 연락처 등록 전 — 배포 준비 중`을 표시하고 HTML에 `data-release-pending="support-contact"`를 둔다. 가짜 주소를 생성하지 않는다. 문서의 관련 운영자 정보도 미확정이면 같은 속성으로 표시한다. 로컬 준비는 가능하나 제출 전 해소해야 한다는 사실을 deployment 문서에 기록한다.
  4. State Transition & Return: export에 `index.html`, `privacy/index.html`, `support/index.html`, `site.css`, `.nojekyll`이 존재한다. `TitleScreen`의 접근 가능한 하단에 `개인정보처리방침`·`지원` 링크를 넣고 React Native `Linking.openURL(PUBLIC_WEB_URL + 'privacy/')`/support를 사용한다. 기존 링크는 중복하지 않는다. 실패는 짧은 접근 불가 안내로 처리하며 게임을 종료시키지 않는다. 문서에는 앱 내 닉네임 변경·신고·온라인 데이터 삭제 경로, 실제 서버 보존/삭제 정책과 호스팅 지역, 게스트 세션 유실/기기 변경 시 계정 복구 불가, 동일 닉네임이 동일인임을 뜻하지 않는 점을 설명한다. 미확정 보존/운영 정보도 pending 표식으로 명시하고 제출 전 실제 구현과 맞춘다.

- **배포 데이터 흐름**: iOS와 웹은 같은 production Supabase URL/publishable key를 사용해 공통 순위표를 조회한다. 익명 identity는 기기/브라우저별이고 닉네임이 같아도 병합하지 않는다. 공개 순위는 플레이어별 누적 최고 정수 %, 상위 100명과 본인 순위, 동점 공동 순위/안정적 시각 순서다. 오프라인 시작 판은 로컬 기록만 갱신하고 순위에 올리지 않는다. 서버가 만든 seed/run과 입력 리플레이가 통과한 production 판만 등록한다.
- **공개 설정/비밀 경계**: 위 두 `EXPO_PUBLIC_*`는 공개 번들에 들어가는 값이다. URL은 실제 `https://<project>.supabase.co`, key는 publishable 키여야 한다. 서버 secret/service-role key, DB password, JWT signing secret, 플레이어 access/refresh token을 코드·Pages·Git·Expo public env·빌드 로그에 넣지 않는다. service-role 권한은 서버에서만 사용하고 publishable key를 권한 통제 대신 사용하지 않는다.
- **CORS**: 배포 웹 origin은 `https://mocca.github.io`이며 `/close-call-nyang/`가 포함되지 않는다. P02 Edge Functions의 allowlist/OPTIONS가 그 origin을 허용하는지 검증한다. localhost는 테스트 환경에서만 별도로 허용한다. Origin이 없는 native의 공개 GET leaderboard는 identity/JWT 없이 rate limit을 적용해 허용하며, 쓰기는 검증된 JWT/소유권·서버 입력 검증을 필수로 적용한다. 제공된 잘못된 bearer를 공개 요청으로 조용히 낮추지 않는다. CORS를 인증 또는 부정 기록 방지 수단으로 취급하지 않는다.
- **실제 보존·삭제 계약**: 매일 cleanup 기준은 active 및 terminal run 무활동 24시간, finalized receipt 7일, report 90일, rate bucket/단기 salted IP hash 24시간이며 best/profile은 사용자 삭제 또는 운영 moderation까지 보관한다. 완료된 deletion tombstone은 7일 및 Auth 만료 안전 조건을 모두 만족한 뒤 제거하고 `pending_auth_delete`는 Auth 삭제 완료 전 정리하지 않는다. provider 로그는 실제 provider 보존 기간을 설명한다. 앱의 `온라인 프로필과 기록 삭제`는 서버 Auth user까지 삭제 완료된 뒤 로컬 session/profile/queue를 비우고 로컬 최고/설정은 유지한다. 사용자가 닉네임 참여를 다시 고르기 전 자동 재가입하지 않는다. 세션은 native AsyncStorage/browser storage에 저장되며 암호화 저장이라고 주장하지 않는다.

### I02. 실제 export 검증과 배포 workflow

- Related Files:
  - `scripts/verify-web-export.mjs` :: `verifyWebExport(options)` — 산출물 검사; new
  - `package.json` :: `web:verify` — `node scripts/verify-web-export.mjs`; modify
  - `.github/workflows/pages.yml` :: `validate`, `deploy` jobs; new
  - `scripts/serve-web.mjs`, `playwright.config.ts` — P01의 `node scripts/serve-web.mjs --port 4173 --base /close-call-nyang`로 `dist`를 `http://127.0.0.1:4173/close-call-nyang/`에서 서빙; read-only
  - `e2e/pages.spec.ts` :: 정적 문서·리소스 경로 검사; new

#### Details
- **Signatures & Types**:
  ```typescript
  type ExportIssue = { file: string; reason: string };
  function verifyWebExport(options: WebExportOptions): Promise<ExportIssue[]>;
  // CLI: node scripts/verify-web-export.mjs [--release]
  ```
- **Data & Schema Fields**: 기본 directory는 저장소의 `dist`, basePath는 고정 `/close-call-nyang/`, release 기본값 false. `--release`만 공개 문서의 모든 `data-release-pending` 표식 제거와 실제 지원 연락 방법을 필수로 검사한다. 일반 검사는 draft를 경고로 보고하되 누락 파일·잘못된 asset 경로는 실패한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 디렉터리가 실제 `dist`인지 확인하고 필수 파일 및 HTML의 script/link/img 로컬 참조를 검사한다. `/assets/...` 등 repo prefix를 빠뜨린 참조, dist 밖 경로, 존재하지 않는 리소스는 issue로 보고한다. `https:`, `mailto:`, `data:`, fragment는 파일로 취급하지 않는다.
  2. Core Processing: Playwright는 기존 localhost 정적 서버를 통해 export를 열고 게임·privacy·support의 200 응답과 CSS 적용, 게임 복귀, 로컬 리소스 404/콘솔 치명 오류 부재를 검증한다. 서버는 해당 repo prefix 아래의 실제 dist 파일만 서빙하고 없는 asset은 404이며 HTML fallback을 하지 않는다. P01의 실제 플레이 및 production 광고 비노출 검사도 그대로 실행한다. `.nojekyll`은 명시적으로 public에 두어 `_expo` 리소스를 보존한다.
  3. Error & Exception Handling: CLI는 문제별 경로/원인을 출력하고 exit 1, 정상은 exit 0이다. HTML parsing이나 URL decode 오류도 실패로 처리한다. workflow는 `pull_request`, `push`의 main, `workflow_dispatch`에서 검증하되 deploy는 main push 또는 main 수동 실행에서만 허용한다. 테스트 실패 후 이전 공개 사이트를 변경하지 않는다.
  4. State Transition & Return: validate job은 checkout → Node 24 설정/npm cache → `npm ci` → `npm run ranked:check` → `npm run typecheck` → `npm run test:ci` → `npm run test:ranking` → `npm run web:export` → `npm run web:verify` → `npm run ranking:env-check` → `npx playwright install --with-deps chromium` → `npm run e2e` → dist artifact 업로드. production export에는 GitHub repository variables의 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 같은 이름의 env로 주입하고 누락/잘못된 HTTPS URL/secret key를 발견하면 배포를 실패시킨다. P02의 `ranking:env-check`를 재사용하며 별도 중복 key scanner를 구현하지 않는다. PR 자동 테스트는 격리된 모의 API/테스트 설정으로 실행해 실서비스 기록을 생성하지 않으며 실제 hosted 검증과 구별한다. 서버 key를 이 workflow에 전달하지 않는다. `EXPO_PUBLIC_ENABLE_MOCK_AD=false`와 앱의 `__DEV__ && flag === 'true'` 보호 유지. deploy는 `needs: validate`, `pages: write`, `id-token: write`, environment `github-pages`, concurrency group `pages`이며 main만 허용한다. 공식 Actions 구현 시 지원 버전을 고정하고 PR에는 배포 권한을 주지 않는다.
- `docs/deployment.md`에 사용자가 빈 `close-call-nyang` 저장소 생성 → 기존 원격 확인 → 직접 push → Settings/Pages의 Source를 GitHub Actions로 변경하는 절차를 적는다. 비공개 저장소의 Pages 플랜 조건과 인증은 실행 때 실제 계정 기준으로 확인한다. 에이전트가 원격 생성·푸시하지 않는다. URL 공개 확인은 사용자 push 이후 P03-T04의 제출 gate이며, 로컬 T01 완료와 구별한다.
- 동일 문서에 Supabase 계정/프로젝트는 사용자가 실제 실행 단계에 준비하며 무료 플랜의 비활성 프로젝트 일시정지·용량/요청 한도는 당시 대시보드와 공식 문서로 확인한다고 기록한다. 순위 서버 중단/한도 초과 시 로컬 게임은 계속되고 실패 기록을 성공 제출로 표시하지 않는다. 복구 절차·운영자 연락 경로를 쓰되 결제나 유료 전환을 임의 실행하지 않는다.

## Acceptance Criteria
- [ ] export 게임과 두 공개 문서가 repo 하위 경로에서 정상 렌더링되고 리소스 404가 없다.
- [ ] 테스트·타입 검사·빌드·export 검사·E2E 중 하나라도 실패하면 배포 job이 실행되지 않는다.
- [ ] 출시 export에 광고/부활 진입 버튼이 없으며 PWA/분석 SDK를 추가하지 않았다.
- [ ] 공개 backend 설정이 실제 production 프로젝트를 가리키며 서버 비밀이 번들에 없고, 실제 Pages origin의 인증된 요청/CORS 검증 근거가 있다.
- [ ] 개인정보·지원 문서가 익명 ID/닉네임/점수·리플레이/신고/삭제와 게스트 복구 한계를 실제 구현대로 설명한다.
- [ ] 미정 연락처는 초안임이 명확하고 `--release` 검사는 이를 실패시킨다. 공개 배포 성공을 근거 없이 기록하지 않는다.
- [ ] 학습노트에 하위 경로, 정적 문서, CI와 실제 공개의 차이를 기록한다.

## Validation
- 모든 명령의 작업 폴더: `D:\GrillmeEDU`.
- `npm.cmd run typecheck` 및 `npm.cmd run test:ci` — 전체 통과.
- `npm.cmd run web:export` 및 `npm.cmd run web:verify` — 산출물 경로 검사 exit 0.
- `npx.cmd playwright install chromium` 이후 `npm.cmd run e2e` — 로컬 Chromium의 게임/정적 문서/광고 차단 통과.
- `node scripts/verify-web-export.mjs --release` — 실제 연락처가 있으면 통과; 없으면 명시적 pending-contact 실패가 예상 결과이며 T04 차단으로 기록한다.
- `npm.cmd run ranked:check`, `npm.cmd run test:ranking`, `npm.cmd run ranking:env-check` — canonical rules 일치, online 동작 검사, P02 inspector의 공개 설정/서버 비밀 분리 검사. 문자열 스캔만으로 임의 비밀 유출 불가능성을 증명했다고 쓰지 않는다. PR fixture 검증은 실서버 성공 근거가 아니다.
- `git diff --check` — 공백 오류 없음. workflow의 deploy 조건·needs·permissions를 직접 검토한다.

## Commit Message
```text
feat(web): prepare Pages deployment and public policies

Plan: 2026-09-21-close-call-nyang
Phase: P03-release
Task: T01-pages-and-policies

- Validate the production export under the repository base path
- Gate Pages deployment on tests and provide Korean public pages
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Sources
- [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Edge Functions CORS](https://supabase.com/docs/guides/functions/cors)
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
