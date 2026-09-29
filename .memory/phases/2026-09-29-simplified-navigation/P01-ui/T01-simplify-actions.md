# Task: T01 결과·홈 UI와 첫 닉네임 진입 정리

## Status: done

## Goal

결과 화면은 ‘다시 도전 → 처음으로’ 두 주요 버튼과 사용 가능한 경우 그 아래의 ‘광고보고 일어서기’만 조작 버튼으로 노출한다. 홈의 서비스 버튼은 랭킹·캐릭터·설정만 유지한다. 최초 닉네임을 미룬 사용자는 설정에서 설정할 수 있고, 설정된 사용자는 앱에서 변경 버튼을 볼 수 없다.

## Decision Summary

- 사용자가 승인한 UI 순서·mint 강조·광고 부활 유지·홈 3개 버튼·설정에서만 최초 닉네임 설정·UI 수준 변경 제한을 따른다.
- 서버 `POST /profile`/`rank_upsert_profile`, 랭킹 제출과 pending replay, 프로필 삭제, 해금 공지는 그대로 둔다. 베테랑/iOS 기존 Task와 미커밋 파일은 보존한다.

## Implementation

### I01. 결과 화면과 App 전달 값 간소화

- Related Files:
  - `src/screens/ResultScreen.tsx` :: `ResultScreenProps`, `ResultScreen`, `styles.actions/button/notice` — 주요 두 버튼 순서·스타일, 조건부 부활, 랭킹/서비스 UI 제거; modify
  - `App.tsx` :: `Panel`, `start`, `home`, `revive`, `ResultScreen` 렌더, `share` 관련 불필요한 props/콜백 — 결과 UI 전달값 정리, 내부 `ranking` 동작 유지; modify
  - `src/screens/ShareFeedbackPanel.tsx`, `src/services/share.ts` :: 다른 소비자 확인 후 원본 보존; read-only
  - `src/i18n/ko.ts` :: 재사용할 `retry`, `home`, `revive` 레이블; read-only

#### Details

- **Signatures & Types**: `ResultScreenProps`는 `score:number`, `bestScore:number`, `canRevive:boolean`, `onRetry():void`, `onHome():void`, `onRevive():void`, `newlyUnlocked?: readonly CharacterId[]`, `startBusy?:boolean`만 UI 계약으로 사용한다. 불필요한 `onShare/onSettings/onCharacters/onLeaderboard/onNickname/showNicknamePrompt/submissionState/receipt/onRetrySubmission` 결과 props 제거. App의 `ResultScreen` 호출도 일치시킨다. `Panel`에서 `share`가 더 이상 쓰이지 않으면 제거한다.
- **Data & Schema Fields**: 신규 저장 필드/DB 변경 없음. 점수 `score/bestScore`, 해금 `newlyUnlocked`, 게임 화면 `screen`, 랭킹 제출 상태는 현재 런타임 원본 그대로다.
- **Execution Flow / Logic**:
  1. 결과 카드의 점수·최고기록·해금 공지는 그대로 표시한다. `retry-button`을 `result-home` 앞에 놓고 세로 배치한다. 재도전 배경은 `palette.mint`, 홈은 기존 `palette.paper`를 쓴다.
  2. `canRevive`가 true일 때만 `revive-button`을 홈 아래 같은 너비·높이·간격으로 표시한다. `onRevive`는 기존 광고 상태 전이만 호출한다.
  3. 랭킹 성공/대기/로컬 문구 및 랭킹 재시도와 서비스 버튼은 결과 UI에서 제거하되 `useRankedGame`의 제출·대기 큐는 계속 동작시킨다. `onRetry`의 `startBusy` disabled 상태를 유지한다.
  4. 결과의 공유 진입이 완전히 없으면 App의 미사용 공유 콜백/패널 wiring만 제거한다. `shareScore` 서비스와 테스트는 향후 재사용을 위해 유지한다. 한 화면의 버튼 제거를 서버/공유 서비스 삭제로 확대하지 않는다.
- **Error & Exception Handling**: 랭킹 제출 오류는 결과 UI에서 보여주지 않지만 다음 시작의 기존 `PendingRankingPanel` 경로는 보존한다. 저장 실패/광고 미가용 조건은 기존 동작대로 유지한다.
- **State Transition & Return**: `retry`는 새 시도 시작, `home`은 홈 복귀, `revive`는 지원된 mock 광고만 기존 `REQUEST_AD` 전이. 신규 상태 없음.

### I02. 홈·설정의 닉네임 첫 설정 경로

