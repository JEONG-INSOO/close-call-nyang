# Phase: P02 Leaderboard

## Goal
닉네임 중복을 허용하는 가입 화면 없는 기기별 플레이어와 iOS/웹 공통 온라인 순위표를 구현한다. 서버 검증 최고 기록·상위100·내 순위·프로필 변경/삭제 및 장애 복구를 확인한다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 데이터 모델·권한·API·서버 재생 구현/로컬 검증 완료 (`0f3e52d`); 실제 DB 검증은 T03 | [T01](./T01-ranking-backend.md) |
| T02 | `in_progress` | 익명 세션·닉네임/순위 UI·입력 제출·오프라인 대응 (다음 active, 실행 대기) | [T02](./T02-ranking-client.md) |
| T03 | `pending` | 실제 Supabase 설정·권한/통합 검증·운영 안내 | [T03](./T03-hosted-verification.md) |

## Progress
- done: 1/3 (active: T02; T01 source `0f3e52d`, T02 blueprint not read or implemented in T01)
- next phase: [P03 release](../P03-release/phase.md)
- validation: Jest431/29suites, Deno45, SQL static21, web server14, Node/Deno/Chromium golden3, typecheck/builds and actual browser26pass7skip0fail passed. Actual hosted RLS/transactions/Auth/limits/cleanup and Hermes remain pending.
- external prerequisites: 사용자의 Supabase 계정·실제 프로젝트 설정은 T03에서 수행. 현재 서버 코드는 로컬 검증만 완료했고 키 설정·배포·푸시하지 않음.
