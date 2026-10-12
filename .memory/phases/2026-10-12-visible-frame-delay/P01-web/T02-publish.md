# Task: T02 Pages 배포 확인

## Status: done

## Goal
동일 Safari 수정 요청의 GitHub 업로드 승인 범위에서 T01 소스를 main에 푸시하고 정확한 Pages CI 및 공개 번들을 확인한다.

## Implementation
- T01 완료/검증 후 일반 git push origin main. force 금지, 사용자 아트/메모/계정 변경 없음.
- gh run list/view --json으로 T01 정확한 headSha의 build/deploy 성공 확인.
- 공식 index/JS/support/privacy GET-only, 새로운 지연 정책 marker와 공개 광고 유지 확인. 실제 iPhone Safari/오디오 발생 원인 실측은 미검증으로 남긴다.
- `store/web-frame-delay-2026-10-12.json` 신규: sourceCommit:string, workflowRunId:string, deploymentStatus:string, publicBundle:string, checks:string[], iphoneSafariVerified:false, nativeBuildUpdated:false. secret/사용자ID 없음.
- `.memory/current.md`, plan/phase/T02 done 갱신 후 원래 2026-09-29-app-store-review-prep/P01-readiness/T03-store-assets.md pending 복귀.
- 학습노트 배포 결과 보완. index-only 선택 스테이징으로 기존 더티 메모 보존.

## Acceptance Criteria
- [x] 정확한 소스 배포 성공 및 공개 응답 확인
- [x] 실기기 미검증/네이티브 미변경 구분

## Validation
- `gh run view <run> --json headSha,status,conclusion,jobs`
- 공식 GitHub Pages GET/compiled JS 정책 검사. prod 계정/점수 쓰기 없음.
- `git diff --check`

## 배우는 개념 / 학습 질문
커밋/배포/실기기 QA는 별도 상태다. ① 어느 SHA가 공개됐나? ② CI 성공과 사용자 Safari 성공은 같은가? ③ IPA가 왜 갱신되지 않나?

## Commit Message
```text
docs(web): record visible frame delay deployment

Plan: 2026-10-12-visible-frame-delay
Phase: P01-web
Task: T02-publish
```
## Progress
- [x] 배포 완료: source783f1ce / Pages38212634050 build/deploy success.
- [x] 공개 검증 통과: index/JS/support/privacy200, timing/광고 marker, privacy source hash 동일. CI58pass/11skip, 실제 iPhone 미검증.
- commit: pending
