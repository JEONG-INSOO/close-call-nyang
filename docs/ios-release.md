# iOS 출시 준비와 Expo Go 검사

## 2026-09-30 · 공개 안내 페이지 준비

- 사용자 승인된 운영자 `Insoo Jeong`/지원메일로 한·영 지원·개인정보 HTML을 준비했다. `web:export`가 정적 페이지를 포함하며 `web:verify`와 Pages CI가 누락·base·알려진 비밀/추적 리소스를 검사한다.
- 로컬 격리 운영 export, 페이지 Node22/release8/타입·ranked8/브라우저6 통과. 기존 dist는 보존했다. 공식 공개 URL의 활성 여부는 원격 배포 완료 후 별도로 기록한다.
- 앱 내 개인정보 링크·기존 랭킹 지원 링크 연결, 공급자 로그/백업·지원메일 보관 설정, 실제 최신 TestFlight 캡처·개인정보 설문/최종 문구 승인은 남았다. HTML/웹 검사만으로 App Store 심사 준비 완료라고 하지 않는다.

## 2026-09-28 · 위험 효과음 제거 — 1.0.0 (4) 제출 예약

- 사용자 요청: 새 빌드 제출 후 TestFlight 표시/설치 가능 여부는 사용자가 확인한다. 반복 모니터링/Apple 처리 확인은 수행하지 않는다.
- 소스 `d8e8dbd14107670e7b08ac1fcab2c90175a746bd` (6c2bd59 포함), 새 빌드 `f8d4ccb3-edc9-41af-99a9-11843efc33a3`, 제출 `eb4df011-0fc4-4f21-8569-8f92218306ae`. EAS가 1.0.0/build4 생성 및 제출 예약을 접수했다. 클라우드 완료/Apple 업로드 성공/설치 가능 상태는 아직 미확인이다. release-state의 submittedAt은 업로드 성공 증거가 없으므로 null, testflightStatus는 not_started를 유지한다.
- 변경: 위험 효과음/플레이어만 제거, 위험 진동·다른 소리 유지. 직전 전체676/45suites, 이번 release7/ranked8/env10 및 공개 GET200/rules 일치. 기존 dist 검사는 환경 경계 확인이며 새 웹 배포가 아니다.
- 실제 archive201파일/비공개경로0/소스·설정8파일 해시 일치 후 사본만 삭제. EXPO_NO_DOTENV=1, EAS production 공개변수2, 광고/진단 false. 기존 서명/요금제 유지. Apple 프로필 재검증401은 기존 로컬 검증 결과로 진행됐으며 새 인증서 발급은 하지 않았다.
- 기존3번의 빌드 FINISHED06:00:29.820UTC, 제출 FINISHED06:02:13.117UTC를 읽기 재확인했다. 3번을 재제출하지 않았다. 새4번은 완료 여부를 추측하지 않는다. App Review/GitHub push/웹 재배포 없음.

## 2026-09-28 · 오디오 전환 개선 TestFlight 업데이트

- 사용자 피드백off 비교에서 개선보고, 중복오디오처리수정과업로드승인. 소스8e5f95ca5a1af835a807d2215c39a92fc07742c2, EAS build32b1ca9b-eb95-4fc1-b675-b8d1c0144500,1.0.0(3). 물리/광고/햅틱정책/래스터캐릭터변경없음.
- 신규회귀3개oldfail→대상15pass, 전체675/45suites, release7/types/ranked8/env10/운영publicGET200/rulesmatch. Archive201파일/인증·비공개경로0/주요7파일해시일치; 정확한검사사본만삭제. 이전dist는보존했고이번환경검사는기존production구성에대한검사이지새웹배포가아니다.
- EASproduction공개변수2로드, mock/diagnosticsfalse. Apple프로필재조회401후기존서명localvalidation으로계속됨; 자격재발급/요금제변경없음. 기존CLI24.7.0유지; TestFlight설명Enterprise옵션미사용.
- 이전build2 FINISHED05:08:39.350UTC, submissionbac21516-a95a-4811-bec4-977c50454df2 FINISHED05:10:28.745UTC(독립재조회). 새3번은오디오수정,2번은버튼/표시memo수정으로구분한다. 실기기FPS미측정, 사용자빌드번호미확인.

## 2026-09-28 · 터치 개선 TestFlight 업데이트

