# Phase: P02 Leaderboard

## Goal
닉네임 중복을 허용하는 가입 화면 없는 기기별 플레이어와 iOS/웹 공통 온라인 순위표를 구현한다. 서버 검증 최고 기록·상위100·내 순위·프로필 변경/삭제 및 장애 복구를 확인한다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 데이터 모델·권한·API·서버 재생 구현/로컬 검증 완료 (`0f3e52d`); 실제 DB 검증은 T03 | [T01](./T01-ranking-backend.md) |
| T02 | `done` | 익명 세션·닉네임/순위 UI·입력 제출·오프라인 대응 완료 (`ae82e14`); 모의 API/실제 Chromium 검증 | [T02](./T02-ranking-client.md) |
| T03 | `in_progress` | 서울 Free2개 준비, staging 배포·HTTP14/권한96/101순위 통과; 운영·실제웹·production 검증 남음 | [T03](./T03-hosted-verification.md) |

## Progress
- done: 2/3 (active: T03; T02 source `ae82e14`, T03 preparation is not hosted completion)
- next phase: [P03 release](../P03-release/phase.md)
- validation: T02 Jest582/40suites(ranking184/UI21), typecheck/ranked check, web server14, Expo dependency check, 3web builds, browser28pass11skip0fail166.207sec. Production fixture/diagnostic absence confirmed. T01 Deno45/SQL static21/runtime golden3 are historical. Actual hosted RLS/transactions/Auth/limits/cleanup and Hermes remain pending.
- T03 local validation: tools60/Jest582/ranking184/Deno45/Chromium golden3 +typecheck/ranked/server check passed; existing dist local-only scan passed. No new web build/E2E/SQL execution. Read-only independent tool/operations review found no new blocker.
- external prerequisites: 선택1 승인 후 실제 Free/빈 DB 확인, nyang-staging 재사용·nyang-production 생성 완료. staging만 migration/API 배포·카탈로그/실제HTTP14/역할별SQL96/101명fixture 통과. fixture롤백/4명smoke게스트삭제 확인, production 미배포. 과금 변경·푸시 없음, T03 미완료 유지.
- latest local validation: Deno50/tools64/SQLstatic22/ranking184/Chromium골든3/typecheck/ranked/server 통과. 전체 Jest 첫1실패(커피 opacity)→단독33통과→전체583/583 재통과; 간헐 실패 기록 유지. 실제 설정 웹·cron·경쟁·Gateway·production/Hermes는 다음 검증.
