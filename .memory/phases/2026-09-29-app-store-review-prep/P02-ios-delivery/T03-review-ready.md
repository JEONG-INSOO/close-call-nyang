# Task: T03 App Store Connect 심사 직전 상태

## Status: pending

## Goal

최신 검증 빌드를 App Store Connect 앱 버전에 연결하고 필수 가격/국가·한/영 소개·스크린샷·지원/개인정보 URL·연령등급·개인정보 답변을 실제 앱과 맞춰 검토 가능한 상태로 만든다. 사용자의 최종 승인 없이 Submit for Review를 누르지 않는다.

## Decision Summary
- 전 세계, 무료, IAP 없음, 수동 공개, `2026 Insoo Jeong`, 지원 `mocca3232@naver.com`.
- 스토어 소개 문구는 사용자의 마지막 확인 대상이고 Privacy Nutrition Label 답변은 `store/privacy-inventory.md`와 실제 SDK/서버 운영 확인을 기반으로 한다.

## Implementation

### I01. Connect 메타데이터·정책 답변
- Related Files:
  - `store/ko-KR/metadata.json`, `store/en-US/metadata.json` :: 승인 문구; read-only unless user correction
  - `store/release-inputs.json` :: 가격·지역·연락처; read-only
  - `store/privacy-inventory.md` :: 데이터 항목 근거; read-only/modify only for verified changes
  - `store/release-state.json` :: `reviewStatus`, 연결된 buildNumber, `releaseMode`; modify after evidence
  - `docs/ios-release.md`, `docs/learning-notes.md` :: UI 입력/검증 기록; modify selectively
- **Signatures & Types**: Connect 체크 `{field:string, expected:string|boolean, observed:string|boolean|null, status:'passed'|'failed'|'not_run', source:string}`. 기존 `release-state` schemaVersion 1 유지. 비밀 세션/API 토큰·개인 계정 식별자는 저장하지 않는다.
- **Data & Schema Fields**: 가격 `free`, availability `worldwide`, release mode `manual`; locale `ko-KR`/`en-US`; copyright `2026 Insoo Jeong`; support/privacy URLs; iPhone landscape screenshots; `madeForKids:false` 초안은 실제 연령등급 답변과 일치시켜야 한다. 익명 인증 ID·닉네임·점수/사용 데이터·신고·공급자 로그 여부는 App Privacy 질문별로 사실 확인한다.
- **Execution Flow / Logic**:
  1. 사용자가 App Store Connect에 직접 로그인한다. 기존 앱 `6815771701`, bundle ID, 팀을 읽기 확인하고 다른 앱에 입력하지 않는다.
  2. 실제 공개된 support/privacy URL을 브라우저에서 열어 연락처·삭제 안내를 확인한다. 한/영 텍스트를 사용자에게 보여 최종 확인받는다.
  3. 현재 빌드번호를 버전에 연결하고 실제 iPhone 캡처, 설명/키워드/부제, 카테고리, 연령등급, 광고/IAP 없음, 가격/국가, 수동 출시를 저장한다. Apple이 요구하는 추가 개인정보·수출 규정·콘텐츠/권리 질문은 현행 화면과 코드 근거를 대조해 답한다.
  4. App Privacy 답변은 목록대로 소스/서버 확인을 기록하며 '수집 없음'을 자동 선택하지 않는다. 원본 이미지 저작권·게시 권한, 신고/삭제 운영 연락 경로를 확인한다.
  5. 화면의 누락 경고를 모두 검토하고 제출 직전 화면/체크리스트를 사용자에게 공유한다. 이 Task의 기본 종료는 **ready_to_submit**이지 심사 제출/승인/공개 완료가 아니다.
- **Error & Exception Handling**: App Store Connect 접근권한/인증/Apple 서버 오류, 누락 캡처, 법적/개인정보 미확정 답변은 `blocked`로 남긴다. 추측으로 답변하거나 유료 플랜/팀 변경·새 앱 생성·심사 제출을 하지 않는다.
- **State Transition & Return**: 사용자 승인 대기 중인 정확한 제출 후보 버전과 Connect 필드 증거.

### I02. 학습 기록
- Related Files: `docs/learning-notes.md` :: 바이너리/스토어 메타데이터/공개 URL의 독립 배포와 App Privacy 판단; modify.
- 왜 카테고리·가격·출시 모드가 빌드 파일과 별도로 설정되는지, 왜 익명 ID도 수집 데이터일 수 있는지 기록한다.

## Acceptance Criteria
- [ ] 정확한 빌드/앱에 필수 메타데이터·지원/개인정보 URL·실제 캡처가 들어가 있다.
- [ ] 가격·전 세계 지역·수동 출시·연령등급/개인정보 답변의 근거를 확인했다.
- [ ] 사용자가 소개 문구와 제출 전 체크리스트를 최종 검토했고 실제 심사 제출은 별도 승인 전 실행하지 않았다.

## Validation
- App Store Connect 앱/버전 화면 필수 필드/경고 및 빌드번호 readback.
- 브라우저에서 공개 support/privacy URL HTTP/내용 확인.
- `npm.cmd run test:release` — 로컬 메타데이터·브랜딩 제한.
- `git -c safe.directory=D:/GrillmeEDU diff --check`.

## Learning
- 개념: App Store Connect 메타데이터와 IPA의 분리, 데이터 공개표의 실제 수집 기준, 수동 출시와 심사 제출의 차이.
- 예상 디버깅: 다른 ASC 앱 선택, Apple 계정 401, 정책 URL 404, 초안 문구와 버튼 불일치.
- 복습 질문: IPA만 올리면 App Store 공개가 되지 않는 이유는? 개인정보 답변에서 로컬 데이터와 서버 데이터를 왜 나눠 보는가? 수동 공개는 언제 작동하는가?

## Commit Message
```text
docs(store): record App Store review-ready verification

Plan: 2026-09-29-app-store-review-prep
Phase: P02-ios-delivery
Task: T03-review-ready

- Reconcile Connect listing, privacy and release settings with the tested build.
- Record explicit user approval gate before review submission.
```

## Progress
- [ ] Connect 준비·최종 사용자 검토 완료
- [ ] 검증·범위 한정 커밋 완료
- commit: pending
