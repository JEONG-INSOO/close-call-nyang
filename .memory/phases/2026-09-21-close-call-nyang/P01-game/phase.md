# Phase: P01 Game

## Goal
계정 연동 없이 검증 가능한 냥대리 게임과 production 웹 산출물을 완성한다. 이어지는 P02에서 온라인 닉네임·리더보드를 연결하며 실제 배포 iPhone 확인은 P03에서 증거를 남긴다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Expo/TypeScript/Jest 기반과 Git | [T01](./T01-foundation.md) |
| T02 | `done` | 물리·점수·사건·상태 머신 | [T02](./T02-game-engine.md) |
| T03 | `done` | SVG 냥대리3종·캐릭터 목록·횡스크롤 배경 | [T03](./T03-vector-scene.md) |
| T04 | `in_progress` | 입력·루프·플레이 가능한 화면 (active, 실행 대기) | [T04](./T04-playable-app.md) |
| T05 | `pending` | 설정·저장·캐릭터 해금/선택·소리·공유·가상 광고 | [T05](./T05-local-services.md) |
| T06 | `pending` | 회귀 검증·웹 QA·조작감 조정 | [T06](./T06-quality-pass.md) |

## Progress
- done: 3/6 (active: T04)
- execution: T01 e2d066a; T02 f09b6d1; T03 ce14e74. Latest scene76+catalog16/full Jest177, typecheck, app web export, scene bundle and diff check passed. Browser visual inspection failed on tool startup; native QA pending. T04 implementation not started.
- next phase: [P02 leaderboard](../P02-leaderboard/phase.md)
