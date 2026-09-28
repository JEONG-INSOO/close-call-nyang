# Task: T01 닉네임 첫 안내와 결과 화면 참여 안내

## Status: done

## Goal
설정하지 않은 사용자에게 첫 홈에서 한 번 선택 가능한 안내를 제공한다. 이후 결과 화면에서 설정을 권유하되, 방금 끝난 로컬 기록이 소급 등록된다는 오해를 막는다.

## Decision Summary
- 첫 홈에서 “냥대리의 이름을 정해주세요”와 `설정하기 / 나중에` 제공. 건너뛰면 재실행해도 자동 팝업을 반복하지 않는다.
- 결과 화면은 미설정 시 “닉네임을 설정해 랭킹을 등록해보세요!” 및 “설정 후 다음 도전부터 랭킹에 참여할 수 있어요”. 기존 닉네임 버튼 재사용.
- 기존 서버 검증·익명 프로필 생성 시점·로컬 플레이 유지. 오프라인/서버 장애 때문에 게임을 막지 않는다.

## Implementation

### I01. 안내 이력의 독립 로컬 저장
- Related Files:
  - `src/services/nicknameOnboarding.ts` :: 타입/저장 함수; new
  - `src/services/useNicknameOnboarding.ts` :: 로드 및 세션 이력 hook; new
  - `src/services/preferences.ts`, `src/services/usePreferences.ts` :: 기존 점수/설정/수집 보호 근거; read-only

#### Signatures & Types
```typescript
export const NICKNAME_ONBOARDING_KEY = 'close-call-nyang.nickname-onboarding.v1';
export interface NicknameOnboardingRecord { schemaVersion: 1; handled: boolean }
export interface NicknameOnboardingLoad {
  handled: boolean;
  status: 'ready' | 'memoryOnly';
}
export function parseNicknameOnboarding(raw: string | null): boolean;
export function loadNicknameOnboarding(): Promise<NicknameOnboardingLoad>;
export function saveNicknameOnboardingHandled(): Promise<boolean>;
export function useNicknameOnboarding(): {
  handled: boolean;
  status: 'loading' | 'ready' | 'memoryOnly';
  markHandled(): void;
};
```
- DB/네트워크 없음. JSON에는 schemaVersion와handled만 저장, 닉네임/사용자ID/토큰은 저장하지 않는다. handled는 false→true만 가능하며 온라인 프로필 삭제로 되돌리지 않는다.
- 새 키가 없으면 handled=false/ready. 유효한 schemaVersion1 및 boolean만 허용한다. 잘못된 JSON/타입/버전은 false로 파싱하되 로드만으로 자동 덮어쓰기하지 않는다. 명시적 안내 처리 시에만 true 저장한다.
- 읽기 예외는 false/memoryOnly로 반환하고 자동 팝업을 생략한다. 게임·수동 닉네임 설정은 계속 사용 가능해야 한다. false를 무조건 '첫 실행'으로 해석하지 않는다.
- markHandled는 ref를 먼저 true로 바꾸고 React 상태를 갱신한 다음 단 한 번 저장 요청을 한다. 즉시 UI를 닫을 수 있어야 하며 디스크 응답을 기다리지 않는다. 실패는 memoryOnly로 기록하고 세션의true는 되돌리지 않는다. 실패 시 다음 앱 실행에서 재등장할 수 있다는 한계를 학습노트에 명시한다.
- 로딩 중 markHandled가 호출되면 현재true와로드결과를 OR 병합해서 늦은false가 사용자의 선택을 취소하지 않게 한다. 로드/저장의 결과 경합 시 마지막 저장 상태를 이전 로드가 덮지 않게 sequence 또는 동등한 guard를 둔다. unmount 후 setState 금지, Promise rejection 흡수, module-global 계정 상태 사용 금지.

