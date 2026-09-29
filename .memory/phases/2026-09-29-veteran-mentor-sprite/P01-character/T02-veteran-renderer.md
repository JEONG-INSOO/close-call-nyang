# Task: T02 베테랑 PNG 스프라이트 연결

## Status: in_progress

## Goal

T01에서 육안 승인·검증한 단일 아틀라스를 `veteran` 캐릭터가 홈 미리보기와 실제 게임에서 사용하게 한다. 4포즈/위험/넘어짐/커피·부활 상태를 기존 `SceneFrame`만 읽어 표시하고, 옛 평면 SVG 전용 테스트를 새 계약에 맞춘다.

## Decision Summary

- T01 사용자가 선택한 걷기 원본 01·03에는 화면 오른발 젤리가 반복된다. 사용자는 네 장을 수정 없이 쓰기로 확정했다. T02는 이미지를 자동 반전하거나 프레임을 교체하지 않고 기존 순서를 그대로 렌더링한다.

- 새 그림은 `CharacterId='veteran'`의 표현만 교체한다. `src/characters/catalog.ts`의 10회 해금, `src/services/characterProgress.ts`의 저장, 게임 엔진·랭킹 규칙은 읽기 전용이다.
- 성실한 냥대리처럼 6칸 단일 텍스처/클립을 사용해 6개의 중첩 전신 이미지를 동시에 애니메이션하지 않는다. `rookie`/`diligent` 코드는 보존한다.
- 떨어지기 전 좌우 40°에서 위험 표정, `fallen=true`에서 넘어짐 표정이 우선한다. `hasCoffee`와 `protectionSeconds`는 기존 프레임 값으로만 표현한다.

## Implementation

### I01. 베테랑 전용 UI 스프라이트

- Related Files:
  - `src/scene/VeteranSprite.tsx` :: `VETERAN_ART`, `veteranFrameIndexAt`, `VeteranProtectionShape`, `VeteranSprite`; new
  - `assets/characters/veteran/walk-atlas-v1.png` :: 정적 이미지; read-only, T01 산출물
  - `src/scene/DiligentSprite.tsx` :: clip/useId/AnimatedG/커피 패턴; read-only 참고
  - `src/scene/RookieSprite.tsx` :: `expressionAt`; read-only 재사용
  - `src/scene/walk.ts` :: `walkPhaseAt`, `EmployeePose`; read-only
  - `src/scene/svgMotion.ts` :: `svgTransform`, `svgTransformAdapter`; read-only
  - `src/scene/types.ts` :: `SceneFrame`; read-only

#### Details

- **Signatures & Types**:
  ```typescript
  export const VETERAN_ART: Readonly<{ width: 380; height: 425; feetY: 415; scale: number }>;
  export function veteranFrameIndexAt(pose: EmployeePose, distanceM: number): 0 | 1 | 2 | 3;
  export function VeteranProtectionShape(): React.JSX.Element;
  export function VeteranSprite(props: { frame: SharedValue<SceneFrame>; pose: EmployeePose }): React.JSX.Element;
  ```
