# 오디오 전환 중복 호출 줄이기

## 증상과 근거
사용자는 빠른 교차 터치는 괜찮지만 시작/종료에 끊김이 있고, 음악·효과음·진동을 모두 끄면 훨씬 나아진다고 보고했다. 이것은 피드백 경로의 단서이지 개별 오디오/햅틱 원인 확정은 아니다. 코드상 snapshot 알림마다 같은 setPlaying(false)가 전달돼5개 플레이어를 반복pause했다.

## 핵심 변경
`src/services/audioCore.ts`에서 `if (playing === value) return`으로 같은 상태 알림을 건너뛴다. 이런 식으로 같은 요청을 반복해도 추가 부작용이 없게 만드는 성질을 멱등성이라고 한다.

`needsPause: Set<AudioKey>`는 실제 play 명령을 보낸 플레이어만 추적한다. 정상 종료나 성공한 pause 후에는 지워서 이미 조용한 소리에 native pause를 보내지 않는다. JS snapshot → 오디오 정책 → 꼭 필요한 native play/pause라는 흐름이다. 프레임 루프/물리/랭킹 증거는 건드리지 않았다.

단순히 pause 호출만 생략하면 안 된다. 기다리는 play/seek promise를 취소하는 tickets/generation은 계속 갱신해야 한다. 웹의 제스처 priming 중인 재생도 추적하고, 예상 밖의 late playing 상태가 오면 반드시 다시 정지한다. pause가 예외를 내면 추적을 남겨 후속정지에서 재시도할 수 있다.

## 실패에서 배운 점과 회귀 방지
새3개 테스트가 기존 코드에서 모두 실패했다(기존12개통과). 반복false30회는pause150회였다. 게임오버 시 music+step만 실제재생해도 stopEffects가여러번돌며총10pause를발생시켰다. 수정 후 반복false30회0pause, 종료는재생중인music+step각1회로2pause. 이는 명령 횟수 개선이지 FPS 측정값이 아니다.

같은false를무시하면 결과의fall이재생되는동안새게임도false인countdown으로전환될수있다. 따라서 새시작/재시도unlock에서 이전결과효과음과pendingseek를명시적으로취소했다. 반대로 단순반복false알림은 준비중인fall을잘라서는안된다. 이두상황을구분하는검사를추가했다.

## 범위와 주의
오디오session상시활성화나햅틱off를해결책으로넣지않았다. 기존 keepAudioSessionActive:false/무음/백그라운드정책, 독립설정, 웹제스처허가/중단복귀를유지한다. 광고off/난이도/반대입력제동/위험포즈전환도불변. 위험머리각도순간변경과제동력은이미알려진별도검토사항이고이번범위에포함하지않는다.

## 검증
대상 feedback15개 통과(웹 priming/늦은거절/중단/cleanup 포함), 전체Jest675개/45suites(41.584초), 타입/랭킹8파일/배포7검사통과. 새TestFlight ID는배포결과에기록한다. 실제iOS/Safari오디오성능은mock검사로대체하지않는다.

## 다음 연습
1. 상태 알림과 실제 플랫폼 명령의 횟수가 왜 달라야 할까?
2. pause를 생략하면서 promise 취소 처리는 유지해야 하는 이유는?
3. 새 빌드에서 음악만/효과음만/진동만 켠 비교가 왜 필요한가?
