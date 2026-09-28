# Task: T02 새 TestFlight 업로드
## Status: done
## Goal
T01 오디오 개선소스를 기존앱의 새빌드로생성,정확한ID로업로드하여기기테스트가능한대상전달.

## 2026-09-28 사용자 추가 승인: 위험 효과음 제거 빌드
- 사용자: 새 빌드를 올리고 TestFlight 표시/설치 가능 여부는 직접 확인한다.
- 새 소스 기준 `d8e8dbd14107670e7b08ac1fcab2c90175a746bd` (위험 소리 제거6c2bd59 포함). 직전676Jest/타입/ranked8/release7 통과.
- 기존 build3/submission은 읽기 조회로 이력만 정리하고 재제출하지 않는다. 새 build ID를 발급받아 정확한 ID로 제출한다.
- 이번 archive 경로는 `output/ios-danger-audio-archive-20260928`; 사본만 검사/삭제한다. 기존 소스/서명/앱ID/광고·진단설정 유지.
- 이번 완료 경계는 EAS 빌드 생성 및 TestFlight 제출 요청 접수까지다. 사용자가 이후 확인을 맡았으므로 완료까지 반복 모니터링하지 않는다. 예정/진행 상태를 업로드 성공으로 표시하지 않는다.
- 제출 예약 이후에도 클라우드 빌드/업로드 실패 가능성이 있음을 기록하고, 원래 P03-T03 실기기 QA는 미완료 유지.
## Decision Summary
사용자명시업로드승인. 앱6815771701/com.mocca.closecallnyang/EAS315e87a2-f405-4f65-ae45-c91f1d2c59bf/ownerinsoojeong/teamS9RLQ8474U 유지. priorbuild2 b679d4dc-c1c8-45f3-b401-6d7ba769e722,submissionbac21516-a95a-4811-bec4-977c50454df2 FINISHED05:10:28.745UTC(재조회). 중복제출안함.
## Implementation
### I01. 빌드와 제출
- Related Files: `store/release-state.json` :: ReleaseState, `docs/ios-release.md`, `docs/qa-report.md`, 학습노트, current와Phase — modify. app.config/eas/package/서명설정 — read-only.
- 기존 ReleaseState schemaVersion1/sourceCommit/easBuildId/buildNumber/submissionId/submittedAt/testflightStatus 갱신. 새빌드ID발급전추정값기입금지. QA pending/review not_started/manual유지. 이전ID는docs이력보존.
- 기존T01완료소스커밋사용. EAS24.7.0 `build:inspect --platform ios --stage archive --profile production --output output/ios-audio-archive-20260928` 후비공개경로/키/env없음+audioCore와lock/config해시확인,정확한검사사본만삭제.
- `npx.cmd --yes eas-cli@24.7.0 build --platform ios --profile production --non-interactive --freeze-credentials --no-wait` 기존서명/원격자동번호. exactID로 `submit --platform ios --profile production --id ID --non-interactive --no-wait --no-auto-testflight-setup`. --what-to-test는Enterprise-only이므로쓰지않음. 과금플랜변경/API키재발급없음.
- EAS build:view/submit:view JSON은선택필드만출력(서명URL/로그/비밀노출방지). actualFINISHED를확인. submit:status는현재Apple401이력; 별도Appleavailable확인불가시처리미확인명시하고사용자TestFlight번호확인요청. 업로드만성공이면Task로컬전달완료가능,원래P03-T03nativeQA는in_progress로남김.
- 빌드실패/인증문제는에러증거기록후허용된수정만;중복실행/성공날조없음. 지원·개인정보/심사/물리규칙/웹공개배포범위밖.
## Acceptance Criteria
- [x] 사용자 변경 범위에 따라 정확한 소스/새 번호의 빌드 생성 및 제출 예약 접수. 후속 완료 확인은 사용자 담당; FINISHED로 주장하지 않는다.
- [x] docs/ReleaseState/학습노트실제결과일치,미검증nativeFPS/Appleavailable구분.
## Validation
- T01검증통과,`npm.cmd run test:release`, `npm.cmd run ranking:env-check -- --env-file .env.ranking.production`,운영publicGET읽기rules일치,archive검사.
- exactID EAS build:view/submit:view 선택JSON필드; `git -c safe.directory=D:/GrillmeEDU diff --check`.
## Learning
새빌드의sourceSHA/번호와업로드/Apple처리/체감개선을구분. 질문:왜기존build2를재제출하면안되나? 업로드성공은FPS검증인가? 서명키를바꾸지않는이유는?
## Commit Message
```text
docs(ios): record audio performance TestFlight upload

Plan: 2026-09-28-audio-transition
Phase: P01-audio
Task: T02-testflight
```
## Progress
- [x] 구현 완료: source d8e8dbd14107670e7b08ac1fcab2c90175a746bd,1.0.0(4),build f8d4ccb3-edc9-41af-99a9-11843efc33a3,submit eb4df011-0fc4-4f21-8569-8f92218306ae 예약 성공.
- [x] 검증 통과: release7/ranked8/env10/archive201/8hash/private0/publicGET200 rulesmatch. 직전Jest676/types통과. Apple프로필조회401기존검증fallback; credential변경없음.
- 기존 build3 FINISHED06:00:29.820UTC,submit3 FINISHED06:02:13.117UTC 확인. 새4번 완료 상태는 사용자 확인으로 남김.
- commit: this completion record commit
