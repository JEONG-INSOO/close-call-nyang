# Task: T01 결과 버튼 정렬
## Status: done
## Goal
종료 화면 모든 버튼의 너비/최소높이/모양/글자 통일과 단일열 배치.
## Implementation
- src/screens/ResultScreen.tsx :: ResultScreen(ResultScreenProps), styles — modify. 공통button(width100%,minHeight50,flexShrink0,radius14,border1,paddingHorizontal12,paddingVertical10,배경paper),buttonText(fontSize14,lineHeight20,fontWeight600,textAligncenter). actions/services column gap10. revive와 pending retry도 공통 스타일. pending retry는 notice 밖에 두어 외곽 너비 동일. testID result-home 추가. 기존 ScrollView 패딩/조건부 노출/모든 onPress 유지.
- 모델/계약 변경 없음: startBusy:boolean, canRevive:boolean, submissionState?:RankSubmissionState, receipt?:SubmitResult|null 및 callbacks 그대로. 서버 확인 전 완료 표시 금지.
- src/screens/__tests__/presentation.test.tsx — 공통버튼규격/기능/disabled 회귀 추가.
- e2e/result-layout.spec.ts — 새 로컬브라우저 3viewport, 실제 입력으로 종료 후 각 버튼 scrollIntoView, 같은 x/width/height·양수 간격·마지막버튼 접근/가로overflow 없음 확인. auth signup 금지.
- docs/learning-notes.md — 표시와 동작 분리, flex1세로축 함정, ScrollView 접근성 및 검증 기록.
## Acceptance Criteria
- [x] 모든 표시 버튼 동일규격/한행씩, 스크롤로 마지막버튼 접근.
- [x] 기능/disabled/광고조건/서버계약 유지, 회귀 통과.
## Validation
- npm.cmd run typecheck
- npm.cmd run test:ci -- src/screens/__tests__
- npm.cmd run ranked:check (규칙불변; 서버사본 재생성 없음)
- npm.cmd run web:export (로컬빌드), 브라우저 새 spec3viewport. 기존 테스트 서버는 건드리지 않고 자체서버만 정리.
- git diff --check
## Learning
질문: 세로배치에서 flex1이 왜 위험할까? 크기공유와 onPress공유의 차이는? 작은화면에서 버튼이 보여야만 접근가능한 걸까?
## Commit Message
```text
fix(ui): unify result buttons in a vertical stack

Plan: 2026-09-25-result-button-stack
Phase: P01-release
Task: T01-layout
```
## Progress
- typecheck/ranked8/UI73(7suites)/webexport/newChromium3viewport pass. Screenshot reviewed; own3servers stopped after Windows cleanup wait. No server/API/rules change; no production data writes.
- commit: this completion commit
