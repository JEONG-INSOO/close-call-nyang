# Task: T04 스크린샷·최종 확인·App Review 제출

## Status: pending

## Goal
실제 iOS 캡처와 닉네임·공통 온라인 순위를 반영한 스토어 문구/개인정보 설명을 사용자에게 보여주고 확인받은 뒤, 검증된 앱 버전을 App Review에 실제 제출해 상태 증거를 남긴다.

## Decision Summary
- 사용자가 소개 문구를 제출 전에 다시 확인하도록 명시했다. 이미지와 빌드·최종 제출 대상도 구체적으로 보여준 뒤 승인받는다. 일반 4+ 콘텐츠 목표의 게임/캐주얼이며 Kids로 지정하지 않는다.
- 회원가입/로그인 화면이 없더라도 서버에는 익명 player UUID, 공개 닉네임, 검증 점수와 입력 증명이 있다. 실제 데이터 처리·신고·삭제 기능을 스토어 응답과 일치시킨다. 분석/광고 추적은 없다.
- EAS Submit 업로드, Add for Review, 최종 Submit for Review는 서로 다른 상태다. 승인 후 공개 방식은 manual이며 Apple 심사 승인까지 이 Task가 보장하지 않는다.

## Implementation

### I01. 실제 iPhone 캡처와 벡터 문구 합성

- Related Files:
  - `store/screenshots/source/` :: 실제 검증 빌드의 원본 PNG; new
  - `store/screenshots/manifest.json` :: `ScreenshotManifest`; new
  - `store/screenshots/final/` :: 승인받을 스토어 PNG; new
  - `scripts/render-store-screenshots.mjs` :: `renderScreenshots`, `verifyScreenshots`; new
  - `package.json` :: `store:render`, `store:verify`; modify
  - `store/ko-KR/metadata.json`, `store/ko-KR/review-notes.md` :: 제출본; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type ScreenshotItem = {
    id: 'commute' | 'coffee' | 'office' | 'result'; source: string; output: string;
    caption: string; device: string; osVersion: string; buildNumber: string;
    sourceSha256: string; outputSha256: string | null;
  };
  type ScreenshotManifest = {
    schemaVersion: 1; width: number; height: number; items: ScreenshotItem[];
    fontFile: string; fontLicense: string;
  };
  function renderScreenshots(manifest: ScreenshotManifest): Promise<void>;
  function verifyScreenshots(manifest: ScreenshotManifest): Promise<string[]>;
  ```
- **Data & Schema Fields**: 네 장 모두 실제 검증된 iOS build number와 일치. 최초 target은 가로 2796×1290의 불투명 PNG로 두되, 실행 시 Apple의 현재 허용 규격과 원본 장치 해상도를 확인해 manifest에 확정한다. 원본은 변조하지 않고 그대로 보존한다. 한국어 합성 폰트는 재배포 가능한 정적 파일과 라이선스를 `assets/fonts/`에 함께 두고 정확한 경로를 지정한다. 이미 번들된 적합한 폰트가 있으면 재사용한다. npm scripts는 `store:render = node scripts/render-store-screenshots.mjs`, `store:verify = node scripts/render-store-screenshots.mjs --check`로 정의하고 check 모드에서는 파일을 수정하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: P03-T03 nativeQa/leaderboardQa passed와 정확한 build ID/number/backend URL을 확인한다. 사용자의 iPhone 캡처 또는 실제 iOS 실행 환경의 캡처가 필요하다. Windows 웹 캡처를 iPhone 캡처로 대체하지 않는다. 원본에 개인정보·알림이 보이면 실제 게임에서 다시 촬영한다. 캡처는 본인의 테스트 guest로 만들고 다른 사용자의 비공개 정보를 포함하지 않는다.
  2. Core Processing: SVG의 문구/배경 레이어와 sharp 합성으로 실제 게임 화면에 짧은 한국어 문구를 더한다. 출근길, 커피, 사무실, 결과의 기존 네 장을 유지하고 결과 캡처에 실제로 보이는 닉네임·온라인 제출/순위 진입을 담을 수 있다. 다섯 번째 이미지를 추가 요구하지 않는다. 화면 비율을 유지하고 조작/점수를 가리지 않으며 플레이 내용이나 기록을 조작하지 않는다. 원본/결과 SHA256과 build number를 manifest에 기록한다. 미디어 제작은 코드 기반 compositing이며 AI 이미지 편집을 사용하지 않는다.
  3. Error & Exception Handling: 원본·폰트 누락, 해시 불일치, 잘못된 크기/알파, 문구 잘림은 exit 1. missing source를 가짜 게임 장면으로 메우지 않는다. 실행 환경에 캡처 수단이 없으면 구체적 요청과 not_run 상태로 남기고 제출을 진행하지 않는다.
  4. State Transition & Return: 네 결과물을 직접 열어 한국어 렌더링·가독성·원본 충실성을 확인한다. 문구 변경 또는 재합성 시 이전 승인 해시를 무효화한다.

### I02. 공개 URL·운영 입력·최종 승인

- Related Files:
  - `public/privacy/index.html`, `public/support/index.html` :: 연락처/운영자 초안 해소; modify
  - `store/release-inputs.json` :: 실제 운영 입력; modify
  - `store/privacy-inventory.md` :: 익명 identity·순위/리플레이/신고·삭제와 실제 App Privacy 응답; modify
  - `store/release-approval.json` :: `ReleaseApproval`; new
  - `store/release-state.json` :: T03 상태; read-only/modify
  - `docs/release-record.md` :: 실제 URL 확인·사용자 승인·App Review 기록; new
  - `docs/deployment.md`, `docs/learning-notes.md` :: 공개 상태/학습; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type ReleaseApproval = {
    schemaVersion: 1; status: 'pending' | 'approved'; approvedAt: string | null;
    approvalEvidence: string | null; easBuildId: string; buildNumber: string;
    metadataSha256: string; screenshotManifestSha256: string;
    releaseInputsSha256: string; privacyInventorySha256: string;
    backendUrl: string; releaseMode: 'manual';
  };
  // release-inputs.json 기존 필드:
  // supportEmail, copyrightHolder, price, territories, appleTeamId, ascAppId
  // 미정은 null. price = 'free' | {currency:string; amount:number}, territories = string[].
  ```
