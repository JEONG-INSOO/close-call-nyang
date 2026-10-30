# Task: T02 iOS1.0.1 서명 빌드와 Apple 업로드
## Status: pending
## Goal
검증한 동일 게임 소스를 서명 IPA로 만들어 ASC6815771701에 업로드한다.
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
