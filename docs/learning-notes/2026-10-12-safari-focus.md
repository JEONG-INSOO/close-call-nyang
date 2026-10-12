# Safari의 잠깐 blur와 실제 숨김을 나누기

## 무엇을, 왜
`useAppLifecycle.web`은 window blur 한 번마다 즉시 PAUSE를 요청했다. 포커스 이탈은 화면이 사라졌다는 뜻이 아니므로 Safari에서 잠깐 발생한 이벤트가 이어하기 화면을 여는 경로였다. 실제 iPhone 이벤트 로그로 유일한 원인을 계측한 것은 아니다.

## 핵심 흐름
`subscribeWebForeground`를 게임과 온라인 시작이 공유한다. visible blur는 500ms 타이머, focus는 취소, 그때도 `document.hasFocus()`가 false면 비활성 처리한다. hidden/pagehide는 기다리지 않고 정지한다. 포커스 복귀는 업로드를 허용할 뿐 게임을 자동 재개하지 않는다.

`if (timer !== null) return`으로 반복 blur가 계속 유예를 늘리지 않게 한다. unmount에서는 타이머와 이벤트를 제거한다. 최신 React callback은 ref로 읽는다. 키보드/터치 입력 해제, native AppState, 큰 프레임 간격의 안전 정지는 그대로다.

## 검증
관련 Jest28/28, TypeScript, ranked:check8파일 통과. 광고 false로 만든 별도 production 웹 번들에서 휴대폰 가로 Chromium UI2/2 통과: 지속 blur 뒤 수동 재개/세로 정지, 100ms blur 복귀 후 이어하기 창 없음. 499/500ms, hasFocus만 복귀, hidden/pagehide, 중복 blur, cleanup, 온라인 시작 응답의 취소 경계도 검사했다. 실제 iPhone Safari 조작은 별도 확인이 필요하다.

첫 테스트에서 `jest.getTimerCount() === 0`은 실패했다. React Native 테스트 렌더러도 타이머를 소유하므로 전역 총합으로 이 구독의 cleanup을 판단할 수 없다. 이 구독의 listener 제거와 unmount 뒤 유예 시간이 지나도 callback이 실행되지 않는 검사를 사용한다. 499/500ms와 실제 hidden 정지 조건은 그대로 검사한다.

## 다음 연습
1. blur와 hidden의 차이는? [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
2. timer를 지우지 않고 hook을 해제하면 어떤 일이 생길까?
3. 포커스가 돌아왔을 때 업로드와 게임의 재개 정책은 왜 다른가?

## 범위 밖
긴 프레임으로 발생하는 pause는 별도 안전장치다. 이번 수정으로 모든 종류의 끊김을 해결했다고 주장하지 않는다. 기존 스토어 심사와 지역 변경은 수행하지 않는다.
