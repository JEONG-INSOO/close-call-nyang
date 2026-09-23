# Plan: 15m Progressive Difficulty

## Objective
15m 이후 기울기 변화가 점진적으로 빨라지고, 중간 이벤트가 거리와 함께 강해지도록 조정한 뒤 로컬 웹에서 테스트 가능하게 한다.

## Phases
- P01 difficulty tuning: 엔진·난이도 계산, 단위/통합 테스트, 웹 빌드와 회귀 검증

## Boundaries
- 랭킹 엔진과 Supabase 검증 사본은 동일 소스로 동기화하고 새 규칙 해시를 생성한다.
- 65도 실패 각도, 커피 15m, 이벤트 경고/활성 구조, 저장·랭킹·캐릭터 외형 불변
- Supabase·스토어·GitHub Pages 배포는 실행하지 않음

## Validation
- `npm.cmd run typecheck`
- `npm.cmd test -- --runInBand src/game/__tests__/difficulty.test.ts src/game/__tests__/engine.test.ts src/game/__tests__/brisk-balance.test.ts`
- `npm.cmd run ranked:check`
- `node scripts/generate-ranked-replays.mjs --check`
- `npm.cmd run web:export`
- `npm.cmd run e2e -- --config output/plush-playwright.config.ts`
- `git diff --check`
