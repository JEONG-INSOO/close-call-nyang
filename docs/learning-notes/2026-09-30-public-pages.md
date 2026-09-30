# 한·영 지원·개인정보 페이지를 빌드와 배포에 연결하기

## 무엇을, 왜

App Store에 주소를 입력하는 것과 그 주소에 실제 안내가 존재하는 것은 다르다. Expo의 게임 export가 성공한 **뒤** 알려진 HTML 두 개를 복사하고, 누락되면 배포 검사를 실패시키도록 했다. 웹 게임과 정책 페이지는 같은 GitHub Pages 프로젝트 경로를 사용한다.

```js
await expoExportSucceeded;
await copyPublicPages({ outputRoot });
// /close-call-nyang/support/, /close-call-nyang/privacy/
```

실제 코드는 `scripts/export-web.mjs`의 자식 프로세스 완료 Promise 후 `copyPublicPages()`를 호출한다. Promise는 작업 완료·실패를 나타낸다. child의 실패를 성공 복사로 덮지 않는다.

## 데이터 흐름과 경계

- `web-static/*/index.html` → Expo export 완료 → 출력 폴더의 `support/index.html`, `privacy/index.html` → CI 검사 → Pages 배포 → 실제 HTTP/브라우저 검사.
- 공개 닉네임·publicId·최고 점수와 비공개 Auth 계정 ID·토큰은 다르다. ‘익명 로그인’은 ‘데이터 수집 없음’이 아니다.
- 온라인 삭제는 서버 프로필·기록/계정 처리다. 로컬 캐릭터·설정·이어가기와 별개이며 앱 제거만으로 서버 데이터가 없어지지 않는다.
- DB의 만료 시간은 정리 **대상** 시각이다. 일일 cleanup, 완료 삭제 상태 안전 조건, 공급자 로그·백업을 구분해야 ‘즉시 모든 데이터 삭제’라는 잘못된 약속을 피할 수 있다.
- 지원 메일도 이메일·첨부 자료 처리를 만든다. 공개 문의 주소 승인은 받았지만 운영 메일의 정확한 보관 기간은 아직 확정하지 않아 임의 기간을 쓰지 않았다.

## 안전한 파일 복사

헬퍼는 프로젝트 `dist` 또는 `output/` 하위의 검증 출력만 받는다. 소스는 알려진 HTML 두 개로 고정한다. 출력 루트·파일 심볼릭 링크와 잘못된 Pages base를 거부하고, 모든 소스/대상 검사를 먼저 마친 뒤 복사한다. 기존 다른 export 파일은 삭제하지 않는다. 이전 `dist`는 보존하고 `output/public-pages-web`로 검증했다.

HTML 검사는 한·영 섹션, 이메일, 삭제 안내, base 경로·언어 링크, 알려진 비밀 패턴과 실행 코드·외부 추적 리소스를 검사한다. **법적 적합성, 모든 가능한 비밀, 실제 iPhone 동작을 증명하는 검사는 아니다.**

## 실제 검증 — 2026-09-30 로컬