- 사용자 요청에 따라 터치 수정756c005 및 제출 설정을 포함한 소스4084834e0f54c8edaaa9dcc58c80fade722b0b7c로 새 빌드를 생성했다. EAS ID b679d4dc-c1c8-45f3-b401-6d7ba769e722, 버전1.0.0/원격 buildNumber2, 생성05:04:06UTC. 최초 확인 IN_PROGRESS; 기존1번을 재제출하지 않는다.
- 전송 전 archive201파일, 비공개/인증 경로0, 주요 소스·설정6파일 해시 일치. 검사 사본만 제거했다. release7/typecheck/ranked8/public-env10 및 운영 공개GET200/rules일치 확인; 직전 터치 변경 전체Jest672/browser2 통과 증거 보존. 광고/진단 false, production 공개변수2 로드 확인.
- 비대화형 Apple 프로필 재조회401 경고 후 기존 remote 서명(local validation active/2027-09-13만료)을 사용해 빌드 요청이 생성됐다. 인증서나 API키를 교체하지 않았다. `--what-to-test` 자동 설명 첨부는 Enterprise 한도 오류로 제출 예약 실패; 요금제 변경 없이 그 선택 옵션만 제거해 재시도한다. 업로드 완료·Apple처리·실기기 성공은 서로 구분한다.
- 이전 빌드5b46dbe0-2511-485a-aa05-386a3222dfb9 및 제출7efac989-7ff8-4768-9de0-b7e3de61a179는 재조회FINISHED, 이전 제출 완료2026-09-24T20:43:33.355Z. 기존 문서의 예약 대기 기록은 당시 시점이다.
- Build2는2026-09-28T05:08:39.350Z에 FINISHED(한국14:08:39). 제출 bac21516-a95a-4811-bec4-977c50454df2는 IN_PROGRESS. 로컬 `submit:status`는Apple API401이므로 앱이 없다고 해석하지 않는다. Apple 처리/설치 가능 상태는 아직 독립 확인되지 않았다.

업데이트 후 사용자 검사: TestFlight에 표시된1.0.0(2)인지 확인하고 앱을 삭제하지 말고 업데이트한다. 같은 기기에서 무입력/한쪽 길게 누르기/빠른 좌우 교차/양쪽 누른 뒤 한쪽만 떼기/일시정지 후 재개를 비교한다. iPhone 모델·iOS 버전·빌드번호·끊기는 상황을 함께 기록한다. 실기기 통과 전T03를done으로 바꾸지 않는다.

## 2026-09-25 · 실제 서명 확인과 업로드 요청

실제 실행: source commit `a54835786507e00eac6c366eda77262345fedf84` → EAS build `5b46dbe0-2511-485a-aa05-386a3222dfb9`, version1.0.0/build1 (2026-09-24 17:46:38UTC 생성). 원격 번호를 처음1로 초기화했고 이후 autoIncrement다. Expo Go 관련 권고 경고는 SDK57 개발방식을 바꾸라는 오류가 아니며 독립 앱 검증은 계속 필요하다. 비대화형 빌드는 Apple 서버의 서명 재검증을 건너뛰고 기존 인증서를 그대로 사용했다.

최종 archive199파일/필수입력원본일치, .git/env/키/비공개폴더제외 확인. config SHA256 `63a654695b60a2430508e101e596a6146b4852501fb293d0aa65d1dea84c367e`. 검사 사본v1..v4는 원본경로가 아님을 확인한 후 제거했다. release7/typecheck/Jest666/ranked8, 운영 공개GET200/rules일치 및 EAS 공개값2readback 통과.

저장된 공식 Apple 세션을 재사용해 새 ASC 앱 `6815771701` 생성, 동일팀 기존 API키를 EASSubmit에 연결했다. 비밀키 내용/쿠키를 열거나 저장소로 복사하지 않았다. `submit --id ... --no-wait --no-auto-testflight-setup` 실행에도 CLI가 `Team (Expo)` 내부 그룹과 소유자 접근을 만들었다. 외부 사용자를 초대하거나 App Review를 제출하지 않았다.

정확한 제출ID `7efac989-7ff8-4768-9de0-b7e3de61a179`, 생성시각2026-09-24 17:48:47UTC, 최초상태AWAITING_BUILD. 예약 성공은 Apple 업로드 완료가 아니다. 현재 상태는 store/release-state.json 및 아래 후속 기록을 따른다. 새 ascAppId 제출 설정은 바이너리를 바꾸지 않으므로 이것만으로 재빌드하지 않는다.

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
