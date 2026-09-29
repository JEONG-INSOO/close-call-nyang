# Plan: 베테랑 냥대리 — 승인 시안의 게임 적용

## Goal

[사용자 승인 시안 v1](../../docs/art/proposals/veteran-mentor-concept-v1.png)을 기준으로 `veteran`의 걷기 4장·위험 1장·넘어짐 1장을 투명 원본과 단일 경량 아틀라스로 제작한다. 게임·캐릭터 선택 화면에 새 외형을 연결하고 웹 및 Expo Go에서 확인한다. `veteran` 저장 ID, 10회 해금, 물리·점수·랭킹·광고 규칙은 그대로다.

## Decisions

- [다정한 멘토 외형·시안 승인](../decisions/2026-09-29-veteran-mentor-art.md)
- 사용자는 기존 iOS 검증보다 베테랑 제작을 우선하기로 선택했다. 기존 P03-release/T03의 `in_progress` 기록은 보존하며, 이 작업 완료 후 복귀한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 이미지 원본·아틀라스 → 화면 연결 → 브라우저/기기 검증 | [P01](../phases/2026-09-29-veteran-mentor-sprite/P01-character/phase.md) |

## Boundaries and dirty worktree

- 본 계획은 `veteran`의 **외형 교체**다. `src/game`, `src/online`, `supabase`, `src/characters/catalog.ts`, 수집 저장 키와 0/1/10회 기준, 실광고 설정, iOS/웹 원격 배포는 수정하지 않는다.
- `NyangCharacter`의 공통 넘어짐·보호·거리 기반 프레임 구독은 유지한다. 위험 표정은 기존 `expressionAt`의 좌우 40° 기준을 재사용한다.
- 계획 작성 전부터 작업 트리는 dirty였다. `App.tsx`, 성실한 냥대리 자산·코드·테스트, 출시 관련 `.memory` 문서, 사용자 `test` 등 다른 작업자의 변경을 되돌리거나 통째로 stage/commit하지 않는다. 공유 파일 `NyangCharacter.tsx`/장면 테스트/`docs/learning-notes.md`는 실행 시 최신 내용을 다시 확인하고 이번 Task 변경만 좁게 반영한다.
- T01의 그림 결과는 사람의 육안 승인이 필요하다. 이미지 생성의 성공만으로 같은 캐릭터·교대 발·알파·발 기준점이 검증된 것은 아니다.
- 로컬 `dist`/`output`과 기존 실행 서버는 사용자 상태다. 브라우저 검증은 번들 버전을 확인하고 전용 출력 경로를 우선 사용한다. TestFlight/App Store/GitHub Pages 배포는 자동으로 시작하지 않는다.

## Why these Task boundaries

T01은 캐릭터 원본과 재현 가능한 아틀라스를 완성해 독립 검증한다. T02는 **승인된** 아틀라스만 읽는 렌더러와 단위 테스트를 함께 바꿔, 기존 SVG 기대 테스트가 실패한 채로 남지 않게 한다. T03은 실제 웹 화면·Expo Go 시각/성능 검증과 학습노트를 다룬다. 그림 승인과 런타임 FPS는 서로 다른 증거이므로 한 Task의 성공으로 다른 Task를 완료 처리하지 않는다.

## Out of scope / adjacent finding

- 기존 `e2e/fixtures.spec.ts`와 `e2e/layout.spec.ts`에는 옛 베테랑 SVG를 전제로 한 검사가 있다. 이는 이번 외형 교체에 직접 관련되어 T03에 포함한다.
- 이전 iOS 검증 P03-T03과 새 성실한 냥대리의 실기기 FPS 평가는 여전히 미완료다. 베테랑 로컬 아트 검증을 그 출시 작업의 완료로 간주하지 않는다.
- 스토어 문구 승인, 광고 SDK, 원격 게시와 기존 dirty 파일 일괄 정리는 별도 사용자 결정이 필요하다.
