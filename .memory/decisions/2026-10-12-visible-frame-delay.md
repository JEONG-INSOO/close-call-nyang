# Decision: 보이는 웹 화면의 짧은 프레임 지연

- 사용자 확인: 효과음 사용 시 뜨는 것은 설정창이 아닌 ‘잠시 쉬는 중’. 실제 이탈과 짧은 지연을 구분하는 수정 선택. Web Audio 전환은 이번 범위 밖.
- 웹 document.visibilityState === 'visible'인 playing/countdown에서만 100ms 초과~500ms 이하 프레임 지연을 버리고 계속한다. 입력 유지, 누적 시간 제거, 점수/물리/랭킹 틱을 소급 생성하지 않는다.
- 500ms 초과 또는 hidden/알 수 없는 상태, native 기본 정책은 기존 자동 정지. 실제 visibilitychange/pagehide·500ms blur 정책, 수동 정지, 광고 타이머의 기존 엄격한 정지 유지.
- 사용자 iPhone 오디오 원인은 실측 전 추정이다. 재현 가능한 지연 테스트와 실제 iPhone 검증을 구분한다.
- 앞선 동일 Safari 수정 요청의 GitHub 업로드 승인에 따라 검증 후 main 푸시/Pages 배포 확인. iOS 바이너리 및 심사 정보 변경 없음.
