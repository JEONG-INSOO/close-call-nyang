# Task: T02 Local resume UI

## Status

done

## Scope

- Load the local checkpoint on app start.
- Show `저장된 게임 이어하기` only when a valid checkpoint exists.
- Restore through the controller and resume the saved run.
- Clear the checkpoint when starting a new run or leaving a terminal result.

## Validation

- `npm.cmd run typecheck`
- `npm.cmd test -- --runInBand src/screens/__tests__/presentation.test.tsx src/screens/__tests__/flow.test.tsx src/services/__tests__/gameResume.test.ts`

## Commit

Included in `feat(game): persist local resume state`.
