# Phase: P02 Leaderboard

## Goal
닉네임 중복을 허용하는 가입 화면 없는 기기별 플레이어와 iOS/웹 공통 온라인 순위표를 구현한다. 서버 검증 최고 기록·상위100·내 순위·프로필 변경/삭제 및 장애 복구를 확인한다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 데이터 모델·권한·API·서버 재생 구현/로컬 검증 완료 (`0f3e52d`); 실제 DB 검증은 T03 | [T01](./T01-ranking-backend.md) |
| T02 | `done` | 익명 세션·닉네임/순위 UI·입력 제출·오프라인 대응 완료 (`ae82e14`); 모의 API/실제 Chromium 검증 | [T02](./T02-ranking-client.md) |
| T03 | `in_progress` | 실제 Supabase 설정·권한/통합 검증·운영 안내 (다음 active, 실행 대기) | [T03](./T03-hosted-verification.md) |

## Progress
- done: 2/3 (active: T03; T02 source `ae82e14`, T03 blueprint not read or implemented in T02)
- next phase: [P03 release](../P03-release/phase.md)
- validation: T02 Jest582/40suites(ranking184/UI21), typecheck/ranked check, web server14, Expo dependency check, 3web builds, browser28pass11skip0fail166.207sec. Production fixture/diagnostic absence confirmed. T01 Deno45/SQL static21/runtime golden3 are historical. Actual hosted RLS/transactions/Auth/limits/cleanup and Hermes remain pending.
- external prerequisites: 사용자의 Supabase 계정·실제 프로젝트 설정은 T03에서 수행. 서버와 앱을 연결하는 코드는 있으나 실제 키 설정·배포·푸시하지 않음. 기본 앱은 미설정 로컬 게임.
