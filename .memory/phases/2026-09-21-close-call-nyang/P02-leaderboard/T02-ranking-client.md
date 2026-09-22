# Task: T02 닉네임·리더보드와 온라인 판 연결

## Status: done

## Goal
iPhone/웹에서 가입 화면 없이 닉네임을 정하고 공통 순위표와 내 순위를 보며, 정상 플레이 기록을 안전하게 제출한다. 통신 실패가 게임 자체를 멈추지 않게 한다.

## Decision Summary
- 닉네임 중복 허용, 기기별 익명 플레이어. 로그인·기기 동기화 없음. 플레이어별 역대 최고 정수 성공률, top100+my rank; 같은 점수 공동 순위.
- 아직 이름을 설정하지 않거나 오프라인이면 로컬 플레이. 서버에서 시작한 판만 검증 후 랭킹 등록. 개발/가상 부활 기록은 production 등록 금지.

## Implementation

### I01. 익명 세션·API·닉네임 화면
- Related Files:
  - `src/online/client.ts` :: getOnlineClient/ensureGuestSession — new
  - `src/online/api.ts` :: profile/board/run/report calls — new
  - `src/online/types.ts`, `useOnlineProfile.ts` :: session state — new
  - `src/screens/NicknamePanel.tsx`, `LeaderboardScreen.tsx` :: nickname/leaderboard UI — new
  - `src/screens/TitleScreen.tsx`, `ResultScreen.tsx`, `SettingsPanel.tsx` :: entry/actions — modify
  - `App.tsx`, `src/i18n/ko.ts` :: composition/text — modify
  - `src/online/contracts.ts`, `nickname.ts`, `rulesVersion.ts` :: T01 contracts — read-only
  - `package.json`, `package-lock.json`, `.env.example` :: SDK/environment — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export type OnlineStatus = 'unconfigured' | 'guest' | 'loading' | 'ready' | 'offline' | 'deleting';
  export interface OnlineProfileState { status: OnlineStatus; profile: PlayerProfile | null; error: string | null }
  export interface RankingApi {
    getProfile(): Promise<PlayerProfile | null>;
    saveNickname(nickname: string): Promise<PlayerProfile>;
    deleteProfile(): Promise<void>;
    getLeaderboard(): Promise<LeaderboardResponse>;
    startRun(): Promise<RankedRun>;
    sendChunk(chunk: ProofChunk): Promise<ChunkAck>;
    finalizeRun(runId: string): Promise<SubmitResult>;
    reportNickname(publicId: string, reason: 'inappropriate' | 'impersonation' | 'other'): Promise<void>;
  }
  export function createRankingApi(expectedUserId?: string): RankingApi | null;
  export function ensureGuestSession(): Promise<void>;
  export interface NicknamePanelProps { visible: boolean; profile: PlayerProfile | null; onClose(): void }
  export interface LeaderboardScreenProps { onClose(): void; myProfile: PlayerProfile | null }
  ```
- **Existing server contracts** (do not infer different fields): `PlayerProfile{publicId,nickname,updatedAt}`; `LeaderboardEntry{publicId,nickname,score,rank,achievedAt,isMe}`; board{entries,me|null,rulesVersion,fetchedAt}; RankedRun{runId UUID,engineRunId number,seed uint32,rulesVersion,issuedAt,expiresAt}; ProofChunk{runId,seq,spans:{direction:-1|0|1,ticks:number}[]}; ChunkAck{acceptedSeq,totalTicks,terminal,expiresAt}; SubmitResult{runId,score,bestScore,rank|null,improved}. No direct score write endpoint.
- **Data & Schema Fields**:
  - Add `@supabase/supabase-js` and React Native URL support if its installed supported recipe needs it; use compatible versions and lockfile. Public env `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; never admin/service key. Missing values return unconfigured/local usable, not crash or fake remote scores.
  - Supabase autoRefreshToken true,persistSession true,detectSessionInUrl false for this no-OAuth app. Native session storage uses AsyncStorage as documented RN adapter; separate key `close-call-nyang.online.session.v1` and do not log tokens. Web use browser storage. Explicitly document local data reset loses guest access; no claims of encrypted local storage. No device fingerprint or hardware ID.
  - Nickname valid after NFC+trim+space collapse,2..12 codepoints, Hangul/ASCII letters/digits/internal spaces. Same as T01 server validator, server decides banned names. Public IDs distinct from session.user.id.
  - Public cached board30sec per session only; clear on identity change/delete. `blockedPublicIds:string[]` local storage key `.blocked.v1`, max200 most-recent. Hide blocked rows but preserve server rank numbers; do not locally renumber. Session/profile keys separate from existing Preferences{schemaVersion:1,bestScore,settings:{musicEnabled,sfxEnabled,hapticsEnabled,reduceMotion}}.
