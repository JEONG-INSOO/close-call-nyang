# Task: T02 iOS1.0.1 서명 빌드와 Apple 업로드
## Status: in_progress
## Goal
검증한 동일 게임 소스를 서명 IPA로 만들어 ASC6815771701에 업로드한다.
## Updated Decision (supersedes EAS steps below)
- 사용자는 Expo 계정 사용을 거절했다. EAS login/build/submit 실행 금지. 아래 EAS 계획은 역사이며 이 절을 따른다.
- `.github/workflows/ios-app-store.yml` new: workflow_dispatch만, main ref만, contents:read, concurrency취소false, macos-26/Xcode26.6. mode choice unsigned-archive/app-store. 기본unsigned-archive는 Applesecrets없이실제xcodearchive빌드, 업로드없음. app-store는 인증secrets누락시사전실패, 서명export+Appleupload.
- `scripts/ios-release.mjs` new: mode/config/buildnumber검증, 생성workspace/project의단일appscheme선택, 임시경로내signingfiles처리, profileteam/bundle/만료검사, exportOptions.plist생성, 산출물경로·해시등민감하지않은receipt만출력. source에인증서/키포함금지.
- `scripts/ios-release.sh` new: 임시keychain·profile설치, prebuild/pod/archive/export/upload 실행. trap으로자체임시keychain/profile/key만정리. 로그에키/비밀번호/base64/profile원문금지, 항상xtraceoff.
- app.config.ts config.version/package/lockroot 1.0.1. `IOS_BUILD_NUMBER` optionaldigits1..9999만허용. workflow는100+run_number로고유번호, attempt재시도동일번호는업로드중복여부먼저확인. 기존EAS설정은삭제하지않으나사용하지않는다.
- Apple_SIGNING_CERTIFICATE_P12, APPLE_SIGNING_CERTIFICATE_PASSWORD, APPLE_PROVISIONING_PROFILE, APP_STORE_CONNECT_PRIVATE_KEY 및 keyID/issuerID를이저장소의ActionsSecrets로사용할계획. 기존값없음확인. 새AppleAPI키/인증서발급·GitHub에비밀자료제공은구체적사용자승인후진행, 사용자비밀번호/2FA채팅금지.
- `scripts/ios-release.test.mjs` new: reject잘못된build/target/privateartifacts, unsigned모드secrets없어도허용/appstore모드빠진credentials거절, profile와exportoptions검증. 실행한macOS빌드증거와로컬정적검사를구별.
- 격리된GitHubcheckout이커밋된소스만사용하므로사용자dirty아트가업로드되지않는다. 서명자료없는unsignedarchive를설치가능IPA나업로드성공이라표시금지.
## Implementation
- app.config.ts config.version:string 1.0.0→1.0.1. package.json version:string 및 package-lock root package version도1.0.1로 일치. bundle/team/project/icon/landscape/tablet false 유지. 버전 고정 테스트가 있으면 의미있는 조건만 동기화.
- EAS production read-only env/schema 확인: 실제project production 공개URL/key, mockadtrue/diagnosticsfalse. 토큰 출력 금지.
- dirty 사용자 파일 제외를 위해 git archive HEAD로 output/release-1.0.1 내 격리 소스를 생성. .gitignore/.easignore 경계 준수, 필요 시 별도git init 및 원격/source 메타데이터. node_modules는 기존 설치를 안전히 재사용하되 인증·환경파일 복사금지. EAS업로드 파일 목록검사로runtime source만 포함 확인.
- 설치된 eas-cli 사용. eas build --platform ios --profile production --non-interactive --no-wait; 정확한buildId를기록하고 FINISHED 확인 후 eas submit --platform ios --profile production --id BUILD_ID --non-interactive. 자동중복빌드/최신아무빌드 재제출금지.
- store/release-update-2026-10-30.json new: version,buildNumber,sourceCommit,buildId,status,submissionId,uploadStatus. 기존release-state는실제관찰한필드만변경, 과거심사증거보존.
## Validation
- npm.cmd run typecheck; npm.cmd run test:release; 필요시version관련Jest.
- EAS정확한project/bundle/version/buildNumber 및클라우드완료; ASC실제처리/빌드조회. mac없는 환경에서도클라우드Mac서명과ExpoGo를구별.
## Acceptance
- [ ] 서명빌드완료/정확한버전·식별자
- [ ] 정확한buildId Apple업로드완료
## Learning
마케팅버전과buildNumber, EAS Build와Submit/Review분리, 깨끗한스냅샷의재현성. 실기기QA는확인한범위만기록.
## Commit Message
```text
chore(ios): prepare version 1.0.1 release build

Plan: 2026-10-30-release-update
Phase: P01-release
Task: T02-ios-build
```
