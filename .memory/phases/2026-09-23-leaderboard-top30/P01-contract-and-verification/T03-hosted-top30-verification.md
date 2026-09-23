# Task: T03 staging top-30 및 운영 검증

## Status: in_progress

## Goal

staging에 새 migration과 함수를 배포하고 31명 rollback fixture로 공동순위·top30·31위 me를 검증한 뒤, 기존에 남은 운영 검증 항목을 실행한다.

## Implementation

- `scripts/sql/ranking-staging-fixtures-top30.sql` :: staging-only 31-user fixture — new; 전체 단일 트랜잭션 후 rollback, production 금지.
- `docs/qa-report.md`, `docs/leaderboard-operations.md`, `docs/learning-notes.md` :: 실제 결과·미검증 범위 기록 — modify.
- Staging ref는 `.env.ranking.staging`의 명시 값만 사용하고 `npx supabase db push --project-ref ...` 및 `functions deploy --use-api`로 배포한다.

## Acceptance Criteria

- [ ] staging migration dry-run/apply가 대상 ref에서 성공한다.
- [ ] 실제 board entries가 최대 30개이고 31위 me가 별도로 반환된다.
- [ ] 기존 smoke와 남은 운영 검증 결과가 성공 또는 명시적 not_run으로 기록된다.
- [ ] production은 승인 전 변경하지 않는다.

## Validation

- `npm.cmd run ranking:verify -- --environment staging --project-ref <staging-ref> --env-file .env.ranking.staging --allow-test-writes`
- staging fixture 전체 배치 실행 후 `assertionsPassed`, `rollbackCompleted`, `intentGucsCleared` 확인
- `npm.cmd run ranking:env-check -- --env-file .env.ranking.staging`

## Commit Message

```text
test(ranking): verify top 30 hosted board

Plan: 2026-09-23-leaderboard-top30
Phase: P01-contract-and-verification
Task: T03-hosted-top30-verification
```

## Progress

- [x] top-30 migration/API 배포 및 rollback fixture 통과
- [x] 실제 smoke 14개 통과
- commit: pending
