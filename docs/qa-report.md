# 우당탕탕 냥대리 QA 기록

## 2026-09-23 최신: 상위 30명 staging 계약 검증

새 migration `202609230002_leaderboard_top30.sql`과 top-30 Edge Function을 staging에 적용했다. 31명 전용 rollback fixture가 공동순위 1·1·3, 공개 `entries` 30개, 31위 `me`, `rollbackCompleted=true`, `intentGucsCleared=true`로 통과했다. 후속 실제 smoke는 14개 통과·0개 실패·정리 대상 0개였다. 기존 101명 fixture는 이전 top-100 계약의 역사적 증거로 남기며 새 요구사항의 통과 기준으로 사용하지 않는다.

## 2026-09-23 최신: staging 규칙 동기화 후 실제 smoke 재검증

로컬 규칙 버전이 `nyang-v1-bc732af6f2a7ea66`으로 변경된 뒤 staging 함수가 이전 버전을 사용해 첫 요청이 `RULES_MISMATCH`로 거절됐다. production은 건드리지 않고 staging `leaderboard-api`만 현재 소스로 재배포했다. 재실행한 실제 smoke 보고서는 Git 제외 `output/ranking-staging-87271deb-8290-4f21-93c2-4dc1fb4c8ee3.json`이며 14개 통과·0개 실패·정리 대상 0개, `smokePassed=true`, `taskComplete=false`다. 수동 8개 항목(동시 판 최고값/만료·운영/한도·cron·실제 웹 복구·Hermes)은 여전히 별도 검증이 필요하다.

## 2026-09-22 최신: 승인된 회색 태비 기본 캐릭터

[새 아트 검증 기록](./learning-notes/2026-09-22-grey-tabby-rookie.md)에서 기본 rookie 외형, 같은 SVG의4포즈, 보상 보존과 실제 브라우저 확인을 구분한다. 물리/서버 규칙은 f7245064c9459310 그대로이며 이 아트 작업은 원격 서버 검증 완료를 뜻하지 않는다.

## 2026-09-22 최신: 긴장감과 평면 찌비

새 외형·시드 기반 균형·3배 배경을 로컬 웹에 구현했다. [최신 통합 검증 기록](./learning-notes/2026-09-22-brisk-balance-flat-chibi.md)이 이번 결과와 미검증 범위를 구분한다. 새 로컬 규칙은 `nyang-v1-f7245064c9459310`이며 staging의 옛 배포와 다르다. 아래 인형형 구현/서버 검사는 당시 기록이다. P02-T03 원격 재배포·실기기는 계속 미완료다.

## 2026-09-22 최신 게임 외형·물리 변경

인형형 짧은 팔다리와 빠른65도 균형을 로컬 빌드에 반영했다. [독립 검증 기록](./learning-notes/2026-09-22-plush-cat-and-balance.md)에 최초 실패와 수정, 최종 회귀·브라우저 결과를 기록한다. 새 규칙9fc10a2a8fdd4085는 로컬 원본/서버 사본에만 반영했으며 아래 staging 원격 배포의 옛 규칙과 구분한다. P02-T03/실기기 검증은 여전히 미완료다.

## 최신 상태 · 2026-09-22 staging 실제 배포·부분 검증

사용자 선택1로 기존 프로젝트를 staging으로 재사용했다. 조직 `oxbvynubycrowcazoqzx`의 Free/Owner1명/기존1개 프로젝트와 빈 DB·Auth0·스토리지0·함수0을 확인한 뒤, 서울의 `nyang-staging`(tadokcpealpwjfyjovuy)과 `nyang-production`(fgojrxmpxpzdiwsktjsx)을 준비했다. 후자는 생성만 완료했으며 아직 랭킹 migration/API를 배포하지 않았다. 요금제 변경이나 유료 옵션 선택은 없다.

| 이번 실제 검사 | 결과 / 범위 |
| :--- | :--- |
| staging migration/API | 202609210001 적용, leaderboard-api 원격 번들 배포·수정 재배포 성공 |
| 실제 카탈로그 | private6테이블 RLS/권한, public12RPC 및 private8helper 소유자·search_path·실행권한 통과 |
| Auth 설정 | 익명 가입 활성, ES256, JWT3600초, 익명 가입30회/시간. CAPTCHA 기존false 유지 |
| 실제 HTTP smoke | 최신14passed/0failed, 정상 시간 proof·소유권·중복 ACK/동시 finalize·중복닉네임·개명·신고·자기삭제·같은JWT 삭제재시도 |
| 실제 직접 REST | anon/B의 A점수 INSERT/PATCH4요청 모두406/PGRST106. private스키마 비노출 증거이지 단독 RLS 증거가 아님 |
| 실제 직접 RPC |3개 기존 RPC×anon/B6요청 모두 정확42501(401/403).404를 통과로 계산하지 않음 |
| 실제 SQL 역할 검사 | anon/authenticated/service_role의6테이블×4종0행 요청72개, anon/authenticated의12RPC24개 모두42501; 총96개 |
| 실제 SQL 순위 fixture |101명 전용UUID/고유규칙, 공동1·1·3/top100/내101위/동점시간순/비공개ID 미노출 통과; 전부ROLLBACK |
| 최종 임시 데이터 정리 | Auth/players/best_scores/runs/reports 모두0, pending삭제0. 완료 삭제표식4는 보관정책에 따라 유지 |
| 최신 로컬 검사 | typecheck/ranked/server 통과, ranking184/Deno50/tools64/SQLstatic22/Chromium골든3 통과 |
| 전체 Jest | 최초582pass/1fail, GameScene 단독33pass, 코드변경 없는 전체 재실행583/583(40suites,26.814초) |

