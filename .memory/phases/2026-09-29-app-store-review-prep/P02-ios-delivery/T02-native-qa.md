# Task: T02 최신 TestFlight iPhone QA

## Status: done

## Completion — 2026-09-30 사용자 확정 범위
- 사용자 실행 22개 시나리오 passed, ACCOUNT_DELETE/APP_REINSTALL은 사용자 요청으로 not_run. 생략 항목을 통과로 바꾸지 않고 현재 앱·계정·기록과 삭제 기능을 보존한다. 이 Task 완료는 범위 조정 후 증거 정리 완료이며 전체 nativeQa/leaderboardQa는 pending이다.
- 로그인된 App Store Connect 앱6815771701의 배포 화면과 빌드 선택 목록을 읽기 확인했다. 1.0 제출 준비 중, 선택 가능한 1.0.0(6)의 Apple build ID는 103a4776-f5b9-4ef1-9428-8f72ea8c1539다. 선택 창은 취소했고 등록/업로드/심사 제출은 하지 않았다.
- 실제 스토어는 기본 영어(미국), 스크린샷·설명·빌드 미등록, 자동 출시 선택 상태다. 로컬 수동 출시 결정과 차이가 있어 T03에서 등록 및 최종 승인 게이트를 처리한다.
- 검증: node --test scripts/render-store-screenshots.test.mjs scripts/release-preparation.test.mjs — 12/12 통과. Fontconfig 캐시 쓰기 경고가 있었지만 exit 0이다. 기기 증거와 mock/파일 검사는 별개다.

