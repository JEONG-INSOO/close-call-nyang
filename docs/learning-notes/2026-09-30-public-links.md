# 앱 안에서 공식 개인정보·고객지원 페이지 열기

## 무엇을, 왜

웹 페이지 게시와 앱 안의 접근 버튼은 다른 작업이다. 누구나 설정 하단에서 두 안내를 열고, 랭킹 문의도 같은 공식 지원 주소를 사용하도록 했다. Expo Go에 이미 있는 React Native `Linking`을 사용해 네이티브 SDK나 WebView를 추가하지 않았다.

```ts
// 설정과 랭킹이 같은 상수를 공유한다.
await Linking.openURL(PUBLIC_LINKS.support);
```

`src/config/publicLinks.ts`에 HTTPS 주소를 고정한다. URL에 Auth ID·토큰·닉네임을 붙이지 않는다. render/mount 때 열지 않고 사용자가 탭했을 때만 호출한다. React Native Web의 설치된 Linking 구현은 이 호출을 `window.open(..., '_blank', 'noopener')`로 연결한다.

## 데이터와 비동기 UI 경계

- 설정 탭 → 공통 URL → OS/웹 브라우저. 서버 쓰기·계정 생성·새 저장 키는 없다.
- 링크를 온라인 프로필 조건부 영역 **밖**에 두어 닉네임 없는 사용자도 접근한다. 기존 44pt 버튼·스크롤 영역을 재사용한다.
- React state `openingLink`는 화면의 disabled 표시, ref `linkLocked`는 같은 렌더 사이의 중복 호출을 막는다. 삭제 중에도 링크를 열지 않는다.
- 오류는 `linkError`로 분리한다. 브라우저 실패가 계정 삭제/인증 오류를 지우지 않으며, raw exception은 사용자 화면에 표시하지 않는다.
- `generation`은 닫았다 다시 연 패널의 세대를 구분한다. 이전 요청이 늦게 끝나도 새 패널의 잠금을 풀거나 오류를 되살리지 않는다. 패널을 닫으면 안내 오류를 초기화한다.
- `/web-static/`은 공개 웹 export의 소스다. EAS iOS 업로드에서는 제외하지만 공통 URL 모듈은 앱 런타임에 남긴다.

## 실제 검증 — 2026-09-30

- 관련 Jest41/4 suites, 전체700/50 suites, typecheck, ranked8(규칙 `nyang-v1-bc732af6f2a7ea66`), release8 통과.
- 게스트/등록 사용자 두 링크, mount 호출0, 정확한 URL, 중복 탭, 안전 오류·재시도, close/reopen의 늦은 응답, parent/local 삭제 busy를 mock으로 검증했다. 기존 닉네임·삭제 회귀도 통과했다.
- 기존 dist를 덮지 않고 `output/public-links-web`의 **local-only** export를 만들었다. JS1/assets18/정책 HTML/opaque ICO와 공개 환경 검사8 통과. 운영 연결 빌드라는 뜻은 아니다.
- 실제 브라우저3/3(7.7초), 1280×720/844×390/667×375에서 설정 스크롤과 44pt 링크, 실제 탭 후 새 브라우저 URL, 랭킹의 같은 지원 주소를 확인했다. 외부 요청은 정해진 URL의 응답만 테스트로 가로채 서버/계정 쓰기를 하지 않았다. 작은 가로 화면 캡처도 육안 확인했다.
- 실패에서 배운 점: Jest의 기본 Linking은 이미 mock 함수라 `mockRestore()`만으로 호출 이력이 초기화되지 않았다. 테스트마다 `mockReset()` 후 resolve 동작을 지정했다. `Promise<void>`를 명시해 완료 콜백 타입을 맞췄으며 텍스트 부분 일치는 정규식 matcher로 검사했다. 앱을 바꿔 테스트 실패를 감추지 않았다.

## 제한·범위 밖

브라우저 API의 Promise 성공은 페이지 렌더·iPhone Safari 복귀 성공을 증명하지 않는다. 웹 브라우저가 popup을 차단할 때 RN-web 구현은 이를 reject로 알려주지 않을 수 있다. 실제 iPhone Safari 열기·앱 복귀·일시정지 유지 확인은 새 TestFlight QA에 남았다.

이 Task는 링크와 안전 오류 처리만 바꿨다. 게임 물리·프레임 처리·광고·닉네임 정책·서버·저장 계약은 불변이다. 이번 앱 링크 소스는 아직 공식 웹/새 IPA에 배포하지 않았다. 공개 **문서** 배포와 앱 **코드** 배포를 구분한다. 기존 효과음 설명에 남은 ‘휘청이는 소리’ 문구는 별도 문구 정리 대상이며 이번 범위에서 바꾸지 않았다.

## 복습·다음 연습

1. URL을 두 화면에 복사해 쓰면 어떤 불일치가 생길까?
2. state만 쓰는 잠금과 ref 잠금의 역할은 어떻게 다를까?
3. 첫 요청을 pending으로 둔 채 패널을 닫고 다시 연 뒤 새 요청을 시작해 보자. 옛 요청 reject가 새 잠금을 풀면 어떤 문제가 생길까?
4. 최신 TestFlight에서 개인정보 링크를 탭한 뒤 앱으로 돌아와 게임이 자동으로 재개되지 않는지 확인하자.
