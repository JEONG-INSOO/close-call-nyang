# Plan: 아슬아슬 냥대리

## Goal
Windows에서 Expo SDK 57 + TypeScript + Reanimated + SVG로 한국어 가로 횡스크롤 균형 게임을 만들고, iPhone Expo Go·배포용 iOS 빌드와 GitHub Pages에서 검증한다. 15% 카페/커피/가속, 51% 사무실, 약 90초에 100%, 이후 무한 기록을 구현한다. 중복 가능한 닉네임과 가입 화면 없는 iOS/웹 공통 온라인 리더보드를 제공한다. 광고는 개발용 가상 흐름만 두며 출시에서는 비활성화한다. 실제 App Review 제출과 종합 학습노트까지 추적한다.

- Decisions: [확정 결정](../decisions/2026-09-21-close-call-nyang.md)
- Character amendment: [세 캐릭터·100% 달성 보상](../decisions/2026-09-21-character-collection.md). 기본rookie(2번), 첫 달성diligent(1번),10회veteran(3번). 외형 전용·기기별 수집이며 기존14개 Task에 통합한다.
- Planning date: 2026-09-21
- Implementation gate: 모델 변경 안내 후2026-09-21 사용자 실행 요청을 받아 P01-T01(e2d066a), P01-T02(f09b6d1), P01-T03(ce14e74), P01-T04(cab6500), P01-T05(646c188), P01-T06(7efcc8c) 완료. 실제 production Chromium 검증을 통과했고 다음 active는 P02-T01이다. iPhone·출시 검증은 미완료다.
- Amendment: 닉네임·온라인 리더보드 결정을 반영해 P02-leaderboard 3개 Task를 추가하고 기존 출시 단계를 P03-release로 이동했다. 총14개 Task 중6개 구현 단계를 완료했다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 로컬 게임6/6·실제 production 웹 QA 완료; iPhone/출시는 P03 | [P01](../phases/2026-09-21-close-call-nyang/P01-game/phase.md) |
| P02 | `in_progress` | 익명 플레이어·서버 검증·공통 리더보드 (T01 active, 실행 대기) | [P02](../phases/2026-09-21-close-call-nyang/P02-leaderboard/phase.md) |
| P03 | `pending` | Pages·스토어 준비, 외부 iOS 검증·심사 제출·학습노트 마감 | [P03](../phases/2026-09-21-close-call-nyang/P03-release/phase.md) |

## Task Map
| ID | 결과 | 주요 파일/심볼 |
| :--- | :--- | :--- |
| P01-T01 | Expo/TypeScript/Jest 기반과 로컬 Git | `package.json`, `app.config.ts`, `App.tsx`, `src/config/app.ts`, `docs/learning-notes.md` |
| P01-T02 | 결정론적 물리·점수·사건·상태 전환 | `src/game/{types,balance,difficulty,engine}.ts`, `src/game/__tests__/` |
| P01-T03 | 냥대리·출근길·사무실 벡터/애니메이션 | `src/scene/`, `src/theme/`, `src/scene/__tests__/` |
| P01-T04 | 실제 입력·게임 루프·제목/플레이/결과/정지 | `src/game/controller.ts`, `src/input/`, `src/screens/`, `src/components/`, `App.tsx` |
| P01-T05 | 저장·설정·음악·진동·공유·개발 광고 | `src/services/`, `src/screens/SettingsPanel.tsx`, `src/screens/MockAdScreen.tsx`, `assets/audio/`, `scripts/generate-audio.mjs` |
| P01-T06 | 통합 회귀 검증·조작감 조정·웹 QA | `e2e/`, `playwright.config.ts`, `scripts/serve-web.mjs`, `docs/qa-report.md` |
| P02-T01 | 서버 스키마·닉네임/순위 API·입력 재생 검증 | `supabase/`, `src/online/contracts.ts`, `scripts/sync-ranked-engine.mjs` |
| P02-T02 | 닉네임·리더보드 화면 및 온라인 판 연결 | `src/online/`, `src/screens/{NicknamePanel,LeaderboardScreen}.tsx`, `src/game/controller.ts` |
| P02-T03 | 실제 Supabase 연결·권한/순위/삭제/장애 검증 | `docs/leaderboard-operations.md`, `scripts/verify-leaderboard.mjs`, `.env.example`, `docs/qa-report.md` |
| P03-T01 | Pages workflow·개인정보/지원 페이지 | `.github/workflows/pages.yml`, `public/`, `scripts/verify-web-export.mjs`, `docs/deployment.md` |
| P03-T02 | 벡터 아이콘·스토어 초안·EAS 구성 | `assets/branding/`, `scripts/render-branding.mjs`, `eas.json`, `store/ko-KR/`, `docs/ios-release.md` |
| P03-T03 | 클라우드 iOS 빌드·TestFlight·실기기 QA | `app.config.ts`, `eas.json`, `docs/ios-release.md`, `docs/qa-report.md` |
| P03-T04 | 실제 스크린샷·문구 승인·심사 제출 | `store/screenshots/`, `store/ko-KR/`, `docs/release-record.md` |
| P03-T05 | 실제 결과를 반영한 학습노트·인수인계 | `docs/learning-notes.md`, `README.md`, `.memory/` 완료 기록 |