## Handoff — 2026-09-30
- 최신 사용자 요청은 삭제·재설치 테스트를 실행하지 않고 배포 준비를 진행하는 것이다. 생략 결정은 2026-09-30-skip-destructive-release-qa.md와 Plan에 기록했다. ACCOUNT_DELETE/재설치 not_run(사용자 생략), 기존22개 passed 유지. 현재 앱/계정과 삭제 기능은 보존한다. App Store Connect 앱6815771701 distribution 읽기 시도는 로그인 화면으로 이동했으며 외부 변경 없음. 다음은 사용자 공식 Apple 로그인 후 남은 등록 자료/설문과 실제 빌드 선택 확인이다. 전체QA pending/T02 in_progress와 최종 제출 게이트 유지, 삭제 검사를 다시 요구하지 않는다.
- 최신 사용자1: 소리·진동 모두 off 후 앱 완전 종료·재실행에서도 상태 유지 확인. AUDIO_SETTINGS_RESTART passed, 사용자22시나리오 passed. 다음은 보류한 격리 삭제 검사 재개 여부 확인이다. 승인 전 staging 재개·임시 계정 생성/삭제·현재 앱 재설치 금지. 재개 승인 시 기존 staging만 무료 범위 가능 여부 확인 후 격리 서버 검사로 진행하고 실제 TestFlight 삭제/재설치와 구분한다. 현재 닉네임·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 최신 사용자1: 재연결 후 랭킹 새로고침 시 기존 최고를 넘었던 해당 판의 성공률로 내 순위 갱신 확인. RANKING_RECONNECT_SCORE_ACK passed는 사용자 관찰 증거이며 서버 응답/로그를 별도 조회하지 않았다. 사용자21시나리오 passed. 다음은 AUDIO_SETTINGS_RESTART not_run: 배경음·효과음·진동 설정 변경 후 앱 완전 종료·재실행 보존. usePreferences의 setSettings→persist→savePreferences 및 마운트 시 loadPreferences 경로를 읽기 확인했다. 삭제/재설치 없이 검사하며 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 최신 사용자1로 인터넷 차단 중 끝낸 판의 기존 온라인 최고 초과 확인. RANKING_RETRY_UI_TRANSITION passed는 UI 결과이며 이번 점수 비교도 서버 제출 증거가 아니다. 다음은 랭킹 새로고침 후 내 순위에 해당 판의 성공률이 일치하는지 확인(RANKING_RECONNECT_SCORE_ACK not_run). 사용자20시나리오 passed 유지. 만료/포기와 제출 완료를 UI만으로 구분하지 않는다. 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 온라인 시작 후 인터넷 차단·게임오버·다시 도전의 등록 대기 안내 확인. RANKING_PENDING_UPLOAD_PROMPT passed는 안내 표시 결과이며 재연결 후 서버 등록 성공이 아니다. 다음은 ‘등록 다시 시도’의 화면 전환(RANKING_RETRY_UI_TRANSITION not_run). 제출 성공과 만료/한도 초과 모두 hasPending=false가 될 수 있으므로 새 게임 시작만으로 제출 성공 처리하지 않는다. 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 가로 홈/게임/설정/랭킹의 글자·버튼 가림 없음, 하단 스크롤 접근 정상 확인. LANDSCAPE_SAFE_AREA_ACCESS passed는 보고된 iPhone 화면 결과이며 다른 기기/큰 글씨 설정 검증이 아니다. 다음은 온라인 시작 후 인터넷 차단·게임오버·다시 도전의 등록 대기 안내(RANKING_PENDING_UPLOAD_PROMPT not_run). 안내와 서버 제출 성공은 별도이며 이전 업로드 포기를 누르지 않는다. 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 랭킹 하단 문의 링크에서 공식 지원 페이지 열기·앱 복귀 모두 정상 확인. RANKING_SUPPORT_OPEN_RETURN passed는 링크 동작 결과이며 실제 문의 발송/신고 처리/복귀 후 저장 상태 동일성 검증이 아니다. 다음은 가로 화면의 가림·하단 접근(LANDSCAPE_SAFE_AREA_ACCESS not_run). 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 TestFlight 결과 화면에 다시 도전/처음으로만 표시되고 광고 버튼·가상 광고 비노출 확인. ADS_RELEASE_DISABLED passed는 배포 결과 화면의 사용자 증거이며 실제 광고 SDK/보상 지급 검증이 아니다. 다음은 랭킹 하단 문의 링크 열기·앱 복귀(RANKING_SUPPORT_OPEN_RETURN not_run). 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 오프라인 랭킹 오류 안내 후 재연결·다시 불러오기로 본인 닉네임/최고기록 정상 표시 확인. RANKING_RECONNECT_DISPLAY passed는 읽기 복구 결과이며 점수 제출 큐/자동 재시도 검증은 아니다. 다음은 배포 결과 화면의 가상 광고·광고 부활 버튼 비노출(ADS_RELEASE_DISABLED not_run). 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 좌우 동시 터치 후 모두 떼고 재조작 정상, 입력 고착/멈춤 없음 확인. SIMULTANEOUS_TOUCH_RELEASE passed는 사용자 동작 결과이며 FPS/모든 OS 입력 취소/양쪽 계속 누르기의 난이도 검증은 아니다. 다음은 인터넷 재연결 후 랭킹 다시 불러오기(RANKING_RECONNECT_DISPLAY not_run), 점수 제출 큐와 별도다. 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 배경음·효과음·진동 설정 켜기/끄기의 실제 반영 모두 정상 확인. AUDIO_HAPTICS_SETTINGS passed는 즉시 반영 결과이며 재실행 보존/무음 모드/통화 중 동작 검증은 아니다. 다음은 좌우 동시 터치 후 해제·재조작(SIMULTANEOUS_TOUCH_RELEASE not_run). 삭제 보류·기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 게임 중 아이폰 홈/다른 앱 전환 후 복귀 시 일시정지·이어하기 정상 확인. BACKGROUND_PAUSE_RESUME passed는 일반 전환 결과이며 통화/장시간 중단/OS 종료까지 확대하지 않는다. 다음은 배경음·효과음·진동 설정 반영(AUDIO_HAPTICS_SETTINGS not_run). 삭제 보류·기존 기록 보존·전체QA pending/T02 in_progress 유지. 런타임 변경·완료커밋·심사 제출 없음.
- 사용자1로 세 캐릭터 모두 홈 선택 반영·걷기/위험 표정/넘어짐 자연스러운 표시 확인. CHARACTER_VISUALS_MOTION passed는 육안·체감 증거이며 장시간 FPS/다른 기기 검증은 아니다. 다음은 게임 중 앱 전환→복귀 시 자동 일시정지·수동 이어하기(BACKGROUND_PAUSE_RESUME not_run). useAppLifecycle.ts의 inactive/background 시 pause 콜백 경로를 읽었으나 실제 기기 증거와 구분한다. 삭제 보류·기존 기록 보존·전체QA pending/T02 in_progress 유지. 완료커밋·심사 제출 없음.
- 사용자1로 TestFlight6의 15% 커피 획득·51% 사무실 배경 전환 둘 다 정상 확인. COFFEE_OFFICE_TRANSITION passed는 표시 전환 증거이며 가속 수치·모든 캐릭터 성능 검증이 아니다. 다음은 세 캐릭터의 홈 반영·걷기/위험/넘어짐 표시 확인(CHARACTER_VISUALS_MOTION not_run). 삭제 검사 보류와 기록 보존을 유지한다. 전체QA pending/T02 in_progress, 완료커밋·심사 제출 없음.
- 최신 사용자2는 삭제 검사 잠시 보류다. 기존 기록·세션을 보존하고 staging 재개/임시 계정 생성·삭제를 실행하지 않는다. ACCOUNT_DELETE not_run은 최종 출시 QA의 미검증 항목으로 유지, 보류를 통과나 검증 면제로 취급하지 않는다. 다음은 삭제와 무관한 TestFlight6의 15% 커피·51% 사무실 장면 표시 확인(COFFEE_OFFICE_TRANSITION not_run). T02 in_progress/전체QA pending, 완료커밋·심사 제출 없음.
- 사용자1은 기존 닉네임/온라인 기록 보존·별도 테스트 데이터 검사 선택이다. 삭제 관련 로컬5 suites/78 tests passed(mock), staging smoke는 공개 GET NETWORK_OR_TIMEOUT에서 계정 생성 전 중단(cleanupRequired0/signupResponseUncertain=false, ignored ranking-staging-2ce1e946-2f98-40fd-b84b-e54948cafb66.json). CLI 읽기 조회 staging INACTIVE/production ACTIVE_HEALTHY, staging DNS ENOTFOUND. 다음은 무료 범위 staging 재개 승인/슬롯 확인이며 다른 프로젝트 중지·과금·기존 프로필 삭제를 자동 수행하지 않는다. ACCOUNT_DELETE not_run/전체QA pending/T02 in_progress 유지. 서버 격리 검사는 실제 TestFlight 삭제/로컬 보존 증거를 대신하지 않는다.
- 사용자가 100% 1회→성실한 냥대리, 10회→베테랑 냥대리의 해금·선택을 모두 확인한 1번을 선택했다. CHARACTER_REWARD_UNLOCK passed. 전체 모션·장시간 프레임까지 검증했다고 확대하지 않는다. 다음은 되돌릴 수 없는 온라인 프로필 삭제 검사의 사용자 승인 확인이며 ACCOUNT_DELETE not_run 유지. 전체QA pending, Task in_progress 유지, 삭제·완료커밋·심사 제출 없음.
- 사용자가 일시정지→홈 저장 후 앱 완전 종료·재실행 시 중단 성공률에서 정상 이어짐을 1번으로 확인했다. APP_RESTART_SAVED_RESUME passed. 재설치·기기 간 동기화·물리 상태까지 동일하다는 검증은 아니다. 다음은 100% 1회/10회 보상 캐릭터 실제 해금·선택의 확인 범위. 전체QA pending, Task in_progress 유지.
- 사용자가 인터넷을 끈 상태의 새 게임 시작·플레이 정상 동작을 1번으로 확인했다. OFFLINE_NEW_GAME passed. 재연결 후 랭킹 미등록 정책·온라인 제출 큐 복구와는 별개다. App.tsx의 pause/home 저장·마운트 시 loadGameResume와 gameResume.ts의 AsyncStorage 저장을 읽기 확인했다. 다음은 일시정지→홈 저장 후 앱 완전 종료·재실행 이어가기 실제 검사이며 전체QA pending 유지.
- 사용자가 홈→랭킹→내 순위의 본인 닉네임·온라인 최고기록 정상 표시를 1번으로 확인했다. RANKING_OWN_BEST_DISPLAY passed, 신규 최고기록 갱신·오프라인 제출/복구·삭제까지 검증했다고 확대하지 않는다. 다음은 오프라인 새 게임 시작·플레이 확인. 전체 nativeQa/leaderboardQa pending, Task in_progress 유지.
- 사용자가 빌드6 좌우조작→게임오버→다시도전에서 멈춤·조작 문제가 없다고 1번을 선택했다. GAMEPLAY_GAMEOVER_RETRY passed로 사용자 체감 기록, FPS 수치·장시간/모든캐릭터 성능 통과로 확대하지 않는다. 다음은 랭킹의 본인 닉네임·최고기록/내순위 표시 확인, 전체QA는 pending.
- 사용자가 일시정지→처음으로→저장된 게임 이어하기 시 중단 성공률에서 정상적으로 이어진다고 1번을 선택했다. PAUSE_HOME_SAVED_RESUME passed로 기록했다. 앱 강제종료/재실행 복구·내부 물리 상태 동일이나 오프라인·랭킹·삭제까지 확인했다고 확대하지 않는다. 다음은 좌우조작→게임오버→다시도전 흐름 확인, Task 전체는 in_progress.
- 사용자가 빌드6에서 설정의 개인정보·고객지원 페이지 열기와 앱 복귀를 “모두 정상”으로 확인했다. docs/qa-report.md에 SETTINGS_PRIVACY_OPEN/SETTINGS_SUPPORT_OPEN/SETTINGS_LINKS_RETURN_TO_APP passed를 사용자 실행 증거로 기록했다. 게임 진행·저장 상태 유지/랭킹 문의 버튼까지 확인했다고 확대하지 않는다. 다음은 일시정지→홈→저장된 게임 이어가기의 중단 지점 유지 확인이며 전체QA는 pending이다.
- 사용자가 촬영 기기 iPhone 15 Pro / iOS 27.2를 제공했다. 사용자 보고값 그대로 captureBuild에 연결했다(독립 기기 조회나 OS 버전의 공식 존재/지원 확인으로 표현하지 않는다). 버전·빌드·기기 식별은 확보됐지만 실제 기능/프레임·오프라인·삭제·Safari복귀 검증은 별도다. 다음은 설정의 개인정보·고객지원 링크 열기/게임 복귀 확인.
- 사용자가 실제 캡처를 TestFlight 1.0.0(6)에서 촬영했다고 확인했다. approval.json의 captureBuildConfirmed=true와 captureBuild/version/buildNumber/해당 EAS ID/evidenceSource=user_confirmation을 기록했다. 이전 Apple VALID/내부베타 증거와 사용자 실제 촬영 확인으로 첫 번째·세 번째 acceptance를 충족한다. 기종·iOS와 장면별 동작/네트워크·삭제·Safari복귀 QA는 여전히 미확인이므로 Task 전체 완료는 아니다.
- 사용자가 한국어 description을 그대로 사용하는 1번을 선택했다. description-approval.json에 해당 필드의 UTF-8 SHA-256을 고정해 승인했다. subtitle/promotionalText/영문·스토어 전체 승인이나 실기기QA/최종 제출 승인으로 확대하지 않는다. 소개 사용 승인과 실제 촬영 빌드·기기QA는 별개다.
- 사용자가 가로 시안5장과 문구를 그대로 사용하도록 승인했다. 이미지 승인은 별도 approval.json으로 기록하고, 최초 시안 manifest/픽셀은 재현 입력으로 보존한다. 촬영 빌드·기종·iOS/남은 기기QA와 앱 소개 승인은 별개다.
- 사용자가2번 JPG 확대 시안 선택. 별도 시안 Task 완료2fe32ec:5장2868×1320 RGB PNG, 원본 raw픽셀·캡처영역 동일, Node6/release8/육안 통과. 원형 JPG 메타데이터는 ignored 보존하고 공개 source에서는 EXIF/IPTC/COM lossless제거. 이미지 승인과 기종·iOS·buildNumber/실기기 QA는 아직 미확인. 랭킹4번 제외. 원격 업로드·심사 제출 없음.
- 사용자가 실제 플레이 캡처6장을 제공했다. System.Drawing 읽기 검사:모두1280×590 JPG. 홈/캐릭터선택/랭킹/일시정지/카운트다운/4% 기울어진 플레이가 관찰된다. 기종·iOS·빌드번호/커피·사무실·해금/동작·오프라인·삭제·Safari복귀 검증은 확인 안 됨. 현재 캡처를 제출 규격 원본이라고 간주하지 않는다. 사용자선택후확대시안완료、승인대기. 랭킹 타인 닉네임 공개는 보류.
- T01 완료306f338. 빌드3fd87f8b-5d8e-479a-8fc8-e7cc3a8de37a,1.0.0(6), 제출e0347b70-45bb-4aac-a9f2-d76c8d8cf60d 모두FINISHED. Apple6번VALID/IN_BETA_TESTING/READY_FOR_BETA_SUBMISSION, expired=false 확인.
- Apple 처리·내부 테스트 상태 확인까지만 완료. 실제 iPhone 설치/모델·iOS/장면별QA/랭킹·삭제/최신 원본 캡처는 not_run이며 사용자 증거 대기. 기기 설치와 QA를 대신 확인할 연결 장치는 없다. T02 전체 완료/완료커밋은 하지 않는다.

