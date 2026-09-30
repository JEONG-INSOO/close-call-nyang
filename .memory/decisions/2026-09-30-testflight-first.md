# Decision: 최신 소스 TestFlight 테스트 우선

- Date: 2026-09-30
- Status: confirmed
- 사용자 명시 요청: “testflight에 배포해줘. 테스트해보게”. 기존 승인된 앱/팀/production 서명을 사용해 최신 소스 하나를 빌드·업로드한다.
- 현재 P01-T03 스토어 소개 초안보다 P02-T01 빌드 전달을 우선한다. T03은 pending으로 보존하며 최종 소개 승인·실제 iPhone 원본·심사 준비 게이트를 없애지 않는다.
- TestFlight 업로드는 App Review 제출/공개 출시/외부 테스터 초대/웹 재배포 허가가 아니다. GitHub push도 이번 요청에 포함되지 않는다.
- 기존 dirty 작업은 보존한다. 실제 업로드 archive가 고정 커밋 입력과 일치하지 않으면 빌드하지 않는다. 로그/비밀 제외를 먼저 확인한다. 이전 build5 사실은 역사 기록으로 보존하고 새 build/submission ID를 별도로 추적한다.
