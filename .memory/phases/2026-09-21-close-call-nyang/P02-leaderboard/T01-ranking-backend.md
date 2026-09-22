# Task: T01 익명 플레이어와 검증된 기록 API

## Status: done

## Goal
중복 가능한 닉네임·기기별 익명 플레이어·공통 순위표를 위한 스키마와 서버 API를 만들고, 클라이언트가 임의 점수를 직접 쓰지 못하게 검증 경로를 구현한다.

## Decision Summary
- 사용자 확정: 회원가입 화면 없음, iOS/웹 공통 온라인 순위표, 기기별 플레이어, 닉네임 중복 허용. 구현 기본값: 역대 최고 정수 성공률·상위100·내 순위.
- Supabase Auth의 익명 사용자, Postgres, Edge Functions. 여기서는 파일/단위 검증까지 수행하고 실제 계정 연결·DB 정책/배포 검증은 T03에서 한다. 실제 서비스가 검증됐다고 미리 기록하지 않는다.

## Implementation

### I01. 공용 계약 및 데이터 권한
- Related Files:
  - `src/online/contracts.ts` :: API DTO — new
  - `src/online/nickname.ts` :: normalizeNickname/validateNickname — new
  - `supabase/config.toml` :: function configuration — new
  - `supabase/migrations/202609210001_leaderboard.sql` :: tables/grants/RLS/transaction functions — new
  - `supabase/functions/leaderboard-api/index.ts` :: Deno.serve/bootstrap — new
  - `supabase/functions/leaderboard-api/handler.ts` :: createHandler — new
  - `supabase/functions/_shared/` :: auth,validation,repository,rate-limit adapters — new
  - `supabase/deno.json`, `supabase/deno.lock` :: server dependencies — new
  - `src/online/__tests__/backend-contract.test.ts`, `nickname.test.ts` :: contract tests — new
#### Details
- **Signatures & Types**:
  ```typescript
  export interface PlayerProfile { publicId: string; nickname: string; updatedAt: string }
  export interface LeaderboardEntry {
    publicId: string; nickname: string; score: number; rank: number;
    achievedAt: string; isMe: boolean;
  }
  export interface LeaderboardResponse {
    entries: LeaderboardEntry[]; me: LeaderboardEntry | null;
    rulesVersion: string; fetchedAt: string;
  }
  export interface RankedRun {
    runId: string; engineRunId: number; seed: number; rulesVersion: string;
    issuedAt: string; expiresAt: string;
  }
  export interface InputSpan { direction: -1 | 0 | 1; ticks: number }
  export interface ProofChunk { runId: string; seq: number; spans: InputSpan[] }
  export interface ChunkAck {
    acceptedSeq: number; totalTicks: number; terminal: boolean; expiresAt: string;
  }
  export interface SubmitResult {
    runId: string; score: number; bestScore: number; rank: number | null;
    improved: boolean;
  }
  export type ApiErrorCode = 'INVALID_INPUT' | 'UNAUTHORIZED' | 'FORBIDDEN' |
    'RATE_LIMITED' | 'NICKNAME_REJECTED' | 'PROFILE_REQUIRED' | 'EXPIRED' |
    'OUT_OF_ORDER' | 'PROOF_REJECTED' | 'RULES_MISMATCH' | 'NOT_FINISHED' | 'UNAVAILABLE';
  export interface ApiError {
    code: ApiErrorCode; message: string; retryAfterSeconds?: number; expectedSeq?: number;
  }
  export function normalizeNickname(value: string): string;
  export function validateNickname(value: string): { ok: true; value: string } | { ok: false; reason: string };
  export interface ServerDependencies {
    admin: import('@supabase/supabase-js').SupabaseClient;
    allowedOrigins: readonly string[]; rulesVersion: string;
  }
  export function createHandler(deps: ServerDependencies): (request: Request) => Promise<Response>;
  ```