## Goal

Apple이 처리한 정확한 새 빌드를 실제 iPhone에 설치해 가로 화면·캐릭터/입력/프레임·오프라인/랭킹/삭제를 확인하고 App Store 캡처의 진짜 출처를 확정한다.

## Decision Summary
- 2026-09-30 사용자 변경: 삭제·재설치 검사는 이번 릴리스에서 생략한다. 실행 단계3의 이 두 검사만 제외하며 not_run/사용자 생략을 기록한다. 미검증을 passed로 간주하지 않고 현재 계정·로컬 기록 및 앱의 삭제 기능을 유지한다. 실제 제출 전에 남은 자료/승인 게이트를 확인한다.
- EAS submission FINISHED는 Apple TestFlight 처리 완료/설치 가능의 증거가 아니다.
- Expo Go 체감 결과는 참조 가능하지만 독립 앱의 프레임/권한/저장 상태와 같다고 볼 수 없다. 실기기 수치 미측정 시 FPS 수치 주장 금지.

## Implementation

### I01. Apple 처리·기기 검사
- Related Files:
  - `store/release-state.json` :: `testflightStatus`, `nativeQa`, `leaderboardQa`, build 식별자; modify
  - `docs/qa-report.md`, `docs/ios-release.md` :: 장면별 관찰·기기/날짜/빌드; modify selectively
  - `store/screenshots/README.md`, `store/screenshots/iphone-landscape/` :: 사용자가 승인한 실제 캡처; modify/new after receipt
  - `store/screenshots/approval.json` :: 사용자가 승인한 가로 시안5장·문구 범위, 원격 업로드/심사와 분리; new
  - `store/ko-KR/metadata.json` :: 사용자에게 제시한 한국어 description; read-only
  - `store/ko-KR/description-approval.json` :: description_only 승인·UTF-8 SHA-256·원격 미업로드 기록; new
  - `.memory/phases/2026-09-29-veteran-mentor-sprite/P01-character/T03-veteran-qa.md` :: 기존 Expo Go 미완료 검사; read-only unless matching evidence supplied
  - `.memory/phases/2026-09-21-close-call-nyang/P03-release/T03-ios-build-validation.md` :: 기존 iOS 검증; read-only unless its own acceptance criteria pass
