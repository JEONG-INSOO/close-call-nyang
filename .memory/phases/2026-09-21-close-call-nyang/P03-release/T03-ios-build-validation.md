# Task: T03 실제 iOS 빌드·TestFlight·기기 검증

## Status: pending

## Goal
Windows에서 EAS로 독립 iPhone 빌드를 생성해 App Store Connect에 업로드하고, 실제 기기 플레이와 iOS·웹 공통 온라인 순위/닉네임·삭제를 같은 live backend에서 검증한 증거를 남긴다.

## Decision Summary
- 유료 Apple Developer 계정은 있다고 확인됐지만 인증·Team ID·실제 iPhone 검증은 아직 완료되지 않았다. 일반 SDK57 Expo Go 테스트와 production/TestFlight 검증은 별개다.
- 광고·추적 SDK 없는 iPhone 가로 앱 `com.mocca.closecallnyang`. P02에서 검증된 익명 인증/서버 입력 리플레이/공통 순위를 사용하며 계정 로그인 화면은 없다. 클라우드 업로드는 App Review 제출이 아니며, 이 Task에서 심사 제출 버튼을 누르지 않는다.

## Implementation

### I01. 인증과 재현 가능한 production 빌드

- Related Files:
  - `app.config.ts` :: `extra.eas.projectId`, `ios.appleTeamId`, version/권한/scene 설정; modify
  - `eas.json` :: 실제 production image/submit app ID; modify
  - `store/release-inputs.json` :: 실제 Team ID·App Store Connect ID; modify
  - `store/release-state.json` :: `ReleaseState`; new
  - `docs/ios-release.md` :: 실제 명령/인증·빌드 결과; modify
  - `package.json`, `package-lock.json` :: 호환성 수정이 입증된 경우만; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type CheckStatus = 'pending' | 'passed' | 'failed';
  type ReleaseState = {
    schemaVersion: 1; bundleIdentifier: 'com.mocca.closecallnyang';
    sourceCommit: string | null; easProjectId: string | null; easBuildId: string | null;
    ascAppId: string | null; version: string | null; buildNumber: string | null;
    expoGoQa: CheckStatus; nativeQa: CheckStatus; leaderboardQa: CheckStatus;
    backendUrl: string | null;
    testflightStatus: 'not_started' | 'processing' | 'available' | 'failed';
    reviewStatus: 'not_started' | 'ready_for_review' | 'waiting_for_review' | 'in_review';
    releaseMode: 'manual'; submissionId: string | null; submittedAt: string | null;
  };
  ```
- **Data & Schema Fields**: 첫 상태의 ID/version/number/commit/date는 null, QA pending, TestFlight/review not_started. 실제 계정 연동 결과만 채운다. 빌드 전 앱/config/의존성 변경이 있으면 로컬 검사 후 아래 source-only 메시지로 먼저 커밋하고 `sourceCommit`에는 그 SHA를 기록한다. 이는 빌드 소스를 식별하기 위한 준비 커밋이며 Task Status는 pending/in_progress로 유지한다. 앱/config 변경이 없으면 해당 소스의 기존 SHA를 사용한다. 빌드 후 QA/기록·Task 완료는 본문의 최종 Commit Message로 별도 커밋한다. 자기 SHA를 같은 커밋 안에 넣지 않는다. 최종 앱/config가 빌드 당시와 달라진 경우에만 새 source-only 커밋·재빌드·재검증하며 문서만 추가된 것은 재빌드 이유가 아니다.
  ```text
  chore(ios): finalize the source for the production build

  Plan: 2026-09-21-close-call-nyang
  Phase: P03-release
  Task: T03-ios-build-validation

  - Capture verified app configuration before the cloud build
  ```
- **Execution Flow / Logic**:
  1. Precondition & Validation: P03-T02 로컬 검사와 `npm.cmd run typecheck`, `test:ci`, `web:export`를 통과한다. P02의 hosted backend 검증 증거와 production API 상태, 공개 URL/key·rules/replay 검증 버전이 앱과 맞는지 확인한다. `npx.cmd eas-cli@latest whoami`로 Expo 계정을 읽기 확인한다. 사용자 인증 또는 계정 선택이 필요하면 공식 로그인 UI/CLI를 사용하며 비밀번호/2FA를 문서나 코드에 저장하지 않는다.
  2. Core Processing: 승인된 사용자 계정에서 EAS 프로젝트를 연결하고 정확한 projectId/Team ID/ascAppId를 사용한다. 기존 동일 bundle 앱이 있으면 새 앱을 중복 생성하지 않고 확인한다. `npx.cmd eas-cli@latest build:configure`가 필요하면 변경 내용을 검토해 production 프로필을 보존한다. EAS production의 `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 Pages와 같은 프로젝트이며 공개 key인지 확인하고, `backendUrl`에 실제 URL을 기록한다. 서버 secret/service-role key는 빌드/client/Git에 넣지 않는다. SDK57/Node24 및 현재 Apple 제출 요구를 만족하는 지원 EAS 이미지를 선택·기록한다. Xcode27이면 Expo scene-support 필요 조건을 공식 문서로 확인하고 필요한 SDK 패치/plugin 설정을 반영·재검증한다.
  3. Error & Exception Handling: 계정 인증·서명 권한·빌드 quota·네트워크·Supabase 일시정지/한도/설정 누락이 있으면 정확한 오류와 다음 필요한 사용자 행동을 기록하고 Task를 미완료로 둔다. 무료 플랜 조건을 바꾸거나 결제를 대신 실행하지 않는다. 인증정보 우회나 로컬 Mac 도구 사용을 가정하지 않는다. 빌드 실패 시 로그의 원인을 수정한 후 관련 로컬 검사를 다시 돌린다. 관련 없는 SDK major 업그레이드를 하지 않는다.
  4. State Transition & Return: 실제 암호화 사용/포함 라이브러리를 검토해 export compliance와 native config를 확정하고 필요한 로컬 검사와 source-only 커밋을 마친다. 이후 `npx.cmd eas-cli@latest build --platform ios --profile production`을 실행하고 실제 ID/빌드 번호·URL·소스 식별자를 기록한다. 완료된 정확한 ID로 EAS Submit을 수행해 TestFlight processing→available을 관찰한다. 명령 timeout이나 업로드 성공만으로 available을 기록하지 않는다.

