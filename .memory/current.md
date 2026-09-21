# Current Context

## Active Plan
[아슬아슬 냥대리](./plans/2026-09-21-close-call-nyang.md)

## Active Phase
[P01 Game](./phases/2026-09-21-close-call-nyang/P01-game/phase.md)

## Active Task
[T04 입력·게임 루프·플레이 화면](./phases/2026-09-21-close-call-nyang/P01-game/T04-playable-app.md)

## Status
- Interview: complete including online nickname/leaderboard and [3종 캐릭터 수집 변경](./decisions/2026-09-21-character-collection.md); [기존 결정](./decisions/2026-09-21-close-call-nyang.md)
- Planning: complete; 3 phases / 14 tasks / 3 completed
- Execution: user requested continuation after the model-switch reminder on2026-09-21.
- Completed: P01-T01 foundation(e2d066a), P01-T02 game engine(f09b6d1), P01-T03 characters/scenery(ce14e74); original planning commit2a1c426.
- Validation: T03 scene76+catalog16 tests, full Jest177/177, typecheck0errors, app web export, separate GameScene web bundle and git diff --check passed. T01 SDK check/Doctor21/21 are historical results, not newly rerun.
- Active Task: P01-T04 ready, not implemented yet. Browser visual QA was attempted but tool failed; iPhone visual QA and cloud/app deployment remain pending.

## Next Step (IMPORTANT)
다음 실행 요청 시 P01-T04 청사진만 읽고 입력·고정 간격 controller·실제 플레이 화면을 기존 엔진과 장면에 연결한다. SharedValue<SceneFrame>을 전달하며 GameScene은 부모 공간을16:9로 contain한다. 기본2번과 첫100%/10회 해금 규칙을 유지하되 달성 집계·저장은T05이다. T01~T03을 다시 구현하거나 육안 검사 성공을 꾸며 쓰지 않는다. 모델 변경 안내와 실행 허가는 이미 완료됐으며 이번 턴은 한 Task를 완료하고 멈춘다.

## Handoff Facts
- 캐릭터 변경: 약1.74등신 SVG3종과 카탈로그는T03 구현 완료. 기본은2번 rookie, 서로 다른 판에서100% 첫 달성 시1번 diligent,10회 시3번 veteran. 외형만 다르고 동일 물리. 로컬/오프라인 달성 포함, 판당1회, 획득 안내는 결과 화면, 선택은 다음 판부터. 실제 집계·저장·선택UI는T05 미구현.
- 최신 기획: 냥대리/가로 횡스크롤/파스텔/SVG;15% 카페·커피·가속;51% 사무실;100% 약90초와 색상 변경만;게이지 없음;위험 각도 즉시 실패.
- 온라인 변경: 닉네임 중복 허용, 가입 화면 없이 기기별 익명ID, iOS/웹 공통 역대 최고 top100+내 순위. Supabase Auth/Postgres/Edge Functions, 서버 입력 재생 검증, 오프라인 로컬 플레이, 프로필 변경/삭제/신고. 기기 간 프로필 복구·동기화는 없다.
- 새 단계: P01 로컬 게임6 tasks → P02-leaderboard3 tasks → P03-release5 tasks. 기존 P02-release는 P03-release로 이동했으므로 옛 경로를 실행하지 않는다.
- Expo SDK57 안정 패치, Windows npm.cmd/npx.cmd. 일반 iPhone Expo Go가 SDK57을 지원함을 [2026-09-03 공식 공지](https://expo.dev/changelog/expo-go-57-login)로 정정 확인했다. 동일 Expo 계정 로그인, EAS는 독립 앱 빌드용; 전용 Go 빌드는 선택 대안.
- Expo57.0.24/React19.2.3/RN0.86.3/TypeScript6.0.3 기반, 게임 엔진과 장면 모듈이 있다. App.tsx는 아직 준비 화면이며 playable UI는T04이다. Git 작성자는 저장소 로컬 설정의 mocca3232 / mocca3232@naver.com이다. 다른 사용자 실행 시 git 소유자 경고는 명령별 safe.directory=D:/GrillmeEDU로 한정 처리; 전역 예외를 추가하지 않았다.
- T02 엔진은 고정1/120초, seed0→1 정규화, 사건 경계 분할, 즉시 실패, 일시정지와1회 가상광고 부활을 구현했다. 사건 종료의 미세 잔여시간은1e-9초 허용오차로 정리하며14,000틱 재현이 통과했다. 순수 엔진에는 캐릭터별 능력치/100% 축하 효과/저장소가 없다. 동일 런타임 재현만 검증했으며 Hermes/Deno 간 재현은P02에서 별도 확인한다.
- T03:960×540/ground425/anchor270,425/height205/head118/torso51/legs36; rookie default; cup frame.hasCoffee. SVG native matrix/web transform은svgMotion어댑터. 배경은문clip+고정타일, [frame]구독으로새SharedValue교체회귀검증. JSX그림이물리에접근하지않는다. docs/art-direction.md에후속시각검사표.
- 시각검사제한: ignored output/의정적프리뷰bundle은성공했으나 browser CUArepl이trusted Node process exited unexpectedly로2회실패. 브라우저/기기육안QA통과주장금지. 임시로컬서버는종료했고프리뷰는App/커밋에포함하지않았다.
- 사용자가 앞선 GitHub 작업에서 공개 저장소 생성·푸시를 승인했다. 실제 GitHub 인증 계정은 JEONG-INSOO이며 https://github.com/JEONG-INSOO/close-call-nyang 을 생성했다. T02/T03은 로컬 커밋만 했고 푸시하지 않았다. 브랜치 동기화 여부는 git status/원격 HEAD로 확인한다. 이후 무조건 자동 푸시를 허가한 것으로 확대 해석하지 않는다. Pages 사이트는 아직 배포하지 않았다.
- 실제 예정 Pages URL은 https://jeong-insoo.github.io/close-call-nyang/ 이다. 기존 mocca 호스트와 CORS 관련 계획 문자열을 교정했고 iOS bundle ID com.mocca.closecallnyang은 유지했다.
- npm audit10moderate(Expo/xcode/uuid 하위 의존성),0high/critical. 강제 Expo 하향/무시 설정 없음; 호환 수정판 및 출시 전 재검토 필요.
- Store 소개 문구·스크린샷·최종 심사 제출은 실제 자료를 다시 보여주고 사용자 확인 후 진행한다. 제출과 승인/공개는 구분한다.
- `docs/learning-notes.md`와 `docs/development.md`를 생성했다. 학습노트에 T01~T03의 실제 변경·검증·실패 해결·미검증 사항을 기록했으며 이후 Task에서 누적한다. 전체 게임/서버/스토어 완료 기록은 아니다.
