# Plan: 인형형 냥대리와 빠른 균형

## Goal

확정된 [결정](../decisions/2026-09-22-plush-cat-and-balance.md)에 따라 세 캐릭터를 짧은 고양이 팔다리로 바꾸고 약65도까지 버티는 빠른 균형 물리를 실제 로컬 웹 빌드로 전달한다. 이번 요청은 계획과 구현을 모두 명시하므로 문서 준비 후 순차 실행한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | done ✅ | 공통 체형·물리·재생규칙·시각 QA 완료 (4caea00) | [P01](../phases/2026-09-22-plush-cat-and-balance/P01-game-feel/phase.md) |

## Scope and Return

단일 Task로 묶는다. 표시와 임계각을 따로 완료하면 새 몸의 큰 기울기가 잘리는지 검증하기 어렵고 앱/서버 규칙이 다른 중간 상태를 만들기 때문이다. Task 내부의 아트와 엔진 파일 작업은 분리 병렬 수행할 수 있으나 통합 검증/커밋은 한 번만 한다.

기존 P02-T03은 미완료로 보존한다. 완료 뒤 [기존 서버 검증](../phases/2026-09-21-close-call-nyang/P02-leaderboard/T03-hosted-verification.md) 포인터로 복귀하되 새 규칙 staging 배포·재검증 필요를 남긴다. 이번에는 DB/클라우드/Pages/스토어 배포·요금변경·푸시하지 않는다. 기존 점수/해금/설정/세션 삭제 없음.
