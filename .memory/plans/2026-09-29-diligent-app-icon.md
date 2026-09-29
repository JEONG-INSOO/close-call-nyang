# Plan: 성실한 냥대리 iOS 앱 아이콘

## Goal

[확정 결정](../decisions/2026-09-29-diligent-app-icon.md)대로 성실한 냥대리의 얼굴·리본이 또렷한 연보라 1024px 앱 아이콘을 만들고, 기존 웹 파비콘은 동일하게 유지한다. 생성 원본과 빌드 산출물이 불일치하면 검증이 실패해야 한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 아트 원본·브랜딩 파이프라인·검증·학습 기록 | [P01](../phases/2026-09-29-diligent-app-icon/P01-branding/phase.md) |

## Boundaries

- 단일 Task로 다룬다. 원본만 바꾸면 기존 `branding:verify`가 실패하므로 아트·렌더러·테스트를 함께 검증해야 한다.
- 미커밋 베테랑 P01-T03/iOS P03-T03, `App.tsx`, 성실한 냥대리 게임 자산과 사용자 `test`를 보존한다. 완료 후 `.memory/current.md` 포인터를 베테랑 P01-T03로 복귀시킨다.
- 아이콘 변경은 Expo Go에서 네이티브 홈 아이콘으로 보이지 않을 수 있다. 기기 설치 검증은 향후 새 TestFlight 빌드에서 수행하고, 이번 Task에서는 로컬 PNG를 1024px/축소판으로 육안 검토한다.
- 인접 발견: 앱스토어 공개 전에 스토어 초안의 지원/정책 정보와 실제 기기 검증이 별도로 필요하다. 이번 아이콘 작업에 포함하지 않는다.
