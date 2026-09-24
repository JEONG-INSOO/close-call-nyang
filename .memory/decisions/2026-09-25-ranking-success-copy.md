# Decisions: 랭킹 완료 안내 간소화

- Date: 2026-09-25
- Status: Confirmed

## D01. 사용자 요청
- 결과 화면 온라인 안내에는 `랭킹등록완료!`만 표시하고 검증된 성공률/온라인 최고 기록/등수 상세 행은 제거한다.
- 기존 결과 성공률·기기 최고 기록, 별도 랭킹 화면 및 서버 저장은 변경하지 않는다.

## D02. 코드로 확인한 범위
- ResultScreen의 ranking-receipt Text가 상세 행을 표시한다. 완료 안내는 submitted와 receipt가 모두 있어야 한다. 확인 전 성공으로 표시하지 않는 조건을 보존한다.
- 문자열 변경에 따른 e2e/online.spec.ts 셀렉터도 함께 갱신한다. API SubmitResult 타입은 그대로 유지한다.
- 왜: 데이터 검증/보존과 화면 정보량을 분리하면 서버 동작을 건드리지 않고 UI만 단순화할 수 있다.
- Out of scope: 자동 push/Pages 재배포, 기존 Pages T03 검증. 추가 결함 없음.
