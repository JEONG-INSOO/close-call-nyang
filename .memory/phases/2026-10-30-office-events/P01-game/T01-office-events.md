# Task: T01 사무실 다양화 및 이벤트 강화
## Status: done
## Goal
사무실에서 반복 대화만 보이는 문제와 후반 이벤트 힘이 약한 문제를 수정한다.
## Implementation
### I01. 배경
- src/scene/OfficeScene.tsx :: OfficeTile, OFFICE_TILES modify. 폭2400, [0,2400] 두 복제. 400px 구역6개로 typing/copier/presentation/break/documents/conversation. y399 기준. 고정 SVG 노드+기존 단일 useAnimatedProps translation, scroll wrap2400. 커피/차트/프린터 종이/서류 시각적 구분. 기존 clip/51% 경계/전경 바닥 유지.
- src/scene/OfficeActivity.tsx 신규 :: OfficeWorker({x:number,y:number,pose:'typing'|'copier'|'presenting'|'coffee'|'carrying',color?:string}):React.JSX.Element. memo, 팔/소품/표정이 동작별로 다르고 배경 인물은 플레이어보다 작다. DB/schema 없음.
### I02. 이벤트
- 후속 가속/ESC 요청: speedAt의 로그 계수1.05, 거리0~15초반 유지. 관련 difficulty/regression/brisk 수치 기대를 100%83.65초/101%84~86초로 갱신. useKeyboardInput.web Escape는 active3screens에 PAUSE, clearInput/resetFrameClock. repeat/form/modal 제외. keyboard 단위검사와 e2e ESC pause/no toggle 추가.
- 후속 요청 추가: EventId/office 후보에 resignation, HUD 한글 안내, SceneFrame 선택 필드 resignationDirection/resignationProgress, controller에서 순수 이벤트 샘플 파생. OfficeScene 한 AnimatedG가 progress에 따라 -100→1100 또는1060→-140으로 지나가고, direction으로 좌우 반전. timer 없이 게임 시간만 사용. verifyProof 허용 eventId도 동기화. 기존 engine/regression 허용 목록 추가.
- e2e/office.spec.ts 신규 및 fixture 거리60/70 추가로 다양한 스크롤 위치 캡처. 테스트 RNG는 작은 연속 seed가 첫 후보에 몰리지 않도록 분산시킨다.
- src/game/difficulty.ts :: difficultyAt(distanceM:number):Difficulty에서 eventStrength만 1.6+1.8*level로 변경. 유한값 방어 및 deterministic math 유지, timer/입력/속도 유지.
- src/game/__tests__/difficulty.test.ts 공식 기대값 갱신. src/game/__tests__/office-events.test.ts 신규 :: 동일 상태 active 이벤트 vs null을 한 고정 틱 비교, 거리30/51/100/200에서 방향별 angularVelocity 차이가 증가함. 경고 때 힘없음, 보호 중 힘없음, 동일 seed 재현 유지. 기울기 순간이동 금지.
- src/scene/__tests__/OfficeScene.test.tsx 신규 :: 6상황 존재, 프레임 변경/장거리 노드수 고정, wrap 양쪽 타일 이어짐 확인.
### I03. 생성/검증/학습
- npm.cmd run ranked:sync 로 supabase/functions/_shared/game/difficulty.ts 및 양쪽 rulesVersion 생성. 기타 canonical 변경은 없음.
- node scripts/generate-ranked-replays.mjs --write 로 test-fixtures/ranked-replays.json 재생성. --check 및 npm.cmd run ranked:browser로 실제 Chromium replay 확인.
- npm.cmd run typecheck; npm.cmd run test:ci; npm.cmd run ranked:check; npm.cmd run server:check
- npm.cmd run fixtures:build; npm.cmd run online-fixtures:build; npm.cmd run web:export -- --output-dir output/public-links-web (검사용 public env빈Supabase/mocktrue/diagnosticsfalse). 생성 도중 E2E 금지.
- phone-landscape 장면 fixture를 Playwright로 캡처해 여러 거리의 배경을 육안 확인. 새 규칙은 운영 서버에 아직 없으므로 온라인 검사는 simulated API fixture만 사용.
- docs/learning-notes/2026-10-30-office-events.md + docs/learning-notes.md 링크. 변경 이유/힘 수치/정적 배경 성능/실패 및 검증 결과/운영 서버 미배포 기록.
## Acceptance Criteria
- [x] 6상황 / 타일 고정 노드 / 육안 확인
- [x] 후반 이벤트 실제 각속도 영향 증가 / 예고·보호 유지
- [x] 앱/서버/golden 일치 및 테스트 통과
## 배우는 개념과 복습
물리 힘은 그림 회전이 아니라 각가속도에 적용한다. 반복 타일은 모듈로 오프셋과 동일 폭의 두 복제 필요. 규칙 수정은 서버 해시/재생 기대값도 바뀐다.
질문: 배경을 다양하게 하면서 매프레임 노드를 늘리지 않는 방법은? 힘과 각도의 차이는? 클라이언트만 새 규칙이면 랭킹이 왜 실패하나?
## Commit Message
```text
feat(game): diversify office scenes and strengthen late events

Plan: 2026-10-30-office-events
Phase: P01-game
Task: T01-office-events
```
## Progress
- [x] 구현 완료
- [x] 검증 통과: Jest733/52 suites, 타입/서버, canonical8/Chromiumgolden3. 사무실browser1, 게임8중7pass/광고1회late-frame정지 후 단독재검1pass(광고보호 유지).
- commit: pending
