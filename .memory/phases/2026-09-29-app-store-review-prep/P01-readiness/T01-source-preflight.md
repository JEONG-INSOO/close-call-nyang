# Task: T01 출시 소스·QA 선행 검사

## Status: done

## Goal

새 아이콘, 최신 선택 캐릭터/걸음 UI가 포함될 정확한 소스 집합을 검증하고 선택 커밋한다. 이전 1.0.0(5)의 미커밋 아카이브 문제를 반복하지 않으며 베테랑·기존 iOS QA의 미완료 상태를 정직하게 기록한다.

## Decision Summary
- 최신 게임 변경을 포함하지만 더티 작업 트리 전체는 배포 소스가 아니다. 개인 `test`와 미승인 제안 이미지는 제외한다.
- `store/release-state.json`의 1.0.0(5) 사실은 보존하고 새 빌드 성공 전에 새 빌드 번호로 덮지 않는다.

## Implementation

### I01. 정확한 변경 범위와 테스트
- Related Files:
  - `App.tsx` :: `App` — 홈 선택 캐릭터가 실제 게임 선택과 일치하는지 확인; modify if broken
  - `src/characters/catalog.ts` :: `getSelectableCharacterIds` — 개발 전용 전체 해금이 릴리스에서 닫히는지; modify if broken
  - `src/scene/DiligentSprite.tsx` :: `DiligentSprite` — 4걸음/위험/넘어짐 아틀라스 매핑; modify if broken
  - `src/screens/CharacterSelectPanel.tsx` :: `CharacterSelectPanel` — 미리보기 매핑; modify if broken
  - `src/services/characterProgress.ts`, `src/services/usePreferences.ts` :: 해금·선택 저장 로직; modify if broken
  - `scripts/build-diligent-frames.mjs`, `scripts/build-diligent-four-frames.mjs` :: 자산 재현·검사; modify if broken
  - `assets/characters/diligent/{step-1-v3,step-2-v3,step-3-v3,step-4-v3,alarm-v3,fall-v3,walk-atlas-v4}.png` :: 승인 게임 자산; new/modify
  - `docs/art/source/diligent-four-frame/{frame-1,frame-2,frame-3,frame-4,alarm-expression,fall-expression}.png` :: 위 자산의 재현 원본; new
  - `.easignore` :: archive에서 문서/테스트/비밀 제외; modify if needed, 실제 source runtime이 빠지지 않는지 점검
  - `src/**/__tests__/*.test.ts*`, `e2e/fixtures.spec.ts`, `e2e/layout.spec.ts` :: 해당 소스 계약 테스트만; modify if affected
  - `docs/qa-report.md`, `docs/learning-notes.md` :: 근거/남은 기기 검증; modify selectively
  - `.memory/phases/2026-09-29-veteran-mentor-sprite/P01-character/T03-veteran-qa.md` :: 이전 T03; read-only until its actual acceptance criteria pass
- **Signatures & Types**: 기존 `selectedCharacter: CharacterId`, `getSelectableCharacterIds(completedRuns: number): CharacterId[]`, `DiligentSprite`의 기존 `SceneFrame` 파라미터를 유지. `__DEV__`와 `EXPO_PUBLIC_TEST_UNLOCK_ALL_CHARACTERS`를 함께 만족할 때만 개발 선택지를 확대하며 서버/로컬 `completedRuns`는 변경하지 않는다.
- **Data & Schema Fields**: `CharacterId = 'rookie'|'diligent'|'veteran'`; `completedRuns`는 0..10에 제한된 로컬 정수; `selectedCharacter`는 해금된 ID여야 한다. 랭킹 규칙·증거 스키마는 변경하지 않는다.
- **Execution Flow / Logic**:
  1. `git status`/`git diff`로 파일별 출처와 포함 범위를 확정하고, 승인 PNG만 아틀라스 재생성 원본에 대응시킨다. 자산 해시와 불필요한 미사용 포즈를 점검한다.
  2. 단위·타입·랭킹 동기화·release 검사, 브라우저 fixture와 iOS export를 실행한다. 기존 `dist`/`output`이 사용자 자료면 덮지 않고 별도 검증 출력/포트를 쓴다.
  3. 스테이징에는 정확한 소스/검증 파일만 추가한다. `test`, 제안 초안·외부 비밀, 기존 다른 Task의 문서는 제외한다. `git diff --cached`와 아카이브 입력 목록을 검토하고 소스 커밋을 만든다.
  4. Expo Go/실기기 확인이 부족하면 기존 베테랑 T03를 `in_progress`로 유지하고 새 빌드 T02 QA의 차단 조건으로 명시한다. 이전 iOS P03-T03도 완료로 바꾸지 않는다.
- **Error & Exception Handling**: 테스트 실패/재현 불가 PNG/릴리스에서 개발 해금 노출/원치 않는 파일 stage가 있으면 커밋하지 않는다. 기존 더티 파일은 되돌리거나 일괄 정리하지 않는다.
- **State Transition & Return**: 재현 가능한 커밋 SHA, 검증 명령별 결과와 실기기 미확인 목록.

