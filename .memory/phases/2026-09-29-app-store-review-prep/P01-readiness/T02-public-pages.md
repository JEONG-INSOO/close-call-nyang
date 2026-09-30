# Task: T02 지원·개인정보 안내 공개 페이지

## Status: done

## Goal

전 세계 사용자가 앱과 App Store의 지원/개인정보 URL에서 실제로 열 수 있는 한·영 안내를 제공하고, 앱의 데이터 처리와 삭제 경로를 코드 근거와 맞춘다.

## Decision Summary
- `mocca3232@naver.com`은 공개 허용된 지원 주소다. 공개 운영자 표기는 `Insoo Jeong`이다.
- 기존 URL `https://jeong-insoo.github.io/close-call-nyang/support/` 및 `/privacy/`는 초안 주소다. 실제 HTTP 확인 없이 활성으로 표시하지 않는다.
- Supabase 익명 인증·닉네임·기록·재생 증거·신고가 있어 `수집 없음`이라고 쓰지 않는다. 실제 보유 기간과 공급자 로그는 검증된 범위만 기재한다.

## Implementation

### I01. 페이지 원본과 빌드 연결
- Related Files:
  - `web-static/support/index.html`, `web-static/privacy/index.html` :: GitHub Pages의 `/support/`, `/privacy/` 정적 페이지; new
  - `scripts/export-web.mjs` :: Expo export 완료 후 공개 페이지를 `dist`의 대응 경로에 안전 복사하는 빌드 흐름; modify
  - `scripts/verify-web.mjs`, `scripts/verify-web.test.mjs` :: base path·내용/링크·민감 정보 미포함 검사; modify
  - `.github/workflows/deploy-pages.yml` :: 기존 Pages export/verify 흐름과 정적 페이지 연결; modify only if necessary
  - `e2e/helpers.ts`, `e2e/nickname-onboarding.spec.ts` :: 배포 CI의 실제 운영 구성에서 첫 안내가 옛 gameplay tests를 가리는 회귀를 복구; modify/new after reproduction, 앱 구현/보상 값은 변경하지 않음
  - `store/privacy-inventory.md` :: 데이터 처리의 기존 근거; read-only, 불일치 시 근거 기록
  - `src/online/client.ts`, `supabase/functions/leaderboard-api/handler.ts`, `supabase/migrations/202609210001_leaderboard.sql` :: 실제 데이터/삭제 흐름; read-only
- **Signatures & Types**: 정적 경로 `support/index.html`, `privacy/index.html`은 UTF-8 HTML. 빌드 헬퍼를 추가하면 `copyPublicPages({sourceRoot:string, outputRoot:string, basePath:string}): Promise<void>`처럼 입력·출력을 명시하고 같은 위치 외 복사를 거부한다. 배포 루트는 `GITHUB_PAGES`일 때 `/close-call-nyang/`을 사용한다.
- **Data & Schema Fields**: 정책 섹션은 `operator`, `contactEmail`, `lastUpdated`, `dataCategories[]`, `purpose`, `storage/retention`, `sharing/serviceProvider`, `deleteHow`, `contact`. 페이지는 한국어/영어를 언어 속성·명확한 전환 링크로 표시한다. 앱 서버 스키마는 변경하지 않는다.
- **Execution Flow / Logic**:
  1. 개인정보 inventory와 실제 저장소/삭제 코드·Supabase 설정을 대조한다. 불확실한 공급자 로그/보유기간은 단정하지 않고 출시 체크리스트로 남긴다.
  2. support에는 문의 이메일, 랭킹/삭제/오프라인 문제 문의 방법을 넣는다. privacy에는 익명 계정이 계정 식별자라는 점, 공개 닉네임/점수, 비공개 플레이 증거, 신고, 기기 로컬 데이터, 삭제 방법과 공급자(Supabase)를 쉬운 언어로 기술한다. 향후 실제 광고가 도입되면 고지/동의와 페이지 개정이 선행되어야 함을 명시한다.
  3. 기존 게임 export가 성공한 뒤 정적 페이지를 `dist`의 두 경로에 포함시킨다. 재실행 시 동일 결과여야 하고 다른 파일은 지우지 않는다. 웹 검증 테스트에 페이지 존재·내부 링크·비밀 값 노출 방지를 추가한다.
  4. 로컬 웹 서버에서 두 URL을 열고 실제 GitHub Pages 배포 후 200/내용/모바일 가독성을 확인한다. 네트워크·권한 실패는 `not_verified`로 남기고 공개 완료라 주장하지 않는다.
- **Error & Exception Handling**: 법적 사실·서버 로그 보유 기간이 불확실하면 임의 작성하지 않고 사용자/운영 설정 확인을 요청한다. 출력 경로가 `dist` 밖이거나 비밀 파일이 발견되면 빌드 실패. `dist` 사용자 변경 여부 확인 전 재export하지 않는다.
- **State Transition & Return**: 소스 페이지, 빌드/원격 URL 검증 결과, 남은 개인정보 응답 근거.

### I02. 학습 기록
- Related Files: `docs/learning-notes.md`, `docs/ios-release.md` :: 데이터 흐름과 URL 검증 차이; modify selectively.
- 로컬 HTML 존재와 실제 GitHub Pages 200의 차이, 공개 닉네임과 비공개 Auth ID의 차이, 앱 삭제와 서버 데이터 삭제의 차이를 기록한다.

