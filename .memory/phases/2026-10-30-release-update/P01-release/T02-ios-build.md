# Task: T02 iOS1.0.1 서명 빌드와 Apple 업로드
## Status: in_progress
## Goal
검증한 동일 게임 소스를 서명 IPA로 만들어 ASC6815771701에 업로드한다.
## Decision
- 사용자는 Expo 계정 사용을 거절했다. EAS login/build/submit 실행 금지. 최초 EAS 계획은 Git 이력에 보존되며 이 청사진은 GitHub Mac 방식을 따른다.
- `.github/workflows/ios-app-store.yml` new: workflow_dispatch만, main ref만, contents:read, concurrency취소false, macos-26/Xcode26.6. mode choice unsigned-archive/app-store. 기본unsigned-archive는 Applesecrets없이실제xcodearchive빌드, 업로드없음. app-store는 인증secrets누락시사전실패, 서명export+Appleupload.
- `scripts/ios-release.mjs` new: mode/config/buildnumber검증, 생성workspace/project의단일appscheme선택, 임시경로내signingfiles처리, profileteam/bundle/만료검사, exportOptions.plist생성, 산출물경로·해시등민감하지않은receipt만출력. source에인증서/키포함금지.
- `scripts/ios-release.sh` new: 임시keychain·profile설치, prebuild/pod/archive/export/upload 실행. trap으로자체임시keychain/profile/key만정리. 로그에키/비밀번호/base64/profile원문금지, 항상xtraceoff.
- app.config.ts config.version/package/lockroot 1.0.1. `IOS_BUILD_NUMBER` optionaldigits1..9999만허용. workflow는100+run_number로고유번호, attempt재시도동일번호는업로드중복여부먼저확인. 기존EAS설정은삭제하지않으나사용하지않는다.
- Apple_SIGNING_CERTIFICATE_P12, APPLE_SIGNING_CERTIFICATE_PASSWORD, APPLE_PROVISIONING_PROFILE, APP_STORE_CONNECT_PRIVATE_KEY 및 keyID/issuerID를이저장소의ActionsSecrets로사용할계획. 기존값없음확인. 새AppleAPI키/인증서발급·GitHub에비밀자료제공은구체적사용자승인후진행, 사용자비밀번호/2FA채팅금지.
- `scripts/ios-release.test.mjs` new: reject잘못된build/target/privateartifacts, unsigned모드secrets없어도허용/appstore모드빠진credentials거절, profile와exportoptions검증. 실행한macOS빌드증거와로컬정적검사를구별.
- 격리된GitHubcheckout이커밋된소스만사용하므로사용자dirty아트가업로드되지않는다. 서명자료없는unsignedarchive를설치가능IPA나업로드성공이라표시금지.
## Implementation
- Recovery: signed102의Xcode모듈precompile로그가07:06:59UTC에서장시간정체됐고Apple새빌드없음을확인후해당run만cancel. 성공한unsigned101 artifact12958302479/run41012370017/d8d85f7을재사용한다. archive출처headSHA/event/conclusion과고정artifactID/digest검증, git diff runtime영역으로현재소스와일치확인후서명만수행. 새코드가다르면실패해오래된산출물사용금지.
- app-store모드는prebuild재컴파일대신고정archive다운로드→프로필/P12설치→공식fastlane resign→codesign검증→IPA업로드. 산출물전달중실행비트누락을CFBundleExecutable대상에복구. CFBundleVersion은현재run번호로갱신하며실제게임소스와서명workflowSHA를별도로receipt에남긴다. permissions에publicartifact다운로드용actions:read만추가.
- app.config.ts config.version:string 1.0.0→1.0.1. package.json/lockroot도1.0.1로일치. bundle/team/project/icon/landscape/tablet false유지. CI IOS_BUILD_NUMBER는1..9999문자열.
- GitHub production공개URL/key, mockadtrue/diagnosticsfalse확인. checkout은커밋된소스만사용, privatekey/profile/p12는ActionsSecrets→RUNNER_TEMP로만전달. Docs/아트dirty는런타임빌드에자동포함하지않는다.
- workflow_dispatch unsigned-archive실행→실제archive+receipt확인. 사용자키발급/자료저장승인뒤 app-store실행→정확한GitHubrunId/소스SHA/빌드번호와Apple처리대조. 자동중복빌드/무관한최신빌드재제출금지.
- store/release-update-2026-10-30.json new: version:string,sourceCommit:string,buildProvider:string,unsignedBuild:{runId:number,buildNumber:string,status:string,artifactId:number,archiveIdentityValidated:boolean,installable:false,appleUploadCompleted:false},signedBuild:{runId:number,buildNumber:string,status:string,appleUploadCompleted:boolean},newReviewSubmitted/newVersionApproved/newVersionPublic:boolean. 실제확인값만추가. 비밀값없음.
- Apple키는앱관리권한, 실제6815771701/bundle일치조회. 새배포인증서와개인키공개키일치검증, 기존인증서유지. 생성성공후부분실패시재실행전공개키일치기존인증서조회해중복생성방지.
## Validation
- npm.cmd run typecheck; npm.cmd run test:release; node --test scripts/ios-release.test.mjs; npm.cmd run test:ci -- --runTestsByPath src/config/__tests__/app.test.ts
- gh run view RUN --json status,conclusion,headSha,jobs 및실제archive/receipt의bundle/version/build검증. Apple GET builds로정확한1.0.1/번호와VALID대조. Mac없는환경에서도GitHubMac서명과ExpoGo를구별.
## Source preparation checkpoint
- version1.0.1/GitHubworkflow/임시서명스크립트구현. typecheck/release11/config23/서명가드4/YAML/셸문법통과. source-only d8d85f7. unsigned101실제성공. 사용자자료저장·API사용동의승인후GitHub6Secrets등록과signed102실행. Apple업로드성공은아직관찰전.
- 빌드소스를고정하기위한source-only커밋을먼저만든다. Task는실제서명빌드·업로드전까지in_progress. 기존dirty파일제외.
## Acceptance
- [ ] 서명빌드완료/정확한버전·식별자
- [ ] 정확한buildId Apple업로드완료
## Learning
마케팅버전과buildNumber, compile/sign/upload/review분리, 깨끗한스냅샷의재현성. 실기기QA는확인한범위만기록. 복습: unsignedarchive는왜설치불가인가? 서명인증서와업로드API키는어떻게다른가? retry전에왜서버의실제상태를확인해야하나?
## Commit Message
```text
chore(ios): prepare version 1.0.1 release build

Plan: 2026-10-30-release-update
Phase: P01-release
Task: T02-ios-build
```
## Completion Commit Message
```text
docs(ios): record version 1.0.1 signed Apple upload

Plan: 2026-10-30-release-update
Phase: P01-release
Task: T02-ios-build
```