- **Execution Flow / Logic**:
  1. Title offers `닉네임 설정`/current name and `랭킹` next to existing start/settings. No mandatory tutorial/registration. Name setting explains public visibility and device-local guest identity, then creates an anonymous Supabase session on explicit nickname-save if no valid existing session. Don't create a user just for opening app/reading ranks. Existing session restores without UI login.
  2. Save valid name via POST profile; only confirmed saved profile displayed as registered. Busy disables repeated save; server name rejection inline; duplicate names work; editing updates old row record rather than creates new player. Network error keeps old profile/name and draft field for retry.
  3. Rank modal/screen from title/result, not during active play unless game is paused first. Columns rank/nickname/success rate, current player highlighted with `나`, own row separate even outside100. Show empty/loading/error/retry/last-loaded states. Round numbers never fabricated. Pull-to-refresh or button with throttling; no constant real-time polling.
  4. Row menu `닉네임 신고` opens reason choices and posts target public ID; `숨기기` hides locally. Display support link for follow-up. Server filters names independently; report success doesn't promise removal. Existing blockedIDs prevent renaming from unblocking because publicID unchanged.
  5. Settings provide nickname edit and `온라인 프로필과 기록 삭제`; destructive confirmation explains nickname/online record removal and retained local best/settings/character collection. Freeze online submission, call server delete, clear session/profile/queue only after success. Never clear the preferences key or completedRuns/selectedCharacter during online deletion. On lost response retry same deletion, not create new session. Do not recreate anonymous account until user explicitly chooses nickname participation again.
  6. Supabase auth refresh follows foreground lifecycle; expired unrecoverable session loses previous profile ownership, shows simple rejoin notice; never claim matching nickname can reclaim it. No signup/email/OAuth addition. API timeouts use AbortController, code maps clear Korean messages without raw stack/key.

### I02. Canonical input recorder and bounded retry
- Related Files:
  - `src/online/runRecorder.ts` :: createRunRecorder — new
  - `src/online/rankedSession.ts` :: RankedSession — new
  - `src/online/proofQueue.ts` :: pending proof storage — new
  - `src/online/__dev__/RankedReplayDiagnostics.tsx` :: development-only browser/Hermes golden replay diagnostics — new
  - `src/game/controller.ts` :: playing-tick observation — modify
  - `src/game/useGameController.ts`, `App.tsx` :: start/result integration — modify
  - `src/game/__tests__/controller.test.ts`, `src/online/__tests__/` :: recording/retry/UI — modify/new
  - `docs/learning-notes.md`, `docs/development.md` :: online flow — modify
#### Details
- **Signatures & Types**:
  ```typescript
  export interface PlayedTick {
    runId: number; tickIndex: number; direction: -1 | 0 | 1; terminal: boolean;
  }
  // add to existing GameController; callback after each actual playing transition:
  // subscribeTicks(listener: (tick: PlayedTick) => void): () => void;
  export interface RunRecorder {
    record(tick: PlayedTick): void;
    takeChunk(): ProofChunk | null;
    finish(): void;
  }
  export function createRunRecorder(run: RankedRun): RunRecorder;
  export type RankSubmissionState = 'local' | 'recording' | 'pending' | 'submitted' | 'unranked';
  export interface PendingProof {
    schemaVersion: 1; userId: string; run: RankedRun;
    chunks: ProofChunk[]; nextSeq: number; terminalRecorded: boolean;
    updatedAt: string; submissionState: RankSubmissionState;
    acknowledgedTicks: number; failureCount: number; retryAt: string | null;
  }
  // Development diagnostics module only; never part of production UI:
  export interface ReplayDiagnostic {
    fixtureId: string; rulesVersion: string; digest: string; fallTick: number;
    runtime: 'hermes' | 'browser' | 'other'; passed: boolean;
  }
  export function runReplayDiagnostics(): Promise<ReplayDiagnostic[]>;
  export function RankedReplayDiagnostics(): React.JSX.Element;
  ```