## Acceptance Criteria
- [x] 두 경로가 로컬 빌드에서 열리고 한국어·영어·연락처·삭제 경로가 코드와 부합한다.
- [x] 공개 배포 후 실제 URL 200과 내용 검증을 기록한다. 미배포면 Task 완료로 표시하지 않는다.
- [x] 키·토큰·비공개 식별자 및 미검증 보존 약속을 페이지에 포함하지 않는다.

## Validation
- `npm.cmd run web:export` — 정책 페이지 포함 최신 로컬 export.
- `npm.cmd run web:verify` — base/path/HTML 유효성.
- `node --test scripts/verify-web.test.mjs` — 페이지 누락/잘못된 링크/비밀 문자열 회귀.
- `npm.cmd run test:release` — 공개 URL·메타데이터 관계.
- 실제 `https://jeong-insoo.github.io/close-call-nyang/support/` 및 `/privacy/` HTTP/브라우저 검사 — 원격 배포 증거.
- `git -c safe.directory=D:/GrillmeEDU diff --check`.

## Validation Results — 2026-09-30 local milestone
- 한·영 support/privacy 구현, 실제 Auth/DB/삭제 경로 대조. Supabase/GitHub 운영 로그·백업과 지원 메일에는 임의 보관 기간을 약속하지 않았다.
- 새 `scripts/public-pages.mjs`는 고정 소스·출력/심볼릭링크 경계·HTML/링크/비밀 패턴을 검증한다. 기존 dist 보호를 위해 export에 `--output-dir output/...`를 허용했다. `scripts/verify-web.test.mjs`22/22와 release8/8 통과. 이전 verifier의 정책 pending 허용을 제거했다.
- `output/public-pages-web` 운영 공개 설정 export 성공. 웹 정적 검사: JS1/assets18/양쪽 정책/opaque ICO. env 검사10/10. Typecheck/ranked8 통과.
- `e2e/public-pages.spec.ts`6/6,7.5s; 1280×720/390×844/667×375에서 실제 HTML200/영문 anchor/nav44px/overflow 없음. 두 휴대폰 캡처 육안 확인. Playwright 출력 허용목록에 격리 경로를 추가했다.
- 최초 Node 테스트 문법 오류(동기 throws 콜백 안 await) 교정 후 재실행 통과. 알려진 비밀·HTML 안전 패턴 검사는 법률/전면 보안 인증이 아니다.
- 사용자가 이번 커밋의 main push 및 공식 사이트 재배포를 명시 승인했다. 기존 인증/Pages workflow·공개 CI 변수 이름 확인. 배포 및 실제 원격200는 아직 pending이므로 Status는 in_progress다.
- 범위 밖 발견: 앱 개인정보 링크 없음/랭킹 지원은 GitHub 문의. 새 TestFlight 후 캡처 확보라는 계획 의존성도 후속 정리가 필요하다. 학습노트에 남기고 앱 소스는 이번 Task에서 바꾸지 않았다.
- 배포 CI의 browser 단계가 오래 실행되어 운영 설정 로컬에서 held-keyboard test를 15초 제한으로 재현: 첫 닉네임 안내 modal이 시작 버튼을 가려 click timeout. 이전 local-only 빌드는 welcome이 없어 통과했다. 배포 검증 복구에 필요한 test-only 조정으로 공통 gameplay fixture는 returning guest로 준비하고, 실제 ‘나중에’ 클릭/저장/reload/시작/가입 쓰기0는 별도 synthetic-configured test로 검증한다. 실제 게임 안내·인증·캐릭터/점수는 바꾸지 않는다.

## Learning
- 실제 공개 완료: source `fbfd41c`, 배포 test repair `03c67539575b626b798c0326e30bf8e5e884b782`; Actions `36655593459` build/deploy success. support/privacy 모두 HTTP200 UTF-8이고 CRLF 정규화 SHA-256이 저장소 HTML과 일치한다. support `96dcf8deaba317177c592464aff901a5911457dcb05f8f5fb56e509d2ad643a3`, privacy `0be7e56b6b7db7f4a34cd7c17829a309af0f4b0063dd9d1bc9b6ac98507fee98`. 원격 Playwright6/6(16.9s), 세 화면 크기/언어/경로 검증 및 휴대폰 두 캡처 육안 확인. 실제 iPhone 앱 QA/법적 적합성 인증은 아니다.
- CI 첫 실행 `36653859313`는 stale onboarding helper로 지연되어 cancelled 확인했다. 테스트만 수정한 후 운영 구성 전체 Playwright는 46 passed/11 환경별 intentional skips, 3.8m. 실제 새 CI/원격200는 재배포 후 검증한다.
- 개념: 데이터 수집 고지, 공급자와 운영자 역할, 정적 페이지를 앱 번들 배포에 붙이는 방법.
- 예상 디버깅: GitHub Pages의 프로젝트 base path 누락, SPA가 `/privacy/`를 404로 처리, 캐시된 이전 배포.
- 복습 질문: HTML 파일 존재만으로 지원 URL이 유효하다고 할 수 없는 이유는? 익명 로그인도 왜 데이터 처리인가? 서버 삭제와 로컬 삭제는 어떻게 다른가?

## Commit Message
```text
feat(store): publish bilingual support and privacy pages

Plan: 2026-09-29-app-store-review-prep
Phase: P01-readiness
Task: T02-public-pages

- Add code-aligned support and privacy disclosures for global release.
- Verify Pages routes and document remaining provider checks.
```

## Progress
- [x] 구현·검증 완료
- [x] 실제 공개 URL 검증 및 범위 한정 커밋
- commit: `fbfd41c` (구현), `03c6753` (배포 테스트 복구); 완료 기록은 별도 커밋