- **Signatures & Types**: QA record `{platform:'TestFlight iOS', deviceModel:string, iosVersion:string, version:string, buildNumber:string, scenario:string, observed:string, status:'passed'|'failed'|'not_run', capturedAt:string}`. 기존 `release-state`의 `nativeQa`/`leaderboardQa`는 실제 증거 범위에 따라 `pending|passed|failed` 중 하나로만 갱신한다.
- **Data & Schema Fields**: 테스트 닉네임/점수는 사용자 승인 테스트 데이터. 외부 사용자 계정/랭킹 행은 임의 삭제하지 않는다. 개발 전체 해금 플래그는 릴리스에서 꺼져 있어야 하고 기본/1회/10회 해금은 기존 규칙대로 검증한다.
- **Execution Flow / Logic**:
  1. App Store Connect에서 해당 buildNumber의 처리 완료·TestFlight 그룹/설치 가능을 확인한다. API 401이면 사용자가 로그인한 UI에서 조회하되 인증은 사용자가 직접 한다.
  2. iPhone 모델/iOS/빌드번호를 기록하고 가로/노치, 홈 선택 캐릭터, 4걷기·위험/넘어짐, 15% 커피, 51% 사무실, 100%·해금, 좌우/동시 터치·게임오버/재도전·홈 이어가기를 확인한다.
  3. 음향/진동/일시정지·앱 재개·오프라인→온라인 큐·닉네임/Top30/계정 삭제·재설치를 확인한다. 실제 광고는 비활성으로 유지되어야 하며 가상 광고가 배포 UX에 노출되지 않는지 확인한다.
  - 설정의 개인정보·고객지원과 랭킹 문의가 올바른 공개 페이지를 실제 Safari에서 열고 게임 복귀/저장 상태를 유지하는지도 새 iPhone 빌드에서 확인한다. 웹/mock 테스트를 이 기기 증거로 대신하지 않는다.
  4. 사용자의 실제 기기 캡처를 최신 buildNumber와 연결하고 규격·가로·클리핑·개인정보를 검사한다. 발견 결함은 심사 준비를 멈추고 원인/새 빌드 필요성을 분리한다.
