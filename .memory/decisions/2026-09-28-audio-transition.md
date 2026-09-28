# Decisions: 오디오 전환 중복 작업 제거
- Confirmed: 사용자 음악/효과음/진동을 모두 끄면 훨씬 낫다고 보고. 개별 원인은 미분리; 오디오 중복 호출은 코드 재현됨.
- 사용자 승인: 중복 pause 및 시작/종료 집중 호출 개선, 테스트 후 새 TestFlight 업로드. 난이도/역방향 제동/위험 포즈/광고/랭킹/햅틱 정책은 유지.
- 이미 재생 또는 재생요청 중인 플레이어만 pause하되, 늦은 promise/priming/중단/unmount 안전장치를 보존한다. 동일 setPlaying 알림은 no-op, 명시적 unlock으로 새 시작 시 이전 fall 종료.
- 전역 audio session을 상시 활성화하지 않는다. keepAudioSessionActive false와 무음/백그라운드 정책 유지. 실제 체감 개선은 새 빌드에서 다시 확인.
