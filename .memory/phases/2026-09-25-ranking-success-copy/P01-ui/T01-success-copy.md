# Task: T01 랭킹 완료 안내 간소화

## Status: done

## Goal
결과 화면에 랭킹등록완료! 단일 안내를 표시한다.

## Decision Summary
- 상세 수치만 제거; 랭킹 서비스/점수 검증/로컬 기록 보존.

## Implementation

### I01. 표시
- src/screens/ResultScreen.tsx :: ResultScreen(props: ResultScreenProps) — modify, ranking-receipt Text만 제거.
- src/i18n/ko.ts :: ko — modify, rankingSubmitted를 '랭킹등록완료!'로 바꾸고 미사용 rankingVerifiedScore/rankingBestScore 제거.
- ResultScreenProps.receipt?: SubmitResult | null 유지. SubmitResult {runId:string,score:number,bestScore:number,rank:number|null,improved:boolean} 및 submissionState 타입은 변경하지 않는다.
- 흐름: submissionState==='submitted' && receipt일 때만 완료. pending/recording 대기, 나머지 local 안내·재전송 버튼 조건 유지. 새 API/오류 처리 없음.

### I02. 회귀
- src/screens/__tests__/nickname.test.tsx — modify. 실제 receipt가 있을 때 exact 완료 문구, 상세행·수치 부재, result-score/result-best 보존. rank null도 동일. submitted receipt 없음은 성공 아님; pending/recording/local 안내 보존.
- e2e/online.spec.ts — modify. 기존 완료 셀렉터를 exact 새 문구로 갱신하고 receipt 부재 검사.
- docs/learning-notes.md — modify, UI와 서버 상태 분리 이유·검증·제한 기록.

## Acceptance Criteria
- [x] 완료 문구만 표시, 상세행 없음, 기본 결과/랭킹 저장 보존.
- [x] 서버 응답 없는 성공 안내 방지 및 대기/재시도 회귀 통과.

## Validation
- `npm.cmd run typecheck`
- `npm.cmd run test:ci -- src/screens/__tests__` — UI 회귀.
- `npm.cmd run test:ranking` — 온라인 상태/제출 계약.
- `npm.cmd run ranked:check` — 규칙 변경 없음. 규칙/서버 복사본 재생성 불필요.
- `npm.cmd run online-fixtures:build` 후 `npm.cmd run e2e -- e2e/online.spec.ts --project=phone-landscape` (해당 시나리오 전용 viewport). 실패/미실행은 분리 기록.
- `git diff --check`. 공개 재배포와 실제 기기 검증은 이번 범위 아님.

## Learning
- 개념: 화면 표현과 서버 데이터의 분리. 문자열을 바꾸면 브라우저 테스트 셀렉터도 갱신해야 한다.
- 기록 질문: receipt를 왜 유지할까? 상세행 제거와 데이터 삭제는 어떻게 다를까? 실패/대기 상태를 왜 함께 검사할까?

## Commit Message
```text
fix(ui): simplify ranking success notice

Plan: 2026-09-25-ranking-success-copy
Phase: P01-ui
Task: T01-success-copy
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- typecheck/ranked8/UI72(7suites)/ranking186(12suites) pass. Fresh mock export and phone-landscape online2passed(exit0,1.8m); screenshot verified. Windows cleanup hung after both assertions passed; stopped only3own QA servers after PID/command verification. Stop-Process failed; Node process.kill succeeded and runner settled0. No public/native verification, no push. diffcheck passed.
- commit: this task completion commit
