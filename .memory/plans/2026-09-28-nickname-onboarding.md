# Plan: 첫 닉네임 안내와 결과 화면 참여 안내

## Goal
닉네임 없는 사용자가 첫 홈에서 설정하기/나중에를 선택하고, 건너뛴 이후에는 결과 화면 문구로 다음 도전의 랭킹 참여를 안내받는다. 기존 사용자의 설정·점수·수집·온라인 검증은 변경하지 않는다.

## Decision
[확정 결정](../decisions/2026-09-28-nickname-onboarding.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | in_progress | 로컬 안내 이력·첫 안내·결과 안내 및 회귀 검증 | [P01](../phases/2026-09-28-nickname-onboarding/P01-onboarding/phase.md) |

## Scope / Boundaries
- 단일 Task로 저장과 화면 연결을 함께 검증한다. 별도의 서버/API/랭킹 도전 프로토콜 변경은 없다.
- 첫 안내 이력만 독립 AsyncStorage 키로 저장한다. 기존 Preferences 스키마와 hydration(저장 정보 읽기) 병합은 수정하지 않는다.
- 시작 전 dirty: 기존 P03-release/T03-ios-build-validation.md, P03-release/phase.md, `test`. 보존하고 이 Task 커밋에서 제외한다. 사용자 `test` 내용은 읽거나 덮어쓸 필요 없다.
- current는 이 계획으로 전환하되 이전 release 기록은 보존. 완료하면 원래 P03-T03로 복귀하고 보상 캐릭터 작업을 이어갈지는 별도 요청을 받는다.
- 기존 TestFlight4 완료 확인은 사용자 담당. 배포/모니터링/GitHub push/광고/새 캐릭터/스토어 심사 자동 실행 없음.
- 이 단계 산출물은 .memory 문서뿐이며 앱 코드와 학습노트 변경은 실행 단계에서 한다.
