# Task: T03 베테랑 웹·Expo Go 시각 검증과 학습 기록

## Status: in_progress

## Goal

새 베테랑이 실제 작은 가로 화면에서 승인 시안처럼 보이고 4발 교대·표정·컵·보호·부활이 자연스럽게 연결되는지 확인한다. 웹과 Expo Go 증거를 구분해 기록하고, 검증이 끝난 범위만 완료로 표시한다. TestFlight/공식 웹 배포는 하지 않는다.

## Decision Summary

- 외형 승인과 T01 원본 품질, T02 단위 테스트는 실기기에서의 눈/발/컵 가독성이나 FPS를 증명하지 않는다.
- 검증 대상은 `veteran` 한 종의 시각적 결과이며 `rookie`/`diligent`와 0/1/10 해금·물리·랭킹은 회귀 검사만 한다.
- 기존 출시 P03-T03의 iOS 검증은 보존된 별도 작업이다. 이 Task는 로컬 베테랑 확인만 하며 원격 업데이트나 App Review를 승인받은 것으로 해석하지 않는다.

## Implementation

### I01. 브라우저 fixture와 컬렉션 미리보기 검사

- Related Files:
  - `e2e/fixtures.spec.ts` :: 베테랑 54포즈 그리드·장면 검사; modify
  - `e2e/layout.spec.ts` :: 세 캐릭터 미리보기/클립 검사; modify
  - `e2e/fixtures/SceneFixtures.tsx` :: 합성 입력과 폭 844×390 / 667×375; read-only, 필요한 경우에만 수정
  - `src/screens/CharacterSelectPanel.tsx` :: `character-preview-veteran`; read-only
  - `src/scene/VeteranSprite.tsx` :: `veteran-atlas-shift`, `veteran-atlas`; read-only (T02)

#### Details

- **Signatures & Types**: 기존 Playwright `test/expect`와 `Locator` 헬퍼를 사용. `slot: 0|1|2|3|4|5`; 기대 x 이동은 `-slot*380`. `SceneFrame`은 fixture가 합성한 테스트 상태이며 실제 플레이 증거가 아니다.
- **Data & Schema Fields**: fixture는 `characterId='veteran'`, `distanceM:number`, `angleRad:number`, `fallen:boolean`, `hasCoffee:boolean`만 조합한다. 네 걸음 slot은 거리 입력과, 위험 slot4는 ±60°, 넘어짐 slot5는 `fallen=true`와 매핑한다. 서버 프로필/점수 데이터는 만들지 않는다.
- **Execution Flow / Logic**:
  1. `fixtures.spec.ts`의 veteran을 옛 `face-veteran`/`outfit-veteran`/`leg-left` 기대에서 `veteran-sprite`와 클립된 `veteran-atlas` 한 개 검사로 전환한다. `svgTranslateX`를 이용해 걷기/위험/넘어짐 슬롯을 읽는다. Rookie/Diligent assertion은 그대로 둔다.
  2. `layout.spec.ts`의 veteran 미리보기는 SVG 옛 얼굴 대신 아틀라스/고유 `clipPath`와 화면 내 보이는 한 칸을 검사한다. 전체 2280폭 아틀라스의 `getBBox()`는 잘린 슬롯까지 포함할 수 있으므로 이를 캐릭터 실제 폭으로 오판하지 않는다.
  3. 재생성한 fixture와 최신 웹 번들을 실행해 작은 두 가로 폭에서 홈·컬렉션·거리 0/15/51/100m, 젤리, 40° 전후, 넘어짐, 커피, 보호를 스크린샷으로 확인한다. 펜/사원증/올리브 눈이 보이는지, 발이 화면 바닥에 닿는지 확인한다.
- **Error & Exception Handling**: 기존 사용자 서버가 4173/4174에 있으면 무단 종료·덮어쓰지 않는다. 사용 중 서버가 옛 `dist`를 내보내면 통과로 계산하지 말고 전용 포트/빌드 출력으로 옮겨 실제 JS·asset 해시를 확인한다. 밝은 배경에서 PNG 가장자리 검은 후광이나 클립 누출이 보이면 T01/T02로 돌아간다.
- **State Transition & Return**: 브라우저 장면 검증 결과(명령·통과/실패·스크린샷)를 문서에 기록. 라이브 사이트/DB 변경 없음.

### I02. Expo Go 확인과 문서/복귀 기록

- Related Files:
  - `docs/qa-report.md` :: 웹/실기기 결과·미검증 구분; modify
  - `docs/art-direction.md` :: 승인 베테랑 최종 표현·자산 연결; modify
  - `docs/learning-notes.md` :: 변경 이유·실패 해결·복습 질문; modify
  - `.memory/current.md` :: T03 완료 후 원래 P03-release/T03 복귀 포인터; modify only after actual completion
  - `.memory/phases/2026-09-21-close-call-nyang/P03-release/T03-ios-build-validation.md` :: 기존 미완료 출시 QA; read-only, 완료로 바꾸지 않음
  - `.env.local` :: Expo Go 세 캐릭터 테스트 플래그; read-only ignored local setting

#### Details