### I02. 학습 기록
- Related Files: `docs/learning-notes.md` :: iOS 소스 스냅샷 섹션; modify selectively.
- 왜 테스트 성공과 기기 QA가 다른 증거인지, 왜 `__DEV__`가 릴리스에서 해금을 막는지, 왜 현재 Git SHA만으로 이전 build5를 재현할 수 없는지 기록한다.

## Acceptance Criteria
- [x] 릴리스 소스만 선택 커밋 대상으로 정했고 작업 트리의 무관 파일을 보존했다.
- [x] 아이콘/캐릭터·홈·해금/랭킹 검사와 iOS 번들 export가 통과했다.
- [x] 실제 기기 결과를 추측하지 않고 기존 미완료 T03 상태를 보존했다.

## Validation Results — 2026-09-30
- Full Jest: 691/691, 49 suites, exit 0, 40.188s. 개발 플래그가 true여도 `__DEV__=false`면 해금 우회가 닫히는 검사 포함.
- Typecheck exit 0; ranked canonical 8 files/rules `nyang-v1-bc732af6f2a7ea66` 불변; release 8/8; branding 원본 일치 불투명 PNG; diligent `--check` 6 frames + atlas 통과.
- 새 `output/ui-web` export(기존 dist 보존), fixture 최신 빌드. Playwright 5/5, exit 0, 50.1s. 서버를 별도 작업 세션에서 열고 reuse하여 Windows 서버 종료 대기를 해결했다. 최초 4 failures는 옛 veteran SVG 가정/atlas getBBox/WAV5 기대였으며 테스트 계약을 실제 renderer로 교정했다.
- 실제 작은 844×390/667×375 합성 장면 캡처와 veteran 미리보기·위험/컵, diligent 걷기 육안 확인. 실기기/iOS 캡처/FPS 증거가 아니다.
- iOS Hermes export exit 0: `output/release-preflight-ios`, 18 assets, diligent/veteran 각각 atlas 하나. 이 출력은 운영 backend 값 없이 코드/자산 번들 사전 검증이며 새 IPA가 아니다.
- EAS CLI24.7.0 `build:inspect --stage archive` exit0. 검사 사본111파일, 로컬 SHA256 불일치0. 공개 `.env.example` 템플릿만 포함, 실제 .env/인증/비공개 경로0. diligent에는 `walk-atlas-v4.png`만 포함. 캐시 모듈 누락은 isolated output CLI 재설치로 복구했다.
- 학습노트: `docs/learning-notes/2026-09-30-release-snapshot.md`. 이전 베테랑/iOS T03는 기기 QA 미완료로 보존한다.

## Validation
- `npm.cmd run branding:verify` — 아이콘 불투명/원본 일치.
- `npm.cmd run test:ci -- --silent` — 전체 회귀.
- `npm.cmd run typecheck` — 타입.
- `npm.cmd run ranked:check` — 서버 재생 규칙 불변.
- `npm.cmd run test:release` — 프로필·아이콘·문구 제약.
- `node scripts/build-diligent-four-frames.mjs --check` — 아틀라스 원본 재현(옵션은 스크립트 실제 CLI와 일치하는지 먼저 확인).
- `npm.cmd run fixtures:build` 및 `npm.cmd run web:export`, `npx.cmd playwright test e2e/fixtures.spec.ts e2e/layout.spec.ts --project=desktop` — 최신 웹 시각 계약. `dist` 덮기 전 생성물 소유·변경 확인.
- `npx.cmd expo export --platform ios --output-dir output/release-preflight-ios` — 번들만 검증, 설치 증거 아님.
- `git -c safe.directory=D:/GrillmeEDU diff --check`와 `git -c safe.directory=D:/GrillmeEDU diff --cached --check`.

## Learning
- 개념: 버전 제어된 소스 스냅샷, 개발 플래그와 릴리스 빌드 분리, 단위/브라우저/기기 증거의 차이.
- 예상 디버깅: 낡은 `dist`를 새 소스로 오인, 숨긴 PNG가 atlas에 남음, 기존 더티 파일이 의도치 않게 stage됨.
- 복습 질문: EAS archive와 HEAD가 왜 다를 수 있는가? `__DEV__` 검사가 빠지면 10회 해금에 무슨 일이 생기는가? export 통과가 FPS를 증명하지 않는 이유는?

## Commit Message
```text
chore(release): pin validated game snapshot for iOS

Plan: 2026-09-29-app-store-review-prep
Phase: P01-readiness
Task: T01-source-preflight

- Include approved character and home changes with reproducible assets.
- Preserve unrelated work and record remaining native QA.
```

## Progress
- [x] 구현·검증 완료
- [x] 범위 한정 커밋 준비 완료
- commit: `838d7c1`
