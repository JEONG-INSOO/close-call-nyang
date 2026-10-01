# Task: T02 공식 Pages 배포·내용 검증

## Status: pending

## Goal
T01의 source commit을 정상 main push하고 정확한 source SHA의 Pages 성공 및 공식 privacy의 승인 원문/hash·실제 브라우저 가독성을 확인한다.

## Decision Summary
- 사용자1로 push/공식 재배포 승인. repo `JEONG-INSOO/close-call-nyang`, origin main. Force push/새 repo/Actions secret 변경 없음.
- 기존 심사 T03 records는 미완료로 보존. AppReview 제출 및 원격 DB/계정 변화 없음.

## Implementation
### I01. 원격 배포
- `.github/workflows/deploy-pages.yml` :: existing build/deploy — read-only. main push로 기존 QA/export/env/Pages workflow 실행; 변경할 필요 없음.
- `store/policy-deployment.json` :: new. `{schemaVersion:1, state:'passed'|'blocked', sourceCommit:string, workflowRunId:string|null, workflowConclusion:string|null, publicPrivacyUrl:string, publicSupportUrl:string, checks:{privacyHttp200:boolean,supportHttp200:boolean,utf8:boolean,privacyHashMatchesSource:boolean,approvedSupplementPresent:boolean,browserReadable:boolean}, verifiedDate:string}`. 비밀 키/사용자 ID/개인 로그 금지.
1. `git push origin main` 정상 push. divergence면 자동 merge/force하지 말고 보고. Sandbox network는 elevated로 재시도.
2. `gh run list --workflow deploy-pages.yml --commit <sourceSHA> --json databaseId,status,conclusion,headSha`로 정확한 run 선택. `gh run view <id> --json status,conclusion,jobs,headSha` 진행 읽기;60초 넘는 blocking wait/빈번 unchangedpoll 금지. build/deploysuccess 둘 다 확인.
3. 공식 URL `https://jeong-insoo.github.io/close-call-nyang/privacy/`, `/support/` HTTP200/HTML/UTF8, source committed privacy 내용 SHA256과 공개 body UTF8 hash 비교, 승인 두 문단1회/날짜 확인. HTTP raw 원문 민감값 없지만 요약만 출력. 기존 support도 정상인지 확인. GitHub/Pages network checks는 CLI 사용 가능, 인증된 웹 UI는 CUA만.
4. CUA browser로 공개 privacy 한/영 provider 문단 읽기 및 스크린샷(ignored `output/store-review/policy-supplement-public.jpg`) 저장. 웹 mutation 결과 증거를 최종 응답에 embed한다. 앱계정·점수 생성 없음.
5. CI실패는 logs에서 relevant원인만 확인, 기존 범위 밖 부채면 임의게임 수정/Task완료 금지. HTTP200만으로 stale content 성공 처리 금지.
### I02. 완료 기록/복귀
- `docs/learning-notes/2026-10-01-policy-supplement.md` :: T01 hash/run/HTTP/hash/UI 결과·실패관찰 추가.
- `.memory` 선행Task/phase/plan done, `.memory/current.md` 원래 App Store T03 복귀; shared memory는 이 선행 부분만 선택 stage. T03status는 in_progress 유지.
- `store/connect-checkpoint.json` :: `policySupplementPublicDeployment` passed로 local 갱신(실제 성공 후); T03 unfinished 파일이므로 이번 commit 제외.
- completion증거를 정확히 한정 commit하고 기존 승인에 따라 정상 push. 기록-only push의 Pages run은 새 정책 소스와 같은 hash, 실패시최종응답에구분. 공개상태검증sourceSHA를 임의 newSHA로바꾸지 않는다.

## Acceptance Criteria
- [ ] 정확한 T01 sourceSHA의 workflow build/deploy success.
- [ ] 공식 두 URL200/UTF8, privacy committedhash/원문일치, CUA한영문단확인·증거.
- [ ] evidence/no secret/learning/Phase완료·원래T03복귀 및 정확한범위commit/push.

## Validation
- `node --test scripts/policy-supplement.test.mjs scripts/verify-web.test.mjs`
- 정확한 GitHub run/HTTP/공개 body hash/CUA proof
- `git diff --check` / `git diff --cached --check`

## Learning
- 개념: push/build/deploy/cache/livecontent 독립, hash바이트대조와시각검증의차이.
- 질문3개: 어떤commit이실제웹내용을증명하는가?200인데왜옛문구일수있는가?Pages배포와IPA배포는왜별개인가?

## Commit Message
```text
docs(release): verify public privacy supplement deployment

Plan: 2026-10-01-policy-supplement-deploy
Phase: P01-publication
Task: T02-pages-verification

- Record the exact successful Pages source and public content checks.
- Return to App Store preparation without submitting review.
```

## Progress
- [ ] 정확한 원격 배포·공개 검증
- [ ] 복귀·학습 기록
- commit: pending
