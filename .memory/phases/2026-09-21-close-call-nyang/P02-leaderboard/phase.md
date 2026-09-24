# Phase: P02 Leaderboard

## Goal
닉네임 중복을 허용하는 가입 화면 없는 기기별 플레이어와 iOS/웹 공통 온라인 순위표를 구현한다. 서버 검증 최고 기록·상위30·내 순위·프로필 변경/삭제 및 장애 복구를 확인한다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 데이터 모델·권한·API·서버 재생 구현/로컬 검증 완료 (`0f3e52d`); 실제 DB 검증은 T03 | [T01](./T01-ranking-backend.md) |
| T02 | `done` | 익명 세션·닉네임/순위 UI·입력 제출·오프라인 대응 완료 (`ae82e14`); 모의 API/실제 Chromium 검증 | [T02](./T02-ranking-client.md) |
| T03 | `done` | hosted 권한/재생·자동재전송·보관·복구·인계 완료 (`4a56230`) | [T03](./T03-hosted-verification.md) |

## Progress
- FINAL2026-09-25: done3/3, completion commit4a56230. FullJest659/Deno50/tools67/SQL27/Chromium34pass11intentional-skip0fail/3goldens; hosted evidence mapped in docs/ranking-release-handoff.md. Resume deferred Pages plan P01-T02, original P03 native/privacy/Store acceptance still separate. Older pending checkpoints below are historical.
- Latest2026-09-25: real synthetic Auth/game backup+isolatedrestore+refresh identity+realhandler replay/delete verified. Dynamic fetchedAt comparison mistake documented; localfollowup5passed, source/local users+game0, allowncontainers stopped. Docker moved to D:, other15containers preserved. Fullscope in docs/backup-recovery.md. T03 final evidence review/handoff and completion commit pending; in_progress.
- Latest2026-09-25: isolated recovery setup paused BEFORE downloads: C: only~2.45GiB free and Docker VHDX on C:. D:~999GB free; relocation affects other projects and awaits user choice.15 stopped unrelated containers preserved, no cleanup/pull/restore. T03 in_progress.
- Latest: existing per-user Docker installation found after user correction, launched hidden, Linux engine29.7.2 reachable. Installation/defer question resolved; no reinstall. No local Supabase/data restore yet. Next isolated stack setup; T03 in_progress.
- Latest: staging backup dependency/aggregate preflight passed14:39UTC; schema27tests passed. Full Auth recovery still needs isolated Supabase; Docker unavailable, user installation/defer choice pending. Runbook prepared; no new users/remote writes. T03 in_progress.
- Latest: production cleanup job1 installed, JWT3600 verified; scheduled run1 succeeded2026-09-24 14:34UTC. Final active daily03:15UTC/12:15KST restored; completed tombstones2 kept, Auth/profile/best/run/pending0. Schema25/ranking186/typecheck/ranked/server checks passed. Production cron gap resolved; full data/Auth recovery/final handoff remain. T03 in_progress/no completion commit.
- Latest: Usage screenshot received; displayed Free billing cycle below quota (DB5%, Edge437/500000, egress0.002/5GB). User evidence with cropped org/date scope, not performance testing. Screenshot wait resolved. Production retention and data/Auth recovery remain; T03 in_progress.
- 2026-09-24 latest operations: staging private/public schema-only backup restored into disposable local PG18;6tables/6RLS/12service RPCs and anon/authenticated denial passed; cluster stopped. Full data/Auth restore NOT verified. Production pg_cron absent (new launch gap), staging daily cron intact. Both remote DBs ~12MB/Auth0/player0. Native pg_dump18.6 found outside PATH. User will send Usage screenshot next chat; keep T03 in_progress.
- Latest: production hosted smoke14pass/0fail with both guest deletions confirmed; production build/env/local assets passed. Staging Chromium no-click offline recovery now passed (2012ms, matching score0, queue cleared) with UI/API deletion and Auth403 confirmed, cleanupRequired0. Ranking186, typecheck/ranked/server checks passed. GitHub Pages404/public variablesempty. T03 remains in_progress pending Usage/backup-restore and remaining operational evidence; no completion commit.
- Latest production checkpoint: user identified Dashboard as staging while CLI/smoke targeted production, then reports saving app settings to production. ACTIVE v1 / verify_jwt=false confirmed; first smoke failed at PUBLIC_BOARD with503 before signup. Verify production anonymous Auth and retry smoke. T03 remains in_progress; no completion commit.
- 2026-09-24 10:14 UTC: lifecycle SQL fixture now actually passed on staging via CLI --linked/--project-ref/--file. All assertion/rollback/GUC flags true; independent pre/post Auth/players/bests/runs counts zero. Supersedes earlier pending-user-execution note. This is SQL semantics verification, not concurrent-session testing. T03 remains in_progress.
- done: 3/3 (active: none; T03 source `4a56230`)
- next phase: [P03 release](../P03-release/phase.md)
- validation: T02 Jest582/40suites(ranking184/UI21), typecheck/ranked check, web server14, Expo dependency check, 3web builds, browser28pass11skip0fail166.207sec. Production fixture/diagnostic absence confirmed. T01 Deno45/SQL static21/runtime golden3 are historical. Actual hosted RLS/transactions/Auth/limits/cleanup and Hermes remain pending.
- T03 local validation: tools60/Jest582/ranking184/Deno45/Chromium golden3 +typecheck/ranked/server check passed; existing dist local-only scan passed. No new web build/E2E/SQL execution. Read-only independent tool/operations review found no new blocker.
- external prerequisites: 선택1 승인 후 실제 Free/빈 DB 확인, nyang-staging 재사용·nyang-production 생성 완료. staging만 migration/API 배포·카탈로그/실제HTTP14/역할별SQL96/101명fixture 통과. fixture롤백/4명smoke게스트삭제 확인, production 미배포. 과금 변경·푸시 없음, T03 미완료 유지.
- latest local validation: Deno50/tools64/SQLstatic22/ranking184/Chromium골든3/typecheck/ranked/server 통과. 전체 Jest 첫1실패(커피 opacity)→단독33통과→전체583/583 재통과; 간헐 실패 기록 유지. 실제 설정 웹·cron·경쟁·Gateway·production/Hermes는 다음 검증.
- 2026-09-24 hosted delta: `--verify-cross-run-concurrency` staging pass: two users' legal 101m replays paced and finalized concurrently, tie/order correct, lower later score preserved best + `achievedAt`; both temporary users deleted. `test:ranking-tools` 66/66 + `git diff --check` pass. Remaining T03: expiry/moderation races, Gateway/provider limits, actual cron scheduled run, backup/restore, live browser recovery; production and iPhone/Hermes remain out of scope until prerequisites.
- 2026-09-24 prepared staging lifecycle SQL fixture for hidden/banned board filtering/write denial and expired run rejection, with strict staging/owner/trigger guards and one transaction rollback. Schema static checks 23/23 pass; SQL Editor/Postgres run is pending user execution, so hosted lifecycle remains unverified.

