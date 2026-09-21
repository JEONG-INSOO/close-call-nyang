# Task: T03 실제 랭킹 서버 연결과 운영 검증

## Status: pending

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
- external prerequisites: Supabase 계정/프로젝트·실제 배포 권한; 유료 전환은 이번 계획이 승인하지 않음
