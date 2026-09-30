# Task: T01 새 iOS 빌드와 정확한 TestFlight 업로드

## Status: done

## Goal

P01에서 고정한 소스·공개 환경으로 새 아이콘이 들어간 서명 iOS 빌드를 만들고, 그 정확한 build ID만 기존 App Store Connect 앱으로 업로드한다.

## Decision Summary
- 2026-09-30 사용자가 최신 앱을 TestFlight에 올려 테스트하도록 명시 요청했다. P01-T03 메타데이터는 pending 유지하고 이 Task를 우선한다. 소개/실제 캡처/심사 승인 게이트는 후속에 유지한다.
- Expo Go는 개발 검사이며 App Store IPA가 아니다. 기존 1.0.0(5)의 FINISHED는 새 아이콘/UI의 제출 증거가 아니다.
- EAS project `315e87a2-f405-4f65-ae45-c91f1d2c59bf`, iOS bundle `com.mocca.closecallnyang`, ASC app `6815771701`, team `S9RLQ8474U`를 기존 검증값으로 사용하되 CLI readback으로 다시 확인한다. 키/토큰은 출력·커밋하지 않는다.

## Implementation

### I01. 사전 입력과 archive 검사
- Related Files:
  - `app.config.ts` :: `expoConfig`/icon/bundle/orientation; read-only unless verified mismatch
  - `eas.json` :: `build.production`, `submit.production`; read-only unless verified mismatch
  - `.easignore` :: 업로드 경계; modify only if confidential input leaks
  - `store/release-state.json` :: 기존 상태·새 빌드/제출 사실; modify after evidence
  - `store/build-history/2026-09-29-build5.json` :: 현재 dirty release-state의 이전 빌드 사실을 원형 보존; new before replacing current state
  - `docs/learning-notes/2026-09-30-testflight-upload.md` :: archive와 source 대응·실제 build/submission 증거; new
  - `docs/ios-release.md`, `docs/learning-notes.md` :: 빌드/업로드 차이와 결과; modify selectively