## 2026-09-24 · Staging lifecycle and start-rate checks

T03 lifecycle SQL fixture was executed on staging and passed. Gateway `verify_jwt=false` was confirmed read-only. The application start limiter also passed real staging requests: 30 starts allowed, 31st returned 429 + `Retry-After`. Tool regression tests 67/67; post-test Auth/game rows were zero (37 recent limiter buckets are expected). These results are limited to their stated evidence. Provider/IP-hop limits, an actual scheduled cron run, backup restore, and hosted offline recovery remain; phase/T03 stays incomplete and production is untouched.

## 2026-09-24 · Cron/Gateway/browser follow-up (T03 still in progress)

Staging cron accelerated run succeeded (runid 1) and original daily schedule restored. Gateway IP limiter hardened from XFF to `cf-connecting-ip`, deployed v5, and actual 60/61 request test passed. Browser actual-staging API proof confirms offline local-only start is never backfilled, and pending ranking can be sent by explicit retry. Final DB check caught a cleanup failure in browser automation: exact test identities and counts are in T03 blueprint/ops/QA; owner Dashboard cleanup remains. Usage/Free backup (no Docker/pg_dump) and automatic retry without manual click remain unverified. No production change or task commit.

Follow-up local checks passed: ranked-session retry unit tests 28/28, ranking tools 67/67, Deno check and diff-check. Supabase CLI project-list recheck stalled without output; Dashboard automation runtime still unavailable, so these checks did not refresh remote account/data state. T03 is blocked on owner cleanup of the six staging test identities and fresh read-only aggregate; no pointer advance.

