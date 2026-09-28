# Plan: 터치 성능 최소 수정
## Goal
입력 의미를 바꾸지 않고 레이아웃 변동과 표시 불변 재렌더링을 제거하고 회귀 검증한다. 실기기 성능 개선의 크기는 미확인으로 구분한다.
## Phases
| Phase | Status | Summary | Blueprint |
| --- | --- | --- | --- |
| P01 | done | 입력·표시 경로 비용 감소 및 검증, 756c005 | [P01](../phases/2026-09-28-touch-performance/P01-input/phase.md) |
## Boundary
Task1개에 컴포넌트·회귀검사를 묶어 항상 검증 가능한 변경으로 만든다. 완료 후 원래 P03-release/T03-ios-build-validation로 복귀한다. 기존dirty current/docs/ios-release/eas.json/release-inputs/release-state/release-preparation.test 변경은 이 코드 커밋에 섞지 않는다. 광고 플래그/엔진/rules/hash/서버 복사본은 불변, 웹 검사용 산출물은 output 아래 새 경로, 기존 dist/서버/사용자 저장 보존.
