# Task: T03 실제 랭킹 서버 연결과 운영 검증

## Status: in_progress

## Goal
사용자의 Supabase 프로젝트에 준비한 API/스키마를 적용하고 실제 두 익명 플레이어로 공유 순위·권한·삭제·실패 복구가 동작하는 것을 확인한다. 운영과 개인정보 변경을 다음 출시 단계에 전달한다.

## Decision Summary
- 온라인 기능은 mock 테스트만으로 완료하지 않는다. 무료 범위로 시작하되 실제 계정 연결은 실행 시 사용자와 진행하며 요금제 결제/상향은 별도 선택이다.
- 현재 계획 단계에서는 외부 프로젝트나 자격증명을 만들지 않는다. 실제 랭킹 QA 완료 후 P03 출시로 이동한다.

## Implementation

### I01. 프로젝트·인증·서버 설정
- Related Files:
  - `supabase/config.toml`, `supabase/migrations/`, `supabase/functions/` :: T01 server — modify only observed issues
  - `.env.example`, `.gitignore` :: public/server env boundary — modify
  - `scripts/verify-leaderboard.mjs` :: hosted smoke runner — new
  - `scripts/inspect-public-env.mjs` :: forbidden secret/config validation — new
  - `package.json` :: ranking:verify, ranking:env-check — modify
  - `docs/leaderboard-operations.md` :: project/config/retention/moderation/recovery — new
  - `docs/qa-report.md`, `docs/learning-notes.md` :: actual evidence — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export interface HostedRankingCheck {
    id: string; status: 'passed' | 'failed' | 'not_run'; checkedAt: string;
    projectRef: string; environment: 'staging' | 'production'; evidence: string;
  }
  // node scripts/verify-leaderboard.mjs --environment staging|production
  // node scripts/inspect-public-env.mjs
  ```
- **Data & Schema Fields**:
  - Project ref/region/public URL/public key are nonsecret operational data. Native/web build variables: EXPO_PUBLIC_SUPABASE_URL,EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. DB password, Supabase access token, server secret/service role key never use EXPO_PUBLIC prefix; never echo/commit. Use actual existing project if appropriately dedicated, no guessing from GitHub username.
  - Default production `JEONG-INSOO/close-call-nyang` web origin is `https://jeong-insoo.github.io`, not including path. Staging additionally allows local origins. Native requests may have no Origin: public GET leaderboard is available without identity under anonymous read limits, protected routes still require a verified JWT. Separate staging/production refs and auth users; tools must show which before any schema write.
  - Supabase Auth anonymous sign-in enabled, normal email/social UI not integrated. Confirm built-in signup request limits; configure supported bot protection if required/available for Expo/web without breaking signup. If CAPTCHA is enabled, implement its actual verified token flow in nickname participation, not a fake token or disabling auth checks. Record service limits and unresolved abuse defenses honestly.
  - Cleanup scheduled SQL daily: active/terminal runs idle>24h, finalized receipts>7days, reports>90days, rate buckets>24h, completed deletion tombstones7days after completed_at and only after the configured JWT maximum lifetime has elapsed. Never clean pending_auth_delete tombstones before completing Auth removal. Keep best scores/profile until user deletion/moderation; don't blanket-delete anonymous users because they are older than a few days. Logs follow actual provider retention, not fictitious zero logging.