최신 실제 smoke 보고서는 Git 제외 `output/ranking-staging-e99040f6-eeea-41e3-a392-15d735bf72b0.json`이다. 기본검사12개 성공 보고서도 보존했다. `evidenceSource=hosted`, `smokePassed=true`, `cleanupRequired=[]`, `signupResponseUncertain=false`이나 **taskComplete=false**다. runner의8개 수동 항목은 자동으로 not_run이며 별도로 실행한 카탈로그/권한/순위 증거는 이 문서와 SQL 파일에 구분해 기록한다.

### 이번 실패와 수정

- 첫 실제 migration은 PL/pgSQL IF 내부 CASE의 THEN 해석 때문에 SQLSTATE42601로 실패했다. 랭킹 객체가 롤백된 것을 확인하고 CASE 식에 괄호를 추가해 재적용했다. 적용된 현재 migration을 다음 SQL 수정에 재작성하지 말고 새 migration을 추가한다.
- 첫 smoke는 본문 없는 DELETE가 gateway에서 빈 non-null 스트림으로 도착해400이 됐다. null 또는 실제0바이트 종료만 허용하고 실제 첫 바이트/과도한 빈 청크를 거부하는 수정 후50개 Deno 회귀·실제 재검증을 통과했다. 이 최초 실패 때는 Auth 게스트가 생성되지 않았다.
- Windows npx.cmd 위치 인자로 다중행 SQL을 넘긴 실행은 exit0여도 rows[]만 반환했다. 통과 증거로 인정하지 않았으며 공식 Management API에 UTF-8 JSON의 단일 배치로 다시 보내 assertionsPassed/rollbackCompleted/intentGucsCleared를 확인했다. SQL 파일의 SELECT만 떼어 실행하면 검증이 아니다.
- 전체 Jest의 커피 표시 opacity 간헐 실패는 단독/전체 재실행에서 재현되지 않았다. 테스트 타이밍 문제로 확정하지 않았고, 애니메이션·물리 코드를 바꾸거나 기대값을 완화하지 않았다. 원인이 해결됐다고 주장하지 않는다.

**남은 검증:** 서로 다른 판의 최대값/동점시간 및 개명·삭제·운영자 변경 경쟁, 만료·보관정리 cron/백업·복구, 실제 Gateway forwarded 신뢰/호출한도·CPU, 실제 설정으로 빌드한 웹의 오프라인/재연결 UI, production 배포·smoke, iPhone/Hermes. 이번 새 웹 export/전체E2E/Doctor/audit는 미실행이다. 로그 보관은 실제 Free entitlement1일이며 서버 로그 없음으로 표현하지 않는다. T03 완료 커밋·P03 이동·푸시는 하지 않았다.

## 이전 상태 · 2026-09-22 Supabase CLI 인증 확인

- 사용자 로그인 완료 후 CLI2.117.0 `projects list`와 `orgs list` 모두 exit0. 조직1개와 기존 서울(ap-northeast-2) ACTIVE_HEALTHY 프로젝트1개를 실제 조회했다. 로컬에는 연결되지 않았다.
- 조직 이름/프로젝트 상태는 확인했지만 Free plan/남은 슬롯/빈 DB/게임 전용 여부는 목록으로 입증하지 못한다. 기존 프로젝트를 staging으로 재사용할지 사용자 질문 후 대기한다.
- `organizations list`는 잘못된 하위 명령으로 UnknownSubcommand가 났고, help 확인 후 지원되는 `orgs list`로 수정했다. 인증 실패와 명령 오류를 구분한다.
- 이번에는 문서·메모리만 변경했다. 앱 테스트를 새로 돌리거나 실제 게스트/Auth/DB/랭킹 검증을 수행하지 않았다. 키 조회·프로젝트 변경/생성·link·migration·deploy·과금·푸시는 없다. 이전 '가입 필요'는 해결됐지만 T03 자체는 여전히 미완료다.

## 최신 추가 검증 · 2026-09-22 제목 변경

