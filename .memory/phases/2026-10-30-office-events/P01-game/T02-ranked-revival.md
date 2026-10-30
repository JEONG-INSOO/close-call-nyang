# Task: T02 광고 부활 기록 및 통합 랭킹
## Status: done
## Decision Summary
사용자는 광고 부활 후 점수 자동 반영 및 기존 랭킹에 새 난이도 합산을 승인했다. 실제 광고 SDK는 없으므로 광고 시청 증명이라 주장하지 않고, 서버 검증된 첫 낙하에서 한 번만 이어지는 플레이를 검증한다.
## Implementation
- public DTO RankedRevival extends RankedRun(initialState:GameState). RankingApi 선택 reviveRun(parentRunId):Promise<RankedRevival>. api POST /runs/revive body {runId}; strict response ids/version/state checks.
- SQL 신규 202610300001_ranked_revival.sql: runs.parent_run_id unique FK; service-only rank_start_revived_run RPC. subject→player→parent 잠금, finalized parent 소유/규칙/미부활/만료 검사, existing child 반환으로 재시도 idempotent. 새 child는 같은 seed/id, 부모 누적거리/시간/rng 유지, stepIndex0/reviveUsedtrue/protection1.5; 서버 생성 state만 받는다. rank_check_state는 boolean reviveUsed와 보호0..1.5 허용하되 미부활 보호 금지. 기존 초기 START는 여전히0거리다.
- handler POST /runs/revive start rate-limit. 기존 parent checkpoint에 canonical REQUEST_AD→광고시간→countdown을 실행하여 revived playing 초기 상태 생성, stepIndex만0. RPC 반환 initialState를 client에 전달. 재부활 금지/owner/규칙 확인.
- verifyProof는 revived checkpoint protection 허용하고 playing ticks만 재생, 점수는 기존 finalize가 직접 거리에서 계산한다.
- useRankedGame subscribeEffects revive에서 PAUSE→기존 proof.retry/finalize 확인→reviveRun→session.begin(child)→controller.restore(paused countdown3, child initialRun)→RESUME. identity/generation/홈/hidden/삭제 시 오래된 응답으로 복귀 금지. 실패는 기존 local countdown 유지하고 unranked 안내. 첫 낙하 proof 보존. 첫/두번째 판 모두 기록 가능, 세번째 부활은 engine/RPC가 거절. 일반 collection 해금은 기존 !reviveUsed 유지.
- 통합 board: rules_version별 최고를 user별 max로 통합, score-only 공동등수/Top30/나의 순위 유지. finalize bestScore/rank도 동일 전역 집계, receipt멱등성 유지. 기존 rows 삭제/복사하지 않음.
- Deno handler/verifyProof 및 SQL static 검증, Jest API/오케스트레이션 실제 흐름 검증. 사용자 records 보존. 원격 배포는 별도, 운영 쿼리는 앞서 승인된 131 보정만 실행됨.
- 후속 사용자 ‘그냥 운영서버에 진행’ 승인: 검증용복원은 무료2슬롯 제한으로 실패. 로컬 별도 PostgreSQL18에서 migration/1회부활/소유/멱등/전역최고/권한을 rollback 검증 후 운영 migration 및functionv5 배포. 기존 IPA 보존 위해9aa47db legacykernel생성/allowlist 분기, 이전 요청 실제 검사. 보안설정변경옵션 없이 기존false유지 확인. 스크립트 build-legacy-kernel/build-revival-db-check/verify-ranked-revival 및 전용학습노트/운영evidence 포함.
## Validation
- npm.cmd run typecheck; npm.cmd run test:ci -- --testTimeout=30000
- npm.cmd run server:check; npm.cmd run test:server-api; npm.cmd run test:ranking-schema
- web/online fixture 새로 생성 후 해당 랭킹/부활 브라우저 회귀 검사. 신규 운영 RPC는 실제 배포 전 DB 검증 필요.
## Learning
새 child challenge로 이어짐을 서버가 결정한다. 부모/자식 ID가 달라도 UI는 한 판처럼 보이며 seed/누적거리를 유지한다. 한 번만 발급은 unique constraint+잠금으로 보장한다.
질문: 같은 닉네임과 같은 사용자ID는 왜 다른가? 시청 증명과 합법적 부활 검증은 어떻게 다른가? 과거 규칙의 점수를 통합하는 선택의 공정성 영향은?
## Acceptance Criteria
- [x] first fall 이후1회만 server-linked replay
- [x] offline/삭제/이탈/중복 응답 회귀 통과
- [x] 기존 점수 보존, 규칙 간 user별최고 통합

## Results
Jest737/52 suites, Deno53, SQLstatic29, 모의API browser1, 실제 로컬 rollback 및 운영smoke통과. 임시계정삭제확인/cleanupRequired0, 기존131유지. functionv5 ACTIVE, verify_jwt false→false. 아직 새 웹/IPA미게시. commit: pending
## Commit Message
```text
feat(ranking): accept one verified revival and unify lifetime scores

Plan: 2026-10-30-office-events
Phase: P01-game
Task: T02-ranked-revival
```
