# 개인정보 처리 근거 — 공개표 및 버전별 이력

## 최신 상태 — 2026-10-30 업데이트1.0.1
- 빌드104에DEXCONSULTING5초텍스트가상광고/판당1회부활이포함된다. 외부광고SDK·추적ID·별도광고데이터수집추가는없다. 기존공개방침의한영가상광고설명과현재앱소스를대조했다. 기존7유형AppFunctionality/linked yes/tracking no공개표를유지한다. 광고가있다는사실과추적데이터수집은다른질문이다.
- 새편집가능AppInfo의연령설문advertising=true로저장하고관계GET에서재조회했다. 기존출시버전답변은역사로유지한다.
- 승인한한영설명·부활뒤서버검증랭킹·부활없는캐릭터해금조건과심사메모를등록했다. 실제1.0.1/build104 심사제출2026-10-30 17:18 KST,WAITING_FOR_REVIEW. 승인/공개는아직미확인. 상세근거는store/release-update-2026-10-30.json. 아래미제출/광고false는당시기록이다.

## 과거 상태 — 2026-10-01
- 사용자 초안1 승인: 아래7유형 모두 App Functionality/linked yes/tracking no. Apple 게시 확인창의 답변 정확성·법규 준수·처리 변경 시 즉시 업데이트 동의도 별도로 받았다. ASC 실제 게시 완료 문구·7유형 확인, store/privacy-approval.json과 connect-checkpoint.json에 기록했다. 최종 심사 제출 승인이 아니다.
- 승인된 한·영 보완을 web-static/privacy/index.html에 적용했다. 날짜와2문단만 변경, 기존 삭제·보존·연락처 유지. release9/9·페이지 안전22/22·기존dist web:verify 통과. 공식 사이트에 이 보완을 배포/내용 재조회하는 단계는 아직 남았다.
- 아래 초안/미게시/승인 대기는 당시의 검토 이력이다. 제공자 보존기간 미확정 및 표본 한계는 여전히 유지한다.

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

### 2026-09-30 실제 환경 확인 범위