- 표시 이름/Expo 메타데이터/공유 문구를 `우당탕탕 냥대리`로 변경했다. config/share/presentation/settings 4 suites,48개 검사 통과. slug/bundle ID/공개 URL 유지 회귀1개를 추가했다.
- `web:export`와 `typecheck` 통과. 새 production dist로 `playwright test e2e/storage.spec.ts`를 실행해 desktop1280×720/phone844×390/small667×375의 저장·복구·새 제목 공유 문구9/9를39.0초에 통과했다. 전체 E2E/전체 Jest를 재실행한 것은 아니다.
- 새 dist의 `ranking:env-check -- --allow-unconfigured` 통과(텍스트3/바이너리5 제외). 실제 서버 연결 준비 완료를 뜻하지 않는다. 온라인/장면 fixture 번들은 이번에 재빌드하지 않았고 이9개 검사는 새 기본 dist만 사용한다.
- 기존 제목은 런타임 소스/테스트에서 제거했으며, 과거 청사진에는 당시 이름이 남을 수 있다. 최신 결정이 우선한다. 생성된 dist/test-results는 Git에 넣지 않는다. 이번 실행으로 기본 Playwright 결과 파일은 제목 변경9개 검사의 결과로 교체됐다.
- 사용자 최신 답변에 맞춰 Supabase 계정 상태를 없음/가입 필요로 정정했다. 회원가입·서버 생성·배포·푸시·T03 완료 커밋은 하지 않았다. 실제 iPhone/호스팅 검증은 대기한다.

확인일: **2026-09-21 (KST)**. P01의 로컬 게임·production 웹 검증 기록이며 출시 승인 기록이 아닙니다. 온라인 닉네임/순위, GitHub Pages 공개, iPhone/스토어 배포는 아직 완료하지 않았습니다.

## 환경과 최종 명령

- Windows 11 Home10.0.26200, x64, Core Ultra5 125H, 메모리16GiB.
- Node24.19.0, Expo57.0.24, React19.2.3, RN0.86.3, Playwright1.63.0 / Chromium153.0.8010.12 headless.
- 실제 앱: `http://127.0.0.1:4173/close-call-nyang/`. 별도 합성 장면: `http://127.0.0.1:4174/fixtures/`.
- 실제 앱 세 viewport:1280×720,844×390(터치),667×375(터치). 모바일 크기는 Chromium 에뮬레이션이며 iPhone/Safari가 아닙니다.
- 최종 E2E는 workers1/retries0. 성공을 위해 무적·가짜 해금·엔진 상태/seed 주입·자동 재개·정지 보호 제거를 하지 않았습니다.

| 명령 | 결과 |
| :--- | :--- |
| `npm.cmd run typecheck` | pass · 오류0 |
| `npm.cmd run test:ci` | pass ·26 suites,373 tests |
| `npm.cmd run test:server` | pass ·14 tests, skip0 |
| `npm.cmd run web:export` | pass ·하위 경로 JS1개/WAV5개. `EXPO_PUBLIC_ENABLE_MOCK_AD=true`로 빌드 |
| `npm.cmd run fixtures:build` | pass ·별도 진입점, `output/qa-fixtures`에만 출력 |
| `npx.cmd playwright install chromium` | pass ·누락된 headless shell 설치, 이후 불필요하게 반복하지 않음 |
| `npm.cmd run e2e` | pass ·26 passed/7 skipped/0 failed,137.7초. 중복 fixture/lifecycle 프로젝트6개와 비터치 desktop의 touch1개만 의도적으로 제외 |
| `npx.cmd expo install --check` | pass ·Dependencies are up to date |
| `git diff --check` | pass ·공백 오류0 |

재현 절차는 [개발 안내](./development.md#production-웹-qa-재현)를 참조합니다. 빌드/서버의 NO_COLOR·FORCE_COLOR 경고는 CLI 색상 옵션 경고입니다. 브라우저 pageerror/console error/HTTP오류/취소 아닌 요청 실패는 테스트 실패로 취급합니다. `net::ERR_ABORTED`는 원인별 분류 없이 일괄 제외하며 필수 JS/WAV 로드는 별도 검사합니다. 최종 browser-log의 앱 오류·경고는0입니다.

## 확인 항목

`surface`는 unit/browser/expo-go/testflight, `result`는 pass/fail/not-run입니다. 아래 pass의 checkedAt은2026-09-21, not-run은 null입니다.

| ID | surface | result | 증거·검사 내용 |
| :--- | :--- | :--- | :--- |
| WEB-01 | browser | pass | 세 viewport 실제 start/countdown/held right/눈에 보이는 기울기/실패/result/retry, A+ArrowLeft 중 A만 놓기 |
| WEB-02 | browser | pass |844×390·667×375에서 Chromium 두 touch pointer. 양손 상쇄, 왼손만 해제 후 오른쪽 기울기, 취소 시 해제 |
| WEB-03 | browser | pass | 일시정지 동안 각도·점수 고정, DOM blur/focus 이벤트, portrait gate→landscape 후에도 명시적 재개 필요. 실제 OS 백그라운드 전환 검사는 아님 |
| WEB-04 | browser | pass | 기본rookie/잠긴1·3번 캐릭터, 설정 토글, 정상 플레이 최고 기록 저장/새로고침, 손상JSON 복구 |
| WEB-05 | browser | pass | 클립보드 거절 경계에 수동 선택 가능한 공유 문구, 거짓 ‘복사 완료’ 없음. OS 공유 시트 확인은 아님 |
| WEB-06 | browser | pass | 하위 경로 실제JS/WAV MIME과200응답,16:9 SVG,76×76 조작패드·48×48 정지버튼 viewport 내 배치, 가로 overflow 없음 |
| WEB-07 | browser | pass | 공개 광고변수true로 export한 production 결과 화면에 개발 광고/부활 버튼 없음 |
| WEB-08 | browser | pass |5번의 짧은 정상 입력 판: 첫/다섯 result의 window 이벤트별 구독 수 동일. CDP metrics 첨부. 장시간 성능/누수 없음의 증거는 아님 |
| ART-01 | browser | pass | 별도 합성 fixture: 두 phone contain배율의0/15/50/50.5/51/100 장면, coffee/office opacity·cafe/entrance transform. 아래 육안 관찰 포함 |
| ART-02 | browser | pass | 별도 합성 fixture:3캐릭터×커피유무×±0.55rad, 총12포즈를 각 phone크기로 확인. 해금/성공 플레이 증거가 아님 |
| RULE-01 | unit | pass |30/60/120Hz 두 판 동일 state/effects, 숨긴 광고 시간/1회 보상, 악의적 production 부활 요청 거절 |
| RULE-02 | unit | pass |1시간 정지 시간을 제외한100% 도달89.5~90.5초, 이후102% 이상, 발걸음간격≥0.18초,100 전용효과 없음 |
| RULE-03 | unit | pass |1000m 단위 fixture30초 두 번 재생: 유한값·결정론·상한 없음·최소3사건의1.2초 예고 후 힘 적용 |
| COL-01 | unit | pass |0/1/9/10회, 서로 다른10판,200%=한 판 보상1회, 정지/결과/재렌더 중복 없음, hydrate/write 실패, 잠긴선택 거절,3캐릭터×모션2조합 동일 물리 |
| SERVER-01 | unit | pass | 실제HTTP14검사:404/MIME/HEAD·method·prefix·디코딩·traversal·Windows ADS/NUL·외부junction차단·독립fixture root·오류종료 |

## 실제 화면과 합성 이미지

캡처 원본은 `test-results/`에 있으며 Git에서 제외합니다. 다음 E2E 실행은 이전 결과를 교체할 수 있습니다. HTML 보고서에는 같은 이미지와 browser-log/fixture-evidence-scope/반복 실행 계측 JSON이 첨부됩니다.

- 실제 플레이 파일: `game-real-held-keyboard-in-30621-ever-exposes-production-ads-{desktop|phone-landscape|small-landscape}/actual-{title|initial-street|lean|result}.png`.
- 실제 설정 파일: `storage-real-browser-setti-79960-d-collection-remains-locked-{project}/actual-settings.png`.
- 합성 그림 파일: `fixtures-synthetic-scene-and-twelve-pose-fixtures-at-{844x390|667x375}-desktop/fixture-{size}-distance-{0|15|50|50.5|51|100}.png`.
- 합성 포즈 파일: 같은 폴더의 `fixture-{size}-twelve-pose-grid.png`, `fixture-{size}-pose-{character}-{coffee|empty}-{left|right}.png`.

육안으로 실제 제목·초기 거리·휘청이는 모습·결과/정지·설정을 확인했습니다. 667×375에서도 조작패드가 캐릭터와 분리되고 점수가 읽힙니다. 설정의 아래 행은 모달 내부에서 스크롤하며 닫기 버튼은 유지됩니다. 합성15m에는 카페 앞 컵,50~51m에는 출입문과 실내 전환,100m에는 복사기·서류·책상·화분·상사와 혼나는 직원이 보입니다. 작은 게임 배율에서도 세 얼굴의 표정, 짧은 두 다리, 꼬리, 컵이 구별되고 ±0.55 기울기에서 포즈 캡처 밖으로 잘리지 않았습니다.

합성 이미지에는 항상 **TEST FIXTURE — 합성 상태 / iOS 스크린샷 아님**을 표시합니다. 실제 앱에 테스트 전용 route나 해금 조작 UI는 없으며 production dist와 폴더/포트/진입점이 분리됩니다. 이 캡처를 App Store 제출 자료로 사용하지 않습니다.

## 반복 실행·조작감 판단

브라우저에서5번의 짧은 판을 반복해 window의 blur6/focus1/keydown1/keyup1/pointercancel2/pointerup2 및 Playwright 관측 listener1개가 동일하게 유지됐습니다. JSHeap/DOM/JSEventListeners/TaskDuration은 CDP JSON에 관측값으로 보관하며 GC 전후 차이를 누수나 FPS로 환산하지 않습니다.60fps 달성, 장시간 생존, 실제 사람의100% 완주를 검증한 것은 아닙니다.

물리 상수는 수정하지 않았습니다. 15/51/100 경계·위험 각도0.70·90초 곡선은 유지되며 이번 관측에서 상수 변경을 정당화할 체감 근거를 얻지 않았습니다. 사용자와 실제 iPhone에서 초기 난이도·15% 이후 증가·긴 플레이의 반복 정지 여부를 확인해야 합니다.

## 실패와 해결 / 남긴 제한

1. 실제 RNW 버튼에 native `accessibilityState`가 DOM으로 반영되지 않았습니다. 조작패드에 web aria-disabled/aria-pressed, 캐릭터 선택에 aria-pressed를 추가하고 실제 RNW 변환 회귀와 browser검사를 통과했습니다. 활성false는 속성이 생략되므로 검사도 toBeEnabled로 수정했습니다.
2. 처음 작성한 E2E 헬퍼 구문 오류를 수정했습니다. 두손 검사에서는 종료할 손가락 대신 남길 손가락을 CDP에 보냈던 테스트 오류를 고쳤습니다. 설치 Chromium153은 `touchEnd:[a]`로 전달한 왼손만 종료합니다. [Chromium의 두 구현 경로](https://chromium.googlesource.com/chromium/src/+/master/content/browser/devtools/protocol/input_handler.cc)가 달라 업그레이드 후 실제 동작을 다시 확인해야 합니다.
3. 중간 전체 실행 한 번에서844×390의 retry가 정상 초기화된 뒤 카운트다운 중 일시정지돼 패드 대기가 실패했습니다. Trace의0%/업무준비3→잠시 쉬는 중을 확인했고 앱 오류는 없었습니다.100ms 초과 프레임 보호 또는 lifecycle이 원인 후보이나 rAF/blur 계측이 없어 정확한 원인을 확정하지 않습니다. 게임 코드를 우회하거나 자동resume/retry로 숨기지 않고 별도 무거운 검사 없이 다시 실행한 최종 결과를 위에 기록했습니다. 실기기에서 반복된다면 frame/lifecycle 계측 후 판단해야 합니다.
4. 이전 CUA browser 시작 실패와 이번 테스트 도구 구문/프로토콜 실패를 앱 기능 실패와 구분했습니다. 실제 Chromium 동작으로 확인했고 iPhone 결과로 확대하지 않았습니다.
5. 기존 npm 설치 감사는 중간등급10개 경고를 유지했습니다. 이번 별도 `npm audit`/Expo Doctor는 실행하지 않았으며 과거 Doctor21/21을 새 결과로 적지 않습니다. 강제 SDK 하향은 하지 않았습니다.

새로운 범위 밖 결함은 **특이사항 없음**입니다. 사용자 스타터/스킬/사용량 파일은 수정하지 않았습니다.

## 실기기·출시 대기 (checkedAt:null)

| ID | surface | result | P03에서 필요한 증거 |
| :--- | :--- | :--- | :--- |
| IOS-01 | expo-go | not-run | 실제 Expo Go 버전/동일 계정, 가로화면·노치/safe area, 두 손가락 조작 |
| IOS-02 | expo-go | not-run | 홈 전환/회전/알림 중단 후 명시적 재개, 실제 시간·입력 해제 |
| IOS-03 | expo-go | not-run | 무음모드/이어폰/음량/자동재생·인터럽트, 실제 청취·햅틱·OS 공유·디스크 저장 |
| IOS-04 | testflight | not-run | production 가상광고 비노출, 장시간 성능/발열/프레임·반복 정지, 실제스토어 캡처 |
| WEB-09 | browser | not-run | 실제 iPhone Safari·공개 Pages URL에서 운영 QA |

P02에서 온라인 실제 연결, P03에서 Pages workflow·EAS 빌드·실기기 검증을 수행합니다. 앱스토어 소개문구·이미지·최종 제출은 사용자에게 다시 확인받습니다. P01 완료는 전체 게임 출시 완료를 의미하지 않습니다.

## 2026-09-22 · P02-T01 서버 기반 검증

위 P01-T06 기록은 당시 결과입니다. 아래는 최종 `nyang-v1-2093a8b42d416f8a` 엔진/서버 코드의 새 실행 결과입니다. Node24.19.0, Deno2.9.6, Chromium153.0.8010.12를 사용했고 호스팅 프로젝트·실제 키는 사용하지 않았습니다.

| 검사 | 결과 | 증거 범위 |
| :--- | :--- | :--- |
| `ranked:sync` / `ranked:check` | pass | 원본6개+버전2개 생성, 원본/서버 사본 드리프트 없음 |
| `test:ranking` | 58/58 pass | 닉네임26·요청/오류 계약21·Node 재생11 |
| `server:check` | pass | Deno 실제 엔트리포인트와 서버 의존성 타입 검사 |
| `test:server-api` | 45/45 pass | Auth6·handler24·proof13·repository2; 최종471ms, DB/Auth 통신 경계는 모의 |
| `test:ranking-schema` | 21/21 pass | SQL/RPC 시그니처·권한·잠금/재전송·삭제/보관의 정적 계약 검사 |
| `ranked:browser` | 3/3 pass | 실제 Chromium 산술 실행의 합성 입력/최종 상태 지문 일치 |
| `typecheck` / `test:ci` | pass / 431/431 | 전체29 suites, 타입 오류0, 기존 게임·입력·캐릭터·저장·광고 회귀 포함 |
| `test:server` | 14/14 pass | 로컬 웹 서버 HTTP/파일 경계 회귀 |
| production export / fixtures build | pass | Pages 하위 경로+WAV5개, mock ad 환경변수true로 빌드, 그림 fixture 별도 |
| 실제 웹 E2E | 26 pass / 7 skip / 0 fail | 재시도0,159.5초. 앱 오류/경고0. 중복 fixture/해당 없는 desktop touch 등 기존 의도적 제외7개 |
| staged `git diff --check` | pass | Git의 Windows LF→CRLF 안내는 있었지만 공백 오류는 없음 |

### 구체적인 경계 검사

- 같은 닉네임, NFC/공백/길이·허용 문자, 서버 금칙어, 임의 score/user_id/revive 필드 거절. 실제 HTTP Request의64KiB 스트림 한도 및 허위 Content-Length도 검사했습니다.
- 실제 로컬 ES256 키로 JWT를 서명/검증했고 위조 서명·issuer/audience/만료/role/sub·HS256 fallback을 거절했습니다. 실제 Supabase getUser 네트워크/JWKS 다운로드는 모의 경계이므로 운영 인증 통과 증거는 아닙니다.
- 호출자 소유권, 서버 seed와 카운트다운 초기 상태, 규칙 불일치, 입력 순서, 같은 입력의 RLE 정규화·재전송, 마지막 틱 낙하, 낙하 이후 틱 거절,503/429/Retry-After·오류 비공개 처리를 확인했습니다.
- 상위100 밖의 내 순위/동점 정보는 handler가 fake repository의 결과를 공개 필드만 유지해 전달하는지를 검사했습니다. SQL의 rank 계산·최고값 경쟁·스냅샷·잠금·삭제 원자성은 정적 검사이며 실제 DB에서 입증하지 않았습니다.
- 탈퇴 표식→DB 삭제→Auth 삭제→완료 순서, Auth 장애 후 재시도·기존 표식 없는 fallback 금지·일반 요청의 fallback 금지·신고 소유권을 검사했습니다.
- Node/Deno/Chromium 골든3개는 무입력828틱/6%, 오른쪽82틱/0%, 사건7회·커피·사무실을 포함한10970틱/101%로 동일했습니다. Deno는137/1200틱 두 분할 방법으로 같은 결과를 냈습니다. 증거 `output/ranked-browser-report.json`에는 synthetic=true, actualPlayEvidence=false를 명시했습니다.
- 전체 실제 웹 회귀는 새 production 번들로 실행해 두손 상쇄/부분 해제·키보드·정지/회전·저장·공유 실패·광고 비노출을 다시 확인했습니다. 새 디자인 육안 승인이나 iPhone 결과로 해석하지 않습니다. 생성된 `test-results/results.json`은 이전 결과를 교체하며 Git에는 넣지 않습니다.

### 발견과 수정 / 운영 검증 대기

반올림된0.70 각도와15% 거리의 같은 틱 상태/효과 불일치, API의 중복 addedTicks=0과 SQL의 검사 순서 불일치, rate bucket UPSERT/정리 경합 가능성을 보완했습니다. 설명과 코드는 [학습 노트](./learning-notes.md)에 있습니다. 모든 최종 명령은 통과했으며 초기 fixture/테스트 환경 실패는 학습 노트에 별도로 남겼습니다.

**not-run (P02-T03):** 실제 PostgreSQL 마이그레이션 문법 실행, anon/authenticated RLS·EXECUTE 거부, 동시 start/chunk/finalize/delete/운영자 숨김 경쟁, 서버 벽시계 검증, 진짜 최고값/동점 top100과 내 순위, Auth 익명 가입·서명키/삭제·장애, Gateway IP 신뢰성, 호출 제한 부하와 provider CPU 예산, 물리 보관 정리 스케줄/실JWT 최대수명. 로컬 DB 실행기도 사용하지 않았습니다.

**not-run (P02-T02/P03):** 앱 닉네임/리더보드 UI·세션·업로드 대기열 연결, iPhone Hermes 골든/Expo Go/TestFlight, 실제 장시간 조작감·오디오·성능, Pages/서버 공개 배포. 기존 Doctor/Expo 의존성 확인은 이번 재실행 결과가 아닙니다. Deno 의존성 설치의 npm 감사에는 기존 중간등급10개가 남았습니다. 푸시·클라우드 설정·비밀키 생성/배포는 하지 않았습니다.

## 2026-09-22 · P02-T02 앱 온라인 연결 검증

앞의 T01 항목은 당시 기록입니다. 이번에는 닉네임/순위 화면·인증·입력 대기열을 연결하고, 실제 production-shaped 앱의 브라우저 조작을 **모의 API**로 검사했습니다. 실제 Supabase 프로젝트·사용자 자격증명은 사용하지 않았습니다. 엔진 규칙은 `nyang-v1-2093a8b42d416f8a` 그대로입니다.

| 검사 | 결과 | 증거 범위 |
| :--- | :--- | :--- |
| `typecheck` | pass | 앱·신규 훅/화면/테스트 타입 오류0 |
| `test:ranking` | 184/184,12 suites pass | 기존58 포함, 인증/HTTP 경계·프로필·RLE·대기열·취소/삭제/손상·개발 진단 |
| 닉네임/리더보드 화면 지정 Jest | 21/21,2 suites pass | 중복 이름·편집·공동 순위·내 순위·오류/신고/숨김·삭제 확인 |
| `test:ci` | 582/582,40 suites pass | 최종55.697초; 기존 게임/캐릭터/입력/서비스 회귀 포함 |
| `ranked:check` | pass | 서버 생성8파일과 규칙 버전 변경 없음 |
| `test:server` | 14/14 pass | 로컬 정적 서버의 HTTP/경로/파일 경계 |
| `expo install --check` | pass | 설치된 SDK57 의존성 호환; 실제 iPhone 실행 증거 아님 |
| 세 웹 빌드 | pass | `dist`, 별도 그림 fixture, 별도 모의 API 앱. 최종 기본 번들 `index-a5fa9ce5ff84a02cb3c667ad35e421f3.js` |
| production 제외 검사 | pass | 가짜 API 주소/키·진단 화면/골든 marker 미포함, envtrue에서도 광고 차단 |
| 전체 실제 Chromium E2E | 28pass/11의도적skip/0fail | 최종 새 빌드166.207초, retries0/flaky0; 중복 프로젝트/기존 비해당 검사11개 제외 |
| staged diff/자격증명 점검 | pass | 실제 키/토큰/생성 캡처를 커밋하지 않음 |

기본 앱의 browser-log 첨부는 errors/warnings 모두0입니다. 모의 온라인 흐름은 pageerror0이며 의도적으로 만든503 응답은 장애 테스트 입력입니다. 이 오류 응답까지 네트워크 오류0이라고 주장하지 않습니다. Playwright 종료 후4173/4174/4175에 listening 서버가 남아 있지 않음을 확인했습니다.

### 검사한 경계

- 앱 실행/공개 board 조회는 익명 가입0회, 명시적 닉네임 저장만1회. 사용자 고정 API/인증 갱신 최대1회/시작2초/일반8초, 삭제 후 늦은 SDK 저장 차단, 같은 인증으로 삭제 재시도, 프로필 응답과 현재 사용자 일치 검사를 단위 테스트했습니다.
- 실제 고정playing틱/동시입력0방향/마지막 부분 낙하·정지 제외,1200틱 RLE분할, 누락/다른판 거절, ACK 일치/재전송·용량·만료·foreground·429 지연/실패 예산을 검사했습니다. proof에는 토큰을 넣지 않습니다. 판 ID를 비교해 옛 정리가 새 proof를 지우지 않게 했습니다.
- 훅17개에는 이전 요청 취소/닫기/사용자 변경 후 자동 START 금지, 미완료 HOME만 폐기·완료pending 보존, 서버 삭제 성공/로컬 정리 실패 구분을 포함합니다. 손상 JSON/외부 사용자/만료/옛규칙의4종은 명시적 폐기 전 prepareRun/begin을 거절하고 원래 raw를 보존합니다.
- 실제 Chromium844×390의 온라인 UI는 중복 닉네임, 동점1위 두 행, 별도 내101위, opaque publicID 신고·한 행 숨김,503삭제 재시도 후 세션 삭제/기존 로컬 설정 유지, 실제 키보드 입력 청크 전송과 모의 영수증 표시,503시작 실패→로컬 게임을 검사합니다. 서버 점수/순위는 테스트 응답이므로 실제 DB 계산·재생 증거가 아닙니다.
- 기본 앱은 Supabase 공개 변수가 빈 상태, 모의 앱은 가짜 `.invalid` 주소/키만 별도 번들에 들어갑니다. 둘 다 production 컴파일이며 mock-ad/diagnostic envtrue에서도 가상 광고·진단 UI가 노출되지 않습니다. 전체 검사에는 이전 멀티터치·회전/정지·저장·공유 실패·5판 listener 회귀도 유지합니다.
- 새 캡처 `test-results/online-simulated-API-guest-33624-ort-hide-and-deletion-retry-phone-landscape/simulated-ranking.png`, `online-simulated-API-genui-f3272--outage-falls-back-to-local-phone-landscape/simulated-submission.png`를 육안으로 확인했습니다. `SIMULATED API — 실제 서버/iPhone 증거 아님` 표시가 있습니다. 랭킹의 내 행 강조/순위/성공률/닫기 버튼이 읽히며 결과 하단 버튼은 내부 스크롤로 접근합니다. 생성물은 Git에 넣지 않습니다.

### 실패·미검증을 구분한 기록

Metro가 이전 공개 환경변수를 재사용한 실패는 두 export의 `--clear`로 해결했습니다. 삭제 오류의 E2E strict locator는 설정 모달에 한정했고, HOME 단위 검사 초안은 기존 PAUSE→HOME 규칙에 맞췄습니다. 마지막 손상 proof 감사에서는 자동삭제 차단만으로는 덮어쓰기를 막지 못해 새 판 발급/시작도 명시적 폐기 전 차단했습니다. 상세 설명은 학습노트에 있습니다. 빌드 중 캐시 재생성·NO_COLOR/FORCE_COLOR 안내는 도구 메시지이며 앱 경고와 구분합니다.

**not-run:** 실제 Supabase SQL/RLS/권한·원자성·Auth/익명 가입·서명키·삭제 응답 유실·실서버 속도 제한/CPU/보관 정리, 공개 Pages 배포, iPhone Hermes 진단/Expo Go/Safari/TestFlight·성능·소리·실제100% 사람 완주. Deno45·SQL정적21·별도 Node/Deno/Chromium 골든의 T01 기록은 역사적 결과이며 이번에 서버 수정 없이 재실행했다고 주장하지 않습니다. 신규 dev 진단의 SHA 경계는 Jest에서 Node로 모의했으므로 Hermes 통과가 아닙니다.

여러 브라우저 탭 간 원자적 proof 쓰기는 보장하지 않아 온라인 게임은 한 탭에서 사용하도록 기록했습니다. 만료된 삭제 재시도 JWT의 운영 복구는 T03 확인 대상입니다. npm 설치 감사의 기존 중간등급10개는 그대로이며 이번 Expo Doctor/별도 audit 재실행은 없습니다. GitHub 푸시·실서버/Pages/EAS 배포·스토어 문구 확인은 수행하지 않았습니다.

## 2026-09-22 · P02-T03 로컬 운영 검증 도구 준비

**실제 Supabase 배포/통합 검증은 not_run입니다.** 사용자는 후속 답변에서 Supabase 계정이 없다고 정정했습니다. 서울·Free의 `nyang-staging`/`nyang-production` 분리 승인은 유지합니다. 먼저 가입, 이후 실제 CLI 로그인/조직·슬롯·ref 확인이 필요합니다.

| 이번에 실행한 검사 | 결과 | 증거 범위 |
| :--- | :--- | :--- |
| `test:ranking-tools` |60/60 pass | hosted runner15 + public env45, 네트워크/가상시계 주입, simulated만 해당 |
| `typecheck` / `test:ci` | pass /582/582 |40 suites, 최종43.146초 |
| `ranked:check` / `test:ranking` | pass /184/184 | 규칙 사본8개 일치, 기존12 suites |
| `server:check` / `test:server-api` | pass /45/45 | Deno 타입과 Request/로컬 JWT, 외부 DB/Auth는 모의 |
| `ranked:browser` |3/3 pass | Chromium153.0.8010.12, nyang-v1-2093a8b42d416f8a, Node/Deno/브라우저 수치 일치 |
| `ranking:env-check -- --allow-unconfigured` | pass, local-only | 기존 dist 텍스트3개, 바이너리5개 제외; 새 export/전체 E2E는 미실행 |
| 설정 없는 `ranking:verify -- --environment staging` | 예상 exit2/not_run | DISTINCT_PROJECT_REFS_REQUIRED, 실제 요청/계정 생성 없음 |
| 설정 없는 기본 `ranking:env-check` | 예상 exit1 | 운영 공개 설정 누락을 숨기지 않음 |
| CLI2.117.0 version/deploy/login/db push help | pass | 원격 번들 --use-api, --dry-run/--skip-vault 확인 |
| CLI `projects list` | blocked | LegacyPlatformAuthRequiredError, 로그인 필요 |

도구 검사는 명시적 쓰기 허가/대상 불일치 차단, 실제 엔진 기반 proof 생성, 누적 실제 시간 대기, ACK 변조·재전송, 가입/확정/삭제 실패·응답 유실과 자기 계정 정리, 보고서 비밀값 제외를 확인합니다. 정적 키 검사 오탐(SDK 필드명 상수)은 좁게 수정했습니다. 호스팅 보고서는 항상 `taskComplete=false`이며 미구현 수동 검사는 `not_run`으로 남습니다.

**아직 not_run:** 프로젝트 생성, 실제 SQL 문법 실행/카탈로그 권한/직접 REST·RPC 차단, 동시 트랜잭션·공동순위101명 fixture, 실제 Auth/서명키/탈퇴/호스팅 proof, Gateway·CPU·한도, cron/백업/복구, 실제 staging 웹 연결·통신 복구, production 연결, iPhone/Hermes. 기존 E2E28pass11skip과 SQL 정적21/Doctor는 해당 이전 기록일 뿐 이번에 다시 실행한 증거가 아닙니다. 실제 프로젝트 비밀값·키를 발급/저장하지 않았고 배포·푸시·Task 완료 커밋도 하지 않았습니다.
