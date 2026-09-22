# Plan: 긴장감과 평면 찌비 냥대리 구현

## Goal

[확정 결정](../decisions/2026-09-22-brisk-balance-flat-chibi.md)에 따라90초 진행을 보존하면서 화면 이동과 균형의 긴장감을 높이고, 넥타이/사원증만 착용한 약2등신 평면 고양이를 실제 로컬 웹에서 플레이할 수 있게 한다. 사용자가 저장 뒤 코드까지 진행을 명시했으므로 계획 완료 후 같은 요청에서 실행한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | in_progress | 외형·움직임·물리·재생·웹 검증 통합 | [P01](../phases/2026-09-22-brisk-balance-flat-chibi/P01-gameplay/phase.md) |

## Task boundary

단일 검증 가능한 Task다. 시각 배율/발걸음/음향 타이밍과 물리의 생성된 서버 규칙을 중간 상태로 완료하지 않는다. Task 내부에서 서로 다른 파일을 병렬 구현하고 통합 빌드/검증/커밋은 한 번 수행한다. 미사용 theme 옛 치수 정리나 신규 클라우드 배포로 범위를 늘리지 않는다.

완료 후 미완료 기존P02-T03으로 복귀한다. 사용자 데이터/기존4173서버/dirty worktree를 보존하고 자동 푸시·production/Pages/스토어 배포를 하지 않는다.