- Related Files:
  - `src/screens/TitleScreen.tsx` :: `TitleScreenProps`, `TitleScreen` — `nickname/onNickname` 버튼·props 제거; modify
  - `src/screens/SettingsPanel.tsx` :: `SettingsPanel` 온라인 프로필 구역 — `nickname === null`인 경우에만 `onEditNickname`의 최초 ‘닉네임 설정’ 표시, 저장된 이름은 읽기 전용 텍스트; modify
  - `App.tsx` :: `openOnline`, `TitleScreen`, `SettingsPanel`, `NicknameWelcomePanel`, `NicknamePanel` — 설정 전만 닉네임 진입 가능하도록 호출 조건/가드; modify
  - `src/online/useOnlineProfile.ts` :: 서버 프로필 불러오기·첫 저장·삭제 유지; read-only

#### Details

- **Signatures & Types**: `TitleScreenProps`의 `nickname?:string`/`onNickname?():void` 제거. `SettingsPanelProps.nickname?:string|null`/`onEditNickname?():void`는 유지하되 UI 조건을 `!nickname && onEditNickname && !confirming`으로 제한한다. App은 프로필 확인 전 `loading` 상태에서 설정 버튼이 깜빡이거나 편집 진입되지 않도록 상태를 확인한다.
- **Data & Schema Fields**: `online.profile: PlayerProfile|null`의 `nickname:string`이 최초 등록 여부를 표시한다. 온보딩 저장 `handled:boolean`은 기존 AsyncStorage 키를 유지한다. 삭제 뒤 새 익명 신원에서는 `profile=null`로 돌아간다.
- **Execution Flow / Logic**:
  1. 홈에서 `title-nickname`을 제거하고 랭킹·캐릭터·설정만 렌더링한다. `resume`/게임 시작은 유지한다.
  2. 최초 환영 안내의 설정하기/나중에 선택은 유지한다. 나중에를 선택해도 설정 화면에서 `profile`이 없고 온라인 상태가 첫 설정 가능한 경우 닉네임 패널을 열 수 있다.
  3. 등록된 프로필이 있으면 설정에 현재 닉네임을 읽기 전용으로 보여주고 편집 버튼을 숨긴다. App의 `openOnline('nickname')`는 기존 프로필 발견 시 호출을 무시해 숨긴 버튼 외 경로도 방어한다. `deleteProfile` 확인·재시도는 유지한다.
- **Error & Exception Handling**: 온라인 미구성/오프라인에서는 기존 안내·비활성 저장 동작을 유지한다. `loading/deleting` 중 편집 가능한 상태로 오인하지 않도록 한다. 서버 오류가 있어도 기존 프로필을 변경할 수 있게 우회하지 않는다.
- **State Transition & Return**: 최초 저장 성공 후 `online.profile` 갱신 → 설정 버튼 사라짐/읽기 전용 이름만 표시. 삭제 성공 후 새 신원은 다시 첫 설정 가능.

### I03. 테스트·학습 기록

- Related Files:
  - `src/screens/__tests__/nickname.test.tsx` :: 결과 2+조건부1, 홈 3, 설정 최초/기존 분기; modify
  - `src/screens/__tests__/nickname-onboarding.test.tsx` :: ‘나중에’ 후 설정 진입, 결과 안내 제거; modify
  - `src/screens/__tests__/presentation.test.tsx` :: 재도전 disabled와 광고 조건 유지; modify if needed
  - `e2e/result-layout.spec.ts` :: 실제 버튼 순서/전체 너비/간격과 조건부 광고; modify
  - `e2e/online.spec.ts` :: 홈 닉네임 대신 설정에서 가입, UI 문구 제거 후 API 제출/대기 동작 검증; modify
  - `e2e/storage.spec.ts` :: 결과 공유 버튼 의존 검사를 새 UI 부재/저장 회귀 검사로 수정; modify
  - `docs/learning-notes.md` :: 이 변경 이유·상태 흐름·실패/테스트·복습 질문 3개, 기존 미커밋 내용 보존; modify
  - `docs/qa-report.md` :: 자동/브라우저/미검증 기기 결과 추가, 기존 미커밋 내용 보존; modify
  - `tsconfig.json`, `jest.config.cjs` :: 이전 EAS 점검의 ignored `output/` 아카이브가 소스/패키지로 중복 인식되지 않도록 테스트 입력에서 제외; modify
  - `playwright.config.ts` :: `PLAYWRIGHT_WEB_DIR`로 기존 `dist`를 보존한 격리 웹 export를 4173 검사에 사용; modify

#### Details