- Controller existing API dispatch(ControlAction), advanceFrame(timestampMs),readState(),subscribeEffects(),setInput()/clearInput(); pure engine START{runId,seed},TICK{dt:1/120,input}. rAF may produce multiple ticks. Recorder must observe **every actual fixed tick**, not React HUD snapshot/frame time; tick data includes last falling partial step (one tick budget). Timers outside playing don't log inputs.
- On `업무 시작`/retry with a profile and production configuration, try POST runs before START with2sec timeout. Success initializes engine with returned numeric ID/seed, then existing3sec countdown. If timeout/network/version error show local-only state and start local seed as before; cancel stale request generation so a late challenge never attaches to an already-running local game. Server challenge expires by itself. No servercall perframe.
- Preserve T05's local collection integration: accepted START creates exactly one local achievement attempt and freezes selectedCharacter, whether the run starts online or falls back offline. The local attempt number is distinct from server UUID and numeric engine ID. Server receipts/retries never increment collection again. CharacterId/completedRuns do not enter ranked proof or authoritative physics.
- At run start choose `rankEligible=!__DEV__` for production API; development test server env may allow dev submissions only to separate staging project. At any dev/mock-ad flag or reviveUsed true, recording never points at production. Server still has independent proof verification.
- Recorder merges same direction spans, produces chunk at1200 ticks or terminal, seq0 onward, one network request in flight. Flush last partial chunk including fall before finalize. Inputs left+right become0; pause just freezes recorder. RunRecorder rejects mismatched numeric runID/stale subscription.
- Queue at most one incomplete ranked run, max1MiB serialized pending proofs, stored in AsyncStorage separate key `.proof.v1` and scoped to anonymous user ID. Delete acknowledged data promptly. No auth token in queue. If max exceeded, expired24h, corrupted proof, unsupported rules, or auth ownership lost, mark only that run unranked, stop uploads and keep local game/best. Never truncate log and still claim a verified score.
- Retry same last chunk after transient fail with bounded backoff1,2,4,8,16,30sec, respect429 Retry-After, foreground only; stop at expiry/max budget. Same seq+same digest ack idempotent; older seq OUT_OF_ORDER is not guessed-success. Serialize queue updates and retain in-flight payload until ack. Auth refresh retry at most once. Game doesn't wait for acknowledgments.
- If user starts a new ranked run with pending previous result, first attempt flush/finalize; if unavailable offer start local or discard old pending upload then new ranked attempt. Do not silently overwrite pending valid record. No UI wait blocks raw offline play indefinitely.
- Finalize immutable receipt server score,bestScore displayed as `랭킹 등록 완료`; local best remains local even if server rejects. Show `등록 대기` for retryable state, `이번 기록은 기기에만 저장돼요` for unranked. Refresh board after actual success. Dev/fixture placeholder board clearly test-only, never shipped.
- Cross-runtime numeric proof fixtures: same fixture data from T01 in browser and Hermes dev test harness, output only hash/fall tick for QA (no session/whole input data); developer harness gated __DEV__ and absent from export. If mismatch, fix canonical kernel then update server generated version, never loosen backend to accept arbitrary client numbers.

