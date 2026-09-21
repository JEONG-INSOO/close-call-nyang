# Current Context

## Active Plan
[아슬아슬 냥대리](./plans/2026-09-21-close-call-nyang.md)

## Active Phase
[P01 Game](./phases/2026-09-21-close-call-nyang/P01-game/phase.md)

## Active Task
[T06 회귀 검증·웹 QA·조작감 조정](./phases/2026-09-21-close-call-nyang/P01-game/T06-quality-pass.md)

## Status
- Interview: complete including online nickname/leaderboard and [3종 캐릭터 수집 변경](./decisions/2026-09-21-character-collection.md); [기존 결정](./decisions/2026-09-21-close-call-nyang.md)
- Planning: complete; 3 phases / 14 tasks / 5 implementation tasks completed
- Execution: user requested continuation after the model-switch reminder on2026-09-21.
- Completed: P01-T01 foundation(e2d066a), P01-T02 game engine(f09b6d1), P01-T03 characters/scenery(ce14e74), P01-T04 playable app(cab6500), P01-T05 local services(646c188); original planning commit2a1c426.
- Validation: T05 character24 tests, service/ad90, full Jest355/355, typecheck0errors, generated5 deterministic validated WAVs, playable web export with5sounds and git diff --check passed. T01 SDK check/Doctor21/21 and audit are historical results, not newly rerun. Actual browser/iPhone play, phone layout, listening/volume/autoplay/headphone interruption, OS share and physical-device storage remain unverified for T06/P03.
- Active Task: P01-T06 ready, not implemented yet. Earlier browser tool failed during Windows sandbox/trusted Node startup; T05 did not retry browser/device visual QA. No cloud/app deployment performed.

## Next Step (IMPORTANT)
다음 실행 요청 시 P01-T06 청사진만 읽고 통합 회귀·실제 웹 QA·조작감 조정을 진행한다. T01~T05 구현은 재작성하지 않는다. 현재 앱은 저장·설정·캐릭터 수집/선택·음원·공유·개발용 텍스트 광고까지 연결됐다. 자동 테스트를 실제 브라우저/iPhone/청취 성공으로 바꾸어 적지 말고, 이전 도구 초기화 오류와 미검증 항목을 확인한다. 실제 확인이 막히면 구체적인 제약/남은 검증을 기록하며 무조건 출시 완료로 넘기지 않는다. 기본2번/첫100%1번/10판3번, 외형 전용·다음 START 적용,100% 색상만,production 광고 비활성화를 유지한다. 모델 변경 안내와 실행 허가는 이미 완료됐으며 한 Task를 완료하고 멈춘다.

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
- 시각검사제한: ignored output/의정적프리뷰bundle은성공했으나 browser CUArepl이trusted Node process exited unexpectedly로2회실패. 브라우저/기기육안QA통과주장금지. 임시로컬서버는종료했고프리뷰는App/커밋에포함하지않았다.
- 사용자가 앞선 GitHub 작업에서 공개 저장소 생성·푸시를 승인했다. 실제 GitHub 인증 계정은 JEONG-INSOO이며 https://github.com/JEONG-INSOO/close-call-nyang 을 생성했다. T02~T05는 로컬 커밋만 했고 푸시하지 않았다. 브랜치 동기화 여부는 git status/원격 HEAD로 확인한다. 이후 무조건 자동 푸시를 허가한 것으로 확대 해석하지 않는다. Pages 사이트는 아직 배포하지 않았다.
- 실제 예정 Pages URL은 https://jeong-insoo.github.io/close-call-nyang/ 이다. 기존 mocca 호스트와 CORS 관련 계획 문자열을 교정했고 iOS bundle ID com.mocca.closecallnyang은 유지했다.
- npm audit10moderate(Expo/xcode/uuid 하위 의존성),0high/critical. 강제 Expo 하향/무시 설정 없음; 호환 수정판 및 출시 전 재검토 필요.
- Store 소개 문구·스크린샷·최종 심사 제출은 실제 자료를 다시 보여주고 사용자 확인 후 진행한다. 제출과 승인/공개는 구분한다.
- `docs/learning-notes.md`와 `docs/development.md`를 생성했다. 학습노트에 T01~T05의 실제 변경·검증·실패 해결·미검증 사항을 기록했으며 이후 Task에서 누적한다. 전체 게임/서버/스토어 완료 기록은 아니다.