- **Signatures & Types**: 기존 Jest `render/screen/fireEvent`, Playwright `test/expect`와 `testID`를 그대로 사용한다. DB/API schema 없음.
- **Data & Schema Fields**: 온라인 fixture는 POST profile 한 번과 런 제출 흐름을 유지한다. 캐릭터 해금·점수 필드는 불변.
- **Execution Flow / Logic**: Jest에서 서비스 버튼 부재·색상/순서·조건부 revive·저장 후 편집 부재·삭제 확인을 검증한다. Playwright에서 재도전 첫 행/홈 둘째/광고 조건부 셋째와 모든 버튼의 터치 가능성, 온라인 모의 API 등록·자동 제출·실패 후 다음 시작 처리를 검증한다. `dist`와 fixture export는 현재 사용자 서버를 덮지 않도록 별도 output을 활용하거나 기존 스크립트 동작을 먼저 확인한다.
- **Error & Exception Handling**: 브라우저 테스트가 원격 Supabase에 실제 쓰기를 하지 않도록 `e2e/online.spec.ts`의 simulated API route만 사용한다. 테스트 서버 충돌/오래된 `dist`를 실제 통과로 세지 않는다.
- **State Transition & Return**: 테스트·학습노트가 바뀐 화면의 실제 동작을 기술한다. 기기 QA·TestFlight 재배포는 `not_run`으로 남긴다.

## Acceptance Criteria

- [x] 결과 화면에서 재도전 첫 행 mint, 홈 둘째 행, 조건부 광고 부활 그 아래이며 다른 결과 버튼/랭킹 상태 문구는 없다. 점수·최고기록·해금 공지는 유지한다.
- [x] 홈 서비스는 랭킹·캐릭터·설정만, 닉네임 첫 설정은 환영 안내/설정 미등록 상태에서만 가능하고 등록 후 변경 버튼이 없다.
- [x] 서버 랭킹 제출/대기 처리, 삭제, 해금, 광고 부활이 기존대로 동작한다.
- [x] Jest·타입·ranked sync 및 대상 브라우저 검사 통과, 실제 iPhone QA/재배포 미실행 기록.
- [x] 공유 dirty 변경은 보존하고 이번 Task 범위만 커밋한다. 완료 후 이전 베테랑 T03 포인터로 복귀한다.

## Validation

- `npm.cmd run test:ci -- --runInBand` — 전체 Jest 회귀. (중복 Jest 옵션 충돌 시 `npm.cmd run test:ci` 사용)
- `npm.cmd run typecheck` — TS 계약.
- `npm.cmd run ranked:check` — 게임/서버 규칙 불변.
- `npm.cmd run fixtures:build` — 현재 fixture 재생성 필요 여부 확인; 실행 전 산출 경로 확인.
- `npm.cmd run web:export` — 최신 웹 빌드; 실행 전 `dist` 사용자 산출물 보존 여부 확인, 필요하면 별도 Expo export 경로 사용.
- `npx.cmd playwright test e2e/result-layout.spec.ts e2e/online.spec.ts e2e/storage.spec.ts --project=phone-landscape` — 대상 브라우저 흐름.
- `git -c safe.directory=D:/GrillmeEDU diff --check` — 텍스트 변경.

## Learning

- 배울 개념: UI 버튼을 지워도 비즈니스 로직(랭킹 제출/개인정보 삭제)을 남길 수 있는 계층 분리, 온보딩을 미룬 사용자의 복귀 경로, `loading`과 미등록 `guest`의 차이.
- 예상 디버깅: 오래된 e2e의 `title-nickname`·`result-share` 셀렉터, 결과 랭킹 문구 기대, 기존 서버 없는 local mode, EAS 업로드 당시 dirty source 스냅샷과 ignored `output/` 중복 모듈 탐색.
- 완료 후 질문 3개: 왜 결과 UI에서 랭킹 문구를 빼도 `ranking.start`는 유지하나? 닉네임 설정 버튼을 숨길 때 `loading`과 진짜 guest를 구별하는 이유는? 서버 변경 API가 남아 있으면 ‘변경 불가’의 범위는 어디까지인가?

## Commit Message

```text
feat(ui): simplify result and home actions

Plan: 2026-09-29-simplified-navigation
Phase: P01-ui
Task: T01-simplify-actions

- Prioritize retry and home while retaining conditional ad revive.
- Move first nickname setup into settings and hide rename after registration.
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 — Jest 49/691, typecheck, ranked:check, release 7/7, 격리 웹/fixture export, Playwright phone-landscape 6/6(exit 0), diff --check.
- [x] 학습·QA 기록
- commit: pending