### I02. Expo Go와 독립 앱의 실제 iPhone QA

- Related Files:
  - `docs/qa-report.md` :: native QA 매트릭스; modify
  - `docs/leaderboard-operations.md` :: 실제 backend/rules/권한·보존 근거; read-only
  - `test-fixtures/ranked-replays.json`, `src/online/rulesVersion.ts` :: P02 golden fixture와 생성 rules hash; read-only
  - `src/online/__dev__/RankedReplayDiagnostics.tsx` :: Hermes 개발 전용 fixture hash/fall-tick 검사 뷰; 기존 P02 harness 재사용/미존재 시 new
  - `store/release-state.json` :: QA/TestFlight 실제 상태; modify
  - `docs/learning-notes.md` :: P03-T03 실제 빌드·실패·수정; modify
  - `src/input/`, `src/services/`, `src/game/controller.ts`, `src/screens/`, `src/scene/` — 관찰된 native/순위 연동 결함의 최소 수정; modify only if evidenced

#### Details
- **Signatures & Types**:
  ```typescript
  type NativeQaCase = {
    id: string; environment: 'expo-go' | 'testflight'; device: string; osVersion: string;
    appVersion: string; buildNumber: string | null; checkedAt: string;
    status: 'passed' | 'failed' | 'not_run'; evidence: string; issue: string | null;
  };
  ```
