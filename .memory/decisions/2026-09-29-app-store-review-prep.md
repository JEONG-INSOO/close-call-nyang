# Decisions: App Store 공개 심사 준비

- Date: 2026-09-29
- Status: Confirmed for planning; external review gates remain pending

## D01. 목표와 제출 경계
- **Chosen (user)**: 최신 게임과 새 성실한 냥대리 아이콘을 포함해 App Store 공개 심사에 필요한 자료와 빌드를 준비한다.
- **Rationale**: 기존 1.0.0(5)는 EAS 빌드·업로드 완료만 확인되었고 새 아이콘과 이후 UI 변경을 포함하지 않는다. Apple 처리, 실제 설치, 실기기 QA, App Review는 별개다.
- **Gate**: 공개 심사 제출 버튼은 소개 문구·개인정보 답변·실기기 캡처·실제 빌드 QA를 사용자와 최종 확인한 뒤 누른다. 이 결정은 자동 공개 승인이 아니다.

## D02. 가격과 지역
- **Chosen (user)**: 무료, 인앱결제 없음, 첫 공개 지역 전 세계.
- **Rationale**: 구매 흐름이 없는 현재 앱과 일치한다. 전 세계 공개이므로 한국어와 영어의 스토어·지원·개인정보 문구가 필요하다.

## D03. 공개 연락처와 저작권
- **Chosen (user)**: 고객지원 이메일 `mocca3232@naver.com` 공개 허용. 저작권 표기 `2026 Insoo Jeong`.
- **Rationale**: Git 작성자 이메일을 임의 공개하지 않고 운영자가 직접 승인한 연락처를 사용한다.

## D04. 빌드 원본과 기존 진행 작업
- **Chosen (user)**: Expo Go에서 확인한 최신 캐릭터/UI 변경과 새 아이콘을 검증·선별 커밋한 재현 가능한 소스로 새 iOS 빌드를 만든다.
- **Existing code fact**: `.memory/current.md`의 베테랑 `P01-character/T03-veteran-qa.md`는 진행 중이며, 과거 iOS `P03-release/T03-ios-build-validation.md`도 미완료다. 작업 트리에 관련·무관 변경이 섞여 있다.
- **Rationale**: 직전 1.0.0(5)는 미커밋 변경이 아카이브에 포함되어 Git 해시만으로 재현되지 않는다. 기존 QA 기록과 사용자 파일 `test`를 보존한다.

## D05. 스크린샷·스토어 문구·개인정보
- **Chosen (user)**: 최신 TestFlight 앱의 iPhone 가로 화면 원본은 사용자가 촬영·전달하고, 조수는 편집과 App Store 규격·실제 화면 일치 검증을 담당한다. 현재 원본 파일은 없으므로 확보 전 제출하지 않는다. 웹 렌더를 iPhone 실기기 캡처라고 표시하지 않는다.
- **Chosen (earlier user instruction)**: App Store 소개 문구는 최종 제출 전에 다시 사용자에게 확인받는다.
- **Existing code fact**: `store/ko-KR/metadata.json`은 초안이며 영어 현지화가 없다. 예정 지원·개인정보 URL은 실제 공개 게시가 확인되지 않았다. Supabase 익명 인증·닉네임·랭킹/게임 재생 증거를 처리하므로 '수집 없음'이라고 단정하지 않는다.
- **Rationale**: 메타데이터, 데이터 공개, 제출 바이너리 화면이 실제 앱과 일치해야 한다.

## D06. 출시 방식
- **Chosen from existing release state**: `store/release-state.json`의 `releaseMode: manual`을 유지한다. 리뷰 통과 후 자동 공개로 바꾸지 않는다.
- **Rationale**: 전 세계 공개의 마지막 시점을 사용자 통제 아래 둔다. App Store Connect 계정·권한은 실제 로그인에서 확인하며 자격 증명을 채팅/저장소에 받지 않는다.

## Why these choices / 학습 메모
- Expo Go 실행, EAS IPA 빌드, TestFlight 업로드, Apple 처리, App Review는 각각 다른 검증 단계다. 앞 단계의 성공을 뒤 단계의 성공으로 적지 않는다.
- 앱 내부의 개발용 전체 캐릭터 해금은 `__DEV__` 전용이므로 배포 빌드에서도 해금되어 있다고 가정하지 않는다.
- **Out of scope 발견**: 기존 사용자 작업 트리의 여러 변경과 `test` 파일, 오래된 `dist`는 이번 출시 준비라는 이유로 일괄 커밋·삭제하지 않는다. 기존 베테랑 QA의 실제 기기 결과가 없으면 그 Task를 완료로 표시하지 않는다.