- **Execution Flow / Logic**:
  1. Precondition & Validation: 공개 지원 연락처·저작권자·가격·배포 지역 등 실제 제출에 필요한 값이 없으면 실행 시 사용자에게 운영 정보로 받는다. 인증과 심사용 비공개 연락처는 적절한 계정 UI에 입력하고 Git에 보관하지 않는다. 4+는 닉네임 사용자 콘텐츠와 신고/기본 moderation을 포함해 설문을 사실대로 작성한 결과로 확인하며 임의로 등급을 낮추지 않는다. Supabase 프로젝트가 활성 상태이고 현재 무료 한도 내 운영 가능하며 앱/웹의 공개 URL/publishable key가 같은 서버를 가리키는지 확인한다.
  2. Core Processing: 지원/개인정보 문서에 실제 운영 정보, anonymous UUID·닉네임·검증 점수/입력 증명의 목적·보존·처리 위치, 닉네임 신고/변경·온라인 데이터 삭제 방법과 계정 복구 한계를 반영하고 모든 `data-release-pending` 표식을 제거한다. 사용자가 GitHub 저장소를 생성/push하고 Pages Source를 Actions로 활성화하도록 안내한다. 에이전트는 원격 생성·push를 하지 않는다. 실제 게임/privacy/support URL을 열어 올바른 내용과 200을 확인하고 Pages origin `https://mocca.github.io`에서 온라인 조회/인증 요청이 CORS 오류 없이 동작하는지 확인한다. 홈페이지 응답만 보고 API나 하위 문서까지 검증했다고 기록하지 않는다.
  3. Error & Exception Handling: URL 404·초안 연락처/삭제·보존 정보·미처리 빌드·미정 가격/지역·backend 중단/잘못된 공개 설정·권한 부족은 제출 차단. 로컬 코드·이미지·문구 준비가 끝났더라도 외부 상태를 success로 대체하지 않는다. 사용자의 검토를 기다리는 동안 준비 가능한 작업은 끝내되 승인되지 않은 소개문구/이미지를 제출하지 않는다.
  4. State Transition & Return: 실제 빌드 번호와 backend URL, 네 스크린샷, 온라인 순위를 포함한 소개문구/부제/키워드, 지원·개인정보 URL 및 데이터 처리/삭제 설명, 가격/지역, manual 출시를 한 검토 묶음으로 사용자에게 보여준다. 사용자의 명시적 확인 후 approvedAt/evidence와 metadata/manifest/release-inputs/privacy-inventory 해시를 기록한다. 승인 자료 또는 backend 대상이 바뀌면 pending으로 되돌리고 변경된 자료를 재확인한다.

### I03. 실제 App Review 제출

- Related Files:
  - `store/release-state.json` :: `reviewStatus`, `submissionId`, `submittedAt`; modify
  - `docs/release-record.md` :: 계정/앱/버전·제출 관찰 증거; modify