- **Data & Schema Fields**: QA 문서에 실제 장치명·iOS 버전·테스트 일시·버전/build number·검사한 사람/방식·결과를 기록한다. TestFlight 번호가 ReleaseState와 일치해야 한다. 자동 mock 검사와 실기기 관찰은 별도 행이다. P02 canonical physics는 `stableSin`/`stableLog1p`와 playing tick마다 주요 수치의 1e-9 반올림을 사용하고 ordered module 내용의 SHA256에서 `nyang-v1-<16hex>` rules hash를 만든다. Node/browser/Deno에서 통과한 `test-fixtures/ranked-replays.json`의 golden digest/fall tick과 실제 iPhone Hermes 결과를 같은 rules hash로 대조해야 한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 일반 SDK57 Expo Go는 `npx.cmd expo login` 후 iPhone과 같은 계정으로 로그인해 사용한다. 최신 일반 Go의 호환성이 확인되지 않을 때만 `eas go` 현재 help·지원 경로를 확인한다. 사용자의 기존 Expo Go 호스트가 production 앱 설정을 입증하지는 않는다.
  2. Core Processing: 실제 iPhone에서 (a) 가로 고정/안전영역/노치 (b) 양쪽 버튼 동시·빠른 교차 누름과 놓기 (c) 앱/잠금 전환 시 정지 및 수동 재개, 입력 해제 (d) 음악·효과음·햅틱 설정, 무음/오디오 중단 복귀 (e) 결과 저장 후 앱 재시작 (f) 공유 취소/완료 (g) 15% 커피/가속·51% 실내·100% 색상만 (h) 위험 각도 즉시 실패 (i) 장시간 실행 성능을 검사한다. Expo Go에서는 명시적 개발 flag 때만 5초 가상 광고·취소·1회 부활을 검증한다. TestFlight에서는 결과에 광고/부활 버튼이 없고 debug 메뉴·녹음 권한 요청이 없음을 확인한다.
  3. Numeric QA: iPhone의 `__DEV__` 전용 RankedReplayDiagnostics에서 golden fixture를 실행하고 digest/fall tick만 기록한다. session/token/전체 입력 로그를 출력하지 않는다. production에는 이 진입/뷰가 없어야 한다. Hermes 결과가 Node/browser/Deno와 다르면 canonical kernel을 수정하고 `ranked:sync`로 client/server rules hash를 함께 갱신해 실제 server 및 native 검증을 반복한다. 임의 client 점수 허용이나 verifier 오차 확대를 해결책으로 삼지 않는다.
  4. Online QA: 실제 TestFlight와 배포 웹에서 각각 다른 익명 guest를 만들고 동일 닉네임을 지정해도 별도 player로 유지되는지 확인한다. 닉네임 NFC/trim/공백정리 후 2~12 codepoint(한글/ASCII Latin/숫자/내부 공백) 검증·변경, 서버 seed로 시작한 정상 판의 입력 리플레이 검증 후 등록, 두 플랫폼에서 같은 상위 100/본인 순위, 누적 최고점/동점 공동 순위를 확인한다. 앱 개발/mock 판은 production 제출 경로를 쓰지 않으며 서버는 부활/무효 proof를 독립 검증한다. `__DEV__`가 암호학적 앱 인증이라고 주장하지 않는다. 개발 테스트는 staging만 사용한다. 오프라인 시작은 로컬 기록만 갱신하고, 온라인 시작 후 끊긴 판은 최대 1MiB queue/24시간 만료 안에서 동일 seq 재시도·최종 fall chunk/finalize 완료 후만 등록한다. 닉네임 신고/로컬 숨김은 실제 계약대로 동작하고 숨겨도 서버 순위를 재번호화하지 않는다. 본인의 시험 guest를 앱에서 삭제하면 Auth user까지 삭제 완료 후 session/profile/queue가 지워지고 로컬 최고/설정은 남으며 다른 플랫폼에서 해당 순위가 사라진다. 명시적 닉네임 참여 전 계정을 재생성하지 않는다.
  5. Error & Exception Handling: 장치·계정·live backend 접근이 없으면 해당 행은 not_run, task 미완료, current 유지. 사용자가 직접 검증하면 사용자가 제공한 결과와 출처를 명시한다. 브라우저 mock/시뮬레이션으로 대체했다고 주장하지 않는다. crash·stuck input·점수 급증·광고 노출·잘못된 순위/다른 guest 접근 결함은 수정하고 새 production build 또는 영향받은 backend를 해당 규칙에 따라 재검증한다.
  6. State Transition & Return: 필요한 실기기/Hermes hash/공통 순위 항목이 실제로 통과하고 TestFlight 빌드가 처리 완료일 때 expoGoQa/nativeQa/leaderboardQa passed, testflight available. reviewStatus는 not_started 유지. iPhone-only여도 iPad 호환 실행에서 차단 UI가 없는지 점검 필요성을 기록하되 iPad 최적화 작업을 추가하지 않는다.

