# iOS 출시 준비와 Expo Go 검사

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
