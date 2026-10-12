# Task: T03 GitHub 업로드와 Pages 확인

## Status: done

## Goal
검증한 소스 commit만 정상 main push하고 같은 SHA의 CI/Pages와 공개 번들을 확인한다.

## Implementation
- 현재 origin `https://github.com/JEONG-INSOO/close-call-nyang.git`, branch main. `git ls-remote origin refs/heads/main` read-only preflight, diverged면 force/자동merge 금지.
- 사용자 dirty 아트/test/과거 QA를 stage하지 않는다. shared current/learning은 이 작업 hunk만 stage. 개인키/env/debug.log 포함 금지.
- `git push origin main`, `gh run list --workflow deploy-pages.yml --commit <T02SHA>`, `gh run view <id> --json status,conclusion,jobs,headSha`; sandbox 네트워크/인덱스 오류는 승인된 elevated CLI로 재시도. 인증 token 원문 출력 금지.
- 정확한 build/deploy 성공 후 public index+JS HTTP200/DEXCONSULTING 문자열·새 lifecycle 존재/공개 privacy 내용 hash를 source와 확인. 공개 읽기만 수행, 운영 계정 생성/점수/광고 쓰기 없음.
- `store/web-update-2026-10-12.json` new: `{schemaVersion:1,sourceCommit:string,workflowRunId:string|null,status:'passed'|'blocked',publicUrl:string,checks:{workflow:boolean,http:boolean,bundle:boolean,policy:boolean},verifiedDate:string,nativeBuildUpdated:false,iphoneSafariVerified:false}`. 비밀/원본 사용자 로그 제외.
- phase/plan done, current는 이전 스토어 자료 T03 pending으로 복귀. 학습노트에 실제 push/공개 상태를 별도 기록. 기록 commit은 별도 일반 push, 소스 검증 SHA를 기록 commit과 혼동하지 않는다.

## Acceptance Criteria
- [x] source0786111 정상 main push, run38210229901 build/deploy 모두 success, 공식 index/JS/support/privacy200 및 새 JS opt-in/foreground marker·소스와 방침 hash 일치
- [x] 제출 중 빌드6/심사/국가 변경 없음, iPhone Safari 실제 확인은 pending 명시
- [x] sanitized 증거/학습노트, 이전 스토어 자료 Task로 pointer 복귀와 기록 커밋

## Validation
- Result: source `0786111a72148ea1c9eb4624ebea59f1ba0d7210` 정상 main push, 정확한 Pages run `38210229901` build/deploy completed/success. `store/web-update-2026-10-12.json`에 공개 번들/방침 SHA와 검사 결과를 기록했다. 완료 기록의 새 commit과 이 배포 sourceSHA는 별개다.
- 정확한 GitHub run + 공개 HTTP/번들/방침 확인
- `git diff --cached --check`

## Learning
commit/push/빌드/배포/실기기 확인은 별개. 질문: GitHub 업로드만으로 TestFlight는 바뀌는가? 왜 HTTP200만으로 최신 배포를 확정하지 않는가? Safari 실제 손가락 조작은 왜 별도인가?

## Commit Message
```text
docs(release): verify public mock-ad and focus-grace web deployment

Plan: 2026-10-12-mock-ad-safari-focus
Phase: P01-web-update
Task: T03-pages-publish
```
