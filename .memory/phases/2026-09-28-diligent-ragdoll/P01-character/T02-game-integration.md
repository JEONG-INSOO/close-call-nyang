# Task: T02 렉돌 걷기 연결과 검증

## Status: pending

## Goal
`diligent` 선택 시 승인된 새 걸음 이미지를 장면에 그려, 기본 캐릭터와 다른 외형으로 걷되 게임 상태·점수·기존 보상 캐릭터는 변경하지 않는다.

## Decision Summary
- T01의 동일 기준점 PNG 두 장만 게임에서 사용한다. `rookie`와 `veteran` 경로는 유지한다.
- 걸음 전환은 `SceneFrame.distanceM`의 기존 `strideFor`로 계산하고 React 상태 갱신이나 타이머를 추가하지 않는다.

## Implementation

### I01. 렉돌 스프라이트
- Related Files:
  - `src/scene/DiligentSprite.tsx` :: `DiligentSprite`, 정적 프레임 매핑과 animated opacity; new
  - `src/scene/NyangCharacter.tsx` :: `NyangCharacter`의 `characterId==='diligent'` 분기, 보호 윤곽; modify
  - `assets/characters/diligent/step-a.png`, `step-b.png` :: T01 산출물; read-only
- **Signatures & Types**: `DiligentSprite({frame,pose}: {frame: SharedValue<SceneFrame>; pose: EmployeePose}): React.JSX.Element`. 루트 테스트 ID `diligent-sprite`, 얼굴/의상 테스트 ID `face-diligent`/`outfit-diligent`, 기존 장면의 `leg-left`, `leg-right`, `cup-visibility`/`cup` 계약과 양립해야 한다.
- **Data & Schema Fields**: `SceneFrame.distanceM:number`, `angleRad:number`, `hasCoffee:boolean`, `fallen:boolean`, `protectionSeconds:number`는 읽기만 한다. `CharacterId`/저장 스키마/서버 proof 구조 변경 없음.
- **Execution Flow / Logic**: 기존 장면의 200유닛 높이·발 원점에 이미지를 맞춘다. `strideFor(pose,distanceM)` 부호에 따라 A/B만 표시하며 변화는 Reanimated UI thread의 animated props로 처리한다. 기존 루트 기울기·넘어짐을 재사용한다. 커피는 기존 `hasCoffee`에 의해서만 등장한다. `veteran`은 옛 `RewardCat`을 계속 사용한다.
- **Error & Exception Handling**: 유효하지 않은 거리에서는 기존 `strideFor` 기본값을 따른다. 포즈 전환 실패 시 두 프레임이 겹치지 않게 한 장만 보이도록 한다.
- **State Transition & Return**: 그림만 변한다. `frame.value`를 쓰거나 게임 타이머를 추가하지 않는다.

### I02. 회귀 검증과 기록
- Related Files:
  - `src/scene/__tests__/GameScene.test.tsx` :: 세 캐릭터 분기·걸음/커피/루트 기울기 검증; modify
  - `src/scene/__tests__/RookieSprite.test.tsx` :: 기존 보상 외형 가정 중 `diligent`만 갱신; modify
  - `docs/art-direction.md` :: 새 렉돌 결정이 옛 피곤한 얼굴 설명보다 우선함을 기록; modify
  - `docs/learning-notes.md` :: 구현·검증·질문 3개; modify
- **Signatures & Types**: 테스트는 렌더 계층과 `SceneFrame` 불변을 확인한다. 게임 엔진 계산값은 수정하지 않는다.
- **Execution Flow / Logic**: 기본/렉돌/베테랑 선택, 커피 전후, 정지/보행/넘어짐 및 보호 상태를 검사한다. 실제 화면 렌더 확인을 별도로 기록한다.
- **Error & Exception Handling**: 테스트 실패가 기존 옛 외형 가정 때문인지 실제 동작 문제인지 구분하고, 사용자 데이터/서버 계약을 변경해 맞추지 않는다.
- **State Transition & Return**: T02 완료 후 P01과 plan을 done으로, `.memory/current.md`를 이전 P03-T03 상태로 복귀한다.

## Acceptance Criteria
- [ ] `diligent`만 새 렉돌 스프라이트로 표시하고 실제 걸음이 번갈아 보인다.
- [ ] `rookie`와 `veteran` 외형·동작, 해금·저장, 점수·물리·서버 규칙은 그대로다.
- [ ] 커피·넘어짐·일시정지·보호 상태에서 렌더 오류가 없다.
- [ ] 학습노트에 변경 이유, 렌더/테스트 결과, 배운 개념과 질문 3개를 적는다.

## Validation
- `npm.cmd test -- --runInBand src/scene/__tests__/GameScene.test.tsx src/scene/__tests__/RookieSprite.test.tsx` — 장면 테스트 통과
- `npm.cmd run typecheck` — 타입 통과
- `npm.cmd run ranked:check` — 검증 규칙/서버 복제 불변
- `git -c safe.directory=D:/GrillmeEDU diff --check` — 공백 오류 없음
- 로컬 게임 장면 육안 검사 — 프레임 겹침·발 기준점·가독성 확인

## Learning
- 배울 개념: 그래픽 스킨과 물리 상태의 분리, distance 기반 애니메이션, UI-thread animated props.
- 예상 오류: 새 이미지 원점 불일치, `diligent`만 바뀌어야 할 분기에서 `veteran`이 섞임, 이미지 크기로 인한 터치 FPS 저하.
- 완료 후 `docs/learning-notes.md` 질문: 왜 `distanceM`로 걷기를 구동하나? 왜 해금 저장 키를 유지하나? 정적 이미지 프레임이 런타임 처리보다 유리한 점은?

## Commit Message
```text
feat(scene): animate diligent ragdoll without changing game rules

Plan: 2026-09-28-diligent-ragdoll
Phase: P01-character
Task: T02-game-integration

- Render the approved ragdoll only for the diligent unlock.
- Verify scene behavior and document the art pipeline.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