- **Signatures & Types**: 문서 QA 항목 `{platform:'web'|'Expo Go iOS', build/source identifier:string, scenario:string, observed:string, status:'passed'|'failed'|'not_run'}`. 실제 스키마/API 변경 없음.
- **Data & Schema Fields**: `EXPO_PUBLIC_TEST_UNLOCK_ALL_CHARACTERS=true`는 **개발용** 선택 목록에만 작동하며 10회 달성 저장/실제 릴리스 해금을 바꾸지 않는다. `.env.local`을 Git에 추가하지 않는다.
- **Execution Flow / Logic**:
  1. `npm.cmd run test:ci`, `typecheck`, `ranked:check`, T01 아틀라스 `--check`로 소스 회귀를 확인한다. `fixtures:build`, 최신 웹 export와 `expo export --platform ios`를 별도 ignored `output`에서 확인해 veteran은 단일 아틀라스 자산만 번들에 포함되는지 검사한다. 네이티브 export 성공은 기기 FPS 증거가 아니다.
  2. 사용자가 Expo Go에서 새 소스를 로드해 844×390급 가로 화면에서 베테랑 선택/홈 반영, 걷기 좌·우, 15% 커피, ±위험 기울기, 실패·광고 부활 후 보행 복귀를 확인한다. 사용자가 기기 결과를 주기 전에는 Expo Go QA를 `not_run`으로 남긴다. FPS는 실제 계측 없으면 수치로 주장하지 않고 체감 결과로만 기록한다.
  3. 학습노트에 원본↔아틀라스↔화면 연결, 기존 SVG 테스트를 고친 이유, 기기/웹 차이, 실제 실패·수정·남은 미검증을 남긴다. 완료 후 Plan/Phase/Task 상태와 현재 포인터를 업데이트하고, 중단 전 P03-T03으로 되돌린다.
- **Error & Exception Handling**: Expo Go 연결 실패·기기에서 이미지 미갱신·프레임 드롭 재현 시 `not_run`/`failed`를 그대로 유지하고 원인을 좁힌다. 승인 없는 EAS 빌드/제출, App Store 문구 확정, Pages 배포는 하지 않는다. 기존 더티 QA/learning 문서의 다른 변경을 덮거나 전체 stage하지 않는다.
- **State Transition & Return**: 검증된 로컬 베테랑 외형과 남은 release QA가 명확히 분리된 문서 상태.

## Acceptance Criteria

- [ ] 최신 웹 빌드와 fixture에서 베테랑 4걷기·위험·넘어짐·컵·보호가 두 가로 크기에서 잘리지 않고 보이며 rookie/diligent가 변하지 않는다.
- [ ] 전체 단위/타입/랭킹 재현 검사와 최신 iOS export가 통과한다.
- [ ] 실제 Expo Go 기기 결과가 기록되었다. 사용자 기기 확인이 없으면 Task를 완료했다고 주장하지 않고 `not_run`으로 남긴다.
- [ ] 학습노트·QA 기록과 정확한 Task/Phase/current 포인터가 일치하고, 원래 P03-T03은 여전히 `in_progress`다.

## Validation

- `node scripts/build-veteran-frames.mjs --check` — 자산 재현.
- `npm.cmd run test:ci` — 전체 단위 회귀.
- `npm.cmd run typecheck` — TS/테스트 타입.
- `npm.cmd run ranked:check` — 서버 재생 규칙 복사본 불변.
- `npm.cmd run fixtures:build` — 최신 장면 fixture 재생성.
- `npm.cmd run web:export` — 최신 로컬 웹 번들. 기존 `dist`의 사용자 수정을 먼저 확인하고 생성물일 때만 교체한다.
- `npx.cmd playwright test e2e/fixtures.spec.ts e2e/layout.spec.ts --project=desktop` — 새 fixture/웹 빌드에 연결됐음을 확인한 뒤 실행.
- `npx.cmd expo export --platform ios --output-dir output/veteran-ios` — 로컬 iOS 번들·단일 veteran asset 확인(설치/TestFlight 증거 아님).
- Expo Go 실제 화면 사용자 확인 — 장면·체감 FPS는 이 단계만이 증거.
- `git -c safe.directory=D:/GrillmeEDU diff --check` — 문서/테스트 diff 확인.

## Learning

- 배울 개념: 단위 테스트·브라우저 합성·Expo Go 실기기의 증거 수준 차이, 번들에 미사용 PNG가 안 들어가는 이유, 보이는 캐릭터와 저장 해금 상태의 분리.
- 예상 디버깅: 기존 서버가 옛 번들을 제공, SVG `getBBox`가 숨겨진 아틀라스 전체 폭을 세는 문제, 15% 이후 컵이 앞발과 떨어져 보임, 릴리스 빌드에서 테스트 해금 플래그가 꺼짐.
- 완료 후 `docs/learning-notes.md` 질문 3개: export 통과만으로 iPhone 손맛을 보장할 수 없는 이유는? 아틀라스를 clip으로 자를 때 `getBBox`가 왜 오해를 주는가? 새 스킨을 출시했어도 기존 10회 해금 기록을 유지할 수 있는 이유는?

## Commit Message

```text
test(art): verify veteran mentor across web and Expo Go

Plan: 2026-09-29-veteran-mentor-sprite
Phase: P01-character
Task: T03-veteran-qa

- Check clipped poses on landscape web fixtures and record native evidence.
- Document verified behavior, performance limits and learning notes.
```

## Progress

- [ ] 웹/기기 검증 완료
- [ ] 검증 통과 및 P03 복귀 기록
- commit: pending
