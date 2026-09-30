# Decision: 삭제·재설치 테스트 생략 후 App Store 준비

- Date: 2026-09-30
- User request: “삭제 재설치는 하지 않고 배포하자”.
- Scope: 이번 릴리스에서 계정 삭제·앱 재설치 테스트를 실행하지 않는다. 현재 TestFlight 닉네임·최고기록·로컬 진행을 보존하고 staging 재개·추가 계정 생성/삭제를 실행하지 않는다.
- Evidence: 빌드1.0.0(6)의 사용자 확인22개 시나리오만 passed. ACCOUNT_DELETE와 재설치는 not_run/user_skipped로 설명하며 전체 QA 통과로 바꾸지 않는다.
- Feature distinction: 테스트 생략은 계정 삭제 기능 제거가 아니다. 기존 앱/서버 삭제 구현을 유지한다. Apple은 자동 생성 게스트 계정에도 삭제 선택지를 요구한다: https://developer.apple.com/support/offering-account-deletion-in-your-app/ . 현재 실제 삭제 성공은 새로 검증하지 않았다.
- Deployment boundary: 사용자는 출시 진행을 요청했다. 기존 승인된 스크린샷·한국어 description과 기존 빌드를 활용하고, 남은 메타데이터/개인정보/연령등급·실제 빌드 선택·최종 제출 확인은 그대로 확인한다. 미완성 설문을 임의 답변하거나 자동 공개로 바꾸지 않는다.
- Current access: 이번 브라우저에서 App Store Connect 앱6815771701의 distribution을 열자 로그인으로 이동했다. 기존 EAS 업로드와 브라우저 로그인은 별도다. 비밀번호/2FA는 사용자가 공식 Apple 화면에서 직접 입력한다.
- No changes: 게임 코드·계정 데이터·Apple 원격 설정·App Review 제출·새 빌드 변경 없음.