### I02. 첫 안내 UI와 화면 연결
- Related Files:
  - `src/screens/NicknameWelcomePanel.tsx` :: `NicknameWelcomePanel`; new
  - `App.tsx` :: Panel union / 홈 안내 effect / 패널 이동 / 결과 props; modify
  - `src/i18n/ko.ts` :: 문구; modify
  - `src/screens/SettingsPanel.tsx` :: ServicePanelFrame; read-only, 재사용
  - `src/screens/NicknamePanel.tsx`, `src/online/useOnlineProfile.ts`, `src/online/useRankedGame.ts` :: 기존 기능; read-only

#### Signatures & Fields
```typescript
export interface NicknameWelcomePanelProps {
  visible: boolean;
  onSetup(): void;
  onLater(): void;
}
// App Panel union에 'nicknameWelcome' 추가.
```
- ko 키: nicknameWelcomeTitle='냥대리의 이름을 정해주세요', nicknameWelcomeDescription='닉네임을 설정하고 랭킹에 도전해보세요. 나중에 설정해도 괜찮아요.', nicknameWelcomeSetup='설정하기', nicknameWelcomeLater='나중에', nicknameRankingInvite='닉네임을 설정해 랭킹을 등록해보세요!', nicknameRankingNextRun='설정 후 다음 도전부터 랭킹에 참여할 수 있어요'.
- ServicePanelFrame 사용, testID nickname-welcome-panel. 설정하기 nickname-welcome-setup, 나중에 nickname-welcome-later. 닫기/X/back(onRequestClose)는 onLater와 같다. 버튼 minHeight48 이상, 세로 간격10 이상, 기존 색/타이포/스크롤과 가로 안전영역 사용. 키보드는 안내 표시 시 자동으로 열지 않는다.

#### Execution Flow / Logic
1. 훅을 App 최상위에서 항상 호출한다. 자동 팝업은 onboarding.status='ready', !handled, online.status='guest', online.profile=null, !online.isBusy, !online.deletionPending일 때만 후보가 된다. loading/offline/unconfigured/deleting는 미설정 확정이 아니다.
2. 실제 표시 직전 controller.readState().screen==='title', panelRef.current===null, !portraitBlocked, !ranking.startBusy, !ranking.pendingChoice, !resumeLoading을 다시 검사한다. 저장/프로필 조회를 기다리느라 홈의 게임 시작을 disable하지 않는다. 사용자가 먼저 시작했으면 중간에 띄우지 않고 홈으로 돌아온 시점에만 후보를 다시 검사한다.
3. 같은 App 마운트에서 이미 제시했는지 presentedRef로 동기 방어한다. ref를 true로 설정하고 ranking.cancelStart(), changePanel('nicknameWelcome') 순서로 연결한다. Effect는 프레임 상태 전체가 아닌 홈/프로필/이력/패널 관련 의존성에만 반응한다. 엔진 tick/오디오 변경 없음.
4. `나중에`/닫기: markHandled() 후 closePanel(). `설정하기`: markHandled() 후 changePanel('nickname')로 기존 입력창에 교체한다. 두 Modal 동시 표시 금지. 입력 취소/실패해도 첫 안내를 다시 띄우지 않되 프로필 설정 성공으로 오인하지 않는다. 결과 화면 안내와 수동 버튼은 계속 제공한다.
5. 이미 프로필이 확인된 사용자(online.status='ready' && profile!=null)는 첫 안내 없이 이력만 markHandled()한다. 단, 저장 로드가 ready일 때만 자동 저장해 read failure 내용을 덮지 않는다. 기존 닉네임 사용자에게 처음 팝업이 깜빡이지 않도록 loading 동안 표시 금지.
6. 첫 안내가 열린 동안 다른 경로로 프로필이 확인되면 이력 처리 후 해당 안내만 닫는다. 다른 패널은 닫지 않는다. portrait 전환 시 안내는 숨기고 기존 가로 안내를 가리지 않는다. 실제 선택하지 않았다면 가로 복귀 시 기존 열린 안내만 복원 가능하다.
7. 자동 안내 표시/나중에만으로 ensureGuestSession/saveNickname/서버 쓰기를 호출하지 않는다. 계정 생성은 기존 NicknamePanel의 명시적 저장 경로만 사용한다.

