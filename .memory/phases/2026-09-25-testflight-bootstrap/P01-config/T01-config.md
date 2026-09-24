# Task: T01 TestFlight 설정과 EAS연결
## Status: done
## Goal
실제EAS프로젝트를연결하고store프로필/업로드제외경계검증.
## Implementation
- app.config.ts :: ExpoConfig.owner:string,extra.eas.projectId:string — EASinit의실제응답만반영. bundle=com.mocca.closecallnyang/name/slug/권한유지, 임의TeamID/encryption응답없음.
- eas.json new: cli.appVersionSource=remote, build.production{distribution:store,environment:production,autoIncrement:true,node:'24.19.0',ios.image:'macos-tahoe-26.5-xcode-26.6',env:{EXPO_PUBLIC_ENABLE_MOCK_AD:'false',EXPO_PUBLIC_REPLAY_DIAGNOSTICS:'false'}}. Node는현재검증된로컬24.19.0. submit.production={} 실제ascAppId없으므로가짜ID넣지않음.
- .easignore new: 기존.gitignore제외를승계하고 .agents/.memory/docs/.github/examples/test/CODEBURN-SETUP.md/supabase 원격업로드제외. 런타임src/assets/test-fixtures 및빌드설정/scripts는유지. env/output/auth파일제외.
- scripts/eas-config.test.mjs new: node:test로store/noDevClient/flags/ID/ignore경계계약검사. 실제env나secret읽지않음.
- src/config/__tests__/app.test.ts modify: 실제EASproject/account 고정과 미확인AppleTeamID부재 회귀검사.
- docs/ios-release.md,docs/learning-notes.md modify — 연결결과/미완료AppStore조건/학습질문기록.
- `eas init --account insoojeong --non-interactive`로정확한계정에연결; 동명충돌/권한문제시멈춤,무관한프로젝트변경금지. Appleapp유무질문응답확인전앱생성금지.
- EAS환경은public URL/publishable만추후등록; 아직검증안됐으면운영build시작금지. 서버키/Apple비밀번호/토큰기록금지.
## Validation
- node --test scripts/eas-config.test.mjs
- npm.cmd run typecheck
- npm.cmd run test:ci -- src/config/__tests__/app.test.ts
- eas project:info --non-interactive 실제projectId/account/slug일치확인
- git diff --check
## Acceptance Criteria
- [x] 실제EAS연결/로컬store설정/회귀검사완료.
- [x] 아이콘/운영공개env/AppleappID·서명/기기QA/실제빌드업로드미완료를명확히구분.
## Learning
질문: storedistribution이왜필요한가? EASID와Apple앱ID는어떻게다른가? .easignore가왜필요한가?
## Commit Message
```text
chore(ios): prepare EAS TestFlight configuration

Plan: 2026-09-25-testflight-bootstrap
Phase: P01-config
Task: T01-config
```
## Progress
- EAS24.7.0 actualproject315e87a2-f405-4f65-ae45-c91f1d2c59bf @insoojeong/close-call-nyang created, dynamicconfigautowritefailed so exactID/ownerpatched; remoteinfoverified. typecheck/config20/EAS2/diffcheckpass. No build/upload/signing/envwrite/Appleappcreation. PendinguserAppleexistingappanswer. PriorGoQApatch/docs remaininprogress and not countedpassed.
