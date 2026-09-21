# 아슬아슬 냥대리 QA 기록

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