## Acceptance Criteria
- [ ] 정확한 bundle의 서명된 production 빌드가 실제 생성되고 TestFlight에서 처리 완료되었다.
- [ ] 빌드 ID·소스·버전·번호와 실제 iPhone QA 증거가 연결되어 있다.
- [ ] 광고 없는 독립 앱의 입력·생명주기·오디오·저장·공유 검증이 통과했다.
- [ ] 같은 live backend를 사용하는 iOS/웹 닉네임·검증 기록·공통 순위·오프라인 제외·신고·본인 삭제 검증이 통과했다.
- [ ] 동일 rules hash에서 Hermes 실제 기기 golden digest/fall tick이 Node/browser/Deno와 일치하고 developer harness는 production에 없다.
- [ ] 계정/기기 누락 또는 실패 항목이 남으면 done/다음 Task로 처리하지 않는다.
- [ ] App Review 제출을 아직 수행하지 않았음을 구분해 기록한다.

## Validation
- 작업 폴더 `D:\GrillmeEDU`: `npx.cmd expo-doctor@latest`, `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npm.cmd run web:export` — 통과.
- `npm.cmd run ranked:check`, `npm.cmd run test:ranking`, `npm.cmd run server:check`, `npm.cmd run ranking:env-check` — canonical kernel/server와 client 공개 설정 검사 통과.
- `npm.cmd run ranking:verify -- --environment production` — 실제 배포 API/RLS/정상 proof/권한/삭제 검증; 생성한 시험 guest만 정리. Node/browser/Deno 기존 증거에 실제 Hermes fixture 결과를 추가한다.
- `npx.cmd eas-cli@latest whoami` — 작업 계정 확인; 인증 필요 시 `npx.cmd eas-cli@latest login`.
- `npx.cmd eas-cli@latest build --platform ios --profile production` — 성공한 실제 ID를 ReleaseState에 기록.
- PowerShell에서 `$nyangBuildId = (Get-Content -LiteralPath 'store/release-state.json' -Raw | ConvertFrom-Json).easBuildId`로 실제 ID를 읽은 뒤 `npx.cmd eas-cli@latest build:view $nyangBuildId --json` — source/build 식별자와 성공 상태 확인. null이면 실행하지 않는다.
- `npx.cmd eas-cli@latest submit --platform ios --profile production --id $nyangBuildId` — 해당 빌드 업로드. App Store Connect/TestFlight에서 available 상태와 번호를 별도로 확인.
- 실제 iPhone에서 위 QA 매트릭스 실행 — 모든 필수 행 passed. `git diff --check` — 오류 없음.
- 실제 Pages 웹과 동일 backend에서 위 Online QA 실행 — 독립 guest·검증된 기록·삭제 반영 증거와 API 환경/rules 버전을 기록한다. 인증 token과 서버 키는 증거에서 제거한다.

## Commit Message
```text
feat(ios): validate the signed production build on iPhone

Plan: 2026-09-21-close-call-nyang
Phase: P03-release
Task: T03-ios-build-validation

- Configure verified cloud signing and record the TestFlight build
- Complete native lifecycle and production gameplay validation
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
- external prerequisites: Expo/Apple 인증, 서명 권한, 실제 iPhone 및 TestFlight 처리 완료