- 페이지 회귀 Node22/22, release8/8, typecheck/ranked8 통과.
- 운영 공개 URL/publishable 설정만 메모리에 읽은 격리 web export 성공. JS1, assets18, 양쪽 HTML, opaque favicon 검사 통과. 공개 환경 검사10/10, 비밀/진단 알려진 패턴 없음.
- Playwright6/6, 7.5초, 세 화면 크기에서 양쪽 페이지200/실문서, 언어 이동, contact, 가로 overflow 없음과 nav44px 확인. 실제390×844 캡처를 육안 확인했다. iPhone 앱 제출용 캡처가 아니라 웹 QA 증거다.
- 실패에서 배운 점: `assert.throws()`의 동기 콜백 안에서 `await`를 쓰면 문법 오류다. 먼저 HTML을 `await`한 후 동기 검증 함수를 호출해 해결했다. 이전 verifier는 정책 HTML이 없어도 pending으로 통과했으므로 이제 필수 파일로 바꿨다.
- GitHub 로그인은 sandbox 네트워크 안에서 invalid로 보였지만 허용된 읽기 환경에서는 기존 keyring 인증이 정상임을 확인했다. 이를 계정 인증 실패로 단정하지 않고 확인했으며 토큰을 저장/노출하지 않았다.
- 공개 배포 결과는 실제 배포 완료 후 아래에 추가한다. 로컬200만으로 공식 URL이 게시되었다고 표시하지 않는다.
- 배포 CI의 game 테스트 지연은 첫 닉네임 modal을 처리하지 않는 옛 helper 때문이었다. 운영 설정의 로컬 build에서 15초 click timeout과 실제 pointer interception을 재현했다. local-only build에서는 안내가 나타나지 않아 놓쳤다. 일반 game/layout 검사는 재방문 guest의 안내 처리 기록만 준비하고, 첫 실행은 별도 configured synthetic bundle에서 ‘나중에’ 실제 클릭→저장→reload→시작→가입 쓰기0를 확인한다. 보상을 해금하거나 안내를 앱에서 제거해 검사를 우회하지 않는다.

## 실제 공개 결과

`03c6753`의 Actions [36655593459](https://github.com/JEONG-INSOO/close-call-nyang/actions/runs/36655593459)는 build/deploy 성공. 공식 support/privacy의 HTTP200 UTF-8와 원본 SHA-256 일치를 확인했다. 원격 브라우저6/6(16.9초), 세 크기에서 언어 이동·연락처·경로와 휴대폰 캡처 가독성을 검증했다. 로컬 회귀·CI·원격 주소·실제 iPhone 앱은 서로 다른 증거다. 현재 마지막 것은 아직 미검증이다.

전체 운영 구성 브라우저 회귀는 46 passed / 11 환경별 intentional skips(3.8분). 첫 배포 실행 `36653859313`의 cancelled는 배포 성공이 아니다. 수정 커밋의 별도 CI 성공과 공개 문서 내용 일치를 확인했다.

## 출시 전 별도로 남은 점

- 앱 Settings에 개인정보 페이지 링크가 아직 없다. 랭킹의 지원 버튼도 기존 GitHub 문의를 연다. 이번 정적 페이지 Task는 앱 UI를 바꾸지 않으며, 다음 앱 준비 범위에 명시적으로 연결해야 한다. Apple은 개인정보 링크를 앱 안에서도 쉽게 접근할 수 있게 요구한다: [심사 지침5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy).
- 공급자 로그·백업 설정, 운영 지원메일 보관, 글로벌 공개의 개인정보 설문/지역별 요구사항은 출시 전 검토한다. 법률 적합성 승인을 자동 선언하지 않는다.
- 최신 iPhone 캡처는 새 TestFlight 빌드 설치 후 받아야 한다. 캡처를 빌드보다 먼저 완료하도록 한 계획 의존성은 실제 원본을 확보하기 전에 정리해야 한다.

## 복습·다음 연습

1. `/privacy/`와 `/close-call-nyang/privacy/`는 GitHub Pages에서 왜 다른가?
2. 로컬 정책 HTML 하나를 임시 테스트 복사본에서 제거하면 verifier가 실패하는지 확인해 보자. 실제 운영 파일은 지우지 않는다.
3. 계정 삭제 후에도 로컬 캐릭터가 유지되는 이유를 Settings → Auth 삭제 → local preferences 경로로 설명해 보자.
4. 지원 로그·DB 정리·기기 저장의 세 보관 경계를 코드와 비교해 보자.

공급자 근거: [Supabase 로그](https://supabase.com/docs/guides/observability/logs), [개인정보 안내](https://supabase.com/privacy), [GitHub 개인정보 안내](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). 공급자 문서의 정책은 프로젝트 실제 로그 설정을 대신하지 않는다.