## Implementation Notes (2026-09-22)
- Actual additional paths: `src/online/useRankedGame.ts` (App/controller orchestration), `blockedPlayers.ts`, `src/screens/{PendingRankingPanel,onlineStyles}.tsx/ts`, `scripts/export-online-fixture.mjs`, `e2e/online.spec.ts`, `playwright.config.ts`, `docs/qa-report.md`; matching tests are included. `useGameController.ts` itself needs no change because controller exposes the new subscription.
- Authentication state adds separate `isBusy` and `deletionPending`; deletion retry does not permanently disable its own button. Auth-only `close-call-nyang.online.deletion.v1` stores userId/accessToken before DELETE, retained on lost response and removed after confirmed deletion. Native AsyncStorage/web localStorage are not encrypted storage. Expired deletion JWT needs later operator flow, no automatic rejoin/assumed success. Client generation and serialized writes prevent obsolete SDK callbacks resurrecting deleted sessions.
- API instance binds expected identity, general timeout8sec/start total2sec, auth refresh once except deletion, board cache30sec per identity with HTTP cache bypass. Config accepts only `sb_publishable_` key. SDK2.116.0 and URL polyfill4.0.0; Expo Crypto~57.0.3 for development diagnostics. All development gameplay is local-only; optional staging dev submission is not implemented.
- Queue persists acknowledgedTicks/failureCount/retryAt; max20 consecutive failures, reset after ACK; retry respects server delay after reload. Same-JS storage operations are serialized. Cleanup checks user and run ID. Multi-tab atomic storage/write coordination is NOT guaranteed; document single-tab online use. Restore retries completed terminal proofs but abandons interrupted playing/countdown proofs because engine restore is not implemented.
- Pending retry/discard cancellation and identity changes cannot auto-START later. HOME abandons unfinished active proof only; completed pending proof remains. Server deletion success plus disk cleanup failure returns success with separate local warning. Local collection/best/settings stay independent.
- Isolated production-shaped online fixture build lives only in ignored `output/online-web` on4175, never dist. API responses are intercepted, fake ranking/receipt explicitly labelled simulated, not actual server proof. Basic offline app4173 and scene fixtures4174 remain. Both export scripts clear Metro cache because stale public-env transforms were observed. Development diagnostic module/goldens excluded from production even with envtrue.

## Acceptance Criteria
- [x] Nickname duplicate/edit and top100+my rank display work with API state fixtures; real hosted check T03.
- [x] No nickname/login requirement blocks local gameplay, no fake public ranking shown offline.
- [x] Every authoritative playing tick is captured including final fall; pause/resume and rapid retry cannot mix runs.
- [x] Upload queue is bounded, retry idempotent, stale challenge ignored, dev/boosted runs cannot be submitted to production by app.
- [x] Own profile deletion/report/hide UX works and identities/tokens stay separate from public profile.

## Validation
- `npm.cmd run test:ranking` — extend globs to all src/online tests, nickname/session/recorder/network queue tests pass.
- `npm.cmd test -- --runInBand src/screens/__tests__/leaderboard.test.tsx src/screens/__tests__/nickname.test.tsx` — define tests for tied ranks, duplicate names, loading/errors/edit/delete confirmation, my rank outside100, blocked row ranks unchanged.
- `npm.cmd run ranked:check` / `npm.cmd run typecheck` / `npm.cmd run test:ci` — deterministic kernel and all old game rules pass.
- `npm.cmd run web:export` / `npm.cmd run e2e` — real build retains offline play; add routed fixture API tests for name/rank/failure, label these simulated not hosted evidence.
- `git diff --check` — clean; no service keys or session dumps in staged files.

## Validation Results (2026-09-22)
- typecheck/ranked:check passed; rules unchanged `nyang-v1-2093a8b42d416f8a`.
- Ranking184/12suites; specified UI21/2suites; complete Jest582/40suites passed. Web server14 and Expo dependency compatibility passed.
- Fresh production and isolated online export, scene fixtures passed. Production fake-host/key/diagnostic/golden markers absent even diagnostic/mock envtrue.
- Actual Chromium28pass/11intentional skips/0fail/0flaky,166.207sec. Basic app error/warning logs empty; simulated online pageerrors0, deliberate503 responses expected. No hidden reruns in Playwright (retries0).
- Staged diff check and credential/output separation inspected. Learning notes, development guide and QA report updated. Hosted Supabase/SQL/RLS, Hermes/iPhone and deployment NOT performed. Historical T01 Deno/SQL numbers are not new executions.

## Commit Message
```text
feat(ranking): add guest nicknames and cross-platform leaderboard UI

Plan: 2026-09-21-close-call-nyang
Phase: P02-leaderboard
Task: T02-ranking-client

- Add nickname, shared rankings and profile controls without signup screens
- Record fixed-tick inputs and submit verified runs with bounded offline retry
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `ae82e14`
