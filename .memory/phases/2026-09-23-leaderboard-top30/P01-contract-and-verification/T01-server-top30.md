# Task: T01 서버 top-30 계약

## Status: done

## Goal

새 migration으로 `public.rank_get_board`의 공개 `entries`를 최대 30개로 제한하고, Edge Function 응답도 30개만 반환하도록 staging 배포 가능한 서버 계약을 만든다. `me` 전체 순위와 공개 목록의 분리는 유지한다.

## Decision Summary

- 적용된 `202609210001`은 수정하지 않고 `202609230002_leaderboard_top30.sql`을 추가한다.
- SQL 함수의 `limit 30`과 `handler.ts`의 `.slice(0, 30)`을 함께 변경해 DB·HTTP 경계를 일치시킨다.

## Implementation

### I01. SQL migration

- Related Files:
  - `supabase/migrations/202609230002_leaderboard_top30.sql` :: `public.rank_get_board` replacement — new
  - `scripts/leaderboard-schema.test.mjs` :: static migration assertions — modify

#### Details

- `create or replace function public.rank_get_board(p_user_id uuid, p_rules_version text) returns jsonb`는 기존 함수 본문을 보존하되 `top_rows`의 정렬·tie rank 계산·`me` snapshot을 유지하고 공개 `entries`만 `limit 30`으로 제한한다.
- `me`는 `decorated`에서 조회해 30위 밖이어도 반환하며 public caller의 `me`는 JSON null이어야 한다.
- 기존 grants/owner/search_path/SECURITY DEFINER 계약을 보존한다.

### I02. Edge Function 응답 경계

- Related Files:
  - `supabase/functions/leaderboard-api/handler.ts` :: GET `/leaderboard` — modify
  - `supabase/functions/_shared/__tests__/handler.test.ts` :: public board response contract — modify

#### Details

- `board.entries.slice(0, 100)`을 `.slice(0, 30)`으로 변경한다.
- 응답의 `rulesVersion`, `me`, CORS, 인증 동작은 변경하지 않는다.
- 테스트는 30개 entries와 31위 me를 허용하고 31개 entries 응답은 서버 경계에서 잘리는지 확인한다.

## Acceptance Criteria

- [ ] 새 migration이 기존 migration을 수정하지 않고 top-30 SQL 함수를 정의한다.
- [ ] Edge Function은 공개 entries를 최대 30개로 반환하고 me를 별도로 유지한다.
- [ ] SQL static 및 Deno handler 테스트가 통과한다.

## Validation

- `npm.cmd run test:ranking-schema` — migration 계약 통과
- `npm.cmd run server:check` — Deno 타입 통과
- `npm.cmd run test:server-api` — handler/repository 50개 이상 통과
- `git diff --check` — 공백 오류 없음

## Commit Message

```text
feat(ranking): limit public board to top 30

Plan: 2026-09-23-leaderboard-top30
Phase: P01-contract-and-verification
Task: T01-server-top30

- Add a forward-only top-30 leaderboard migration
- Keep the full personal rank in the me field
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending
