# Current Context

## Active Plan
[아슬아슬 냥대리](./plans/2026-09-21-close-call-nyang.md)

## Active Phase
[P02 Leaderboard](./phases/2026-09-21-close-call-nyang/P02-leaderboard/phase.md)

## Active Task
[T01 닉네임·리더보드 서버 기반](./phases/2026-09-21-close-call-nyang/P02-leaderboard/T01-ranking-backend.md)

## Status
- Interview: complete including online nickname/leaderboard and [3종 캐릭터 수집 변경](./decisions/2026-09-21-character-collection.md); [기존 결정](./decisions/2026-09-21-close-call-nyang.md)
- Planning: complete; 3 phases / 14 tasks / 6 implementation tasks completed
- Execution: user requested continuation after the model-switch reminder on2026-09-21.
- Completed: P01-T01 foundation(e2d066a), P01-T02 game engine(f09b6d1), P01-T03 characters/scenery(ce14e74), P01-T04 playable app(cab6500), P01-T05 local services(646c188), P01-T06 web QA(7efcc8c); original planning commit2a1c426.
- Validation: T06 full Jest373/373(26suites), server14/14, typecheck0errors, Expo dependency check, Pages-base production export with5sounds/mockenvtrue, isolated fixtures and diff check passed. Actual Chromium153 final26pass/7intentional skips/0fail in137.7sec; app errors/warnings0. Keyboard/touch/pause/phone-size layout/storage/share fallback/ad absence verified. Separate art fixtures inspected, not iOS/high-score evidence. Real iPhone/Safari/listening/native services/long-play performance remain not-run. Doctor21/21 and prior audit are historical, not rerun this task.
- Active Task: P02-T01 ready, not implemented or blueprint-read in T06. No cloud/app deployment or push performed.

## Next Step (IMPORTANT)
다음 실행 요청 시 P02-T01 청사진만 읽고 닉네임·공통 리더보드의 서버 데이터 모델/권한/API/입력 재생 검증을 구현한다. P01 로컬 게임과 서비스를 재작성하지 않는다. 실제 Supabase 계정·배포 검증은 P02-T03에서 다루며 필요한 권한이나 운영값은 해당 단계에서 확인한다. 클라이언트 직접 점수 쓰기나 비밀키 포함을 금지하고 기존 순수 엔진을 규칙의 기준으로 유지한다. Pages 하위 경로/production 광고 차단/캐릭터 수집 규칙을 보존한다. 검증은 docs/qa-report.md와 docs/development.md의 실제 production 절차를 사용하고 iPhone/장시간 성능을 웹 성공으로 대체하지 않는다. 모델 변경 안내와 실행 허가는 이미 완료됐으며 한 Task를 완료하고 멈춘다.