- **Execution Flow / Logic**:
  1. Read-only check actual CLI availability/current Supabase deployment docs and authenticated account. Obtain project choice/login at execution. Prepare local code and review schema before requesting missing access. Use Free only if available; stop before any billing action requiring new spending choice.
  2. Validate canonical sync/tests, then link correct staging ref and apply migrations using Supabase CLI. Hosted deploy can use server-side bundling when no Docker; confirm supported `functions deploy --help` flags rather than assume installed option. Apply only intended migrations, not arbitrary database reset. Existing nonempty project requires read-only schema inspection and conflict-safe migration.
  3. Deploy leaderboard-api with server env and app-specific CORS/rate-limit/limits. Gateway optional JWT behavior must allow public GET while handler explicitly verifies all writes with auth.getUser. If gateway config disables built-in verify_jwt for public access, it does **not** disable handler validation; test every write route without/with wrong JWT.
  4. Run staging tests including generated legal replay fixtures, negative ownership attempts, simultaneous calls and delete cleanup. The runner must pace legal chunks against the actual challenge issued_at and elapsed wall-clock budget, including the3sec countdown; immediately uploading precomputed future ticks would correctly fail the anti-speed check. Use short interruptible waits and report progress for long fixtures. Tests use dedicated temporary guest users created by this test and delete only their own profile via the normal API after success/failure. Never enumerate/delete other users or change real records to manufacture evidence.
  5. Apply proven migration/server to actual production project, set actual public build vars in ignored local env and record nonsecret operational values. CI workflow/eas.json do not exist yet: hand off their actual variable injection to P03-T01/T02 rather than create those files here. Production smoke creates disposable guest profiles with known names, posts a valid time-paced legal input proof to the real verifier (no bypass flag/test-score endpoint), reads rankings and deletes those exact profiles. Record sanitized request IDs/outcomes without tokens. Require explicit --environment target to prevent confusion.
  6. `ranking:env-check` checks built public config has HTTPS URL and publishable key type, no known server env names/secret assignments in public config/dist, production mockAds disabled. Never print secret match values. Text scan is supplemental to architectural key separation, not proof that arbitrary secrets are impossible.
  7. Free service currently has quotas/inactivity pausing; document monitoring/restoration/export backup procedure, not paid SLA or infinite availability. Local gameplay and error UI must stay usable if API paused or quota exceeded. No paid upgrade/keepalive abuse to evade service limits.

### I02. Real permission/replay/ranking verification and handoff
- Related Files:
  - `scripts/verify-leaderboard.mjs` :: actual REST/anonymous Auth tests — new
  - `docs/leaderboard-operations.md` :: admin procedures and privacy inventory — new
  - `docs/qa-report.md` :: cloud cases/cross-runtime hashes — modify
  - `src/online/`, `supabase/` :: fix observed integration issues — targeted modify
#### Details
- **Execution Flow / Logic**:
  1. Two fresh anonymous sessions A/B may choose same nickname. A cannot change B's name/run or best via direct REST/RPC; unauth and public key alone cannot write. Wrong JWT/signature, tampered userId, guessed UUID and CORS bypass fail appropriately. Check service-only RPC grants against actual deployed DB, not just mocked repository.
  2. Submit legal replay with server seed, verify accepted integer score and best. Tampered score field rejected/ignored by strict schema; same last chunk retry no duplicate, same seq changed input fails, wrong owner/expired/version/after-fall data rejected. Duplicate finalize and concurrently finishing valid runs preserve max and earliest equal-score time.
  3. Check ties rank(1,1,3) and top100/me using staging fixtures seeded via controlled migration/test role if generating101 completed runs is impractical; label fixture-based rank test separately from full end-to-end real playback. Production test never inserts synthetic points via admin role.
  4. Verify browser interaction on real staging API and a separate native/Expo Go session if available; full production iPhone check remains P03-T03. In this Task backend semantics must pass independent of native availability; record Hermes fixture result pending if phone unavailable and carry explicit P03 requirement. Compare Node/Deno/browser numeric golden hashes now.
  5. Disconnect during playing: same local outcome, bounded pending badge; reconnect flush and finalize; offline-start never backfills; corrupted queue/stale challenge/user delete does not attach to new run. Simulated network tests supplement actual network call evidence.
  6. Rename preserves score, report stored with rate limit, hide removes row only for blocker, banned row omitted consistently from ranks. Delete removes public record and Auth guest user, retry after lost response yields safe settled state. Session reset doesn't auto-recreate profile. Manual admin moderation steps identify exact target publicID and audit action/time, never embed admin credentials in app.
  7. Privacy inventory to P03: public nickname/score, private guest ID/session, server-issued run state/digest/receipt, short-lived proof handling, reports, provider request logs. Separate purposes/retention/deletion/support. Supabase operator identity/region and service disclosure use actual values. App Store “no data collected” must be reevaluated, not copied from old offline plan.
  8. If account/project/permission missing, keep task pending with exact missing prerequisite and prepared files. Hosted failure cannot be replaced by mocked passing report. Once actual checks pass, use phase/current protocol to advance P03.

