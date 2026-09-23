# Decisions: 랭킹 상위 30명 표시

- Date: 2026-09-23
- Status: Confirmed

## D01. 공개 목록 범위
- **Chosen**: 공개 목록은 상위 30명만 표시하고, 현재 플레이어가 30위 밖이면 `내 순위`를 별도 표시한다.
- **Rationale**: 화면을 간결하게 유지하면서 자신의 전체 순위를 잃지 않는다. 기존 상위 목록+내 순위 UX를 보존한다.

## D02. 서버와 클라이언트의 계약
- **Chosen**: 서버 SQL 함수가 30개를 반환하고 Edge Function·클라이언트 파서도 최대 30개를 검증한다.
- **Rationale**: UI만 자르면 네트워크 payload와 서버 fixture가 불일치하므로 단일 계약으로 제한해야 한다.

## D03. migration 정책
- **Chosen**: 이미 staging에 적용된 migration은 수정하지 않고 새 migration으로 top-30 함수를 배포한다.
- **Rationale**: 적용 이력을 재작성하면 staging·production의 schema history가 갈라진다.

## D04. 검증 데이터
- **Chosen**: staging 전용 fixture는 31명을 사용해 공동 1·1·3 순위와 31위 밖 `me`를 검증하고 전체 트랜잭션을 rollback한다.
- **Rationale**: 30위 경계와 내 순위 분리를 가장 작은 데이터셋으로 검증하며 production에는 synthetic score를 넣지 않는다.