## Handoff Facts
- 캐릭터 변경: 약1.74등신 SVG3종/카탈로그(T03), 실제 집계·저장·선택UI(T05) 구현 완료. 기본2번 rookie, 서로 다른 적격 판100% 첫 달성1번 diligent,10회3번 veteran. 외형만 다르고 동일 물리. 로컬/오프라인 포함·판당1회·개발 광고 활성 판 제외, 안내는 결과 화면·자동장착없음·선택은 다음 START부터. 3skins×reduceMotion2설정의6조합 엔진 결과가 동일함을 App 통합 테스트로 확인했다.
- 최신 기획: 냥대리/가로 횡스크롤/파스텔/SVG;15% 카페·커피·가속;51% 사무실;100% 약90초와 색상 변경만;게이지 없음;위험 각도 즉시 실패.
- 온라인 변경: 닉네임 중복 허용, 가입 화면 없이 기기별 익명ID, iOS/웹 공통 역대 최고 top100+내 순위. Supabase Auth/Postgres/Edge Functions, 서버 입력 재생 검증, 오프라인 로컬 플레이, 프로필 변경/삭제/신고. 기기 간 프로필 복구·동기화는 없다.
- 새 단계: P01 로컬 게임6 tasks → P02-leaderboard3 tasks → P03-release5 tasks. 기존 P02-release는 P03-release로 이동했으므로 옛 경로를 실행하지 않는다.
- Expo SDK57 안정 패치, Windows npm.cmd/npx.cmd. 일반 iPhone Expo Go가 SDK57을 지원함을 [2026-09-03 공식 공지](https://expo.dev/changelog/expo-go-57-login)로 정정 확인했다. 동일 Expo 계정 로그인, EAS는 독립 앱 빌드용; 전용 Go 빌드는 선택 대안.
- Expo57.0.24/React19.2.3/RN0.86.3/TypeScript6.0.3 기반, 엔진·장면·controller와 플레이 화면이 있다. App.tsx는 제목/카운트다운/플레이/정지/결과를 연결한다. Git 작성자는 저장소 로컬 설정의 mocca3232 / mocca3232@naver.com이다. 다른 사용자 실행 시 git 소유자 경고는 명령별 safe.directory=D:/GrillmeEDU로 한정 처리; 전역 예외를 추가하지 않았다.
- T02 엔진은 고정1/120초, seed0→1 정규화, 사건 경계 분할, 즉시 실패, 일시정지와1회 가상광고 부활을 구현했다. 사건 종료의 미세 잔여시간은1e-9초 허용오차로 정리하며14,000틱 재현이 통과했다. 순수 엔진에는 캐릭터별 능력치/100% 축하 효과/저장소가 없다. 동일 런타임 재현만 검증했으며 Hermes/Deno 간 재현은P02에서 별도 확인한다.
- T03:960×540/ground425/anchor270,425/height205/head118/torso51/legs36; rookie default; cup frame.hasCoffee. SVG native matrix/web transform은svgMotion어댑터. 배경은문clip+고정타일, [frame]구독으로새SharedValue교체회귀검증. JSX그림이물리에접근하지않는다. docs/art-direction.md에후속시각검사표.
- T04: fixed1/120 accumulator, max100ms/12steps, >100ms auto-pause+input clear, no auto-resume. readState latest vs cached getSnapshot10Hz+boundaries. Effects once/transition with reentrant controls queued; frame SharedValue per display frame. StrictMode uses deferred disposal lease. Raw native touches/web pointer IDs and Arrow/A/D held input are independent. Web portrait content display:none plus App start/resume guards prevent hidden keyboard activation; this has mocked non-pointer click regression tests, not actual DOM evidence. RN0.86 uses StyleSheet.absoluteFill, not removed absoluteFillObject.
- T05 storage: close-call-nyang.preferences.v1 stores best/settings/collection only. Defaults use parsePreferences(null); settings music/sfx/haptics true, reduceMotion false. One serialized/coalesced writer, hook synchronous session ref, hydration touched-fields+max-best+completion journal. Failed reads do not auto-overwrite unread data; later intentional saves retry. beginAttempt independent of runId, counted synchronously before async; no crash-proof/cross-device/anti-tamper claim. Online data remains separate and unimplemented.
- T05 feedback: useGameAudio stable API; native5Expo players, web5HTML elements because installed Expo web play discards its Promise. audioCore owns cooldowns/max2SFX/pending seek and play tokens/interruption. Music0.15/effects<=0.4, fall allowed just after setPlaying(false), no100cue. generate-audio.mjs creates original12s100BPM5bar loop+4SFX; hashes repeat/no clipping. No real listening/device test. Haptic disabled/web noop. Share native sheet/web clipboard with manual selectable fallback; URL still planned, not live deployment.
- T05 integration: App.subscribe and subscribeEffects read latest service refs; accepted START captures selected skin and new eligible attempt. Panels block start/resume; inline title/result/pause modal flags removed so sibling storage error stays accessible. MockAd reads engine time only; production callback+engine guards false even publicenvtrue,5active seconds/one revive. A real SDK is not installed and needs explicit future provider/engine API work, not automatic ad arrival switching.
- T06 web QA: Playwright1.63/Chromium153의 실제 production UI를1280×720/844×390/667×375로검사. Native accessibilityState가RNW DOM에누락돼ControlButton web aria-disabled/aria-pressed,CharacterSelect aria-pressed수정. CDP부분손가락해제는설치Chromium에서touchEnd:[종료할point],브라우저업그레이드시재검증. 이전CUA초기화실패와달리이번실제웹/합성장면육안검사는완료; iPhone은미검증.
- T06 harness: web:export는GITHUB_PAGES=true자식env로/close-call-nyang적용,개발/native기본경로는유지. web:serve는127.0.0.1:4173/dist,fixture별도4174/output/qa-fixtures. fixtures:build후e2e실행;test-results/playwright-report/output/dist는ignored이고다음실행시기존증거교체가능. 실제앱치트/fixture route없음,로컬서버종료확인.
- T06 limitation: 중간전체실행에서retry초기화성공뒤countdownPAUSE1회. 긴프레임보호또는lifecycle후보이나정확한트리거미계측. 물리/정지보호우회없이별도전체재실행26pass. 실제기기에서반복되면rAF/lifecycle계측필요.5번짧은판window구독수동일은장시간누수/60fps증거가아님. 상태·실패·미검증은docs/qa-report.md에보존.
- 사용자가 앞선 GitHub 작업에서 공개 저장소 생성·푸시를 승인했다. 실제 GitHub 인증 계정은 JEONG-INSOO이며 https://github.com/JEONG-INSOO/close-call-nyang 을 생성했다. T02~T06는 로컬 커밋만 했고 푸시하지 않았다. 브랜치 동기화 여부는 git status/원격 HEAD로 확인한다. 이후 무조건 자동 푸시를 허가한 것으로 확대 해석하지 않는다. Pages 사이트는 아직 배포하지 않았다.
- 실제 예정 Pages URL은 https://jeong-insoo.github.io/close-call-nyang/ 이다. 기존 mocca 호스트와 CORS 관련 계획 문자열을 교정했고 iOS bundle ID com.mocca.closecallnyang은 유지했다.
- npm audit10moderate(Expo/xcode/uuid 하위 의존성),0high/critical. 강제 Expo 하향/무시 설정 없음; 호환 수정판 및 출시 전 재검토 필요.
- Store 소개 문구·스크린샷·최종 심사 제출은 실제 자료를 다시 보여주고 사용자 확인 후 진행한다. 제출과 승인/공개는 구분한다.
- `docs/learning-notes.md`와 `docs/development.md`, `docs/qa-report.md`에T01~T06의실제변경·검증·실패해결·미검증사항을기록했다. 이후Task에서누적하며전체서버/스토어출시완료기록은아니다.
