# Task: T03 한·영 스토어 자료와 캡처 준비

## Status: pending

## Goal

현재 게임과 일치하는 한국어·영어 스토어 소개 초안을 만들고 가격/지역/저작권/지원 정보를 채우며, 새 TestFlight 설치 후 실제 iPhone 가로 캡처를 확보할 촬영 계약을 준비한다. 원본 확보·사용자 최종 승인은 P02의 별도 필수 게이트다.

## Decision Summary
- 전 세계 무료·IAP 없음; 저작권 `2026 Insoo Jeong`; 공개 문의 `mocca3232@naver.com`.
- App Store 소개 문구는 최종 제출 전 사용자 재확인이 필요하다. 사용자가 최신 TestFlight iPhone 가로 원본을 보내고 조수가 규격·편집을 확인하는 방식은 확정했다. 원본 파일은 아직 없으며 새 빌드 후 P02-T02에서 확보한다.
- 2026-09-30 순서 보강: 이 Task는 draft와 촬영 계획까지만 완료할 수 있다. 최종 소개 승인은 P02-T03에 기록하며, 실제 캡처를 빌드보다 먼저 요구하지 않는다. 실제 이미지/승인 없이 최종 심사 준비를 완료할 수 없다는 제약은 유지한다.

## Implementation

### I01. 메타데이터·검증
- Related Files:
  - `store/release-inputs.json` :: `supportEmail`, `copyrightHolder`, `price`, `territories`; modify
  - `store/ko-KR/metadata.json` :: 기존 초안 업데이트; modify
  - `store/en-US/metadata.json` :: 전 세계 기본 영문 소개; new
  - `scripts/release-preparation.test.mjs` :: Apple 필드 길이·URL·언어·표기 일치; modify
  - `docs/learning-notes.md` :: 현지화·메타데이터 근거; modify selectively
- **Signatures & Types**: `ReleaseInputs = {schemaVersion:1,supportEmail:string,copyrightHolder:string,price:'free',territories:'worldwide',appleTeamId:string,ascAppId:string}`. `StoreMetadata = {locale:'ko-KR'|'en-US',name:string,subtitle:string,promotionalText:string,description:string,keywords:string[],primaryCategory:'GAMES',gameSubcategory:'CASUAL',madeForKids:false,supportUrl:string,privacyPolicyUrl:string,status:'draft'|'user_approved'}`. 파일의 기존 필드를 유지하고 테스트에서 허용 길이를 검사한다.
- **Data & Schema Fields**: 이름/부제/키워드/설명은 실제 게임의 좌우 조작, 15% 커피, 51% 사무실, 100% 초과, 캐릭터 해금, 선택형 온라인 Top30과 일치. 광고 부활은 운영 비활성 상태라 출시 기능처럼 약속하지 않는다. 영어를 비영어 지역의 기본 정보로 준비한다.
- **Execution Flow / Logic**:
  1. 기존 한국어 초안과 현재 결과/홈/설정/랭킹 UI를 대조해 삭제된 버튼·광고 기능·닉네임 변경 약속을 없앤다.
  2. 한국어·영어 초안을 작성하고 명칭/부제/키워드 등 App Store Connect 제한과 URL을 검증한다. 소개 문구는 `draft`를 유지하며 사용자에게 최종 텍스트를 보여 승인받기 전 `user_approved`로 바꾸지 않는다.
  3. `release-inputs.json`에 승인된 공개 값만 기입한다. Apple 팀/앱 ID는 기존 실제 값 유지. 국가 목록은 UI에서 전 세계 선택을 실제로 확인할 때까지 문서의 목표일 뿐이라고 구분한다.
- **Error & Exception Handling**: 번역이 화면과 다르거나 정책 URL 미게시면 메타데이터 준비만 표시. 법적·마케팅 표현을 사용자 승인으로 추측하지 않는다.
- **State Transition & Return**: 두 locale의 검증된 초안과 승인이 필요한 문구 목록.

### I02. 실제 캡처 계약
- Related Files: `store/screenshots/README.md` :: 장면·기기·빌드·원본 파일명·승인 체크리스트; modify. `store/screenshots/iphone-landscape/` :: 제공된 원본만 저장; new when user supplies.
- **Signatures & Types**: 캡처 기록 `{file:string,deviceModel:string,iosVersion:string,appVersion:string,buildNumber:string,capturedAt:string,scene:'commute'|'coffee'|'office'|'result',source:'iPhone TestFlight',approved:boolean}`. 원본에 타인 닉네임·비밀키·디버그 오버레이가 없어야 한다.
- **Execution Flow / Logic**: Apple 최신 가로 규격 확인 → 최신 빌드 설치 후 홈/출근/커피/사무실/결과 장면 실제 iPhone 캡처 → 크기·알파·잘림 확인 → 사용자 육안 승인. 웹·fixture·생성 일러스트를 실제 게임 캡처로 대체하지 않는다.
- **Error & Exception Handling**: 원본 미도착/지원 해상도 아님/빌드 식별 불가면 캡처 레코드를 `pending`으로 유지하고 P02-T02/P02-T03를 완료하지 않는다. 이 Task의 촬영 계획 작성과 실제 확보를 혼동하지 않는다. 가짜 이미지 생성 금지.
- **State Transition & Return**: 제출 가능한 실제 캡처 목록 또는 명확한 대기 상태.

## Acceptance Criteria
- [ ] 한·영 초안과 release-inputs가 현재 기능/선택과 일치하고 필드 검사 통과.
- [ ] 실제 iPhone 촬영 계약·장면/기기/빌드/규격 확인 체크리스트가 준비되고 원본 미확보 상태와 P02-T02 후속 게이트가 명시됐다.
- [ ] 최종 소개 문구 확인은 P02-T03의 필수 게이트로 기록하고, 본 Task의 문구는 draft를 유지했다.

## Validation
- `npm.cmd run test:release` — 길이·필드·브랜딩 검사.
- `npm.cmd run typecheck` — 앱 소스와 자료 경계 확인.
- 캡처 README의 장면·실제 원본/기기/빌드·width/height/alpha 체크 계약 확인 — 실제 픽셀 검사는 P02-T02에서 수행한다.
- `git -c safe.directory=D:/GrillmeEDU diff --check`.

## Learning
- 개념: 메타데이터와 실제 기능의 일치, 현지화 기본 언어, 스크린샷의 증거 출처.
- 예상 디버깅: 30자 제한 초과, 미게시 URL, 이전 빌드 화면을 새 빌드로 오인.
- 복습 질문: 영어 소개를 왜 추가하는가? 웹 스크린샷을 iPhone 캡처로 제출하면 어떤 문제가 생기는가? `draft`와 `user_approved`는 왜 구분하는가?

## Commit Message
```text
docs(store): prepare localized listing and device captures

Plan: 2026-09-29-app-store-review-prep
Phase: P01-readiness
Task: T03-store-assets

- Align Korean and English copy with the verified game.
- Record approved release inputs and the post-build iPhone capture contract.
```

## Progress
- [ ] 메타데이터 초안·촬영 계획·후속 승인 게이트 준비 완료
- [ ] 검증·범위 한정 커밋 완료
- commit: pending