- **Error & Exception Handling**: 기기/계정 접근이 없어 확인 못하면 `not_run`을 유지하며 완료 커밋하지 않는다. 서버 연결 실패를 무조건 게임 버그로 단정하지 않고 앱 환경/운영 ref를 대조한다.
- **State Transition & Return**: TestFlight 빌드 식별·기기 QA 체크와 실패/미검증 목록.
- **Image approval schema**: `{schemaVersion:1,status:'approved',approvedOn:'2026-09-30',scope:'five_landscape_images_and_captions',manifest:'store/screenshots/manifest.json',assetCommit:'2fe32ec',uploadedToAppStoreConnect:false,captureBuildConfirmed:true,captureBuild:{version:'1.0.0',buildNumber:'6',easBuildId:string,confirmedOn:'2026-09-30',evidenceSource:'user_confirmation',deviceModel:'iPhone 15 Pro',iosVersion:'27.2'}}`. 원형 manifest의 draft/출처 null은 제작 시점 기록이며 현재 승인·촬영 빌드·기기 정보는 별도 approval을 읽는다. 사용자 보고값을 독립 기기 조회로 표현하지 않으며 nativeQa/leaderboardQa를 passed로 바꾸지 않는다.
- **Description approval schema**: `{schemaVersion:1,status:'approved',approvedOn:'2026-09-30',locale:'ko-KR',scope:'description_only',metadata:'store/ko-KR/metadata.json',descriptionSha256:string,uploadedToAppStoreConnect:false}`. SHA-256은 JSON 원문 전체가 아니라 description 문자열의 UTF-8 bytes를 대상으로 한다. 다른 공개 문구/실기기QA/최종 제출과 분리한다.

