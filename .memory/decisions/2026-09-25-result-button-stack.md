# Decisions: 결과 버튼 통일 및 재배포
- Date: 2026-09-25
- Status: Confirmed
- 사용자 요청: 종료화면의 처음으로/다시도전 등 모든 버튼을 동일한 규격으로 한 행에 하나씩 표시, 공식 사이트 재배포.
- 구현 선택: 공통 full-width/minHeight50/radius14/동일 배경·글자 스타일, 세로 gap10. 기존 순서/버튼 기능/광고 노출 조건/성공 안내 유지. 대기중 재전송 버튼도 같은 외곽 너비로 배치.
- 코드 확인: 현재 actions=row, services=wrap이며 개별 flex 비율·글자 크기가 다름. ScrollView 유지하여 작은 가로화면에서도 접근 보장.
- API/저장/규칙/production 사용자 데이터 변경 없음. 사용자 재배포 요청은 검증된 main 일반 push와 기존 Pages workflow 실행을 허용한다. 비밀/설정 변경 불필요.
