# Task: T05 종합 학습노트와 인수인계

## Status: pending

## Goal
실제로 구현·검증·제출한 게임의 개발 과정을 하나의 한국어 학습노트에 정리하고, 사용자가 실행·재배포·후속 유지보수를 할 수 있는 문서로 마감한다.

## Decision Summary
- 사용자 요청의 종합 파일은 `docs/learning-notes.md` 하나다. README는 실행 안내와 링크만 두고 학습 본문을 중복하지 않는다.
- 완료 범위는 게임·익명 닉네임/서버 검증 공통 순위·Pages 구성과 실제 검증 및 App Review 제출이다. Apple 심사 승인이나 공개는 별도 외부 상태이며 구현 실적을 지어내지 않는다.

## Implementation

### I01. 누적 증거에 기반한 학습노트 편집

- Related Files:
  - `docs/learning-notes.md` :: 종합 본문·작업 이력; modify
  - `README.md` :: 게임 소개·실행·검증·문서 링크; modify
  - `docs/deployment.md`, `docs/ios-release.md`, `docs/qa-report.md`, `docs/release-record.md`, `docs/leaderboard-operations.md` — 실적·명령·운영·한계; read-only/문서 오류 수정
  - `store/release-state.json`, `store/release-approval.json`, `store/screenshots/manifest.json`, `package.json`, `package-lock.json` — 사실 근거; read-only
  - `.memory/phases/2026-09-21-close-call-nyang/P01-game/phase.md`, `.memory/phases/2026-09-21-close-call-nyang/P02-leaderboard/phase.md`, `.memory/phases/2026-09-21-close-call-nyang/P03-release/phase.md` — 완료 진행률 dashboard; read-only
  - `supabase/`, `.env.example`, `store/privacy-inventory.md` — 실제 backend/API/RLS·키 구분/정책 근거; read-only

#### Details
- **Signatures & Types**: 앱 데이터 모델 변경 없음. 문서 각 작업 기록은 아래 필드와 같은 구조로 작성한다.
  ```typescript
  type LearningEntry = {
    taskId: string; outcome: string; why: string; files: string[];
    validation: { command: string; result: 'passed' | 'failed' | 'not_run'; evidence: string }[];
    pitfalls: string[]; fix: string | null; commit: string | null; remaining: string[];
  };
  type HandoffState = {
    localGame: 'verified' | 'incomplete'; pages: 'prepared' | 'live-verified';
    hostedLeaderboard: 'live-verified' | 'incomplete'; backendUrl: string | null;
    iosBuildId: string | null; appReview: 'submitted' | 'not-submitted';
    appleApproval: 'not-observed' | 'approved' | 'rejected'; publicRelease: 'not-observed' | 'released';
  };
  ```
- **Data & Schema Fields**: null과 not_run은 실적이 없는 경우 그대로 둔다. 실패 사례는 실제 로그/수정이 있었을 때만 기록하고 가상의 회고를 만들지 않는다. 마지막 Task의 자기 commit SHA는 커밋 전 null이며 후속 메모리 동기화에 기록해 무한 amend를 피한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: phase dashboard, Git log, 기존 학습노트/QA/배포 증거에서 P01 6개, P02 3개, P03 T01~T04의 실제 완료/검증/commit을 확인한다. 과거 Task 청사진을 다시 읽어 구현 지시로 적용하지 않는다. hosted 순위 검증, P03-T03 빌드/기기·공통 순위 검증 또는 P03-T04 실제 제출이 미완료면 이 Task의 최종 완료로 덮지 말고 원래 active task를 유지한다. 그동안 누적한 노트는 보존한다.
  2. Core Processing: 노트를 다음 순서로 편집한다: 프로젝트 목표/최신 결정 → grill-me·memory-plan·memory-execute의 역할과 산출물 → Windows/Expo Go/EAS 준비 → 코드 디렉터리/데이터 흐름 → 고정 시간 물리·점수·난이도/15·51·100% → 키보드·멀티터치·정지 → SVG/Reanimated → 저장·오디오·햅틱·공유 → 가상 광고/production 차단 → Supabase 익명 ID/닉네임·중복 이름/프로필 → API·Postgres/RLS·공개 key/서버 secret → server seed와 입력 리플레이·검증 점수/공동 순위 → 오프라인 시작/서버 장애·재시도 → 신고/기본 moderation·데이터 삭제·보존/개인정보 → 테스트/실기기/실제 hosted 증거 → Pages 하위 경로/CORS/공개 문서 → 아이콘·스크린샷/사용자 검토 → EAS 업로드와 App Review → 실제 실패/해결 → 다음에 다시 하는 절차. 각 부분은 관련 소스와 실제 테스트/commit 링크를 포함한다. 입력 리플레이 검증은 임의 점수 조작을 줄이지만 자동 플레이까지 완전히 방지한다고 주장하지 않는다.
  3. Error & Exception Handling: 계획값과 실제 구현값이 다르면 최종 코드·검증 결과를 기준으로 쓰고 변경 이유를 표시한다. 깨진 로컬 링크/옛 제목·bundle·세로 화면·30% 커피·100% 축하 효과, 현재와 맞지 않는 '서버 없음/데이터 수집 없음/온라인 순위 없음' 설명을 교정한다. 과거 결정 인용은 현재 사양과 명확히 분리한다. README의 기존 메모리 워크플로 안내가 유용하면 보존·축약하고 관련 없는 사용자 파일을 삭제하지 않는다.
  4. State Transition & Return: README에는 `npm.cmd ci`, `npm.cmd start`, `npm.cmd run web`, `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npm.cmd run web:export`, `npm.cmd run e2e`, `npm.cmd run ranked:sync`, `npm.cmd run ranked:check`, `npm.cmd run test:ranking`, `npm.cmd run server:check`, `npm.cmd run ranking:env-check`, `npm.cmd run ranking:verify -- --environment staging`의 실제 지원을 확인해 적는다. production verify는 실제 대상에 시험 guest를 만들고 정리하는 명령임을 명시한다. iPhone Expo Go/터미널 로그인, TestFlight 확인, 사용자 Supabase 준비·무료 플랜/일시정지/한도 관리, Pages 최초 설정/사용자 push를 구분한다. 두 공개 Supabase env와 서버 비밀 보관 위치를 설명하되 비밀을 쓰지 않는다. guest 세션의 AsyncStorage/browser storage를 암호화 저장이라고 쓰지 않고, 로컬 저장 삭제·재설치의 복구 한계 및 공동 순위표와 계정 동기화의 차이를 설명한다. 실제 배포 상태·검증한 장치/서버·남은 Apple 처리 상태를 명시한다.