- DTOs have no SDK imports. `ServerDependencies` and `createHandler` belong only to `supabase/functions/leaderboard-api/handler.ts`, using the Deno dependency map for the server SDK. Do not place the server SDK type in `src/online/contracts.ts`: the client SDK is installed in T02, and T01 client typecheck must independently pass.
- **Data & Schema Fields** (all timestamps timestamptz UTC; explicit nulls only where listed):
  - `private.players`: user_id uuid PK references auth.users ON DELETE CASCADE, public_id uuid unique default gen_random_uuid, nickname text NOT NULL, status text active|hidden|banned default active, created_at/updated_at default now(). nickname is NOT unique. Public ID is opaque display reference, never auth.users ID.
  - `private.best_scores`: (user_id uuid FK players ON DELETE CASCADE, rules_version text) composite PK, score bigint>=0, achieved_at default now(), source_run_id uuid. score derives from floor(server.distanceM); JS supported integers must remain safe. No arbitrary game score cap; representability failure is rejected, not NaN.
  - `private.runs`: id uuid PK, user_id FK cascade, engine_run_id int, seed bigint uint32 range, rules_version text, state_json jsonb, accepted_seq int default -1, last_digest text nullable initially, total_ticks bigint default0, status active|terminal|finalized, issued_at/last_accepted_at/expires_at, receipt_json jsonb nullable until finalize. At most one active/terminal run per user through unique partial index. Starting a new run locks the player's row, deletes only that player's existing active/terminal run, then inserts the new run in one transaction; no undefined abandoned status. Client must warn before discarding a pending result. Concurrent starts serialize on that player lock.
  - `private.nickname_reports`: id uuid PK, reporter_user_id FK cascade, target_public_id uuid, reason enum inappropriate|impersonation|other, created_at; unique(reporter_user_id,target_public_id). No user-entered report text needed.
  - `private.deletion_receipts`: user_id uuid PK (no FK), created_at, completed_at nullable until complete, status pending_auth_delete|complete. Set tombstone in same transaction as profile removal, deny profile/run creation for this subject until Auth deletion finishes. Cleanup7days after completed_at and only after the configured JWT maximum lifetime has elapsed, never pending; retain short-lived receipt purpose in privacy inventory. DELETE retries may verify old JWT cryptographic signature/JWKS+subject and return completed receipt without a now-deleted auth user, but no other route bypasses getUser.
  - `private.rate_buckets`: key text PK, window_start timestamptz, count int. Atomic limits: profile edits5/hour/user, run starts30/min/user, chunks120/min/user, reports10/day/user, reads60/min/user or salted short-lived IP hash for unauth reads. Bucket/IP hash retention24h, no raw IP copied to app DB/log. Supabase built-in signup rate limits also apply.
  - Moderation list in `supabase/functions/_shared/nickname-blocklist.ts`: small documented Korean/English reject list; normalize/strip spaces for matching, reject email/URL/control characters via allowed alphabet; operator can hide/ban profile through authenticated server-side operational SQL, not public client action. Reports don't automatically ban someone solely by count.
  - Exposed public schema provides **no direct** client grants to private tables; enable RLS on tables and revoke anon/authenticated access. Security-definer RPCs called only by server service role with fixed search_path and explicit subject. Never grant best score/run writes to client JWT roles. Service key env is server-only.
  - Service-only public RPC names/contracts: `rank_upsert_profile(p_user_id uuid,p_nickname text)`→profile JSON; `rank_get_profile(p_user_id uuid)`→profile|null; `rank_get_board(p_user_id uuid nullable,p_rules_version text)`→board; `rank_start_run(p_user_id uuid,p_rules_version text,p_initial_state jsonb,p_seed bigint,p_engine_run_id int)`→challenge+checkpoint (server handler creates cryptographic seed; DB timestamps/UUID); `rank_get_run(p_user_id uuid,p_run_id uuid)`→private checkpoint; `rank_commit_chunk(p_user_id uuid,p_run_id uuid,p_expected_seq int,p_digest text,p_state jsonb,p_added_ticks int,p_terminal boolean)`→ChunkAck; `rank_finalize_run(p_user_id uuid,p_run_id uuid)`→SubmitResult; `rank_delete_player_data(p_user_id uuid)`→deletion status; `rank_complete_deletion(p_user_id uuid)`→void; `rank_record_report(p_user_id uuid,p_target_public_id uuid,p_reason text)`→void; `rank_limit(p_key text,p_window_seconds int,p_max int)`→allowed boolean/retry seconds. No RPC accepts arbitrary SQL; all bindings parameterized, onlyservice_role EXECUTE, empty/fixed search_path with fully qualified tables. Server-admin auth methods deleteUser/getUser handle Auth lifecycle; no client routes invoke admin SDK.