## Architecture
- 루트 앱에 Router를 설치하지 않는다. `App.tsx`가 화면 상태를 선택한다.
- `src/game`은 React·플랫폼·저장소를 모르는 순수 TypeScript 규칙. 1/120초 고정 간격으로 시뮬레이션한다.
- `controller`는 requestAnimationFrame 시간 누적과 입력/생명주기를 관리한다. Reanimated shared values는 매 프레임 시각화, React 화면 정보는 최대 10Hz 및 상태 변화 시 즉시 갱신한다.
- `src/scene`은 상태를 그리기만 하고 점수·판정을 변경하지 않는다. 게이지와 100% 축하 이펙트는 없다.
- `src/services`는 저장·오디오·진동·공유 어댑터. 플랫폼 예외가 게임을 종료시키지 않도록 복구한다.
- `src/online`은 Supabase 익명 세션·닉네임·API·기록 입력 대기열을 관리한다. 회원가입 UI/기기 동기화는 없다. 공개 닉네임은 중복 가능하며 개인 식별키와 다르다.
- 서버 함수와 Postgres가 입력 재생 검증 및 개인별 최고 기록 갱신·상위100/내 순위를 처리한다. 클라이언트 점수 직접 쓰기는 금지한다. 원본 엔진을 서버용으로 동기화하고 동일 rulesVersion을 검증한다.
- 온라인 장애 시 로컬 플레이는 지속한다. 시작 전에 서버 run을 발급받지 않은 판은 온라인 순위에 넣지 않는다. 개발/부활 판은 production 랭킹 제외다.
- 분석/실제 광고 SDK/서비스 워커 제외는 유지한다. assets는 로컬 번들에 포함한다.

## Why These Boundaries
P01은 로컬 게임 규칙과 화면, P02는 새로 추가된 서버·네트워크·온라인 사용자 데이터, P03는 호스팅과 iOS 배포 영역이다. 다른 실행 환경과 검증 조건을 가진 세 경계로 나눈다. 각 Task는 구현과 검증을 묶으며 계정 연결·실기기·외부 처리 대기를 로컬 게임 완료와 구분한다.

## Execution Protocol
1. `.memory/current.md`와 해당 Active Task를 읽고 한 Task씩 진행한다. 구현은 모델 변경 안내 이후 사용자의 실행 요청으로 시작한다.
2. 각 Task의 Validation을 통과해야 Status를 done으로 바꾸고 명시된 메시지로 해당 소스·청사진을 커밋한다. unrelated 파일을 일괄 stage하지 않는다.
3. 커밋 후 task의 commit 기록, phase 진행률, plan 진행률과 current 포인터를 동기화한다. 자기 자신의 커밋 해시를 그 커밋 안에 넣으려는 무한 amend는 하지 않는다. 후속 메모리 동기화 커밋에 기록할 수 있다.
4. 커밋 신원/권한 또는 실제 기기 검증이 없으면 성공으로 기록하거나 다음 Task로 건너뛰지 않는다. 완료한 로컬 작업은 보존하고 구체적인 남은 의존성을 기록한다.
5. 각 Task에서 `docs/learning-notes.md`에 무엇/왜/검증/실패와 해결/남은 한계를 누적한다. 처음부터 완료된 것으로 쓰지 않는다.
6. 최초 공개 원격 생성·현재 이력 푸시는2026-09-21의 명시 요청으로 에이전트가 처리한다. 향후 출시 푸시·Pages 설정은 해당 단계에서 사용자와 진행하며 이번 승인으로 자동 배포까지 확대하지 않는다. App Store 문구·이미지·최종 심사 제출은 사용자 확인을 거친다. 제출 후 공개는 수동 상태로 둔다.

## Validation Strategy
- 단위: 고정 간격, 15/51/100 경계, 약 90초 속도 적분, 즉시 실패, 사건 예고, 광고 5초·취소·1회 보상, 정지 중 시계 불변.
- 온라인: 익명 세션/닉네임 중복·변경, 서버 발급 seed와 재생 점수, 직접 점수 쓰기 차단, 중복 전송/최고기록 경쟁/공동 순위, 네트워크 실패·삭제·신고, iOS/웹 공통 순위.
- 화면: 버튼 지속/동시/다중 입력, 입력 해제, 시작/재도전/설정/정지/결과, 저장 손상·공유 거부·오디오 실패.
- 웹: 실제 production export를 하위 경로 `/close-call-nyang/`에서 열어 asset 경로·키보드·터치·가로 레이아웃·광고 숨김 확인.
- iPhone: Expo Go와 production/TestFlight에서 멀티터치·회전·앱 전환·오디오·햅틱·성능·저장·공유·가짜 광고 비노출 확인. 자동 mock 통과와 구별한다.
- 출시: 실제 지원/개인정보 URL 200, 스크린샷 원본·규격, 빌드 식별자, 승인 이력, App Review 상태 증거.

