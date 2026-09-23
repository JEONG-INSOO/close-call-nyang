# Task: T02 클라이언트 top-30 계약

## Status: pending

## Goal

클라이언트가 서버의 최대 30개 응답을 검증하고, 화면 문구·테스트가 “상위 30명 + 내 순위”를 설명하도록 맞춘다.

## Implementation

- `src/online/api.ts` `parseBoard`: `entries.length <= 30`으로 변경한다.
- `src/i18n/ko.ts` `rankHint`: 상위 30명과 내 순위를 명시한다.
- `src/screens/__tests__/leaderboard.test.tsx`, `src/online/__tests__/api.test.ts`, `src/online/__tests__/backend-contract.test.ts`: 30개 경계와 31위 me를 검증한다.
- `scripts/verify-leaderboard.mjs`와 관련 회귀 테스트의 공개 board bound를 30으로 변경한다.

## Acceptance Criteria

- [ ] 31개 entries payload는 클라이언트에서 거부된다.
- [ ] 30개 entries와 31위 me는 정상 렌더링된다.
- [ ] 한국어 안내 문구가 실제 동작과 일치한다.

## Validation

- `npm.cmd run test:ranking`
- `npm.cmd test -- --runInBand src/screens/__tests__/leaderboard.test.tsx src/online/__tests__/api.test.ts src/online/__tests__/backend-contract.test.ts`
- `npm.cmd run typecheck`

## Commit Message

```text
feat(ranking): align client with top 30 board

Plan: 2026-09-23-leaderboard-top30
Phase: P01-contract-and-verification
Task: T02-client-top30
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
