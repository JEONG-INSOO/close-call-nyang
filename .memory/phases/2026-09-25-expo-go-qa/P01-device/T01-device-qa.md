# Task: T01 Expo Go 실행 및 사용자 실기기 QA
## Status: in_progress
## Goal
호환성 경고를 해결하고 iPhone에서 실제 게임·저장·Hermes 증거 수집.
## Implementation
- package.json/package-lock.json :: dependencies.expo:string — sameSDK~57.0.25만 package manager로 갱신. SDK major/서버규칙 변경 금지.
- docs/ios-release.md new — 실행/단계/실기기 QA 목록. docs/learning-notes.md modify — Go와서명앱의차이, 네트워크오류와인증구분.
- ExpoGo진단필드 ReplayDiagnostic{fixtureId:string,rulesVersion:string,digest:string,fallTick:number,runtime:'hermes'|'browser'|'other',passed:boolean} 기존구현 재사용, API변경 없음.
- expo whoami확인(insoojeong), install--check/doctor/typecheck/tests. sandbox network오류는 허용된network로 재검사, 무효인증으로 단정하지 않음.
- 프로세스한정 EXPO_PUBLIC_REPLAY_DIAGNOSTICS=true, EXPO_PUBLIC_ENABLE_MOCK_AD=false, backendpublicenv제거/EXPO_NO_DOTENV=1; expo start --go --lan --clear. 포트기존사용자는 유지. 노출키/token출력금지. LAN이안되면 사용자확인후tunnel대안.
- 사용자가 같은Expo계정/같은네트워크로 iPhone 실행. 기종/iOS/ExpoGo버전/검사일시·출처와 입력/스크롤/홈이어가기/앱전환/저장/소리햅틱/공유/장시간/Hermes3golden 실제결과를 기록. 미실행은not_run. ExpoGo개발판 제출은local-only임을 안내.
- iOS배포 전 원래 P03선행조건(EAS/appID/서명/정책/소개문구승인) 이행; 실제Apple계정/서명/업로드는 이Task에서 시작하지 않음.
## Validation
- npx.cmd expo install --check
- npx.cmd expo-doctor@latest
- npm.cmd run typecheck
- npm.cmd run test:ci
- npm.cmd run ranked:check
- expo devserver status/ios manifest 또는 번들 컴파일(실기기증거로오인금지).
- git diff --check; 실제 iPhone 체크리스트와runtimehermes/golden3passed 사용자증거.
## Acceptance Criteria
- [x] 호환성/로컬회귀검사와 개발서버 준비.
- [ ] 실제기기QA 및Hermes결과 수집, 필요한수정검증.
## Learning
왜웹검사만으로iPhone완료가아닌가? 계정로그인과Apple서명은어떻게다른가? Go개발판과production랭킹제출경로차이는?
## Commit Message
```text
test(ios): verify Expo Go device readiness

Plan: 2026-09-25-expo-go-qa
Phase: P01-device
Task: T01-device-qa
```
## Progress
- Pending actualdevice, no completioncommit until evidence.
- 2026-09-25: expo57.0.25, installcheckclean/Doctor21of21/typecheck/Jest665/ranked8 passed; iOSmanifest/bundlecompile200, LANmanifest200 at172.30.1.23:8081. Serverexec51480 left running intentionally withlocal-onlyenv/diagnosticstrue/mockfalse. No nativeQA claimed. npm auditmoderate10 persists, no forcefix. docs/ios-release.md andlearningnotesrecorded. Deviceinfo/physicalQA/Hermes3golden pending.
