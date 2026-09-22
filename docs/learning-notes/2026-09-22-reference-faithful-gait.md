# 2026-09-22 연결된 신입 실루엣과 발 젤리 노출

## 바뀐 것
- rookie 재킷 실루엣을 넓혀 머리와 연결하고, 소매/다리를 재킷 뒤에 그려 어깨·엉덩이 이음새를 숨겼다.
- `soleRevealAt(stride, fallen)`: 디딘 발은 젤리 0, 들린 발만 최대 0.82로 살짝 노출, 넘어짐은 1.
- rookie 보폭만 18도/좌우3/들기8로 키웠다. 보상 diligent/veteran은 11도/2/5 유지.
- 물리·보상·커피·저장·랭킹 규칙 변경 없음. 규칙 `nyang-v1-f7245064c9459310` 유지.

## 검증
- typecheck, Jest 650, ranked:check / generate-ranked-replays --check 통과.
- web:export → fixtures:build → online-fixtures:build 순차 재빌드 후 전체 Chromium 34 pass / 11 intentional skip / 0 fail (3.9분, 사용자 4173 서버 재사용 설정).
- 4173이 제공하는 HTML/JS가 새 dist(`index-d7faa3a667dbf16d952226333ed3dcd8.js`)와 바이트 동일. local-only env scan, `git diff --check` 통과.
- `docs/art/grey-tabby-connected-gait-v2.png` 실제 SVG 캡처 확인.

## 한계와 후속
- 이 버전은 정면을 향한 채 걷는 모습이다. 사용자 검토에서 "우측 진행처럼 보여야 한다"는 피드백을 받아 옆모습 재설계로 대체될 예정이다([결정](../../.memory/decisions/2026-09-22-side-view-walk.md)). 이 커밋은 정면 버전으로 돌아올 수 있는 기준점이다.
- iPhone/Hermes/실제 손맛은 미검증.
