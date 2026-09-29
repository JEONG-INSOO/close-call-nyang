# Task: T01 베테랑 걷기·표정 아트와 아틀라스

## Status: done

## Goal

사용자가 승인한 주황·흰색 멘토 시안과 동일한 인물의 걷기 4장, 위험 1장, 넘어짐 1장을 투명 원본으로 보존하고, 런타임이 한 번에 로드할 6칸 PNG 아틀라스를 **결정적으로 재생성**한다. 그림 승인 전에는 T02로 진행하지 않는다.

## Decision Summary

- **2026-09-29 사용자 후속 선택 우선**: `tabby-walk-frame-01..04.png` 네 장을 숫자 순서대로 정확히 보존한다. 직전 미리보기나 `frame-1`=승인 시안 복사 가정은 대체되었다. 원본/복사본 SHA-256 일치·1186×1326 투명 RGBA 확인 후 아틀라스를 재생성했다. 위험·넘어짐 두 장은 앞서 만든 후보를 유지한다.
- **사용자 승인한 예외**: 01과 03 모두 화면 오른발 젤리가 보인다. 이 한계를 설명했고 사용자가 네 장을 수정 없이 사용하겠다고 확정했다. 좌우 발 교대를 위해 이미지를 임의로 반전·재생성하지 않는다.

- 기준: `docs/art/proposals/veteran-mentor-concept-v1.png` 및 `.memory/decisions/2026-09-29-veteran-mentor-art.md`. 올리브빛 초록 눈·숲색 니트 조끼·아이보리 셔츠 걷은 소매·주머니 펜·사원증·짧은 맨발/분홍 젤리를 유지한다.
- 기존 성실한 냥대리의 `scripts/build-diligent-four-frames.mjs`는 읽기 전용 참고다. 승인 시안 자체를 다른 캐릭터처럼 재해석하거나 기존 diligent 파일을 수정하지 않는다.
- 산출물은 그림 6장과 `assets/characters/veteran/walk-atlas-v1.png` 한 장. 게임 코드와 배포는 이 Task 범위 밖이다.

## Implementation

### I01. 여섯 원본의 정체성과 동작

- Related Files:
  - `docs/art/proposals/veteran-mentor-concept-v1.png` :: 승인 기준; read-only
  - `docs/art/proposals/veteran-mentor-concept-v1-prompt.md` :: 생성 지침·금지 요소; read-only
  - `docs/art/source/veteran-mentor/frame-1.png` ... `frame-4.png` :: 원본 보행 포즈; new
  - `docs/art/source/veteran-mentor/alarm-expression.png` :: 위험 얼굴; new
  - `docs/art/source/veteran-mentor/fall-expression.png` :: 넘어짐 얼굴; new
  - `docs/art/source/veteran-mentor/frame-prompts.md` :: 이미지마다 사용한 프롬프트·검토 기록; new

#### Details

- **Signatures & Types**: 각 원본은 `PNG`, 최종 `1186×1326`, 실제 알파 채널이 있는 RGBA. 저장 파일에 출처별 역할을 적고, 프롬프트는 텍스트로 보존한다. 런타임에는 이 고해상도 원본을 직접 `require`하지 않는다.
- **Data & Schema Fields**: 아트 원본 목록 `frame-1..4`, `alarm-expression`, `fall-expression`; 각 원본은 동일한 털 무늬, 올리브 눈(감은 장면 제외), 펜 위치, 사원증 모양, 조끼, 꼬리 형태를 가진다. 사용자 저장 스키마/API 필드는 변경 없음.
- **Execution Flow / Logic**:
  1. 사용자가 지정한 폴더의 `tabby-walk-frame-01..04.png`를 01→02→03→04 순서로 `frame-1..4.png`에 바이트 동일하게 복사한다. 원본은 덮어쓰지 않고 SHA-256으로 각각 대조한다.
  2. 앞서 생성한 `alarm`(눈 커짐·식은땀·다문 입)과 `fall`(눈 질끈·작은 벌린 입)을 유지한다. 모두 실제 투명 PNG이며 다른 인물·문자·안경·넥타이·신발이 없다.
  3. 6장의 머리 크기·발 기준선·캔버스 좌표를 육안 비교한다. 01·03의 같은 오른발 젤리 반복을 문서화하고 사용자 확정에 따라 그대로 보존한다. 전신을 좌우 반전해 펜·무늬 위치를 바꾸지 않는다.
- **Error & Exception Handling**: 이미지 생성 모델이 얼굴/눈/복장·펜/ID를 바꾸거나 한 장에 중복 발/손을 만들면 그 장면만 다시 생성·편집한다. 배경 흰색을 투명이라고 간주하지 않는다. 크기 불일치는 품질 저하를 감추는 강제 왜곡 대신 투명 캔버스에 배치·재검토한다. 품질이나 사용자 육안 승인 없이는 Task를 done으로 기록하지 않는다.
- **State Transition & Return**: 승인 시안 → 6개 검토된 고해상도 원본. 실제 게임·수집·물리 상태는 그대로다.

### I02. 재현 가능한 작은 아틀라스 생성

- Related Files:
  - `scripts/build-veteran-frames.mjs` :: `buildVeteranAtlas`, CLI `--check`; new
  - `scripts/build-veteran-frames.test.mjs` :: 메타데이터/결정적 재생성/오류 경계; new
  - `assets/characters/veteran/walk-atlas-v1.png` :: 게임용 6칸 자산; new
  - `scripts/build-diligent-four-frames.mjs` :: 크기·리사이즈 전례; read-only

