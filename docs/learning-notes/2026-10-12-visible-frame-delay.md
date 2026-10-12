# 짧은 렌더 지연과 실제 화면 이탈 구분하기

## 현상과 확인한 사실
사용자는 iPhone Safari에서 효과음을 켜면 ‘잠시 쉬는 중’이 반복되고 끄면 괜찮다고 보고했다. 실제 기기 원인 로그는 없다. 오디오가 지연을 만들었다는 것은 가설이며, 코드에서 확인된 사실은 `deltaMs > 100`이면 화면이 보여도 바로 PAUSE했다는 점이다. 앞선 500ms blur 유예와 이 타이밍 경로는 별개였다.

## 무엇을 왜 바꿨나
`src/game/controller.ts`의 createGameController에 선택적인 `isPageVisible(): boolean` 정책을 주입했다. `src/game/useGameController.ts`는 웹에서만 현재 document.visibilityState를 읽는다. 네이티브에는 정책을 전달하지 않아 기존 동작이 유지된다.

```ts
if ((state.screen === 'playing' || state.screen === 'countdown') &&
    deltaMs <= MAX_VISIBLE_FRAME_DELAY_MS && timing.isPageVisible?.() === true) {
  accumulator = 0;
  return;
}
```

이 분기는 100ms를 넘은 프레임에서만 실행한다. 웹 화면이 보이고 500ms 이내라면 이번 지연 시간과 남은 소수 틱을 버리고 다음 정상 프레임부터 계속한다. 입력을 지우지 않으므로 누르고 있던 방향이 유지된다. 지연된 시간을 한번에 물리 계산하면 캐릭터가 갑자기 넘어지거나 점수가 뛰므로 소급 계산하지 않는다. 고정 1/120초 엔진·서버 재생·규칙 버전은 그대로다.

## 유지한 보호
- 실제 visibilitychange hidden/pagehide: 즉시 정지. visible 복귀만으로 자동 재개하지 않는다.
- 500ms 지속 blur, 500ms 초과 프레임 중단: 정지 보호 유지.
- 수동 정지와 광고: 자동 재개하지 않는다. 광고에는 짧은 지연 예외를 적용하지 않아 지연 시간으로 보상을 얻지 못한다.
- 정상 100ms 이하 프레임은 기존 최대12 고정 틱 계산, native 정책도 기존 그대로.

## 검증
controller 경계 테스트37개 통과:100.1/250/500ms 복구,500.1ms/1초/10초 정지, hidden, countdown, manual, 광고, 틱·효과 무발생, 입력 유지, 다음 틱과 순수 엔진 동일 확인. 타입 검사 및 서버 엔진8파일 parity 통과(`nyang-v1-bc732af6f2a7ea66`). 전체 Jest50 suites/725개, Chromium phone-landscape 게임 테스트7개 통과. 새 테스트는 실제 main thread를180ms 막은 뒤 정지창 없이 조작 가능함과 hidden 후 수동 재개를 확인했다. iPhone Safari 오디오 실측을 대체하지 않는다. 별도 output/public-links-web 빌드 완료 후 검사했으며 기존 아트/QA 메모 변경은 보존했다.

처음 Jest는 sandbox Temp realpath EPERM으로 시작하지 못해 일반 환경에서 같은 명령을 재실행했다. 테스트 단언을 완화하거나 런타임 정책을 우회한 것은 아니다.

## 알아야 할 한계 / 함께 확인한 점
실제 아이폰의 오디오 지연 길이·정확한 이벤트 순서는 아직 미계측이다. 500ms가 넘는 중단이나 실제 이탈 알림이면 여전히 정지한다. 이 수정은 짧은 지연의 오정지 경로를 해결하며 효과음 자체를 더 빠르게 만들거나 모든 Safari 문제를 해결했다고 주장하지 않는다. 범위 밖 추가 결함 특이사항 없음. Web Audio 교체는 이번 선택에 포함되지 않는다.

## 복습과 다음 연습
1. 화면이 보인다는 정보와 프레임 간격은 왜 다른가?
2. 지연을 버리지 않고 다음 프레임에 누적하면 어떤 일이 생길까?
3. 광고 타이머와 물리 틱에 같은 복구 예외를 무조건 적용하면 왜 위험할까?

아이폰에서 효과음을 켠 채 플레이하고, 홈으로 나갔다가 돌아오면 정지창이 남는지도 확인한다. 기기 데이터 삭제/재설치는 필요 없다.

## 공개 배포 결과
소스 `783f1ce097dfebd0615de8367570d4cad5689091`을 main에 푸시했고 Pages run `38212634050`의 build/deploy가 모두 성공했다. GitHub에서도 Jest725, 랭킹191, 전체 Chromium58 pass/11 의도된 skip/0 fail이다. 공식 index/JS/support/privacy GET200이며 공개 JS에서 visible 콜백/100·500ms 정책/가상 광고 활성화를 확인했다. 기존 개인정보 페이지는 커밋된 바이트와 동일했다. 증거는 `store/web-frame-delay-2026-10-12.json`. 실제 iPhone Safari 재검증과 iOS 바이너리 갱신은 수행하지 않았다.