- **Data & Schema Fields**: 읽는 `SceneFrame` 필드만 `distanceM:number`, `angleRad:number`, `fallen:boolean`, `hasCoffee:boolean`; 공유 `NyangCharacter`는 `protectionSeconds:number`를 계속 읽음. 아틀라스 슬롯 `0..3=걸음`, `4=위험`, `5=넘어짐`. 새 저장/API 필드 없음.
- **Execution Flow / Logic**:
  1. `VETERAN_ART`는 T01 아틀라스 칸 380×425, 발 기준 415, 공통 보이는 키 200 단위에 맞는 `scale=200/387.5`로 시작한다. 실제 원본의 머리·발이 잘리면 그림 정렬을 먼저 고치고 물리/카메라 크기를 바꾸지 않는다.
  2. `veteranFrameIndexAt`은 `'game'`에서 `walkPhaseAt(distanceM)`을 네 90° 구간으로 나눠 `0..3`을 반환하고 `'walk'/'run'` 미리보기에서는 안정적인 기본 슬롯 0을 반환한다. 함수는 Reanimated worklet이며 비정상 거리도 기존 `walkPhaseAt`의 유한값 보호를 따른다.
  3. `expressionAt(frame.value.angleRad, frame.value.fallen)`이 2면 슬롯5, 1이면 슬롯4, 아니면 걸음 슬롯. 하나의 `useAnimatedProps<GProps>`가 한 `<AnimatedG>`를 x=`-slot*380` 옮긴다. `svgTransformAdapter`로 native의 `matrix`와 web의 `transform` 차이를 처리한다. 380×425 고정 `ClipPath`를 `useId` 기반 고유 ID로 만들고 `<Image>` **한 개**에 2280×425 아틀라스를 담는다. `testID`는 `veteran-sprite`, `veteran-atlas-shift`, `veteran-atlas`로 둔다.
  4. 컵은 `pose==='game' && frame.value.hasCoffee`일 때만 기존 위치 `translate(64 -60)`에 표시한다. 베테랑 손과의 접점은 T03에서 육안 검증한다. 커피 얻는 점수/거리 조건을 여기서 재계산하지 않는다. `VeteranProtectionShape`는 승인된 새 머리·몸통 외곽을 mint 선으로 둘러싸되 효과 시간/투명도는 상위 리그를 그대로 쓴다.
- **Error & Exception Handling**: 아틀라스 파일 누락은 Metro 번들 오류이므로 T01 `--check` 선행. React `useId`에서 나온 문자는 SVG ID 안전 문자만 남겨 여러 미리보기/게임 장면의 clip ID 충돌을 방지한다. `frame.value`를 수정하거나 추가 React state/timer를 만들지 않는다. 그림이 컵이나 발 기준과 어긋나면 좌표/원본을 수정하고 점수·물리로 보정하지 않는다.
- **State Transition & Return**: `frame` 공유값 변화 → 화면의 아틀라스 칸/컵 투명도 변화. `SceneFrame`은 불변.

### I02. 공통 캐릭터 분기와 옛 SVG 정리

- Related Files:
  - `src/scene/NyangCharacter.tsx` :: `NyangCharacter`, 구 `RewardCat`/`Face`/`Outfit`/`PawPads`, `NYANG_COLORS`; modify
  - `src/scene/__tests__/GameScene.test.tsx` :: 베테랑 SVG 가정과 애니메이션 계약; modify
  - `src/scene/__tests__/RookieSprite.test.tsx` :: 베테랑 외형·기존 캐릭터 분리 검사; modify
  - `src/characters/catalog.ts` :: `CharacterId`, `requiredCompletions`; read-only
  - `src/services/characterProgress.ts` :: 수집 저장; read-only

#### Details

- **Signatures & Types**: `NyangCharacter(props: NyangCharacterProps): React.JSX.Element` 공개 인터페이스를 유지한다. `characterId==='veteran'`만 `<VeteranSprite frame={frame} pose={pose}/>`와 `<VeteranProtectionShape/>`로 연결한다. `NYANG_RIG`, `NYANG_WALK`와 기본 `characterId`는 유지한다.
- **Data & Schema Fields**: 저장 ID `'veteran'` 그대로. `requiredCompletions:10` 그대로. 옛 SVG 전용 `RewardId`/`RewardCat`/`Face`/`Outfit`/`PawPads`는 새 분기에서 사용하지 않으므로 제거한다. `NYANG_COLORS`는 다른 소스의 import가 없는지 최신 `rg`로 확인 후, 루트 외곽선 색만 보존하고 불필요한 옛 털/넥타이 팔레트는 정리한다. 기존 색 값 자체를 바꿔 다른 스킨의 외곽선이 달라지게 하지 않는다.
- **Execution Flow / Logic**:
  1. 상위 `nyang-root`의 회전·넘어짐 시간·`reduceMotion`·보호 opacity는 손대지 않는다. 외형 분기만 교체한다. 홈/컬렉션 미리보기도 같은 `NyangCharacter` 경로를 쓰므로 별도의 홈 전용 스킨을 만들지 않는다.
  2. `GameScene`의 `it.each(CHARACTERS...)`에서 veteran을 SVG 얼굴/다리 검사가 아니라 `veteran-sprite` 검사로 바꾼다. `preserves veteran as a flat cat...`와 `keeps veteran on original eleven-degree gait`는 새 아틀라스의 4포즈/표정 테스트로 교체한다. rookie 전용 `leg-left`/커피/부활 검사는 그대로 남긴다.
  3. 4거리 구간, ±40° 위험, `fallen` 우선, 부활 시 현 거리의 걷기 복귀, 커피 on/off, paused/replaced `SharedValue`, 보호 opacity, 원본 `frame.value` 불변, 6칸 중 이미지 노드 한 개를 검사한다. `RookieSprite.test.tsx`의 옛 `NYANG_COLORS.fur`와 `outfit-veteran` 예상도 새 ID로 갱신한다.