### I03. 결과 화면 안내
- Related Files:
  - `src/screens/ResultScreen.tsx` :: ResultScreenProps/안내 렌더; modify
  - `App.tsx` :: ResultScreen 연결; modify
- `ResultScreenProps`에 `showNicknamePrompt?: boolean` 추가(기본false). App에서 online.status==='guest' && !online.profile && !online.isBusy && !online.deletionPending일 때 true 전달한다. null만으로 판단하지 않는다.
- showNicknamePrompt && onNickname일 때 2줄 문구를 `result-nickname-notice`에 표시한다. 기존 `result-nickname` 버튼 바로 위 서비스 영역에 배치하고 버튼 높이/1행 정렬/간격 유지. 자동 Modal/새 제출 버튼은 추가하지 않는다.
- 기존 '로컬 기록' 설명과 안내가 겹치지 않도록 submissionState==='local' && showNicknamePrompt인 경우 기존 일반 ranking-submission-status 안내는 생략하고 새 안내만 표시한다. pending/recording/submitted/receipt와 재전송 버튼 동작은 그대로 보존한다.
- 프로필 저장 성공 후 안내는 없어져야 하며 로컬 결과 자체를 '등록 완료'로 바꾸면 안 된다. 다음 도전부터 기존 start가 서버 도전 발급을 시도한다. 광고/개발모드/오프라인의 기존 제한 변경 없음.

### I04. 테스트 및 기록
- Related Files:
  - `src/services/__tests__/nicknameOnboarding.test.ts` :: 저장 파싱/실패; new
  - `src/services/__tests__/useNicknameOnboarding.test.tsx` :: 경합/수명; new
  - `src/screens/__tests__/nickname-onboarding.test.tsx` :: 실제 App과 welcome/result 통합; new
  - `src/screens/__tests__/service-panels.test.tsx` :: 결과 상태 회귀; modify if needed
  - 기존 App 관련 테스트는 필요한 경우 명시적 guest/handled fixture만 조정하고 제품 자동안내를 일괄 mock으로 숨겨 회귀를 무력화하지 않는다.
  - `docs/learning-notes/2026-09-28-nickname-onboarding.md` :: 상세 학습 기록; new
  - `docs/learning-notes.md`, `docs/qa-report.md` :: 링크/검증 근거; modify in execution only

#### Test matrix
1. 키없음/true/false/깨진JSON/잘못된타입·버전/읽기·쓰기거절; true저장만 수행, 기존 Preferences/온라인키 건드리지 않음.
2. hook 로드 지연→markHandled→늦은false, 연속처리 중복쓰기 방지, 저장실패 세션유지, unmount후 지연완료, 재마운트 true복원.
3. 깨끗한 저장+guest 홈에서 자동안내 1회. 나중에와닫기 각각 재마운트 후 재등장 없음, 홈수동설정 가능. 점수/음악설정/수집 원본 그대로.
4. 설정하기→기존 nickname-panel(하나만 열림), 저장실패/입력취소→플레이가능·결과안내유지. 성공→안내숨김. 명시적저장 전 서버쓰기0.
5. loading→ready profile, offline/null, unconfigured, deleting 및 저장read실패는 자동안내 없음. 초기loading후guest는 정상표시. 기존프로필은 재등장 억제.
6. 프로필/이력 로드가 플레이/다른패널/세로모드 중 완료돼도 팝업 침범 없음. 홈·가로·빈패널 조건을 만족하면 1회만 제시. 게임시작은 로드로 차단되지 않음.
7. 결과guest에 두 문구/기존설정버튼, 프로필확인되면숨김, 불확실loading/offline은거짓미설정안내 없음. 닉네임저장후에도 방금 로컬 결과가 submitted로 바뀌지 않음.
8. 기존 pending/submitted/receipt/재시도/보상안내/결과버튼1열/오디오/랭킹재현 회귀 통과.
- App 통합 테스트는 기존 settings-and-ad/flow의 가로844x390, RAF 제어, useOnlineProfile mocking을 재사용 가능한 방식으로 구성한다. storage boundary만 Jest AsyncStorage mock 사용. 의도적으로 이력키를 preseed한 기존사용자 시나리오와 fresh키 테스트를 구분한다.

