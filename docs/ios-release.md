# iOS 출시 준비와 Expo Go 검사

## 2026-09-25 · 실제 서명 확인과 업로드 요청

EAS credentials 읽기 조회로 bundle `com.mocca.closecallnyang`의 Apple Team `S9RLQ8474U`, 배포 인증서 및 active provisioning profile을 확인했다. 프로필은 조회 직전 갱신되어 있었고 두 항목 만료는 2027-09-13이다. 인증서/개인키를 다운로드하거나 재생성·폐기하지 않았다. 사용자가 TestFlight 업로드를 명시적으로 요청했다.

암호화 검토: 앱은 Supabase HTTPS 인증/요청을 사용하며 자체 암호화 프로토콜·VPN·암호화 메시징 기능은 없다. expo-crypto iOS의 digest는 Apple CommonCrypto, 포함된 AES 구현은 CryptoKit을 호출한다. 앱의 digest 사용은 개발 재현 검사이며 Supabase helper는 WebCrypto SHA-256을 사용한다. 플랫폼 암호화만 사용하는 현재 소스/의존성 검토에 따라 `ios.config.usesNonExemptEncryption: false`로 설정했다. 이는 HTTPS를 쓰지 않는다는 뜻이 아니며, 암호 라이브러리/기능 추가 시 다시 검토해야 한다. [Apple 기준](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations), [plist 의미](https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption).

빌드 준비 소스의 Team ID만 실제 확인값으로 반영했다. ASC 앱 ID는 아직 추측하지 않는다. archive 비밀 파일 제외·환경·검사 후 source-only commit → cloud build → 정확한 성공 build ID submit 순서. 빌드 성공·업로드 접수·Apple 처리 완료·실기기 QA는 각각 따로 기록한다.

## 2026-09-25 · 새 앱 선택 / P03-T02 준비 완료

사용자는 기존 App Store Connect 앱이 없어 새 앱 준비를 선택했다. **아직 Apple 앱 생성·서명·IPA 빌드·TestFlight 업로드를 실행한 것은 아니다.** 다음 P03-T03에서 공식 인증과 팀/앱 식별자를 실제 확인한다. 비밀번호/2FA는 채팅에 보내지 않는다.

- `assets/branding/icon.svg`는 회색 태비·정장·사원증·커피의 새 원본 아이콘 초안이다. 게임의 PNG 캐릭터는 그대로 유지했다. `npm.cmd run branding:render`로 sharp0.35.4를 사용해 RGB 불투명 1024/48 PNG를 생성한다. `branding:verify`는 재생성 없이 원본과 픽셀을 비교한다. 두 크기 육안 확인 완료, 사용자 최종 디자인 승인은 별도다.
- store/에 한국어 소개·심사 안내·개인정보 데이터 근거·실제 iPhone 캡처 계획을 저장했다. `status: draft`, 운영자/공개 연락처/가격/지역/Apple 식별자 null. 개인정보/지원 URL은 **예정 주소**이며 이번 export에도 아직 없다. App Review 전 실제 게시·문구 승인 필요.
- 기존 빈 EAS production 환경을 확인한 다음 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 두 개만 project/plaintext로 등록하고 CLI readback을 메모리에서 대조했다. Pages와 같은 운영 ref `fgojrxmpxpzdiwsktjsx`. 키 내용은 문서/출력/Git에 남기지 않았으며 서버 키는 등록하지 않았다. 광고/진단 false는 기존 eas.json 프로필 유지.
- 실제 검증: branding 생성·읽기검사/1024·48 이미지 확인, release 검사7, 전체 Jest666(44 suites), typecheck, Doctor21/21, ranked canonical8 통과. 개발 public config에 Pages baseUrl 없음·가로·iPhone-only·bundle/icon 정확.
- 올바른 production 공개 입력과 두 개발 flag=false로 `scripts/export-web.mjs`(web:export와 동일 진입점)를 실행했다. dist의 JS1/참조 asset17/불투명48프레임 ICO 검사 및 공개 설정·알려진 비밀 패턴 검사10 통과. 현재 로컬 dist는 운영 설정이며 **사이트 재배포는 하지 않았다**. 게임을 시작해도 온라인 참여/등록은 별도 사용자 행위다.
- 초기 web:verify는 PNG만 예상해 Expo의 ICO에서 실패했다. 실제 Expo 인코더의 16/32/48 BGRA 출력·마스크 생략 형식을 읽고 검사를 교정했으며 깨진/투명 ICO 회귀 검사를 추가했다. 서버나 게임 로직 문제는 아니었다.

남은 사항: Apple 인증·서명 권한·암호화 수출 답변 검토·빌드 업로드 archive 확인·실제 클라우드 빌드·TestFlight 처리 상태 확인·실제 iPhone/Hermes/온라인 QA. 기존 npm audit moderate10은 강제 변경하지 않았다. Go 실행과 독립 앱, TestFlight 업로드와 App Review는 각각 별도 검증이다.

## TestFlight 준비 · 2026-09-25 후속