- **Error & Exception Handling**: 다른 테스트가 구 SVG `leg-left`, `face-veteran`, `tie-veteran` 등을 공유 assertion으로 기대한다면 `veteran` 분기만 정확히 바꾼다. 기본 rookie의 실제 부품 테스트를 약화시키지 않는다. 더티 테스트 파일의 다른 미커밋 변경은 보존하고 Task diff만 stage한다.
- **State Transition & Return**: 선택된 `veteran`은 홈/게임/결과에서 동일 승인 외형. 해금·점수·서버 리플레이 불변.

## Acceptance Criteria

- [ ] 승인 아틀라스의 4걷기·위험·넘어짐이 프레임 변화에 맞춰 표시되고 `veteran`의 옛 평면 SVG가 실제 렌더 트리에 남지 않는다.
- [ ] 홈 미리보기·실제 게임·결과가 동일 선택 ID를 따르며, 컵/보호/부활·`reduceMotion`이 유지된다.
- [ ] rookie/diligent의 외형과 단위 테스트, 카탈로그 0/1/10회와 저장·게임/랭킹 소스에 변화가 없다.
- [ ] 새 veteran은 한 아틀라스 이미지·한 위치 worklet만 사용한다(별도 커피 opacity 제외).

## Validation

- `node scripts/build-veteran-frames.mjs --check` — T01 자산 일치.
- `npm.cmd test -- --runInBand src/scene/__tests__/GameScene.test.tsx src/scene/__tests__/RookieSprite.test.tsx` — 거리 4포즈/표정/부활/커피와 기존 스킨 회귀.
- `npm.cmd run typecheck` — 런타임/테스트 타입 검사.
- `npm.cmd run ranked:check` — 게임·서버 리플레이 규칙 사본 불변.
- `git -c safe.directory=D:/GrillmeEDU diff --check` — 공백 오류 없음.

## Learning

- 배울 개념: 공통 캐릭터 ID와 그림 분기의 차이, SharedValue/Worklet으로 매 프레임 React 렌더를 피하는 이유, 한 아틀라스와 ClipPath의 역할.
- 예상 디버깅: native SVG `matrix` vs web `transform`, clip ID 중복, 신규 전신 그림의 컵 손위치, 옛 SVG testID를 여전히 찾는 테스트.
- 완료 후 `docs/learning-notes.md` 질문 3개: 스킨이 달라도 랭킹 점수가 같아야 하는 이유는? 위험 표정과 실제 실패 판정은 어떤 코드에서 각각 결정하는가? PNG 여섯 장을 겹치는 방식보다 한 아틀라스의 장단점은 무엇인가?

## Commit Message

```text
feat(scene): render approved veteran mentor skin

Plan: 2026-09-29-veteran-mentor-sprite
Phase: P01-character
Task: T02-veteran-renderer

- Replace veteran-only flat SVG with the approved clipped atlas.
- Cover walking, danger, fall, coffee and revive without physics changes.
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