## Important Guards
- 캐릭터 선택은 렌더/로컬 수집에만 적용한다. 순수 물리·온라인 검증에는 캐릭터별 능력치나 hitbox 차이를 넣지 않는다. 한 판200%도 달성1회이며 completedRuns의10상한은 해금 진행에만 적용한다. 기존 게임 점수는 계속 증가한다.
- 최신 결정 우선: 냥대리/가로/SVG/15% 커피/51% 실내/100% 색상만/즉시 실패.
- production에서는 public 환경변수만 바꿔 가상 광고를 켤 수 없어야 한다. `__DEV__`와 명시적 개발 플래그를 함께 요구한다.
- 보상은 게임 상태 머신이 딱 한 번 승인한다. 광고 완료 콜백만으로 임의 재부활하지 않는다.
- 브라우저나 앱을 벗어난 시간을 복귀 프레임에 누적하지 않는다. 숨김 중 광고 완료도 허용하지 않는다.
- Pages의 하위 경로, underscore assets와 `.nojekyll`, 공개 문서 경로를 실제 빌드로 확인한다.
- EAS Submit 업로드는 심사 제출이 아니다. 상태를 단계별로 기록한다.
- `EXPO_PUBLIC_*`에는 Supabase URL/공개 key만 포함한다. 관리자/service-role/secret key는 앱·Pages·Git에 절대로 포함하지 않는다. Origin 검사는 사용자 인증 대체가 아니다.
- 익명 세션으로 접근권을 잃으면 닉네임만으로 기존 계정을 복구하지 않는다. 개인정보 문구를 "데이터 전송 없음"으로 남기지 않는다.

## Environment and Prerequisites
- 확인: Node 24.19.0, npm.cmd 11.17.0, Git 2.55.0; 기존 앱/Git 저장소 없음. PowerShell에서는 `npm.cmd`/`npx.cmd` 사용.
- Expo SDK 57는 공식 지원 버전 조합을 `expo install`로 맞춘다. SDK57 최신 안정 패치(최소 알려진 수정 버전 57.0.17 이상)를 조회 후 lockfile로 고정하며 SDK58로 묵시적 상승 금지.
- [2026-09-03 Go 공지](https://expo.dev/changelog/expo-go-57-login)에 따라 SDK57은 일반 iOS Expo Go에서 테스트 가능. 동일 Expo 계정 로그인 필요. `eas go`는 선택 가능한 대안이다.
- Git 커밋 작성자는 mocca3232 / mocca3232@naver.com으로 확인했다. 미확정 운영값은 Expo/Apple 인증·앱 ID, 공개 지원 연락처, 제출 가격/지역이며 필요한 실행 단계에서만 받는다.
- Supabase Free 운영을 기본으로 계획한다. 실제 프로젝트·권한·사용량·휴면 상태는 P02-T03에서 확인한다. 유료 전환이나 계정 결제를 자동으로 하지 않는다.

## Sources
- [Expo SDK compatibility](https://docs.expo.dev/versions/latest/)
- [Reanimated setup](https://docs.expo.dev/versions/latest/sdk/reanimated/), [SVG](https://docs.expo.dev/versions/latest/sdk/svg/), [Jest](https://docs.expo.dev/develop/unit-testing/)
- [Web publishing](https://docs.expo.dev/guides/publishing-websites/)
- [iOS EAS Submit](https://docs.expo.dev/submit/ios/)
- [Supabase anonymous users](https://supabase.com/docs/guides/auth/auth-anonymous), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [function limits](https://supabase.com/docs/guides/functions/limits), [pricing](https://supabase.com/pricing)

## Progress
- Tasks done: 6/14
- Active: P02-T01 (P01 source7efcc8c; Jest373/server14/typecheck/Expo dependency check/production+fixture exports/Chromium26pass7skip0fail passed. Browser interaction and labeled art QA complete; iPhone/listening/long-play/native release checks pending. One intermediate countdown auto-pause is documented without claiming an exact trigger.)
- GitHub amendment2026-09-21: user explicitly authorized public repository creation/push for current work; authenticated account JEONG-INSOO, repository https://github.com/JEONG-INSOO/close-call-nyang. Earlier user-only remote creation restrictions do not block this expressly requested handoff. Pages activation/release deployment remain later Tasks.
- Adjacent out-of-scope defects: 특이사항 없음. 기존 스타터 문서/예시는 보존한다.