- **Execution Flow / Logic**:
  1. Nickname normalize NFC, trim, collapse whitespace; count Unicode codepoints2..12; allow composed Hangul, ASCII A-Z/a-z/0-9 and single internal spaces. Apply identical client shape validation and server authoritative moderation. Name changes keep same user/public ID and existing records.
  2. Route base `/functions/v1/leaderboard-api`. GET `/leaderboard?rulesVersion=...` returns top100 rows plus authenticated caller's own entry (or null when no verified record). No public auth UUID, seed, proof, tokens or moderation data. Guests may read without creating identity; verify optional bearer if present. Invalid bearer returns401, not someone else's data.
  3. POST `/profile` body{nickname}, GET `/profile`, DELETE `/profile`, POST `/runs` body{rulesVersion}, POST `/runs/chunks` body ProofChunk, POST `/runs/finalize` body{runId}, POST `/reports` body{targetPublicId,reason} require verified Supabase bearer (`auth.getUser`, not local JWT decode alone). Never accept user_id in client body as ownership evidence.
  4. POST profile upserts current user, returns PlayerProfile; invalid/banned nickname422; duplicate nickname valid. Ranking query uses `rank() over(order by score desc)` only; display order score DESC, achieved_at ASC, public_id ASC. Exactly100 rows max even if a tied group spans cutoff; `me` queried from full same snapshot and shows true rank outside top100. Hidden/banned profiles excluded before rank calculation. Only strictly higher score changes achieved_at; equal replay cannot jump ahead.
  5. DELETE profile removes profile/scores/runs/reports and anonymous Auth user through server admin API; make immediate ranking removal transactional then idempotently retry Auth deletion. Delete reports both by this reporter and targeting this player's public ID. Deny still-valid JWTs for deleted/tombstoned user; final success only when Auth user deleted. Do not silently create a new profile during deletion retry. Client clears tokens after response, local game settings/best retained. Deletion endpoint is scoped solely to caller, never arbitrary target.
  6. GET leaderboard cache30sec **per caller** or split public list+private me; do not cache one caller's isMe/me for another. Rate limits server-side; CORS allow deployed `https://jeong-insoo.github.io` (origin has no repo path), localhost dev only staging. Native requests without Origin are permitted: public GET leaderboard needs no JWT under anonymous read limits, whereas protected routes require verified JWT. CORS is not authentication.
  7. API responses JSON UTF-8 with no raw stack/credentials. Status400 shape errors,401 invalid session,403 owner/banned,409 version/order/not-finished,410 expired,422 proof/name rejected,429 limit+Retry-After,503 transient. Default request cap64KiB; validate Content-Length if present AND streamed byte cap if absent. Strict key/schema validation, finite integers only. No analytics or full JWT/proof logging.