## Acceptance Criteria
- [ ] Actual target Supabase environment deployed with verified policies, anonymous identity and strict ownership.
- [ ] Valid replay produces public ranking, malicious/direct score writes fail, retry/finalize is idempotent.
- [ ] Duplicate nickname/edit/delete/report, shared rank and offline behavior verified with evidence.
- [ ] Server keys stay server-side and free service/retention/admin operations are documented.
- [ ] P03 receives explicit privacy and native verification requirements.

## Validation
- `npm.cmd run ranked:check` / `npm.cmd run test:ranking` / `npm.cmd run server:check` — existing checks pass.
- `npx.cmd supabase --version` / `npx.cmd supabase functions deploy --help` — verify supported CLI/remote bundling.
- `npx.cmd supabase login` only when required, then `npx.cmd supabase projects list` — actual allowed account/project.
- Read actual ref from protected local config, then `npx.cmd supabase link --project-ref $nyangProjectRef`, `npx.cmd supabase db push`, `npx.cmd supabase functions deploy leaderboard-api --project-ref $nyangProjectRef` with verified remote-bundling flag if needed — intended migration/deployment success. Never use db reset against hosted data.
- `npm.cmd run ranking:verify -- --environment staging` and later `--environment production` — define script `node scripts/verify-leaderboard.mjs`; real success including scoped cleanup, no server secret logged.
- `npm.cmd run ranking:env-check` / `npm.cmd run typecheck` / `npm.cmd run test:ci` / `npm.cmd run web:export` / `npm.cmd run e2e` — matching config/client integration pass.
- `git diff --check` — clean. Known golden fixture digest compared across Node/browser/Deno; Hermes pending only until P03-T03.