### I02. 학습 기록
- Related Files: `docs/learning-notes.md` :: 현장 QA에서 발견한 문제와 원인/다음 연습; modify.
- Expo Go, TestFlight, App Review 빌드의 차이를 사용자 관찰과 연결해 기록한다.

## Acceptance Criteria
- [x] 정확한 최신 빌드의 Apple 처리·설치 가능 확인. Apple VALID/내부베타 기록 + 사용자 실제 캡처 빌드6 확인.
- [x] 사용자 확정 범위의 실제 기기 매트릭스 22개와 랭킹 관찰 증거를 기록했다. 삭제·재설치 2개는 사용자 제외/not_run으로 분류하고 전체 QA pending 및 잔여 위험을 보존했다. 이 기준은 2026-09-30 생략 결정으로 조정한 것이며 원래 전체 매트릭스 통과가 아니다.
- [x] 캡처는 해당 buildNumber의 실제 iPhone 원본이며 사용자 확인을 받았다. 사용자 제공 실제 JPG + 1.0.0(6) 촬영 확인; 편집본은 승인된 확대본이며 원본 고해상도라고 주장하지 않는다.

## Validation
- App Store Connect TestFlight 화면의 buildNumber/상태와 iPhone 설정의 앱 버전 대조.
- 이번 범위의 랭킹 증거는 실제 사용자 조회·재연결 후 점수 반영 확인이다. staging smoke 실패는 보존한다. 운영 ranking:verify 쓰기 재실행은 하지 않는다. 삭제·재설치 제외 결정에 따라 새 테스트 계정/cleanup을 요구하지 않는다.
- `node --test scripts/render-store-screenshots.test.mjs scripts/release-preparation.test.mjs`.
- 실제 iPhone QA 체크리스트 및 원본 이미지 치수/알파 확인.
- `git -c safe.directory=D:/GrillmeEDU diff --check`.

## Learning
- 개념: 테스트 피라미드의 마지막 단계, 네트워크/런타임/손맛의 실기기 증거, 운영 데이터 최소 침습 검증.
- 예상 디버깅: Apple processing 지연, TestFlight 그룹 미배정, 카메라 캡처가 이전 build, 운영 ref 불일치.
- 복습 질문: EAS FINISHED만으로 설치 가능을 보장하지 못하는 이유는? Expo Go에서 괜찮던 화면이 IPA에서 달라질 수 있는 이유는? 운영 랭킹 쓰기 검증은 왜 cleanup이 필요한가?

## Commit Message
```text
test(ios): verify latest TestFlight build on iPhone

Plan: 2026-09-29-app-store-review-prep
Phase: P02-ios-delivery
Task: T02-native-qa

- Record build-specific device, ranking and screenshot evidence.
- Keep unverified scenarios explicit instead of assuming success.
```

## Progress
- [x] Apple 처리/사용자 확정 범위 기기 QA 증거 정리 완료(전체 QA 통과 아님)
- [x] 검증 완료·범위 한정 커밋 대상 확정
- commit: pending
