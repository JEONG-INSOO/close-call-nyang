# Task: T03 첫 진입 닉네임 입력창
## Status: done
## Goal
닉네임이 없는 첫 진입에 안내 버튼 단계 없이 실제 입력칸을 한 번 표시한다.
## Implementation
- App.tsx onboarding effect에서 guest/ready storage/landscape/title/no pending gates 유지. changePanel('nickname') + onboarding.markHandled(). 기존 profile이면 안내하지 않음. 아직 ready 아닌 loading/deleting/unconfigured에는 계정 생성 UI를 강제하지 않음.
- src/services/nicknameOnboarding.ts key를 close-call-nyang.nickname-onboarding.v2로 올려 과거 안내만 넘겼던 guest도 입력창을 한 번 봄. v1기록/다른 저장소는 삭제하지 않는다.
- NicknamePanel 안내 문구에 ‘닉네임을 설정하면 다음 도전부터 랭킹에 기록을 등록할 수 있어요’ 명시. 닫기로 바로 플레이 허용, 저장 버튼을 누르기 전 익명 가입/네트워크 쓰기 없음.
- 서비스/Jest onboarding 및 e2e helpers의 처리 마커 v2로 갱신, nickname-onboarding browser 검사는 실제입력창/닫기/재진입 미표시/기존 profile 미표시를 검증. 기존 설정 경로 유지.
## Validation
- npm.cmd run typecheck; npm.cmd run test:ci -- --testTimeout=30000
- 새 웹/online 빌드 후 nickname-onboarding E2E. 처음 저장하지 않고 닫아도 게임 시작 가능, 설정에서 추후 설정 가능.
## Learning
한 번 표시했다는 로컬 표식은 서버 프로필이 아니다. 복습: 표식 버전 변경 이유? 가입은 언제 발생? 기존 닉네임 사용자는 왜 예외인가?
## Results
- Jest52 suites/738개 및 typecheck 통과.
- 최신 main/online 웹 빌드 생성, static web 검증 통과. 닉네임3화면과 모의온라인3흐름6pass/6의도적skip. 광고 부활 두 번째proof 제출 포함. small-landscape 캡처에서 입력칸·닫기·스크롤 영역 육안 확인.
- 운영서버는 T02에서 migration202610300001/functionv5 적용·실제smoke 완료. 이 Task는 신규 DB 변경 없음. 새 웹 공개/새 IPA는 아직 미수행.
- 학습노트 docs/learning-notes/2026-10-30-nickname-entry.md. 이전v1 표식과 기존 프로필/점수/캐릭터 보존.
## Commit Message
```text
feat(onboarding): show nickname entry once on first visit

Plan: 2026-10-30-office-events
Phase: P01-game
Task: T03-nickname-entry
```
