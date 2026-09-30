# Task: T01 앱 개인정보·고객지원 링크

## Status: in_progress

## Goal

설정에서 개인정보처리방침·고객지원 링크를 누구나 열고 기존 랭킹 문의도 공식 지원 페이지를 사용한다. URL 중복·실패 안내를 검증하고 기본 게임/삭제 흐름을 보존한다.

## Decision Summary

- 사용자가 두 설정 링크와 기존 문의 리다이렉션을 승인했다. 선행 공개 페이지 T02의 실제 URL200 확인 후 시작한다.
- OS/웹 외부 브라우저는 `Linking.openURL`로 사용자 탭에서만 연다. Expo Go가 가진 API이며 새 네이티브 SDK를 설치하지 않는다.

## Implementation

### I01. 공통 주소와 UI

- Related Files:
  - `src/config/publicLinks.ts` :: `PUBLIC_LINKS` — 공식 HTTPS 상수; new
  - `src/screens/SettingsPanel.tsx` :: `SettingsPanel` — 설정 마지막의 안내 링크와 독립 오류/열기 상태; modify
  - `src/screens/LeaderboardScreen.tsx` :: `openSupport` — 지역 SUPPORT_URL 제거 후 공유 상수 사용; modify
  - `src/i18n/ko.ts` :: `privacyPolicy`, `supportPage`, `publicPages`, `publicPageUnavailable`, 기존 `supportNotice`; modify
  - `.easignore` :: `/web-static/` — 앱 비런타임 정적 안내 소스 제외; modify
- **Signatures & Types**:
  ```ts
  export const PUBLIC_LINKS = {
    privacy: 'https://jeong-insoo.github.io/close-call-nyang/privacy/',
    support: 'https://jeong-insoo.github.io/close-call-nyang/support/',
  } as const;
  // SettingsPanel 내부: async function openPublicPage(url: string): Promise<void>
  ```
- **Data & Schema Fields**: 화면 로컬 상태 `linkError:string|null=null`, `openingLink:boolean=false`, 재진입 방지 ref boolean. 기존 `SettingsPanelProps`, `Settings`, 온라인 profile/삭제/session/기기 저장 키는 불변. 새 서버 데이터는 없다.
- **Execution Flow / Logic**:
  1. 공통 주소를 위 두 문자열로 고정한다. 사용자 입력이나 env를 URL에 붙이지 않는다.
  2. SettingsPanel의 기존 옵션/온라인 프로필 뒤, 스크롤 내용 안에 ‘안내·문의’ 제목과 ‘개인정보처리방침’, ‘고객지원’ 두 44pt 이상 Pressable을 둔다. guest·닉네임 유무와 무관하게 보이고 `accessibilityRole='link'`/명확한 이름/testID `settings-privacy`, `settings-support`를 사용한다. 새 개인정보 링크가 기존 nickname 조건부 View 안에 들어가 숨지 않게 한다.
  3. 삭제 중 또는 링크가 열리는 동안 중복 탭을 막는다. 탭 즉시 `Linking.openURL(url)`을 호출한다. 실패하면 `publicPageUnavailable`을 별도 alert로 표시하고 재시도를 허용한다. 인증/삭제 오류와 덮어쓰지 않는다.
  4. 기존 `active`/`generation` 패턴으로 닫힌 패널에서 비동기 결과가 상태를 되살리지 않게 하고, 닫힐 때 링크 오류를 초기화한다. 탭없이 mount/render 시에는 외부 URL을 열지 않는다.
  5. 랭킹의 `openSupport`는 `PUBLIC_LINKS.support`로 바꾼다. GitHub 공개문의 경고 `supportNotice`는 ‘문의에 비밀번호·인증 코드·토큰을 보내지 마세요.’로 맞춘다. 기존 신고/숨김/최고 기록 계산은 바꾸지 않는다.
  6. EAS archive에서 정적 페이지 소스를 제외하도록 `/web-static/`만 추가한다. 앱 런타임/아이콘/공유 상수가 제외되지 않게 기존 패턴을 유지한다.
- **Error & Exception Handling**: `Linking.openURL` reject → 새 안내 alert, 정상 재시도 가능. 삭제 busy는 기존 modal 잠금 유지. close/unmount 후 결과는 무시. 네트워크 실패를 랭킹 인증 오류로 기록하지 않는다.
- **State Transition & Return**: idle → opening → idle 또는 error → retry. 성공은 브라우저 호출 접수이지 실제 페이지 렌더/iPhone 복귀 검증이라는 주장이 아니다.

