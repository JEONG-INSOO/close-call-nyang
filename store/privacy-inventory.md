# 개인정보 처리 근거 — 초안 / Apple 설문 미제출

2026-09-25 소스 기준. 아래 mapping은 검토 후보이며 법률 판단이나 Apple 승인 결과가 아니다. 운영자·연락처와 실제 제공자 보존 정책을 확정하고 지원/개인정보 페이지를 게시한 뒤 다시 검토한다. 익명 로그인이라도 서버 계정에 연결된 데이터를 처리하므로 **수집 없음으로 자동 답하지 않는다**. 현재 출시 프로필은 광고/개발 진단 false이며 추적 SDK를 추가하지 않는다.

## 1. 익명 인증
- data: Auth UUID, access/refresh session, 인증 관련 제공자 메타데이터
- source: Supabase anonymous sign-in
- purpose: 본인 기록 소유권·삭제 권한 확인
- storedWhere: Supabase Auth; 기기 AsyncStorage session (암호화 보장 저장소 아님)
- linkedToAnonymousPlayer: yes
- publicVisibility: 비공개. session/token과 랭킹 publicId는 다르다
- retention: 계정 삭제까지; Auth 운영 로그 정책은 별도 제공자 설정 확인 필요
- deletionPath: `온라인 프로필과 기록 삭제` → 서버 계정 삭제 및 기기 session 정리. 네트워크 실패 시 재시도
- appleQuestionnaireMapping: Identifiers / User ID, App Functionality, linked-to-user 여부 검토; 공개/비공개와 linked 판단은 별개
- evidence: src/online/client.ts (storage, getOnlineClient, getPendingDeletion), supabase/functions/_shared/auth.ts, supabase/functions/_shared/repository.ts

## 2. 온라인 프로필과 최고 기록
- data: 별도 publicId, nickname, updatedAt, score, achievedAt, rank
- source: 사용자 닉네임·서버 검증 결과
- purpose: 공통 Top 30/내 순위, 기록 소유권
- storedWhere: Supabase private schema; 공개 API가 제한된 필드를 반환
- linkedToAnonymousPlayer: yes
- publicVisibility: publicId/닉네임/정수 성공률/순위/달성 시각. Auth UUID/session은 공개하지 않음
- retention: 사용자가 삭제할 때까지 최고 기록 유지; 도전 증거의 24시간/7일 보존과 구별
- deletionPath: 내 온라인 프로필·기록 삭제. 로컬 기록/캐릭터는 유지
- appleQuestionnaireMapping: User ID, User Content (닉네임), Usage Data / Product Interaction (게임 기록) 후보; App Functionality
- evidence: src/online/contracts.ts, supabase/migrations/202609210001_leaderboard.sql, 202609230002_leaderboard_top30.sql

## 3. 도전 검증 데이터
- data: runId/engineRunId, seed, rulesVersion, 체크포인트/입력 digest, seq, 발급·만료시각, 최종 receipt; 전송 입력 spans
- source: 서버 발급 도전·클라이언트 좌우 입력
- purpose: 서버 재현, 점수 조작/중복 등록 방지
- storedWhere: 서버 체크포인트/해시/receipt; raw 입력 proof는 처리 중 사용, 클라이언트 재전송 큐는 기기 저장
- linkedToAnonymousPlayer: yes
- publicVisibility: 비공개 (검증된 최고 점수만 공개)
- retention: 활성/종료 도전 24시간 만료(입력 수락 시 연장), 확정 receipt 7일. 로컬 큐 최대 1MiB/24시간. 만료 후 일일 cleanup에서 정리
- deletionPath: 온라인 삭제 및 서버 cleanup; 정상 ACK 후 로컬 proof 정리
- appleQuestionnaireMapping: Usage Data / Product Interaction, App Functionality/보안 후보
- evidence: src/online/contracts.ts, supabase/functions/_shared/verifyProof.ts, supabase/migrations/202609210001_leaderboard.sql

