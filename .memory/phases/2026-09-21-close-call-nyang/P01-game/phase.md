# Phase: P01 Game

## Goal
계정 연동 없이 검증 가능한 냥대리 게임과 production 웹 산출물을 완성한다. 이어지는 P02에서 온라인 닉네임·리더보드를 연결하며 실제 배포 iPhone 확인은 P03에서 증거를 남긴다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Expo/TypeScript/Jest 기반과 Git | [T01](./T01-foundation.md) |
| T02 | `done` | 물리·점수·사건·상태 머신 | [T02](./T02-game-engine.md) |
| T03 | `done` | SVG 냥대리3종·캐릭터 목록·횡스크롤 배경 | [T03](./T03-vector-scene.md) |
| T04 | `done` | 입력·루프·플레이 화면 구현/자동 검사 완료; 실제 웹·기기 QA 대기 | [T04](./T04-playable-app.md) |
| T05 | `done` | 설정·저장·캐릭터 해금/선택·소리·공유·가상 광고; 자동 검사 완료 | [T05](./T05-local-services.md) |
| T06 | `in_progress` | 회귀 검증·웹 QA·조작감 조정 (active, 실행 대기) | [T06](./T06-quality-pass.md) |

## Progress
- done: 5/6 (active: T06)
- execution: T01 e2d066a; T02 f09b6d1; T03 ce14e74; T04 cab6500; T05 646c188. Latest character24/service-ad90/full Jest355, typecheck, deterministic5WAV generation, web export with5sounds and diff check passed. Actual browser interaction, phone layout, listening/autoplay/interruption/native feedback/share/storage QA remain unchecked for T06/P03. The prior browser tool startup failed; T05 did not rerun visual/device QA. T06 not started.
- next phase: [P02 leaderboard](../P02-leaderboard/phase.md)
