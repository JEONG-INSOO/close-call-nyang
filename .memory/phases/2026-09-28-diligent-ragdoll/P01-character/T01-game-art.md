# Task: T01 성실한 냥대리 게임용 아트

## Status: done

## Goal
승인한 단일 렉돌 시안을 프로젝트 안에 보존하고, 동일 외형의 걷기 포즈를 게임에서 참조할 수 있는 투명 PNG 자산으로 만든다. 다른 캐릭터의 자산은 바꾸지 않는다.

## Decision Summary
- `diligent`만 크림/연회색 렉돌, 파란 눈, 연보라 카디건, 흰 블라우스, 작은 리본, 사원증으로 교체한다.
- 짧은 맨발 다리가 몸에 자연스럽게 붙고 발바닥 젤리는 발을 들 때만 살짝 보인다.
- 시안 이미지는 스타일 기준이며 자동으로 최종 게임 자산이라고 간주하지 않는다.

## Implementation

### I01. 승인 기준과 포즈 원본
- Related Files:
  - `docs/art/diligent-ragdoll-approved.png` :: 승인 시안 보존; new
  - `docs/art/source/diligent-walk-sheet.png` :: 두 발 보행 포즈의 생성 원본; new
- **Signatures & Types**: 파일은 PNG. 저장 키나 API 모델 변경 없음.
- **Data & Schema Fields**: `CharacterId='diligent'`와 `requiredCompletions=1`은 read-only.
- **Execution Flow / Logic**: 승인 이미지에서 같은 캐릭터의 걷기 좌·우 포즈를 생성한다. 원본의 털·눈·의상·실루엣을 유지하고 단색/투명 배경으로 분리한다. 결과를 육안 검사한다. 이미지 생성 편차가 크면 완료로 표시하지 않는다.
- **Error & Exception Handling**: 팔다리 수/사원증/색이 달라지거나 배경이 남으면 재생성하거나 분리 방식을 수정한다. 다른 캐릭터 이미지로 대체하지 않는다.
- **State Transition & Return**: 승인 기준과 포즈 원본을 별도 파일로 남긴다.

### I02. 게임용 프레임
- Related Files:
  - `assets/characters/diligent/step-a.png` :: 걸음 A 투명 이미지; new
  - `assets/characters/diligent/step-b.png` :: 걸음 B 투명 이미지; new
  - `scripts/build-diligent-frames.mjs` :: 원본 시트 검증·프레임 분리; new (필요 시)
- **Signatures & Types**: 두 PNG의 캔버스 크기와 발 기준점을 같게 한다. 배경 alpha=0, RGBA 파일.
- **Execution Flow / Logic**: 생성 시트에서 한 캐릭터씩 분리해 화면 내 동일 크기로 배치한다. 런타임에 이미지 처리하지 않고 빌드 시 자산을 고정한다.
- **Error & Exception Handling**: 투명도·프레임 크기·포즈 식별 검사를 통과하지 못하면 게임 연결로 진행하지 않는다.
- **State Transition & Return**: 두 프레임을 정적 `require`로 읽을 수 있게 한다.

## Acceptance Criteria
- [x] 승인 시안과 같은 렉돌의 두 걸음 프레임이 각각 한 마리만 담고 있다.
- [x] 이미지 배경은 투명하며 프레임 크기와 발 기준점이 동일하다.
- [x] 기본 회색 태비 및 `veteran` 이미지·코드는 그대로다.

## Validation
- `node scripts/build-diligent-frames.mjs --check` — 생성 스크립트가 필요한 경우 시트 구조·크기·알파 검사
- `git -c safe.directory=D:/GrillmeEDU diff --check` — 공백 오류 없음
- PNG 육안 검사 — 시안 유사성·팔다리 연결·발바닥 노출 확인

## Learning
- 배울 개념: 원본 시안과 런타임 자산의 차이, 알파 채널, 동일 기준점으로 프레임을 맞추는 이유.
- 예상 오류: 이미지 생성 포즈 간 얼굴/복장 편차, 배경 제거 후 가장자리 테두리.
- 완료 후 `docs/learning-notes.md`에 질문: 왜 두 포즈를 같은 크기·발 기준점으로 맞춰야 하나? 승인 이미지와 게임 자산은 무엇이 다른가? 배경 투명도를 어떻게 검증했나?

## Commit Message
```text
feat(art): add diligent ragdoll walking frames

Plan: 2026-09-28-diligent-ragdoll
Phase: P01-character
Task: T01-game-art

- Preserve the approved ragdoll concept and add two aligned transparent steps.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: `node scripts/build-diligent-frames.mjs --check`, `git diff --check`, 두 PNG 육안 검사
- commit: `55b72ff`