- `scripts/sql/store-privacy-audit.sql`을 production 프로젝트 `fgojrxmpxpzdiwsktjsx`에 SELECT-only로 실행했다. 반환된 감사 로그 집계는 `audit_rows=0`, `any_ip_recorded=null`, `any_account_linked=null`, `any_action_recorded=null`이다. 빈 테이블의 boolean 집계 null은 ‘외부 로그 수집 없음’이 아니다. 원문 IP·사용자 ID·토큰을 출력하지 않았다.
- [Supabase Auth 감사 로그](https://supabase.com/docs/guides/auth/audit-logs)는 외부 저장과 선택적인 DB 저장을 구분한다. [공급자 로그 필드](https://supabase.com/docs/guides/observability/log-field-reference)의 IP·지역·진단 필드 목록은 가능 항목이며 모든 이벤트의 실제 값/수집 여부를 증명하지 않는다.
- 운영 대시보드에서 실제 로그 범위·보존 설정 확인이 남았다. 브라우저 로그인이 풀렸으며 GitHub Supabase OAuth의 이메일 읽기 권한 승인 단계는 사용자에게 인계했다. App Store Connect 수집 유형 선택창은 미저장, 공개표 미게시다. 위치/진단을 추측으로 추가하거나 ‘수집 없음’을 선택하지 않는다.
- Apple 연령등급 저장 승인은 개인정보 공개표 승인이나 최종 심사 제출 승인이 아니다.

### 로그인 후 실제 제공자 로그 대조 — 2026-09-30

- 사용자 직접 OAuth 승인 후 `nyang-production` 프로젝트 ref 일치 확인. Logs/Last 24 hours의 Edge Function 요청10건과 Auth 로그11건 표시를 확인했다. 이 숫자는 조회 시점의 하루 필터 결과이며 총 사용자 수/보존기간이 아니다.
- 실제 게임 `/runs/finalize` 요청의 Raw JSON에서 다음 필드가 비어 있지 않은지 **값을 기록하지 않고** 확인했다: `request.headers.cf_connecting_ip`, `request.headers.x_real_ip`, `request.headers.user_agent`, `request.cf.country`, `request.cf.city`, `request.cf.region`, `request.cf.postalCode`, JWT subject/session_id 및 `execution_time_ms`. 화면 정규화 `client_latitude`/`client_longitude`는 null이었다. 이 표본은 IP 기반 지역 정보의 수집 근거이며 GPS나 모든 요청의 필드 유무를 증명하지 않는다.
- 열람만 했으며 로그/계정/보존 설정 변경 또는 다운로드 없음. 정확한 제공자 보존 기간은 미확정으로 유지한다. 아래 Apple 매핑은 실제 근거와 공식 정의를 대조한 **사용자 승인 대기 초안**이다.

| App Privacy 수집 유형 | 실제 근거 | 목적 | 사용자 연결 | 광고 추적 |
| --- | --- | --- | --- | --- |
| User ID | 익명 Auth UUID, publicId, 닉네임, 인증 로그 subject | App Functionality | 예 | 아니요 |
| Gameplay Content | 온라인 게임 점수·도전 체크포인트/검증 상태 | App Functionality | 예 | 아니요 |
| Product Interaction | 온라인 도전·좌우 입력 검증 기록/전송 | App Functionality | 예 | 아니요 |
| Other User Content | 랭킹 신고의 정해진 사유·접수 정보 | App Functionality | 예 | 아니요 |
| Coarse Location | 제공자 요청 로그의 IP 기반 국가·도시·지역 | App Functionality | 예 | 아니요 |
| Performance Data | 제공자 게임 요청 execution_time_ms | App Functionality | 예 | 아니요 |
| Other Diagnostic Data | 요청 상태/사용자 에이전트·보안/장애 로그 | App Functionality | 예 | 아니요 |

- 익명 계정도 같은 계정에 연결되면 연결 데이터다. 광고/마케팅·행동 분석 용도로 사용하지 않는 현재 코드/운영 범위에 대한 초안이며 향후 SDK·운영 목적 변경 시 재검토한다.
- 정밀 위치·기기 광고ID·개인 이름/이메일/전화번호·사진/영상·충돌 로그 수집을 이 표본만으로 추가하지 않는다. 고객지원 페이지의 외부 이메일 문의와 앱 내 닉네임 신고를 같은 입력으로 취급하지 않는다.
- 로컬 캐릭터·음악/진동 설정·홈 이어가기 저장만으로 서버 수집을 추가하지 않는다. 공개 개인정보 페이지의 제공자 IP/진단 설명과 대략 위치 표현 일치 여부는 게시 전 별도 검토가 남았다.

### 2026-10-01 공개 방침 보완 문구 — 승인 전 초안

기존 방침의 ‘서비스 제공자와 공개 범위’에 아래 문구를 보완할 예정이다. 아직 `web-static/privacy/index.html` 수정·공식 사이트 배포·ASC 공개표 게시는 하지 않았다. 사용자 ‘이어서 해줘’는 준비 계속 요청으로 기록하며 개인정보 선언 게시의 명시 승인을 대신하지 않는다.

한국어:
> Supabase의 서비스 운영 로그에는 IP 주소와 이 주소에서 추정한 국가·도시·지역 등 대략적인 위치 정보, 요청 상태·기술 정보·처리시간, 인증된 요청의 계정 식별자가 포함될 수 있습니다. 이는 인증·보안·남용 방지와 서비스 장애 대응에 사용하며 광고 추적에 사용하지 않습니다. 이 IP 기반 지역 정보는 기기의 GPS 위치를 요청하여 수집하는 정보와 다릅니다.

English:
> Supabase operational logs may include IP addresses and approximate location inferred from them, such as country, city and region, together with request status, technical details, processing time and account identifiers for authenticated requests. These support authentication, security, abuse prevention and troubleshooting, not advertising-based tracking. This IP-derived regional information is different from requesting your device's GPS location.

- 기존 계정 삭제·로컬 저장·보존기간·지원 연락처 설명은 그대로 유지한다. 제공자 로그가 즉시 지워진다고 약속하거나 미확정 보존기간을 새로 단정하지 않는다.
- 공개표 초안7유형, 모두 App Functionality/linked yes/tracking no라는 답변과 이 한·영 보완 문구의 저장·게시 승인을 함께 확인한다. 최종 App Review 제출 승인은 여전히 별도다.

일일 운영 cleanup은 03:15 UTC(12:15 KST); 보존 기간은 즉시 물리 삭제 시각을 뜻하지 않는다. 타사 로그, OS 백업과 삭제 처리까지 확인해야 한다. 서버 키·사용자 토큰을 이 문서/스토어/빌드에 넣지 않는다. App Store 개인정보 설문과 SDK privacy manifest/Required Reason API 검토는 별도다.

공식 기준: [Apple 앱 개인정보](https://developer.apple.com/app-store/app-privacy-details/), [스토어 입력 필드](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information).