## Acceptance Criteria
- [x] 사용자 선택3개(첫홈1회, 나중에영구억제, 다음도전 안내)가 웹/RN공통코드로 반영된다.
- [x] 기존 사용자/네트워크·저장실패/로드경합이 안내 반복·게임차단·기존데이터손실을 유발하지 않는다.
- [x] 로컬 과거점수 소급등록, 자동계정생성, 기존랭킹·물리 변경 없음.
- [x] 대상·전체회귀/타입/랭킹동일성/릴리스 검증 통과 및 학습노트 실제결과 기록.
- [x] 변경범위만 커밋, current/phase 동기화. 실기기 키보드·레이아웃·성능 미검증을 테스트 통과와 구별.

## Validation
```powershell
npm.cmd test -- --runInBand src/services/__tests__/nicknameOnboarding.test.ts src/services/__tests__/useNicknameOnboarding.test.tsx src/screens/__tests__/nickname-onboarding.test.tsx src/screens/__tests__/nickname.test.tsx src/screens/__tests__/service-panels.test.tsx
npm.cmd test -- --runInBand
npm.cmd run typecheck
npm.cmd run ranked:check
npm.cmd run test:release
git -c safe.directory=D:/GrillmeEDU diff --check
```
- 新 테스트는 수정 전 실패/미구현 근거와 수정 후 통과를 구분해 기록. 기존 ignore 출력사본을 추가하지 않는다.
- 실제 Expo Go/TestFlight에서는 iPhone 가로 키보드 열기/닫기, 나중에 후 재실행, 결과 설정 성공 후 재도전을 사용자와 확인한다. 이 로컬 구현 Task는 실제 기기 완료나 배포완료로 표기하지 않는다.

## Generated artifacts / Deployment
- 엔진/서버/규칙버전 불변: ranked:check만 실행, Supabase 복사본/replay fixture 재생성 불필요.
- 이번 Task는 웹 dist·클라우드 바이너리·공식사이트를 재생성/덮어쓰지 않는다. 공개 갱신은 별도 요청 때 기존 웹 export 또는 EAS production archive검사→새빌드→exactIDsubmit 절차를 수행한다.

## Learning / Debugging
- 독립 저장키는 작은 안내 이력 때문에 기존 점수/수집 전체를 덮어쓰는 위험을 줄인다. 대신 실제 닉네임 설정 여부를 대신할 수 없다.
- profile=null은 '미설정'뿐 아니라 로딩/실패일 수 있다. 명시적 guest 상태와 함께 판정해야 한다.
- 문서에 기록할 질문3개: 안내 처리 이력과 닉네임 유무는 왜 별개인가? 늦은 비동기 응답이 사용자 선택을 취소하지 못하게 하려면? 결과 안내에서 다음 도전을 명시하는 이유는?
- 관련부채 발견 시 이번범위밖은 보고만 한다. 광고/보상아트/서버검증을 임의 수정하지 않는다.

## Commit Message
```text
feat(onboarding): guide nickname setup without blocking play

Plan: 2026-09-28-nickname-onboarding
Phase: P01-onboarding
Task: T01-nickname-onboarding

- Remember the optional welcome prompt locally
- Invite unregistered players to rank on their next run
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 관련38/5스위트, 전체686/48스위트, typecheck, ranked8, release7, diff-check.
- 테스트 작성 중 두 문구 부모 View를 단일 텍스트로 비교해서 처음에 1건 실패. 개별 Text를 조회하도록 수정해 통과.
- commit: this task completion commit
- iPhone 실기기 검증과 웹/스토어 배포는 미실행.
- 범위 밖 발견: `ko.sfxDescription`에 제거된 위험 효과음(“휘청이는 소리”) 언급이 남음. 이번 Task에서 수정하지 않았고 별도 문구 교정 권장.
- 완료 후 이전 `.memory/phases/2026-09-21-close-call-nyang/P03-release/T03-ios-build-validation.md`로 current 복귀. 기존 실기기/출시 Task는 done으로 변경하지 않는다.
