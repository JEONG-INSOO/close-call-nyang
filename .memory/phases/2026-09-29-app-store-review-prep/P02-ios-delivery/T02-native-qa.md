# Task: T02 최신 TestFlight iPhone QA

## Status: in_progress

## Handoff — 2026-09-30
- 사용자가2번 JPG 확대 시안 선택. 별도 시안 Task 완료2fe32ec:5장2868×1320 RGB PNG, 원본 raw픽셀·캡처영역 동일, Node6/release8/육안 통과. 원형 JPG 메타데이터는 ignored 보존하고 공개 source에서는 EXIF/IPTC/COM lossless제거. 이미지 승인과 기종·iOS·buildNumber/실기기 QA는 아직 미확인. 랭킹4번 제외. 원격 업로드·심사 제출 없음.
- 사용자가 실제 플레이 캡처6장을 제공했다. System.Drawing 읽기 검사:모두1280×590 JPG. 홈/캐릭터선택/랭킹/일시정지/카운트다운/4% 기울어진 플레이가 관찰된다. 기종·iOS·빌드번호/커피·사무실·해금/동작·오프라인·삭제·Safari복귀 검증은 확인 안 됨. 현재 캡처를 제출 규격 원본이라고 간주하지 않는다. 사용자선택후확대시안완료、승인대기. 랭킹 타인 닉네임 공개는 보류.
- T01 완료306f338. 빌드3fd87f8b-5d8e-479a-8fc8-e7cc3a8de37a,1.0.0(6), 제출e0347b70-45bb-4aac-a9f2-d76c8d8cf60d 모두FINISHED. Apple6번VALID/IN_BETA_TESTING/READY_FOR_BETA_SUBMISSION, expired=false 확인.
- Apple 처리·내부 테스트 상태 확인까지만 완료. 실제 iPhone 설치/모델·iOS/장면별QA/랭킹·삭제/최신 원본 캡처는 not_run이며 사용자 증거 대기. 기기 설치와 QA를 대신 확인할 연결 장치는 없다. T02 전체 완료/완료커밋은 하지 않는다.

## Goal

Apple이 처리한 정확한 새 빌드를 실제 iPhone에 설치해 가로 화면·캐릭터/입력/프레임·오프라인/랭킹/삭제를 확인하고 App Store 캡처의 진짜 출처를 확정한다.

## Decision Summary
- EAS submission FINISHED는 Apple TestFlight 처리 완료/설치 가능의 증거가 아니다.
- Expo Go 체감 결과는 참조 가능하지만 독립 앱의 프레임/권한/저장 상태와 같다고 볼 수 없다. 실기기 수치 미측정 시 FPS 수치 주장 금지.

## Implementation

### I01. Apple 처리·기기 검사
- Related Files:
  - `store/release-state.json` :: `testflightStatus`, `nativeQa`, `leaderboardQa`, build 식별자; modify
  - `docs/qa-report.md`, `docs/ios-release.md` :: 장면별 관찰·기기/날짜/빌드; modify selectively
  - `store/screenshots/README.md`, `store/screenshots/iphone-landscape/` :: 사용자가 승인한 실제 캡처; modify/new after receipt
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

### I02. 학습 기록
- Related Files: `docs/learning-notes.md` :: 현장 QA에서 발견한 문제와 원인/다음 연습; modify.
- Expo Go, TestFlight, App Review 빌드의 차이를 사용자 관찰과 연결해 기록한다.

## Acceptance Criteria
- [ ] 정확한 최신 빌드의 Apple 처리·설치 가능 확인.
- [ ] 실제 기기 매트릭스와 랭킹/삭제가 실행되었고 실패는 해결 또는 명시적 release blocker로 분류.
- [ ] 캡처는 해당 buildNumber의 실제 iPhone 원본이며 사용자 확인을 받았다.

## Validation
- App Store Connect TestFlight 화면의 buildNumber/상태와 iPhone 설정의 앱 버전 대조.
- `npm.cmd run ranking:verify -- --environment production --project-ref fgojrxmpxpzdiwsktjsx --env-file .env.ranking.production` — 무분별한 운영 쓰기 금지; 실제 테스트 쓰기는 사용자 승인·cleanup 절차가 있을 때만.
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
- [ ] Apple 처리/기기 QA 완료
- [ ] 검증·범위 한정 커밋 완료
- commit: pending
