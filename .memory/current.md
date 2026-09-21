# Current Context

## Active Plan
[아슬아슬 냥대리](./plans/2026-09-21-close-call-nyang.md)

## Active Phase
[P01 Game](./phases/2026-09-21-close-call-nyang/P01-game/phase.md)

## Active Task
[T01 Expo 기반과 검증 도구](./phases/2026-09-21-close-call-nyang/P01-game/T01-foundation.md)

## Status
- Interview: complete including online nickname/leaderboard amendment; [확정 결정](./decisions/2026-09-21-close-call-nyang.md)
- Planning: complete; 3 phases / 14 tasks / 0 implemented
- Execution: updated plan ready, awaiting user handoff after model-change reminder
- Task status: pending. 실제 코드·설치·Git 초기화·빌드·배포는 아직 시작하지 않음.

## Next Step (IMPORTANT)
닉네임 중복 허용·가입 화면 없는 기기별 익명 플레이어·iOS/웹 공통 순위표를 포함한 계획 갱신을 마쳤다. 사용자 요청에 따라 **“이제 AI 모델을 변경할 시점입니다”라고 안내한 뒤 멈춘다.** 사용자가 모델 변경 후 `/memory-execute` 또는 `current 보고 이어서 해줘`로 실행을 요청하면 T01부터 구현·검증·커밋한다. 이번 변경 요청만으로 코딩을 시작하지 않는다.

## Handoff Facts
- 최신 기획: 냥대리/가로 횡스크롤/파스텔/SVG;15% 카페·커피·가속;51% 사무실;100% 약90초와 색상 변경만;게이지 없음;위험 각도 즉시 실패.
- 온라인 변경: 닉네임 중복 허용, 가입 화면 없이 기기별 익명ID, iOS/웹 공통 역대 최고 top100+내 순위. Supabase Auth/Postgres/Edge Functions, 서버 입력 재생 검증, 오프라인 로컬 플레이, 프로필 변경/삭제/신고. 기기 간 프로필 복구·동기화는 없다.
- 새 단계: P01 로컬 게임6 tasks → P02-leaderboard3 tasks → P03-release5 tasks. 기존 P02-release는 P03-release로 이동했으므로 옛 경로를 실행하지 않는다.
- Expo SDK57 안정 패치, Windows npm.cmd/npx.cmd. 일반 iPhone Expo Go가 SDK57을 지원함을 [2026-09-03 공식 공지](https://expo.dev/changelog/expo-go-57-login)로 정정 확인했다. 동일 Expo 계정 로그인, EAS는 독립 앱 빌드용; 전용 Go 빌드는 선택 대안.
- 현재 앱 코드/Git 저장소 없음. Node24.19.0/npm11.17.0/Git2.55.0 확인. 커밋 작성자 값 없음; 실제 실행 시 확보한다.
- GitHub `mocca/close-call-nyang` 원격 생성·푸시는 사용자 담당. 계정 소유권/Pages 공개는 아직 확인하지 않았다.
- Store 소개 문구·스크린샷·최종 심사 제출은 실제 자료를 다시 보여주고 사용자 확인 후 진행한다. 제출과 승인/공개는 구분한다.
- `docs/learning-notes.md`는 T01부터 실제 구현/검증 이력을 누적하고 P03-T05에서 종합한다. 서버·익명 인증·순위·검증·개인정보 변경도 포함한다. 아직 그 노트를 구현 완료 기록으로 생성하지 않았다.