### I02. Server-authoritative chunked input replay
- Related Files:
  - `src/game/deterministicMath.ts` :: stableSin/stableLog1p/quantize — new
  - `src/game/engine.ts`, `difficulty.ts` :: deterministic helpers — modify
  - `scripts/sync-ranked-engine.mjs` :: sync/check canonical kernel — new
  - `supabase/functions/_shared/game/` :: generated shared kernel files — new
  - `src/online/rulesVersion.ts` :: generated RULES_VERSION — new
  - `supabase/functions/_shared/verifyProof.ts` :: verifyChunk — new
  - `supabase/functions/_shared/__tests__/proof.test.ts` :: server Deno tests — new
  - `src/game/__tests__/ranked-replay.test.ts` :: cross-runtime golden fixtures — new
  - `test-fixtures/ranked-replays.json` :: deterministic seeds/inputs/expected digest — new
  - `package.json` :: ranked:sync/ranked:check/test:ranking/server:check — modify
  - `docs/learning-notes.md` :: backend/data/trust boundary — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export function stableSin(value: number): number;
  export function stableLog1p(value: number): number;
  export function quantize(value: number): number;
  export function verifyChunk(checkpoint: GameState, spans: readonly InputSpan[]): {
    state: GameState; ticks: number; terminal: boolean;
  };
  ```
- Existing canonical game kernel: `src/game/{types,balance,difficulty,random,engine}.ts`; createInitialState and transition(state,action,{mockAdsEnabled:false}). RunState includes id numeric, seed/rng, distanceM, elapsedSeconds, angleRad/angularVelocity,hasCoffee,reviveUsed,protectionSeconds,event,nextEventAt,stepIndex,nextFootstepAt,lastWobbleAt. Stage/score15/51/100,1/120 tick, critical0.70,90sec100 remain unchanged. API UUID runId is distinct from numeric engineRunId returned by server.
- Exact deterministic numeric rule: avoid runtime Math.sin/Math.log for authoritative physics. stableSin reduces to[-pi,pi] using fixed literal pi and arithmetic, evaluates odd Taylor terms through degree17 with explicit multiply/divide, error target<3e-8. stableLog1p for x>=0 reduces y=1+x by powers of2 into[1,2), uses20 odd terms of z=(y-1)/(y+1), result2*sum+k*0.6931471805599453. quantize round(value*1e9)/1e9 normalizes negative zero. Quantize angle,angularVelocity,distanceM,elapsedSeconds after each playing tick; timer boundary handling retains existing1e-9epsilon. Use no transcendental alternatives hidden in gameplay code. Verify same golden digest in Node/browser/Deno; Hermes real-device check in P03. These tiny numeric changes must preserve game tests and90±0.5sec target.
- Sync script copies only enumerated canonical pure modules+deterministicMath into server shared folder, rewrites local module extensions to.ts for Deno, verifies no React/platform imports. Compute SHA256 over ordered canonical filenames+LF content and embed `RULES_VERSION='nyang-v1-'+first16hex` in generated client/server modules; --check fails drift without writing. Engine flags use structural type, not import of client config. Tuning changes hash and require matched client/server deploy. Existing deployed v1 rankings must not be reset silently on later rule changes.
- POST runs requires active profile/current rulesVersion. Server handler generates unpredictable nonzero uint32 seed using cryptographic randomness and a positive int32 engine ID; DB assigns UUID, issued_at and expiry24h. Server creates same START(seed), finishes360 countdown ticks through existing transition until playing (assert expected state) before verifying; client receives challenge **before** its own START/countdown. No late attachment to locally started game.
- Client supplies only playing-tick signed controls; RLE spans direction∈{-1,0,1}, ticks positive int, sum1..1200 (10sec max). Consecutive same directions canonicalized for server SHA256. seq starts0 and increases1. One chunk is verified per request; no unbounded replay/array allocation. Both-buttons controls serialize as0.
- Server rejects unsupported rules, wrong owner, expired run, invalid seq/shape, ticks after first failure, and any revive/action not represented by approved input contract. Server flags false, protection0 in ranked run. Compute score from replay, never client score/elapsed/distance. First terminal fall allowed only as last tick of final chunk. No ranked progress from a merely abandoned live run.
- DB server time requires totalTicks/120 <= max(0,now-issued_at-3sec)+2sec tolerance. PAUSE need not be serialized because all game clocks pause; elapsed wall time can exceed simulated ticks. Fresh accepted next chunk renews24h idle expiry; duplicate/invalid requests never extend it. No gameplay score cap or total run-tick cap; bounded chunks keep server CPU finite per call. Enforce per-request CPU performance budget below provider limit in T03.
- Atomic repository transaction: lock the run, compare current accepted_seq and recheck owner/status/expiry plus total-tick wall-clock budget against DB time, then checkpoint+totalTicks+lastDigest+status+expiry together. Latest duplicate seq+same canonical digest returns same ack; same seq different digest409; older seq409 OUT_OF_ORDER with expectedSeq, no mutation. Client only one request in flight, so latest retransmission suffices. Concurrent different updates yield retry/order response without lost state.
- Finalize only terminal; same transaction upserts max best and stores immutable receipt/statusfinalized. Retry returns receipt, not a second result. Live rank in receipt may be recomputed separately without altering earned score. Finalized receipt7day retention for retry, active/terminal idle24h; best remains until user delete/operator moderation. No permanent raw input storage, only checkpoint/digest/receipt.
- No cryptographic guarantee that a human generated valid inputs: scripted/bot play is outside this protection. Dev exports target staging. Browser source is public; do not claim `__DEV__` alone cryptographically attests production. Server runtime always enforces no revival and valid replay, production UI never submits its dev sessions.
- Unit adapters use fake repository to test ownership/transactions expected methods; actual SQL/RLS proof is mandatory T03. All production repository methods and SQL calls have typed parameter sets matching schemas above.

### Implementation refinements (2026-09-22)

- `private.runs.finalized_at timestamptz nullable` separates seven-day final receipt retention from the unchanged last-chunk `expiresAt`; retries keep the original ack.
- Service-only `rank_get_deletion_status(p_user_id uuid)` returns `{status: 'pending_auth_delete' | 'complete'} | null`. The DELETE-only signed-JWT fallback must find this existing tombstone before any deletion action; it cannot initiate deletion for a merely decoded subject.
- Owner-only `private.rank_cleanup(p_jwt_max_lifetime_seconds integer)` defines run/receipt/rate/report retention. Scheduling and the actual JWT maximum lifetime are T03 operations, not enabled or verified by this migration. Pending deletion tombstones are never removed.
- Local reproducible Deno2.9.6 is a pinned npm development dependency; `npm.cmd run test:server-api` or `npx.cmd --no-install deno test --config supabase/deno.json supabase/functions/_shared/__tests__` runs the specified Deno tests without a global install.
- Added `npm.cmd run ranked:browser` (isolated actual Chromium numeric replay) and `npm.cmd run test:ranking-schema` (static SQL/RPC contract guards). Neither substitutes for real hosted PostgreSQL transactions/RLS or iPhone Hermes.
- Jest covers nickname/request contracts and Node replay. Deno covers real Request/Auth/JWT/handler/repository adapters and replay. Repository fakes check boundary behavior, not database concurrency proof.

## Acceptance Criteria
- [x] Nonunique nicknames with private IDs, shared ranks/top100/me and monotonic best implemented; SQL static/adapter checks only, real DB proof in T03.
- [x] Server does not accept client-written score or unowned run; chunk limits/order/retry/finalization are defined and locally tested.
- [x] Canonical numeric physics matches Node/Deno/Chromium golden fixtures and preserves previous gameplay regressions.
- [x] Delete/report/rate-limit paths operate on caller scope and do not expose secrets in local adapter tests.
- [x] Hosted DB/RLS/runtime validation remains explicitly pending for T03.

## Validation
- `npm.cmd run ranked:sync` — generate server kernel/version from canonical modules; script `node scripts/sync-ranked-engine.mjs`.
- `npm.cmd run ranked:check` — same script --check passes without changes.
- `npm.cmd run test:ranking` — define as `jest --runInBand src/online/__tests__ src/game/__tests__/ranked-replay.test.ts`; malformed spans, JWT/ownership, duplicate names, ties, concurrent max, deletion, replay after fall, drift tests pass.
- `npm.cmd run server:check` — define as `deno check --config supabase/deno.json supabase/functions/leaderboard-api/index.ts`; Deno2 installed via official supported Windows method if absent, with required environment permission.
- `deno test --config supabase/deno.json supabase/functions/_shared/__tests__` — pure proof fixtures identical to Node, no hosted secrets required.
- `npm.cmd run typecheck` / `npm.cmd run test:ci` / `npm.cmd run web:export` — client excludes Deno entry points in tsconfig/Jest globs; original tests still pass.
- `git diff --check` — clean. SQL schema/grants inspected but no hosted success claim.

## Commit Message
```text
feat(ranking): add anonymous leaderboard and verified run API

Plan: 2026-09-21-close-call-nyang
Phase: P02-leaderboard
Task: T01-ranking-backend

- Define protected profiles, shared ranks and one-time best-score updates
- Verify bounded seeded input replays with a shared deterministic kernel
```

## Progress
- [x] 구현 완료 (P02-T01 only; client connection/deployment not performed)
- [x] 검증 통과: ranked sync/check; Jest ranking58/full431(29 suites); Deno check/tests45; static SQL21; HTTP server14; Chromium golden3; typecheck; production/fixture builds; actual UI26pass7skip0fail(159.5sec); staged diff check.
- rulesVersion: `nyang-v1-2093a8b42d416f8a`
- evidence/limitations: `docs/qa-report.md`, `docs/learning-notes.md`, `docs/development.md`; actual DB/Auth/network/Hermes validation remains pending.
- commit: `0f3e52d` (source/blueprint; progress pointer synchronized in the following memory commit)
