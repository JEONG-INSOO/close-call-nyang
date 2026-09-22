# Task: T02 Rookie Side-view Game Integration

## Status: done

## Implementation
- Related Files:
  - `src/scene/GreyTabbyParts.tsx` — 승인 시트의 측면 파츠로 교체 (Head/Face/Suit/Arm/Tail, Near/Far leg)
  - `src/scene/NyangCharacter.tsx` — rookie 분기: 측면 걷기 위상(앞/뒤 다리 교대, `walkPhaseAt` 유지), 3단계 표정 전환
  - `src/scene/EmployeeCharacterSheet.tsx` — 측면 4포즈로 갱신
  - `src/scene/__tests__/GreyTabby.test.tsx`, `GameScene.test.tsx` — 측면 계약/표정 계약
  - `e2e/fixtures.spec.ts`, `e2e/fixtures/SceneFixtures.tsx` — 표정 상태별 포즈
- 표정: 순수 worklet `expressionAt(angleRad, fallen): 'calm'|'alarm'|'hurt'` (|angle| >= 40deg → alarm, fallen → hurt). 세 표정 그룹을 opacity로 전환. 새 state/storage 없음. `BALANCE.criticalAngleRad`(65도) 실패 판정 불변.
- `NyangCharacterProps`, `SceneFrame`, 규칙 해시 불변. 보상 캐릭터는 P02 전까지 기존 렌더 유지.

## Validation
- `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npm.cmd run ranked:check`, `node scripts/generate-ranked-replays.mjs --check`
- `npm.cmd run web:export`, `npm.cmd run fixtures:build`, `npm.cmd run online-fixtures:build`
- `npm.cmd run e2e -- --config output/plush-playwright.config.ts`
- 844×390 / 667×375 실제 PNG 육안 검토, `git diff --check`

## Commit Message
```text
feat(art): walk the rookie rightward in side view with three expressions

Plan: 2026-09-22-side-view-walk
Phase: P01-rookie-side
Task: T02-game-integration
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
