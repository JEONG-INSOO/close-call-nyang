# T01 Progressive Tuning

## Status
done

## Goal
거리 15m 이후에만 기울기 drift의 주기·폭과 이벤트 강도·빈도를 점진적으로 높이고, 랭킹 엔진 사본을 동기화하며 초반 적응 구간을 보존한다.

## Files and symbols
- `src/game/difficulty.ts`: `difficultyAt`, `balanceDrift` — distance-aware progressive pressure
- `src/game/engine.ts`: event force scheduling integration if required; preserve warning/active boundaries
- `src/game/__tests__/difficulty.test.ts`: monotonic pressure and 15m threshold contracts
- `src/game/__tests__/engine.test.ts`: event timing/force regression updates
- `src/game/__tests__/brisk-balance.test.ts`: progressive drift/event behavior
- `docs/learning-notes/2026-09-23-progressive-difficulty.md`: evidence and beginner notes

## Model
- `distanceM <= 15`: existing gentle drift/event baseline
- `distanceM > 15`: adaptation remains time-based for first 3–5 seconds; distance pressure scales only after coffee threshold
- event strength remains deterministic and seeded; interval remains bounded at 4 seconds
- no new state fields or storage schema

## Verification
- typecheck, focused Jest, ranked check, replay check, web export, full Playwright config, diff check

## Commit
```text
feat(game): ramp balance pressure after coffee

Plan: 2026-09-23-progressive-difficulty
Phase: P01
Task: T01
```

## Result
- Typecheck, Jest 654, ranked sync/check, replay generation, web export, online fixture build, and Chromium 34 pass / 11 skip completed.
- Rules version: `nyang-v1-bc732af6f2a7ea66`