### I02. 완료 상태와 후속 유지보수 정리

- Related Files:
  - `.memory/phases/2026-09-21-close-call-nyang/P03-release/T05-learning-handoff.md` :: Status/Progress; modify at execution
  - `.memory/phases/2026-09-21-close-call-nyang/P03-release/phase.md` :: 5/5 진행률; modify after checks/commit
  - `.memory/plans/2026-09-21-close-call-nyang.md` :: 전체 14/14 완료; modify after checks/commit
  - `.memory/current.md` :: active task 없음·완료 요약·외부 심사 상태; modify after checks/commit

#### Details
- 기존 memory-execute 순서를 따른다: 문서 검증 → 해당 Task done → 지정 commit → commit hash와 상위 phase/plan/current 동기화. 다른 Task를 완료로 소급 조작하지 않는다. Git 작성자/권한 문제로 commit을 못했으면 완료 포인터로 넘어가지 않는다.
- current에는 완료 plan 링크와 실제 제출 시각/버전 및 Apple 심사 결과가 외부 상태임을 남긴다. 존재하지 않는 다음 Task를 만들거나 자동 광고 SDK 추가를 시작하지 않는다.
- 후속 학습에는 실제 광고 도입 시 development build/SDK·보상 callback·개인정보 재검토, 무료 Supabase 한도/일시정지 모니터링·신고 처리·삭제 요청 확인·서버 rules 버전 변경 시 앱 호환 검증을 설명한다. 실제 운영에서 사용하지 않은 백업/모니터링이 이미 준비됐다고 쓰지 않는다. 다음 버전 구현이나 광고 활성화·계정 결제는 수행하지 않는다.
- 최종 사용자 인수인계는 게임 실행 명령, 학습노트 링크, 실제 검증 결과, 심사 접수와 공개의 현재 차이를 중심으로 작성한다. 설명만 준비한 것을 앱스토어 출시 완료로 표현하지 않는다.

## Acceptance Criteria
- [ ] 하나의 학습노트가 세 스킬과 전체 개발 흐름, 이유, 실제 테스트/실패/해결을 설명한다.
- [ ] 처음 보는 사용자가 README의 실제 명령으로 실행하고 관련 검증/배포 문서를 찾을 수 있다.
- [ ] 최종 사양이 냥대리·가로·15% 커피·51% 사무실·100% 색상만·즉시 실패로 일치한다.
- [ ] 익명 닉네임·서버 최고 기록·top100/본인 순위·공동 순위·리플레이 검증·오프라인/삭제와 실제 운영 조건을 재현 가능한 근거로 설명한다.
- [ ] 완료된 구현·실기기 검증·Pages 공개·심사 제출·Apple 승인 상태가 혼동되지 않는다.
- [ ] 검증/커밋 뒤에만 전체 memory 진행률과 current 완료 상태가 동기화된다.

## Validation
- 작업 폴더 `D:\GrillmeEDU`: `npm.cmd run typecheck` 및 `npm.cmd run test:ci` — 최종 근거 확인. 직전 Task와 코드/의존성 변경이 없고 동일 소스의 통과 결과가 있으면 그 결과를 재사용하며 재실행하지 않은 사실을 적는다.
- `npm.cmd run web:verify`, `npm.cmd run branding:verify`, `npm.cmd run store:verify` — 기존 최종 산출물과 문서가 일치. 산출물이 없으면 해당 문서화된 생성 명령을 먼저 실행한다.
- `npm.cmd run ranked:check`, `npm.cmd run ranking:env-check` — client/server kernel·공개 설정 계약과 문서 일치. Node/browser/Deno/Hermes 및 hosted `ranking:verify`는 기존 동일 배포의 증거를 재사용하고 문서 수정만으로 실서비스 write 테스트를 반복하지 않는다.
- `git log --oneline -40` — 14개 Task별 실제 커밋과 노트의 참조 대조.
- `rg -n "김대리|직장인 오래 걷기|closecallkim|세로 고정|30%.*커피|가상 광고.*출시" README.md docs store/ko-KR` — 남은 일치는 과거 변경 이유인지 확인하고 현재 사양 오류만 수정한다.
- 문서 상대 링크의 대상 파일을 직접 확인하고 `git diff --check` — 오류 없음. 문서 전용 수정에 별도 앱 테스트를 새로 만들지 않는다.
- `store/release-state.json`과 실제 `docs/release-record.md`/QA의 접수·backend 근거 대조 — leaderboardQa passed와 appReview submitted, 실제 승인/공개 상태는 관찰값만 기재.

## Commit Message
```text
docs: complete Nyang development learning notes and handoff

Plan: 2026-09-21-close-call-nyang
Phase: P03-release
Task: T05-learning-handoff

- Explain the implemented game and verified release workflow
- Link task evidence and document the actual submission status
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
