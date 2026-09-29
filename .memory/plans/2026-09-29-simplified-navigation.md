# Plan: 종료·홈 화면 간소화

## Goal

[확정 결정](../decisions/2026-09-29-simplified-navigation.md)에 따라 종료 화면의 주요 두 버튼을 ‘다시 도전 → 처음으로’ 순서로 표시하고, 조건부 광고 부활만 아래에 유지한다. 결과 화면의 랭킹/공유/닉네임/캐릭터/설정 진입 및 상태 문구를 제거한다. 홈은 랭킹·캐릭터·설정만 노출하고, 닉네임은 첫 안내 또는 첫 설정 전의 설정 화면에서만 만들 수 있다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | UI·진입 경로·회귀 테스트·학습 기록 | [P01](../phases/2026-09-29-simplified-navigation/P01-ui/phase.md) |

## Boundaries and dirty worktree

- `src/screens/ResultScreen.tsx`, `TitleScreen.tsx`, `SettingsPanel.tsx`, `App.tsx`와 직접 관련 테스트만 바꾼다. 서버 API·DB, 랭킹 제출/보류 처리, 광고 로직, 게임 물리/점수/해금은 유지한다. 기존 프로필 삭제 진입은 개인정보 보호를 위해 유지한다.
- 현재 베테랑 P01-T03와 iOS P03-T03는 `in_progress`로 보존한다. 새 UI 작업으로 포인터를 잠시 옮기되, 완료 후 베테랑 T03로 복귀한다. TestFlight 1.0.0(5)는 이미 제출되어 이 UI 변경은 **포함되지 않는다**. 배포는 별도 요청이다.
- 작업 트리에는 `App.tsx`, `docs/learning-notes.md`, `e2e/fixtures.spec.ts`, `e2e/layout.spec.ts`, 아트 및 출시 기록 등 미커밋 변경이 있다. 겹치는 `App.tsx`와 학습노트의 기존 변경을 되돌리지 않고, 커밋 시 이번 Task hunk만 stage한다. `test` 및 무관한 자산/문서는 건드리지 않는다.
- 과거 `e2e/storage.spec.ts`의 공유 테스트와 `e2e/online.spec.ts`의 홈 닉네임/랭킹 결과 문구 테스트는 새 UI에 맞게 업데이트한다. 기존 기능 자체를 삭제했다고 서버/API 테스트를 제거하지 않는다.

## Why one Task

버튼 제거와 App 전달 props/진입 경로를 별도 Task로 떼면 TypeScript와 UI 테스트가 중간에 실패한다. 작은 단일 UI 변경과 그 회귀 검증을 하나의 독립 커밋으로 묶는다.

## Out of scope / adjacent findings

- 현재 서버 `POST /profile`은 기존 닉네임 변경을 허용한다. 이번 선택은 UI 제한이지 보안 보장이 아니다. 서버 차단을 원하면 별도 정책·마이그레이션 결정이 필요하다.
- 닉네임 안내의 ‘나중에’는 유지하고 설정 화면에서 첫 설정이 가능해야 한다. 온라인 프로필 삭제 후 새 익명 신원은 새 설정을 할 수 있다.
- 랭킹 제출 실패 시 결과 화면의 재시도 버튼은 제거하지만 다음 게임 시작 시 기존 `PendingRankingPanel`이 처리한다. 이 흐름의 회귀 검사가 필요하다.