#### Details

- **Signatures & Types**: `.mjs`의 공개 빌드 함수 `buildVeteranAtlas({ sourceDir, destination, checkOnly = false }): Promise<{ width: 2280, height: 425, slots: 6 }>` (JSDoc으로 `sourceDir/destination: string`, `checkOnly: boolean` 명시). CLI 진입은 `node scripts/build-veteran-frames.mjs [--check]`. 슬롯 폭 380, 높이 425, 발 기준 y=415, 슬롯 순서 `frame-1, frame-2, frame-3, frame-4, alarm-expression, fall-expression`.
- **Data & Schema Fields**: source metadata `{width:1186,height:1326,hasAlpha:true}` 필수. 출력 RGBA PNG `{width:2280,height:425,hasAlpha:true}`. `frameIndex: 0|1|2|3`, `alarmSlot:4`, `fallSlot:5`는 T02 계약과 동일. DB/API/AsyncStorage 필드 없음.
- **Execution Flow / Logic**:
  1. 고정된 여섯 파일을 순서대로 읽고 메타데이터/알파를 검증한다. `sharp`로 각 장을 380×425의 동일 투명 프레임에 맞춰 정렬하고 발 기준선이 y=415로 일치하는지 확인한다. 승인 시안의 여백을 임의로 크게 자르지 않는다.
  2. 여섯 380×425 버퍼를 x=`slot*380`에 합성해 단일 2280×425 PNG를 만든다. 게임에서 쓸 유일한 저해상도 파일은 이 아틀라스다.
  3. 정상 모드에서는 목적지 파일을 쓴다. `--check`는 재생성한 바이트와 기존 파일을 비교만 하며 **어떤 파일도 수정하지 않고** 다르면 비0 종료한다.
- **Error & Exception Handling**: 누락·크기·알파 불일치 또는 `--check` 바이트 차이는 파일명을 포함한 오류로 종료. 테스트는 임시 디렉터리의 불투명/잘못된 크기 입력도 거부하고 원본/기존 자산을 덮어쓰지 않는지 검사한다.
- **State Transition & Return**: 여섯 원본 → 재현 가능한 단일 아틀라스. 사용자가 아직 승인하지 않은 생성물을 게임에 먼저 연결하지 않는다.

## Acceptance Criteria

- [x] 시안과 같은 한 캐릭터로 보이는 사용자 선택 걷기 4장 + 위험/넘어짐 2장을 육안 확인하고 사용자에게 보여 승인받았다.
- [x] 사용자 원본 네 장의 SHA-256이 복사본과 같고, 01·03 오른발 젤리 반복 예외가 명시적으로 승인되었다. 6장의 발 기준점/머리 크기/옷/펜/사원증을 확인했다.
- [x] 여섯 원본 1186×1326 투명 RGBA, 아틀라스 2280×425 투명 RGBA와 슬롯 순서 0..5가 검사로 확인된다.
- [x] 기존 rookie/diligent 원본·자산 및 게임 코드/해금 데이터는 바꾸지 않았다.

## Validation

- `node scripts/build-veteran-frames.mjs` — 아틀라스 최초 생성.
- `node scripts/build-veteran-frames.mjs --check` — 파일 수정 없이 재생성 일치.
- `node --test scripts/build-veteran-frames.test.mjs` — 누락·불투명·잘못된 크기·결정적 빌드 검사.
- `git -c safe.directory=D:/GrillmeEDU diff --check` — 공백 오류 없음 (기존 dirty diff와 구분).
- `view_image`로 6개 원본과 아틀라스를 확인하고 사용자에게 제시 — 자동 테스트가 표정·발 교대의 의미를 검증하지 못하므로 필수.

## Learning

- 배울 개념: 기준 이미지와 애니메이션 프레임의 차이, 알파 채널과 발 기준점, 아틀라스가 런타임 이미지 노드를 줄이는 원리.
- 예상 디버깅: 한 포즈만 얼굴 크기가 다른 생성 편차, 전신 미러링으로 펜 위치가 바뀜, 투명 가장자리의 어두운 테두리, 발이 415선에서 떠 보임.
- 완료 후 `docs/learning-notes.md` 질문 3개: 왜 비슷한 그림 4장만으로는 자연스러운 걷기가 보장되지 않는가? 알파가 있는 PNG와 흰 배경 PNG를 어떻게 구별하는가? `--check`가 원본을 쓰지 않아야 하는 이유는 무엇인가?

## Commit Message

If the approved baseline image, its prompt, the decision record, or the plan files are still untracked at execution time, preserve their bytes and include those exact paths in this task's scoped commit. Inspect the index first; never use a blanket `git add .` in this dirty worktree.

```text
feat(art): add approved veteran walking atlas

Plan: 2026-09-29-veteran-mentor-sprite
Phase: P01-character
Task: T01-veteran-art

- Preserve six consistent mentor-cat sources and generation prompts.
- Build and verify one transparent six-slot game atlas.
```

## Progress

- [x] 원본 6장·재생성 가능한 아틀라스·오류 검사 구현 완료
- [x] 자동 검증 통과 (`--check`, Node 3/3, `git diff --check`)
- [x] 검증 통과 및 사용자 이미지 승인 (01·03 오른발 반복을 인지하고 원본 그대로 선택)
- commit: `feat(art): add approved veteran walking atlas` (task-scoped local commit; hash in Git history)