### I02. 테스트·학습

- Related Files:
  - `src/config/__tests__/publicLinks.test.ts` :: 두 URL과 store metadata 공개 경로 계약; new
  - `src/screens/__tests__/service-panels.test.tsx` :: guest/기등록 링크 표시·호출/실패·재시도·busy/close; modify
  - `src/screens/__tests__/leaderboard.test.tsx` :: 문의 클릭은 공통 공식 URL, mount에는 open 없음; modify
  - `e2e/public-links.spec.ts` :: 작은 설정 스크롤·guest 링크·외부 popup URL·기존 profile controls; new
  - `docs/learning-notes/2026-09-30-public-links.md` :: 공유 상수/비동기 UI 오류 경계; new
  - `docs/learning-notes.md`, `docs/ios-release.md` :: 해당 새 문단만; modify selectively
- **Scenarios**: `Linking.openURL` mock resolve/reject; 렌더링만으로 호출0; guest/등록닉네임 모두 두 링크; 삭제busy 호출0; 실패alert 후정상재시도; 닫기/재열기 오류초기화; 랭킹 문의 정확한 support URL; 기존닉네임/삭제 tests 회귀. 브라우저 popup은 URL만 확인하며 외부 계정/점수 쓰기는 없다.
- **Generated Artifacts**: 엔진 불변이라 서버 규칙/리플레이 재생성 불필요. 기존 dist 보호를 위해 공개 환경 값 없이 `EXPO_NO_DOTENV=1` 및 광고·진단false로 `npm.cmd run web:export -- --output-dir output/public-links-web`를 생성, Playwright 허용 출력 경로는 고정 하나만 추가한다. 실제 웹 재배포/IPA 빌드는 원래 출시 계획에서 별도 실행한다.

## Acceptance Criteria

- [ ] guest/등록 사용자 모두 설정에 두 링크가 보이고 랭킹 문의도 같은 support를 연다.
- [ ] 열기 실패/중복/close 경계와 기존 닉네임/삭제 회귀가 통과하고 서버·물리·저장 계약은 불변이다.
- [ ] 타입/전체 회귀/작은 웹 화면 검증·학습노트·범위 한정 커밋. 실제 iPhone은 원래 새 TestFlight QA에서 확인한다.

## Validation

- `npm.cmd run test:ci -- --silent src/screens/__tests__/service-panels.test.tsx src/screens/__tests__/leaderboard.test.tsx src/screens/__tests__/nickname.test.tsx src/config/__tests__/publicLinks.test.ts`
- `npm.cmd run test:ci -- --silent`, `npm.cmd run typecheck`, `npm.cmd run ranked:check`, `npm.cmd run test:release`.
- `npm.cmd run web:export -- --output-dir output/public-links-web` — 프로세스 `EXPO_NO_DOTENV=1`/개발flag false. 운영 설정이 없으면 로컬 모드라고 기록한다.
- `npx.cmd playwright test e2e/public-links.spec.ts --project=phone-landscape` — 위 고정 출력의 별도 서버/reuse로 실제 새 빌드를 확인한다.
- `git -c safe.directory=D:/GrillmeEDU diff --check`/cached check.

## Learning

- 공유 URL 상수가 설정·랭킹·스토어 주소 불일치를 막는 이유, `Linking`이 외부 브라우저를 여는 방법, 오류상태를 인증오류와 분리하는 이유.
- 예상 함정: guest 조건 안에 링크를 넣어 숨김, 비동기 close 후setState, 실제 페이지가 안 열려도 mock 성공으로 iPhone QA를 완료 처리.
- 복습: 외부 링크는 왜 render가 아닌 tap에서 열까? 지원 페이지와 삭제 API의 차이는? 왜 mock/웹 성공만으로 iPhone Safari 복귀를 보장할 수 없을까?

## Commit Message

```text
feat(settings): link official privacy and support pages

Plan: 2026-09-30-store-policy-links
Phase: P01-links
Task: T01-policy-links

- Expose public disclosures in Settings and align leaderboard support.
- Guard browser failures without changing account or game behavior.
```

## Progress

- [ ] 구현·검증·학습 기록 완료
- [ ] 범위 한정 커밋 후 원래 출시 자료 P01-T03로 포인터 복귀
- commit: pending
