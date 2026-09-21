# Phase: P03 Release

## Goal
P01 게임과 P02의 실제 호스팅된 익명 닉네임·온라인 순위표 통합을 바탕으로 Pages와 iOS 출시 자료를 준비한다. 실제 iPhone·웹 공통 순위 검증과 사용자 문구/이미지 승인 후 App Review에 제출하고, 실제 완료한 작업을 학습노트로 마감한다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `pending` | Pages workflow·백엔드 공개 설정·지원/개인정보 페이지 | [T01](./T01-pages-and-policies.md) |
| T02 | `pending` | 아이콘·스토어 초안·EAS 구성 | [T02](./T02-store-preparation.md) |
| T03 | `pending` | EAS build/TestFlight·실기기/공통 순위 QA | [T03](./T03-ios-build-validation.md) |
| T04 | `pending` | 실제 스크린샷·최종 승인·심사 제출 | [T04](./T04-review-submission.md) |
| T05 | `pending` | 학습노트·인수인계 마감 | [T05](./T05-learning-handoff.md) |

## Progress
- done: 0/5 (active: none; waiting for P01 and P02-leaderboard)
- plan totals: 3 phases / 14 tasks (P01 6 + P02 3 + P03 5)
- external prerequisites: 사용자가 준비한 Supabase 프로젝트의 실제 API/RLS/리플레이 검증·무료 플랜 상태, GitHub 사용자 생성/푸시와 Pages 공개, Expo/Apple 인증, 실제 iPhone, 스토어 필수 정보 및 사용자 최종 확인
- scope guard: 계획 단계에서 계정 생성·클라우드 배포·결제·구현은 실행하지 않는다. 실제 서버 검증 없이 로컬 mock 결과만으로 출시 완료 처리하지 않는다.
- acceptance: 클라우드 업로드·심사 제출·공개를 서로 다른 상태로 기록한다. 심사 승인 여부는 Apple의 외부 결정이다.
