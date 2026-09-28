# Plan: 오디오 전환 비용 개선 및 TestFlight 업데이트
## Goal
반복적인 idle pause 제거와 안전한 효과음 전환, 식별 가능한 새 iOS 바이너리 업로드.
## Phases
| Phase | Status | Summary | Blueprint |
| --- | --- | --- | --- |
| P01 | in_progress | 오디오 회귀 수정 후 TestFlight 업로드 | [P01](../phases/2026-09-28-audio-transition/P01-audio/phase.md) |
## Boundary
기존 dirty release 문서/current/release-state는 보존; 별도 학습노트 파일 작성 후 기존 index에 링크. 코드 Task 완료 커밋과 배포 기록 구분. 물리 변경 없음으로 ranked 생성사본 재생성 불필요(check 필수). 공개 사이트 push/심사/새 과금 없음. P03-T03 native 전체QA 미완료로 복귀.