Next-session check: public staging leaderboard GET also failed before an HTTP response due to network `TypeError`. Operations docs now include a copy-ready exact-ID SELECT query; this is documentation/preparation only, not hosted cleanup evidence. User action remains required before new staging writes or T03 completion.

2026-09-24 continued local validation: Jest 44/44 suites and 659/659 tests, typecheck, ranked canonical sync, tools 67/67, and Deno check passed. Node and PowerShell attempts to read the public staging board failed before HTTP response. Official Free backup docs were incorporated; real provider usage, full backup/restore, cleanup and production smoke remain open. No commit.

Connectivity diagnosis: staging DNS resolves, but TCP 443 to the resolved host is unreachable from this environment; Dashboard CUA cannot start either. This confirms why hosted reads cannot proceed here and is not an application failure signal.

User's own PowerShell successfully ran staging smoke report `3eefa6e3-4769-4abd-af45-e3b6f2b72de4`: 14 pass, 0 fail, 8 manual/not_run, only this run's two guests cleaned. This shows remote tools are available from their PC. Prior six browser-test accounts still need exact-ID read-only count evidence; then finish staging-only manual items and proceed to production. T03 stays open.

Cleanup resolution (user-reported): user confirmed the Dashboard ref was `tadokcpealpwjfyjovuy`, deleted the six documented IDs by UUID, and says the follow-up SQL query returned zero. Production config-only preflight passed for `fgojrxmpxpzdiwsktjsx` and stopped before any hosted request because `--allow-test-writes` was intentionally absent. Docker/pg_dump unavailable; Usage, backup/restore, live automatic retry, and production rollout/smoke remain. T03 stays in progress; no commit.

Production migration dry-run from the user lists exactly the initial leaderboard schema and Top-30 migrations. Source review found no DROP/TRUNCATE; the cleanup function is defined but not run during migration application. Local pre-deploy checks pass: schema23/23, ranked:check, server:check, production env static scan, diff-check. Production migration apply/API configuration/smoke remain pending; no commit.

User says production `supabase db push` finished. The visible message only contains the final status, not the two applied version rows; next read-only confirmation should query production `supabase_migrations.schema_migrations` for `202609210001` and `202609230002`. Do not mark production schema independently verified until that result arrives. No function deployment yet.

Production migration history confirmed by user query: versions `202609210001` and `202609230002` are present. Next read-only production catalog audit must confirm objects/RLS/grants before Edge Function configuration/deployment. No production API smoke yet.

Production read-only catalog audit from attachment passes the expected structure: 6/6 private tables exist with RLS and no policies/direct grants; 12 RPCs exist and only service_role can execute; 8 helpers are inaccessible to callers/service_role and use empty search_path; only rank_cleanup is SECURITY DEFINER among helpers; no PUBLIC schema grant or unexpected private/ranking objects. Next verify the live board function is the Top-30 version, then production Auth/function configuration and smoke. T03 remains in progress.

User ran the exact-ID cleanup count query. Result: Auth6, players5, best_scores1, runs1, related_reports0, pending_deletions0, completed_tombstones0. The earlier six synthetic browser-test accounts remain; pending=0 does not indicate deletion. Next owner action: delete only the six IDs listed in `docs/leaderboard-operations.md` via staging Dashboard Authentication > Users, then rerun the read-only query. Do not run more write smoke tests or commit/advance T03 before zero lingering rows and remaining acceptance evidence.
