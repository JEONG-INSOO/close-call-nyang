# 처음 App Review에 제출하기

## 목표와 결과
사용자 “앱심사 제출까지 가자”는 기존 승인 메타데이터/빌드6의 최종 심사 제출 요청이다. 2026-10-01 11:37(한국 시간), Apple 앱6815771701의 iOS1.0 / 1.0.0(6) 한 항목이 실제 접수됐고 상세에서 **심사 대기 중**을 확인했다. 수동 출시·무료·IAP/실제 광고 없음·승인한 지역 제외 설정은 바꾸지 않았다. 심사 승인/공개 출시는 아직 아니다.

## 핵심 변경 — 무엇을, 왜
- `store/connect-checkpoint.json`: 사용자 제출 승인과 실제 접수 증거를 별도 객체로 기록했다. 초기 문구/개인정보 게시 승인 파일의 `finalReviewSubmissionApproved: false`는 당시 승인 범위를 보존한다. 새 요청을 옛 승인에 소급해서 섞지 않는다.
- `store/release-state.json`: `reviewStatus: 'waiting_for_review'`. 기존 `submissionId`/`submittedAt`는 EAS가 IPA를 Apple에 올린 기록이며, 새 `appReviewSubmission`은 Apple 심사 접수 기록이다. 두 ID를 덮어쓰거나 같다고 생각하면 배포 단계를 혼동한다.
- `scripts/release-preparation.test.mjs`: `assert.notEqual(state.appReviewSubmission.id, state.submissionId)`로 두 접수를 구별하고 `releaseMode === 'manual'`, 공개/승인false, DSA 미완료와 QA pending을 보존한다. 로컬 테스트가 실제 제출을 대신하지는 않는다.

## 흐름과 실패에서 배운 점
Expo Go/기기 테스트 → EAS store build → EAS upload → Apple 빌드 처리 → 버전 자료 저장 → **심사에 추가(초안)** → **심사를 위해 제출(접수)** → Apple 심사 → 승인 후 사용자 수동 출시.

최종 버튼 첫 호출은 자동 권한 검토의 시간 초과로 실행 여부를 단정할 수 없었다. 다시 누르기 전에 UI를 읽었고 여전히 제출 초안1개/심사 준비됨을 확인했다. 허용된 한 번의 재시도 후 “1개의 항목 제출됨”과 상세의 “심사 대기 중”을 확인했다. 클릭 시도/대기 표시/실제 접수는 서로 다르다. 상세 확인은 중복 제출·취소 없이 읽기만 수행했다.

## 알아야 할 점과 남은 사항
- 심사 접수는 Apple 승인이나 법적 적합성 확인이 아니다. EU27·중국 본토·베트남 제외는 유지하고 DSA 신고/Apple 대체 증빙 문의 답변은 여전히 별도 미완료다. 증빙을 만들어내거나 법적 동의를 임의로 수락하지 않았다.
- 삭제·재설치2검사는 사용자 생략에 따라 not_run, 전체 nativeQa/leaderboardQa는 pending 그대로다. 접수를 위해 검증 결과를 거짓으로 바꾸지 않았다.
- 기존 캐릭터 아트/생성 스크립트/사용자 `test`와 별도 과거 QA 변경을 이 커밋에 넣지 않는다. 토큰·인증코드·심사 전화 원문·주소도 기록하지 않는다. 공개 메타데이터와 sanitized 증거만 남긴다.
- 추가 게임 결함이나 범위 밖 게임 수정 없음. 이전 P01-T03의 자료 준비 문서 상태 정리는 별도 순차 Task이며 접수 취소/재업로드 이유가 아니다.

## 검증과 증거
- 실제 버전 화면: 승인 스크린샷5장, 영어 설명/키워드/지원·저작권/심사 메모, 빌드6, 수동 출시 확인. Apple 사전 검증은 차단 경고 없이 초안 한 항목을 준비했다.
- 실제 접수: `3d829fe4-2709-47fd-9708-016771fa9d3f`, WAITING_FOR_REVIEW. ignored `output/store-review/asc-review-submitted-receipt.jpg`, `asc-review-submitted.jpg`.
- 실제 검증: `npm.cmd run test:release`11/11, `node --test scripts/verify-web.test.mjs scripts/policy-supplement.test.mjs`26/26, `git diff --check` passed(LF/CRLF 알림만). 런타임/물리 코드를 바꾸지 않아 새 IPA/전체 게임 성능 검사를 수행하지 않았다.

## 복습 질문
1. EAS upload가 끝났는데 App Store에 공개되지 않는 이유는?
2. 최종 버튼 응답이 시간 초과였을 때 왜 곧바로 반복 클릭하면 안 될까?
3. `waiting_for_review`, `approved`, `released`를 왜 다른 값으로 저장할까?