- 사용자 요청으로 TestFlight 준비를 진행했다. EAS CLI24.7.0, 계정insoojeong; 실제 프로젝트 `315e87a2-f405-4f65-ae45-c91f1d2c59bf` 생성/연결 후 project:info의 `@insoojeong/close-call-nyang` 일치 확인.
- eas.json production은 store/remote version/autoIncrement, Node24.19.0 및 SDK57용 macos-tahoe-26.5-xcode-26.6 이미지. 광고/진단false, developmentClient 없음. submit.production은 실제Apple앱ID 미확인이라 빈설정이다.
- .easignore는 gitignore의기존보호를승계하고 작업노트/문서/서버코드 제외. 앱src/assets/test-fixtures는유지. 로컬공개env도업로드되지않으므로 EAS운영환경의URL/publishable설정을 별도로 검증하기 전 build하지 않는다.
- 타입/Expo설정20검사/EAS프로필·ignore2검사 통과. **아직IPA빌드/Apple로그인·서명/TestFlight업로드·처리를 실행하지 않았다.** 실제기기QA도미확인이다.
- 다음: 사용자에게이미질문한AppStoreConnect앱유무확인 → 기존P03-T02의아이콘/필수자료·EAS운영공개env → Apple공식CLI로그인·팀/앱ID확인 → 빌드/정확한buildID업로드. 기존앱중복생성금지, 인증코드/비밀번호채팅수집금지. AppReview제출은별도최종승인.

참고: [TestFlight 공식절차](https://docs.expo.dev/submit/testflight/), [SDK57 빌드이미지](https://docs.expo.dev/build-reference/infrastructure/), [.easignore 우선순위](https://docs.expo.dev/build-reference/easignore/). 지원URL/개인정보·스토어문구는공개심사전필수작업이며내부TestFlight 업로드와구별한다.

## 현재 상태 · 2026-09-25

- PC Expo 계정 insoojeong 확인. Expo57.0.24 ->57.0.25 권장패치 적용, SDK major/앱ID/서버규칙 불변.
- `expo install --check` 최신호환, `expo-doctor`21/21, typecheck/전체Jest665(44suites)/ranked8 통과. npm audit의 기존 moderate10건은 남아 있으며 강제수정하지 않았다.
- Metro8081 running/HTTP200, iOS manifest200/name·SDK57·bundleIdentifier 일치. 이는 빌드 준비 확인이며 실기기 실행통과가 아니다.
- ExpoGoQA pending: 실제기기/iOS/Go버전·관찰 결과 아직 미제공. EAS프로젝트/서명/TestFlight/심사 미실행. 기존유료Apple계정은 사용자보고이며 현재서명권한 검증은 별도.

## 실행

현재 실행한 서버는 dotenv자동읽기와 backend공개환경변수를 끈 local-only QA다. 재실행할 때 프로젝트 PowerShell에서:

```powershell
Set-Location D:\GrillmeEDU
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_PUBLIC_REPLAY_DIAGNOSTICS = 'true'
$env:EXPO_PUBLIC_ENABLE_MOCK_AD = 'false'
Remove-Item Env:EXPO_PUBLIC_SUPABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
npx.cmd expo start --go --lan --clear
```

기존서버가 켜져 있으면 중복실행하지 않는다. 같은네트워크에서 iPhone Expo Go에 PC와 같은계정으로 로그인하고 개발서버를 연다. 현재LAN주소는172.30.1.23:8081이며 네트워크변경 시 달라진다. 연결이안되면 오류문구를 먼저확인하며 방화벽전체해제나 무조건tunnel설치를 하지 않는다. [Expo공식SDK57 로그인 안내](https://expo.dev/changelog/expo-go-57-login).

## 실제 iPhone 체크리스트

검사기록에는 기종/iOS버전/ExpoGo버전/일시/사용자관찰임을 함께 남긴다. 현재 전항목 not_run.

- 실행: 가로화면/노치영역/오류없음, 결과버튼동일한세로배치·스크롤접근.
- 입력: 좌우/동시누름/교차/손뗌, 실패·재도전.
- 상태: 일시정지→홈→이어가기, 앱전환/잠금복귀 시 정지·수동재개·입력해제.
- 보존: 최고기록/설정/캐릭터가 앱을 완전히 닫고 재실행해도 유지.
- 기기기능: 음악/효과음/햅틱설정, 무음·오디오중단복귀, 공유완료/취소.
- 게임:15%커피/가속,51%실내,100%색상,장시간프레임/발열(약10분).
- 숫자재현: 제목화면 `재현 검사 (개발용)`→`현재 런타임 검사`, 3행runtime=hermes/passed=true. JSON에는fixture/rules/digest/fallTick만 있으므로 스크린샷으로 확인가능.

개발판은 코드상 `eligible: !__DEV__ && !flags.mockAdsEnabled` 때문에 운영랭킹제출 검사와 다르다. 이번에는 backend미설정이므로 랭킹미연결 안내가 나올 수 있다. 독립TestFlight에서 승인된환경으로 실제제출/오프라인큐/삭제를 별도검증한다.

## 배포로 넘어가기 전

실기기 결과확인 → 기존 PagesT03·개인정보/지원URL·아이콘/스토어자료·EAS설정 준비 → 서명된iOS클라우드빌드 → 정확한빌드TestFlight업로드/처리/실기기검사 → 앱스토어소개문구/최종심사제출사용자승인. ExpoGo테스트통과를 AppStore출시완료로 표시하지 않는다. TeamID/ascAppID/EASprojectID를 추측하거나 비밀번호/2FA를 채팅/문서에 저장하지 않는다.