## 4. 신고
- data: 신고자/대상 플레이어 식별자, 정해진 reason, 접수 시각
- source: 랭킹 사용자 신고
- purpose: 부적절한 닉네임 운영 대응
- storedWhere: Supabase private schema
- linkedToAnonymousPlayer: yes
- publicVisibility: 비공개
- retention: 90일 만료 후 cleanup
- deletionPath: 온라인 삭제의 관련 데이터 정리 및 만료 cleanup. 신고는 즉시 상대 데이터 삭제 명령이 아님
- appleQuestionnaireMapping: User Content / Customer Support 또는 Other User Content 후보, App Functionality
- evidence: src/online/contracts.ts ReportReason, supabase/functions/leaderboard-api/handler.ts, migration rank_cleanup

## 5. 운영 보안 데이터
- data: 해시 기반 요청 제한 bucket, 삭제 재시도 상태·완료 tombstone; 제공자 요청 로그
- source: API 요청/삭제 처리, 호스팅 플랫폼
- purpose: 남용 제한·재시도 안전성·장애 분석
- storedWhere: private DB, Supabase 제공자 로그
- linkedToAnonymousPlayer: bucket 유형에 따라 yes/요청 식별자; 삭제 상태는 yes
- publicVisibility: 비공개; 클라이언트에 내부 식별자/로그를 노출하지 않음
- retention: rate bucket 24시간; 완료 tombstone 최소 7일 및 실제 JWT 최대 수명 경과·Auth 부재 확인 후 cleanup. pending은 완료 전 보존. 제공자 IP/로그 세부 수집·보존은 플랜/설정 확인 필요(정확한 기간 미확정)
- deletionPath: 안전한 cleanup, 제공자 정책 별도. 즉시 모든 운영 로그 삭제를 약속하지 않음
- appleQuestionnaireMapping: Diagnostics / Other Data / Identifiers 수집 여부를 실제 로그 설정 기준으로 추가 검토; 보안/App Functionality
- evidence: supabase/functions/_shared/rate-limit.ts, supabase/functions/_shared/repository.ts, docs/leaderboard-operations.md, docs/ranking-release-handoff.md

## 6. 기기 내 진행과 숨김
- data: local best, 음악/효과음/햅틱, completedRuns(0..10), selectedCharacter, 홈 이어가기 snapshot, 숨긴 publicId 목록
- source: 플레이·사용자 설정
- purpose: 기기 내 편의/수집/랭킹 행 숨김
- storedWhere: AsyncStorage 또는 웹 localStorage; 서버 동기화 없음
- linkedToAnonymousPlayer: 서버 계정에 업로드하지 않음; 숨김 목록은 다른 publicId를 로컬에 참조
- publicVisibility: 비공개
- retention: 앱 저장 데이터 유지 동안. 이어가기/큐의 소비·만료 규칙은 코드에 따름
- deletionPath: 로컬 데이터 초기화/앱 데이터 삭제. 온라인 삭제는 로컬 기록·설정·수집을 삭제하지 않음
- appleQuestionnaireMapping: 기기 밖 전송이 없으면 이 로컬 저장만으로 Apple 수집 항목이라고 단정하지 않음
- evidence: src/services/preferences.ts, src/services/characterProgress.ts, src/services/gameResume.ts, src/online/blockedPlayers.ts, docs/development.md

## 검토 한계와 참조

일일 운영 cleanup은 03:15 UTC(12:15 KST); 보존 기간은 즉시 물리 삭제 시각을 뜻하지 않는다. 타사 로그, OS 백업과 삭제 처리까지 확인해야 한다. 서버 키·사용자 토큰을 이 문서/스토어/빌드에 넣지 않는다. App Store 개인정보 설문과 SDK privacy manifest/Required Reason API 검토는 별도다.

공식 기준: [Apple 앱 개인정보](https://developer.apple.com/app-store/app-privacy-details/), [스토어 입력 필드](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information).