#### Details
- 기존 ReleaseState 계약: schemaVersion 1, bundleIdentifier 고정, sourceCommit/easProjectId/easBuildId/ascAppId/version/buildNumber, expoGoQa/nativeQa/leaderboardQa, backendUrl, testflightStatus, reviewStatus, releaseMode manual, submissionId/submittedAt. 이 Task에서는 빌드 식별자나 backend 대상을 몰래 바꾸지 않는다.
- 전제: ReleaseApproval의 해시/빌드/backendUrl이 현재 파일/선택 빌드와 일치하고 nativeQa/leaderboardQa passed, testflight available이며 실제 공개 URL이 정상이어야 한다. 브라우저/연결 도구의 공식 App Store Connect 기능으로 앱을 열고 정확한 bundle/app ID를 확인한다.
- 개인정보 답변은 실제 배포 앱·Supabase Auth/DB/Edge Functions·포함 SDK의 동작과 privacy inventory를 근거로 결정한다. 로그인 화면이 없다는 사실을 데이터 수집 없음으로 해석하지 않는다. 익명 ID에 연결된 닉네임·게임 기록/증명 및 신고에 적용되는 User ID/Gameplay Content/사용자 입력 항목을 실제 Apple 질문에 매핑하고, 분석·광고 추적 없음과 데이터 수집 여부를 별도로 답한다. 앱 내 온라인 데이터 삭제와 닉네임 신고/기본 moderation을 심사자 경로대로 확인한다. 공개 연락처와 별개인 심사 연락처, 암호화·콘텐츠 권리 등 필요한 항목도 실제 값으로 채운다.
- 승인된 문구·이미지 업로드 → production build 선택 → Games/Casual/실제 연령등급·지원 URL·개인정보 URL·가격/지역 확인 → manual release 확인 → Add for Review → 최종 Submit for Review. 제출 오류는 필드별로 수정하되 승인 자료가 바뀌면 재확인한다.
- 최종 서버 응답/화면이 제출 접수를 나타낼 때만 `reviewStatus=waiting_for_review` 또는 실제 관찰된 `in_review`, 실제 submissionId(노출될 때), submittedAt을 기록한다. Add for Review만 했으면 ready_for_review이고 Task는 미완료다. submissionId가 UI에서 제공되지 않으면 null을 유지하고 버전·빌드·접수 상태·일시·민감정보 없는 증거를 기록한다. 이후 자동 공개를 누르지 않는다.

## Acceptance Criteria
- [ ] 실제 iOS 원본 네 장과 코드 기반 합성본의 규격·출처·해시가 검증됐다.
- [ ] 공개 게임/지원/개인정보 URL이 정상이고 필수 운영 입력의 null/초안 표식이 없다.
- [ ] 실제 backend와 익명 닉네임/순위·신고·삭제 기능이 동작하며 개인정보 응답과 공개 방침이 일치한다.
- [ ] 사용자가 구체적인 문구·이미지·빌드·배포값을 확인한 증거가 있다.
- [ ] 정확한 앱 버전이 App Review에 실제 접수됐으며 EAS 업로드와 구분되는 증거가 있다.
- [ ] 출시 방식은 manual이고 심사 승인/공개 완료를 주장하지 않는다.

## Validation
- 작업 폴더 `D:\GrillmeEDU`: `npm.cmd run store:render`, `npm.cmd run store:verify` — 원본 해시·크기·불투명·manifest 검사 통과 및 최종 이미지 직접 검토.
- `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npm.cmd run web:export`, `node scripts/verify-web-export.mjs --release`, `npm.cmd run e2e` — 최종 수정 후 관련 전체 검사 통과.
- `npm.cmd run ranked:check`, `npm.cmd run ranking:env-check` — 승인한 앱·서버 rules 및 최종 공개 설정/서버 비밀 분리 확인. native golden hash/실제 hosted QA는 P03-T03 증거와 대조한다.
- `Invoke-WebRequest -UseBasicParsing -Uri 'https://mocca.github.io/close-call-nyang/'` — HTTP 200/실제 게임 내용.
- `Invoke-WebRequest -UseBasicParsing -Uri 'https://mocca.github.io/close-call-nyang/privacy/'` — HTTP 200/최종 개인정보 문서 내용.
- `Invoke-WebRequest -UseBasicParsing -Uri 'https://mocca.github.io/close-call-nyang/support/'` — HTTP 200/실제 연락처와 최종 지원 문서 내용.
- `Get-FileHash -Algorithm SHA256 -LiteralPath 'store/ko-KR/metadata.json','store/screenshots/manifest.json','store/release-inputs.json','store/privacy-inventory.md'` — 승인 해시와 일치.
- 실제 Pages 및 TestFlight에서 새 시험 guest의 닉네임/순위 조회·신고·온라인 데이터 삭제 smoke 실행 — P03-T03의 production endpoint와 동일하고 결과가 정책/심사 노트와 일치. server key/session token을 캡처나 로그에 남기지 않는다.
- `npm.cmd run ranking:verify -- --environment production` — endpoint/rules/backend가 P03-T03 이후 바뀐 경우 실제 proof/RLS/삭제 검증을 갱신한다. 변경이 없으면 같은 배포에 대한 기존 통과 증거를 재사용한다.
- App Store Connect 실제 화면에서 bundle/버전/build number/manual 출시/제출 접수 상태 확인. 외부 기능이 없으면 이 검증을 pending으로 두며 done 처리 금지.
- `git diff --check` — 오류 없음; 문서에 토큰·개인 심사 연락정보·서명 비밀 없음.

## Commit Message
```text
feat(release): submit the approved iPhone app for review

Plan: 2026-09-21-close-call-nyang
Phase: P03-release
Task: T04-review-submission

- Finalize genuine iOS screenshots and approved store metadata
- Verify public policies and record the actual App Review submission
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
- external prerequisites: 실제 캡처, Pages 공개, 운영 입력, 사용자 최종 확인, App Store Connect 제출 권한