- **Signatures & Types**: `ReleaseState` 기존 schemaVersion 1 필드 유지. 새 값은 `sourceCommit:string`, `sourceSnapshot:'clean_committed'`, `easBuildId:string`, `buildNumber:string`, `submissionId:string|null`, `testflightStatus:string`, `reviewStatus:'not_started'` 등 기존 JSON 타입/키를 바꾸지 않고 기록한다.
- **Data & Schema Fields**: production의 공개 변수는 `EXPO_PUBLIC_SUPABASE_URL` 운영 ref `fgojrxmpxpzdiwsktjsx`와 `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 필요. mock ad/replay 진단은 false. 서비스 키·개인 `.env`는 아카이브 금지.
- **Execution Flow / Logic**:
  1. P01 소스 커밋과 작업 트리의 잔여 변경을 비교하여 EAS가 업로드할 파일의 바이트/해시가 고정 소스와 일치하는지 확인한다. 아카이브에 현재 무관 더티 파일이 들어가면 빌드하지 않고 별도 안전한 소스 스냅샷을 마련한다.
  2. EAS 계정·프로젝트·운영 공개 변수 존재만 조회한다(값·토큰 출력 금지). 기존 서명/프로비저닝과 App Store Connect 앱을 조회한다. 인증 실패는 사용자가 공식 로그인 화면에서 해결한다.
  3. 검증된 로컬 `output/eas-cli-tools/node_modules/.bin/eas.cmd`(24.7.0; npx 동일 버전의 대안)를 사용해 `build --platform ios --profile production --non-interactive --freeze-credentials --wait`로 새 빌드 하나를 생성한다. 완료된 ID/버전/번호와 source commit을 기록한다. 실패면 수정 후 **새 빌드 ID**를 구분한다. 출력에는 고정 metadata만 남기고 JSON의 서명된 로그 URL/환경 값은 출력하지 않는다.
  4. 정확한 성공 ID를 `npx.cmd --yes eas-cli@24.7.0 submit --platform ios --profile production --id <verified-build-id> --non-interactive --wait --no-auto-testflight-setup`에 전달한다. CLI 옵션은 실제 버전 help로 검증하고 기존 앱 외 새 앱/테스터 그룹을 만들지 않는다. App Review 제출은 하지 않는다.
  5. EAS build FINISHED와 submission FINISHED, Apple 처리·설치 상태는 서로 다른 필드/근거로 저장한다.
- **Error & Exception Handling**: EAS/Apple 401, 네트워크 지연, 서명 오류는 `blocked` 또는 실패로 기록하고 비밀번호/2FA를 채팅에서 받지 않는다. Apple 연결이 안 되면 성공을 추측하지 않고 상태 조회만 재시도한다. 기존 인증서를 임의 폐기·교체하지 않는다.
- **State Transition & Return**: 새 build/submission ID와 검증된 상태, Apple 측 미검증 여부.

### I02. 학습 기록
- Related Files: `docs/learning-notes.md` :: commit→archive→빌드→업로드→Apple 처리의 단계별 증거; modify.
- 업로드 성공과 설치 가능 상태를 구분하고 `autoIncrement` buildNumber의 의미를 기록한다.

## Acceptance Criteria
- [x] 소스·아이콘·운영 설정과 실제 archive의 대응이 검증되었다.
- [x] 새 iOS EAS build가 FINISHED이며 정확한 ID가 기존 ASC 앱으로 업로드 FINISHED.
- [x] Apple 처리·실기기 QA를 아직 확인하지 않았다면 미확인으로 남긴다.

## Validation
- `npm.cmd run branding:verify`, `npm.cmd run test:release`, `npm.cmd run typecheck`, `npm.cmd run ranked:check` — 로컬 release 게이트.
- `npx.cmd --yes eas-cli@24.7.0 project:info` 및 `eas env:list --environment production` — 소유 계정/공개 변수 이름 확인(비밀 값 미출력).
- `npx.cmd --yes eas-cli@24.7.0 build:view <build-id> --json` — 정확한 빌드 상태·번호.
- `eas.cmd submit:view <submission-id> --json` — 정확한 EAS 업로드 상태, 필요한 ID/상태/시각만 출력.
- `eas.cmd submit:status --platform ios --profile production --json --non-interactive` — 실제 Apple 처리 상태. 실제24.7.0 help에는 --id가 없으므로 앱/번호로 조회한다. Apple API 실패 시 EAS 사실까지만 기록.
- `git -c safe.directory=D:/GrillmeEDU diff --check`.

## Validation Results — 2026-09-30 upload completed
- branding 원본일치1024/48 opaque, release8/typecheck/ranked8 통과. 최근 앱 소스의 전체700/50 suites·웹 링크3 통과 결과 유지. 앱 runtime diff 없음.
- EAS계정·projectID, production 공개2변수의 URL/ref와 publishable형식 일치(값비출력). 기존 team/active profile 사용·freeze-credentials. 실제 archive112파일 전부09a7a09 Git blob과 일치, untracked0/forbidden0, 아이콘/링크/아틀라스 포함. /debug.log 제외했고 기존 dirty파일 보존.
- build `3fd87f8b-5d8e-479a-8fc8-e7cc3a8de37a`, 1.0.0(6), source09a7a0949efc21554fee29a3e77e14c18328efe3, FINISHED2026-09-30T02:23:28.174Z. 정확한 ID 제출 `e0347b70-45bb-4aac-a9f2-d76c8d8cf60d` FINISHED2026-09-30T02:24:43.663Z, ASC6815771701 연결 일치.
- Apple 최종 재조회에서6번 VALID/IN_BETA_TESTING/READY_FOR_BETA_SUBMISSION, expired=false, uploadedDate2026-09-30T11:25:45+09:00 확인. 기기 설치·QA 미확인. App Review/공개/외부 초대는 실행하지 않았다.

## Learning
- EAS build 완료·정확한 ID 제출 완료와 Apple VALID/내부 베타 테스트 상태를 별도 조회로 확인했다. 첫 Apple 목록에서는6번이 없었으므로 즉시 설치 가능이라 추측하지 않았고, 재조회 증거 이후 상태를 갱신했다. 실제 기기 QA와 공개 심사는 별개다. 상세 학습노트2026-09-30-testflight-upload.md.
- 개념: source snapshot과 cloud archive, 원격 buildNumber, Apple 업로드 파이프라인.
- 예상 디버깅: 이전 더티 파일이 archive에 섞임, EAS 계정/ASC 앱 불일치, 401을 앱 미존재로 잘못 해석.
- 복습 질문: 빌드 성공이 왜 TestFlight 설치 성공이 아닌가? 새 아이콘을 확인할 때 어떤 buildNumber를 보아야 하는가? 원격 서명을 임의 교체하면 어떤 위험이 있는가?

## Commit Message
```text
chore(ios): record reproducible TestFlight build upload

Plan: 2026-09-29-app-store-review-prep
Phase: P02-ios-delivery
Task: T01-eas-build-upload

- Build and submit the validated source snapshot to the existing app.
- Keep Apple processing and device QA separate from EAS completion.
```

## Progress
- [x] archive·환경·빌드 확인
- [x] 정확한 빌드 업로드 및 증거 기록
- commit: 완료 증거 커밋에 기록; source `09a7a09`