## Commit Message
```text
feat(ranking): verify hosted leaderboard and guest data lifecycle

Plan: 2026-09-21-close-call-nyang
Phase: P02-leaderboard
Task: T03-hosted-verification

- Deploy and verify actual profile, ranking and protected score endpoints
- Document service limits, privacy changes and moderation operations
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
- external prerequisites: 사용자 선택1로 기존 프로젝트 재사용 승인. 실제 조직 Free/Owner/슬롯과 빈 DB 확인 후 nyang-staging(tadokcpealpwjfyjovuy) 재사용·nyang-production(fgojrxmpxpzdiwsktjsx) 생성 완료. 모두 서울/Free. staging만 서버 배포·부분 검증; production은 생성만 완료. 로그인/가입/프로젝트 선택을 다시 요청하지 않는다. 유료 전환은 승인하지 않음.

## Hosted Progress (2026-09-22, partial)

- staging migration202609210001/Edge 배포 완료. 실제 CASE 구문 오류는 최초 실패 트랜잭션 롤백 확인 뒤 괄호로 수정해 적용했다. 빈 DELETE 스트림을 실제 gateway가 전달하는 문제는 bounded 읽기 검증으로 수정·재배포했다. 인증을 완화하지 않았다.
- 익명Auth 활성/ES256/JWT3600초/가입30회·시간 확인. CAPTCHA는 기존 false 유지, 봇방지 완료로 주장하지 않는다. 서버 salt는 Secrets에만 저장, production DB 암호는 Windows Credential Manager 전용 항목에만 저장. 앱 env는 공개 URL/publishable key만 포함하고 Git 제외.
- 실제 카탈로그6테이블/12RPC/8helper, 역할별 SQL 거부96개, HTTP smoke14개(REST 비노출/RPC42501·정상 proof·중복·개명·신고·삭제 포함) 통과. 별도 staging101fixture에서1,1,3/top100/me101 통과·롤백. 최종 Auth/프로필/점수/판/신고0, 삭제 완료표식4만 의도적으로 보관. 전체 Task 통과가 아니다.
- 로컬 typecheck/ranked/server 통과, ranking184/Deno50/tools64/SQLstatic22/Chromium골든3 통과. Jest 최초583중1개 애니메이션 실패 → 단독33통과 → 변경 없는 전체 재실행583통과. 실패 원인은 확정하지 않고 QA에 보존한다.
- 미검증: 다른 판 최고값·동점/만료·운영자 변경 경쟁, Gateway/한도, 정리cron/백업, 실제 설정 웹/오프라인 복구, production 롤아웃·smoke, iPhone/Hermes. Acceptance/Progress 체크박스와 완료 커밋·다음 포인터는 그대로 미완료. 상세 증거는 운영/QA/학습노트 참조.

## Preparation Evidence (2026-09-22, not completion)

- `scripts/verify-leaderboard.mjs`와15개 모의 회귀, `scripts/inspect-public-env.mjs`와45개 회귀를 준비했다. package 명령, 공개 대상 메타데이터 예시, CLI 임시파일 제외, 운영/개발/QA/학습 노트를 추가했다. 앱/서버 원본·물리는 변경하지 않았다.
- 전체60도구검사, Jest582(40 suites)/ranking184, typecheck/ranked:check/server:check, Deno45, Node/Deno/Chromium 공통3골든 통과. 기존 production dist local-only 정적 검사 통과; 실제 URL/key 빌드 및 새 전체 E2E는 미실행.
- CLI2.117.0에서 `--use-api`, `db push --dry-run --skip-vault` 확인. `projects list`는 LegacyPlatformAuthRequiredError로 중단됐다. 후속 답변에서 계정 없음으로 정정됐으므로 가입 후 로컬 `npx.cmd --yes supabase@2.117.0 login`을 진행한다. 토큰을 채팅에 받지 않는다.
- 설정 없는 hosted runner exit2/not_run과 기본 env 검사 exit1로 안전 차단됨. 생성/배포/호스팅 검사를 실제 실행하지 않았으며 관리자 키/실제 공개 설정도 만들지 않았다.
- runner는 명시적 환경/ref/상대ref/쓰기 플래그, 정상시간 proof 제출, 생성한 사용자만 정상 DELETE, 모의/실제 구분과 항상 taskComplete=false를 유지한다. 별도 읽기 전용 리뷰에서 새 차단 결함 없음. 상세 증거는 docs/qa-report.md와 docs/learning-notes.md 참고.
- 실제 DB/RLS/직접 RPC·공동순위101명·다른 판 최고값 경쟁·만료/운영/실제 웹/기기는 여전히 미검증이다. legacy/new server key·Gateway forwarded 신뢰·JWT 최대 수명/cron은 실제 환경 확인 후 필요한 변경만 수행한다.
- Acceptance/Progress는 미완료로 유지한다. 현재 변경은 완료 커밋/푸시하지 않았으며 P03으로 전진하지 않는다.
- 후속 명시 요청으로 표시 제목만 우당탕탕 냥대리로 변경한다. [제목·계정 정정](../../../decisions/2026-09-22-title-and-account-correction.md)의 결정을 따른다. 기술 식별자/게임 규칙/실제 검증 완료 여부는 바꾸지 않는다.
- 제목 변경 검증: 관련 단위48개/4 suites, typecheck, 새 web export, 새 dist의 저장·공유 Chromium9개(39.0초), local-only env scan 통과. 실제 서버 작업은 가입부터 대기하며 현재 T03 미완료를 유지한다.

## Login Check Follow-up (2026-09-22)

- 가입 대기는 해소됐다. 실제 CLI2.117.0 `projects list`/`orgs list` 성공: org oxbvynubycrowcazoqzx(Jeong Insoo), 기본 이름 프로젝트 tadokcpealpwjfyjovuy, 서울 ap-northeast-2, ACTIVE_HEALTHY, linked=false. 이 조회는 Auth 게스트/API/DB 동작 검증이 아니다.
- CLI의 조직 하위 명령은 `orgs`다. `organizations list`는 UnknownSubcommand로 실패했고 실제 help 확인 후 `orgs list`를 사용했다. 목록만으로 요금제/슬롯/프로젝트 용도/빈 DB 여부를 확정하지 않는다.
- 기존 프로젝트를 냥대리용 staging으로 사용해도 되는지 한 가지 질문을 보냈다. 답변 전 기존 프로젝트 이름 변경/연결/마이그레이션/생성은 하지 않는다. 실제 조직 plan과 무료 제한을 다음 읽기 전용 점검에서 확인한다.
- 현재는 메모리/운영 기록만 갱신했으며 구현/호스팅 테스트를 새로 통과했다고 주장하지 않는다. 외부 데이터 쓰기/키 조회/생성/배포/과금/푸시는 수행하지 않았다.
