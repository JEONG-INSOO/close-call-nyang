# Decision: 개인정보 방침 보완 선행 배포

- Status: confirmed
- 사용자1: 방침 배포를 별도 Task로 분리해 완료·커밋·푸시 승인(2026-10-01).
- 이미 승인한 `store/privacy-approval.json.policySupplement` 한·영 두 문단과 시행일2026-10-01만 공식 privacy 페이지에 반영한다. 새 개인정보 선언/문구를 추측하지 않는다.
- 단일 Phase의 T01 로컬 계약·페이지 검증 후 소스 커밋, T02 정상 main push→정확한 commit의 Pages 성공→공개 HTTP/한영 내용·hash 확인 후 증거 커밋. 실패한 배포를 완료로 기록하지 않는다.
- 기존 심사 T03는 in_progress로 보존하고 선행 배포 완료 후 복귀한다. App Review/공개 출시/계정 DSA/서버 데이터/새IPA는 이번 범위 아님.
- 무관한 dirty 파일·아트·test/debug.log 및 T03 미완료 기록을 커밋하지 않는다. shared memory/learning 문서는 이 Task의 새 포인터/링크만 선택 stage한다.
