# 웹과 iOS 업데이트를 나누어 배포하기

## 같은 코드도 배포 경로가 다르다

운영 Supabase가 새 랭킹 입력을 받을 준비를 마쳐도, 사용자의 브라우저에는 새 화면 코드가 자동으로 생기지 않는다. GitHub에 소스를 push하고 CI가 웹 파일을 만들고 Pages에 게시해야 한다. iPhone에 설치한 앱은 별도의 서명된 IPA이므로 EAS Build와 Apple 업로드·심사를 거친다.

## 웹 검증의 근거

이번 웹 소스는 d3b83d2이다. 실제 CI 실행41010800526의 headSha와 build/deploy 결과를 확인한 뒤, 공개 index가 참조하는 JS에서 새 규칙·닉네임 안내v2·사표 이벤트·DEXCONSULTING 문자열을 검사한다. support/privacy는 공개 내용과 기존 소스의 SHA256을 비교한다. 마커 검사는 새 코드 포함 여부를 확인하며 실제 iPhone 성능 측정이나 모든 플레이 경로 검증을 대신하지 않는다.

## 현재 iOS 준비에서 확인한 점

2026-10-30 공개 Apple lookup과 App Store Connect에서1.0 출시/빌드6을 확인했다. 다음 버전은1.0.1로 준비하며 앱 식별자는 유지한다. 원격 buildNumber는 autoIncrement로 중복을 피한다. 현재 Apple 로그인은 정상이나 Expo CLI는 다른 계정isjeong이어서 기존 프로젝트 읽기 권한이 없다. 실제 소유 계정insoojeong 인증 전에는 빌드했다고 기록하면 안 된다.

Expo Go는 개발 중 휴대폰 테스트 앱이다. EAS Build는 Mac 없는 환경에서 서명된 iOS 설치 파일을 만드는 클라우드 서비스다. EAS Submit 업로드가 끝나도 App Review 접수, Apple 승인, 공개 출시는 별도 단계다. 기존 사용자 아트/QA는 빌드 스냅샷에 임의로 섞지 않는다.

## 복습과 남은 확인

질문: push 성공 뒤에도 옛 게임이 보이는 이유는? 웹 버전과 iOS 버전을 왜 별도로 확인하는가? 다른 Expo 계정으로 로그인하면 Apple 로그인이 정상이어도 빌드를 못 하는 이유는?

가상 광고가 켜진 앱의 새 심사 메모는 이전 ‘광고 없음’ 설명과 달라야 한다. 등록 내용은 실제 동작과 대조해 갱신해야 한다. 새로운 추적 SDK나 수집 필드를 추가한 것은 아니다. 그 외 인접 기능 결함 특이사항 없음.

## 웹 공개 완료

실행41010800526의build/deploy가성공했다. Chromium63pass/15의도적skip. 공개JS index-371c90ba00881886945c51f32fdf2278.js에서새rules/닉네임v2/resignation/DEXCONSULTING을확인했다. 지원·개인정보페이지HTTP200과기존소스SHA256일치. 이검사는GET만사용했고사용자계정·점수를수정하지않았다.

## 사용자 선택으로 iOS 배포 경로 변경

사용자가 Expo 계정 사용 없이 다른 방식으로 배포하도록 지정했다. EAS 인증을 더 진행하지 않고, GitHub macos-26/Xcode26.6에서 prebuild→xcodebuild→Apple업로드를 구성한다. Expo CLI가네이티브프로젝트를생성하는데Expo계정은필요하지않는다. 먼저서명없는archive로컴파일을검증하고, Apple서명자료와비밀설정이준비되어야실제설치/업로드가가능하다. GitHubSecrets가현재비어있음을이름목록으로만확인했고비밀값은조회하지않았다. 기존다운로드폴더에p8업로드키파일1개가있지만서명p12/profile은없다. 키내용/비밀번호를학습노트에넣지않는다.
