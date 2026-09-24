# 우당탕탕 냥대리 랭킹 서버 운영 준비

## 최신 확인 — 운영 API smoke 통과, 웹 공개 준비 중

최종 조건별 증거와 남은 출시 범위는 [P03 인계표](./ranking-release-handoff.md)를 기준으로 한다. 이 문서의 날짜별 진행 기록에는 이후 해소된 오류·미검증 상태가 남아 있으며 현재 상태로 해석하지 않는다. 운영자에게 전달할 핵심은 실제 API/권한/자동재전송/cron/합성계정복구가 검증됐다는 점이며, 공개 Pages/iPhone 검증과 법적 운영자·공개 문의처 승인까지 끝났다는 뜻은 아니다.

2026-09-25 최신 복구 상태: Docker는 사용자가 `D:/어치/DockerDesktopWSL`로 이동했고 기존15컨테이너를 유지했다. 독립 로컬 Supabase에서 staging 합성계정1개의 암호화 backup/restore와 실제 Auth 갱신·동일 profile/board·새 정상판 제출·무인증401·삭제까지 통과했다. 원격/로컬 테스트 계정 모두 정리, 격리 서버 종료. 초기 `fetchedAt` 비교 실패와 후속 성공은 둘 다 기록했다. 아래 '아직 생성/복구하지 않았다'는 과거 기록이며 [최신 복구 범위와 보관 정책](./backup-recovery.md)을 우선한다. 운영 전체 재해복구/기기 간 계정 복구 기능/기존 JWT 유지는 주장하지 않는다.

Docker 상태 정정: 기존 사용자별 설치 `C:/Users/mocca/AppData/Local/Programs/DockerDesktop`를 찾고 실행했다. Engine29.7.2 Linux/WSL2 연결 성공, 현재 실행 중 컨테이너0. 설치 여부 질문은 해소됐으며 재설치하지 않는다. 아직 복구용 Supabase는 생성하지 않았다. 아래 Docker 부재/설치 대기는 과거 판단이며 [수정된 복구 절차](./backup-recovery.md)를 따른다.

계정 복구 준비(2026-09-24): staging Auth 사용자·identity·session·refresh0, 게임profile/best/run/report0, pending deletion0/completed17/rate bucket72 및 Auth FK 확인. 이번에는 백업/복원을 실행하지 않았다. Docker Desktop 설치 여부 답변 후 별도 Auth 서비스가 있는 격리 환경을 준비한다. [백업·복구 절차](./backup-recovery.md)에 범위/중단 조건을 기록했으며 승인 전 시스템 변경·계정 생성·클라우드 초기화하지 않는다.

운영 정리 예약 완료(2026-09-24): production `fgojrxmpxpzdiwsktjsx`의 Auth jwt_expiry3600초를 원격 dry-run으로 확인했다. pg_cron 설치 및 `nyang-production-rank-cleanup` job1을 등록했고14:34UTC 실제 예약 run1이 succeeded였다. 최종 스케줄은 active `15 3 * * *`/GMT, 즉 **한국 시간 매일12:15**, 명령은 `select private.rank_cleanup(3600)`이다. 사후 Auth/player/best/run/pending deletion0, 기간이 남은 completed deletion2 보존. 아래 production pg_cron 미설치 기록은 이 결과로 대체한다.

운영별 재설정 파일은 `scripts/sql/ranking-production-retention.sql`이다. **실제 운영 ref·JWT3600 조건·삭제 대상 집계를 다시 확인한 후에만** `npx.cmd --offline --yes supabase@2.117.0 db query --linked --project-ref fgojrxmpxpzdiwsktjsx --file scripts/sql/ranking-production-retention.sql --output json`으로 실행한다. SQL 주석의 ref는 원격 신원 자동검증이 아니므로 CLI 대상을 확인해야 한다. 같은 이름의 다른 명령/소유자/DB job, 검토한 함수 본문 변경, UTC 아닌 cron 시간대는 중단한다. 이 파일은 직접 정리를 즉시 실행하지 않고 일일 예약을 등록한다. 로그인 수명/함수 정책 변경 시 재검토하며 기존 migration을 덮어쓰지 않는다.

실행 이력은 해당 job의 `cron.job_run_details`에서 확인한다. `1 row`는 함수 호출 결과이지 삭제 수가 아니다. 이력 자체는 자동으로 정리되지 않으므로 향후 보관 정책을 별도로 정한다; 이번에는 추가 로그 삭제 작업을 만들지 않았다. [공식 Cron 예약·실행 이력 안내](https://supabase.com/docs/guides/cron/quickstart).

Usage 화면 수신(2026-09-24): 표시된 결제 주기 Free 한도 미초과. DB0.027/0.5GB(5%), Edge437/500000(<1%), egress0.002/5GB(<1%), cached egress0/5GB, MAU0/50000, third-party MAU0/50000, Storage0/1GB, Realtime peak0/200·메시지0/2000000. SSO MAU/Storage Image Transformations는 플랜 미지원. 사용자 캡처 증거이며 조직/ref/기간 필터가 잘려 있으므로 정확한 범위를 추정하지 않는다. 현재 캡처만으로 플랜 변경이 필요하다는 증거는 없으며 과금 설정은 변경하지 않았다. Usage 수신 대기는 끝났고 다음은 운영 정리 예약/JWT 조건 및 데이터·Auth 복구 검증이다.

최신 추가(2026-09-24 14:16UTC): DB 실제 용량 staging11988115bytes/production11578515bytes, 두 환경 Auth0/프로필0. staging 정리 job은 active·매일03:15UTC·JWT3600초 조건이며 production에는 pg_cron이 아직 없다. 운영 예약과 첫 실행은 출시 전 별도 처리한다. 사용자는 조직 Usage 캡처를 다음 채팅에 보내기로 했다. DB 용량 조회를 월간 호출/트래픽/MAU 점검으로 대체하지 않는다.

로컬 PostgreSQL18.6 도구가 `C:/Program Files/PostgreSQL/18/bin`에 있어 staging private/public의 **구조만** 실제 백업→분리된 로컬 DB 복원을 수행했다. 테이블6/RLS6/RPC12와 service_role만 RPC 실행 가능한 권한을 확인하고 임시 서버를 종료했다. 빈 Auth 테이블과 로컬 역할을 합성했으므로 사용자 데이터/Auth/세션·관리형 Supabase 전체 복구 검증은 아니다. 기존 로컬 DB나 production에 복원하지 않는다. 아래 과거의 pg_dump 부재 문장은 PATH 점검만으로 내린 판단이며 이 확인으로 정정한다.

2026-09-24 운영 ref `fgojrxmpxpzdiwsktjsx`의 migration/catalog/Top-30/API v1 배포와 실제 smoke14개가 통과했다. 보고서 `output/ranking-production-14c82633-59f9-42b2-87d4-f82a739f651b.json`에서 테스트 Auth 두 계정의 삭제/재시도, cleanupRequired0, signupResponseUncertain=false를 확인했다. 운영 공개 GET은 Pages Origin으로200이었다. 아래의 production 미배포 문장들은 이전 점검 시점의 기록이다.

같은 후속 점검에서 staging503을 발견해 staging의 환경값과 허용 Origin만 `staging` 및 `http://127.0.0.1:4173,http://localhost:4173`로 복구했다. 두 Origin 모두200/CORS/규칙 일치를 확인했다. salt와 운영 설정은 유지했다. 이후 테스트는 staging을 사용하고, 운영 설정을 staging에 복사하지 않는다. 로컬 웹 준비는 통과했지만 Pages는404/공개 변수미설정이며 Usage·백업복구 등 운영 검증이 남아 있다.

14:02UTC 실제 staging Chromium 검증에서 오프라인 중 종료된 판이 재연결 후2012ms에 자동으로 등록됐다(수동 재시도0, 실제 chunk/finalize200, 점수0 일치, proof 삭제). `output/staging-browser-auto-retry-20260924.json`에8개 통과와 cleanupRequired0을 기록했다. 생성한1개 계정은 설정 UI의 DELETE200/deleted=true, 로컬 세션 삭제, 같은 토큰 DELETE200 재시도 및 Auth403으로 정리를 확인했다. 모달이 닫힌 것만으로 삭제 성공이라고 판단하지 않는다. 이전 자동 재시도 미검증 기록은 이 증거로 대체하며, 전체 사용자 테이블0을 주장하지 않는다.

## 현재 상태 — staging 배포·부분 검증, production은 준비만 완료

2026-09-23부터 공개 보드 계약은 상위 30명과 별도 `me` 순위다. 기존 101명/top-100 fixture 기록은 migration 이전의 역사적 증거이며, 현재 경계는 `scripts/sql/ranking-staging-fixtures-top30.sql`의 31명 rollback fixture로 검증한다.

2026-09-22 사용자 선택1로 기존 프로젝트 재사용을 승인받았습니다. 단일 조직 `Jeong Insoo`의 실제 plan=free/Owner1명과 기존 프로젝트1개를 확인했고, 재사용 전 public/private 사용자 객체·Auth/스토리지 데이터·Edge 함수가 없음을 조회했습니다. 기존 프로젝트를 nyang-staging으로 개명하고 새 nyang-production을 같은 서울 리전에 생성했습니다. 유료 옵션/요금제 변경은 없습니다. staging에는 랭킹 migration/API를 적용했으며 실제 호스팅 검증은 진행 중입니다. production은 생성만 했고 랭킹 서버는 아직 배포하지 않았습니다.

확인된 조직은 `oxbvynubycrowcazoqzx`입니다. 아래 ref가 실제 운영 대상입니다. 둘을 혼용하지 않으며 이제 무료 활성 프로젝트2개를 사용합니다.

| 운영 항목 | staging | production |
| :--- | :--- | :--- |
| 프로젝트 이름(승인) | nyang-staging | nyang-production |
| ref / 실제 URL / 생성 | tadokcpealpwjfyjovuy / https://tadokcpealpwjfyjovuy.supabase.co / 기존 재사용 | fgojrxmpxpzdiwsktjsx / https://fgojrxmpxpzdiwsktjsx.supabase.co / 새 생성 |
| 조직·리전·요금제 실확인 | 위 조직 / ap-northeast-2 / Free | 동일 조직 / ap-northeast-2 / Free |
| 승인된 목표 | 서울 / Free | 서울 / Free |
| 공개 origin | http://127.0.0.1:4173 | https://jeong-insoo.github.io |
| 배포·실제 권한/재생 검사 | migration/API·카탈로그·실제 HTTP smoke 통과, 추가 검증 진행 중 | 생성만 완료 / 배포·통합 not_run |

production DB 비밀번호는 무작위 생성 후 **Windows 자격 증명 관리자**의 `Nyang Supabase DB:oxbvynubycrowcazoqzx/nyang-production`에 보관했습니다(user postgres, UTF-8 blob). 값은 채팅/Git/환경 파일에 넣지 않았습니다. 기존 staging DB 비밀번호는 변경하지 않았습니다. CLI 인증은 별개의 Supabase CLI 자격증명으로 메모리에서만 공식 API에 사용했습니다. 두 `.env.ranking.*`는 Git 제외이며 공개 URL/publishable key만 포함합니다.

프로젝트 ref는 이름과 다릅니다. GitHub 이름으로 추정하거나 예제 ref에 배포하지 않습니다. 계정에 Free 슬롯이 없으면 멈추며 다른 프로젝트를 정지/삭제하거나 요금제를 바꾸지 않습니다.

## 인증과 배포 전 확인

가입과 CLI 로그인은 이번 목록 조회 성공으로 확인됐으므로 다시 요청하지 않습니다. 계정 가입 완료와 CLI 로그인 완료는 별개이며, 게임 이용자에게 Supabase 운영자 계정 가입을 요구하는 것은 아닙니다.

CLI2.117.0의 실제 `--version`/`functions deploy --help`/`db push --help`를 확인했습니다. 이전 `LegacyPlatformAuthRequiredError`는 사용자 로그인 뒤 해결됐습니다. 조직 명령은 `organizations`가 아니라 실제 help의 `orgs list`입니다. 비밀번호·PAT·DB 접속 문자열·서버 키는 채팅에 붙이지 않습니다.

```powershell
npx.cmd --yes supabase@2.117.0 login
npx.cmd --yes supabase@2.117.0 projects list
npx.cmd --yes supabase@2.117.0 orgs list
```

기존 프로젝트의 게임용 여부 확인 후 조직 요금제와 무료 슬롯을 읽기 전용으로 확인합니다. orgs list에는 plan이 없으므로 Dashboard Billing 또는 [조직 조회 API](https://supabase.com/docs/reference/api/v1-get-an-organization)의 plan을 확인합니다. [무료2개 제한](https://supabase.com/docs/guides/platform/billing-faq)은 Owner/Admin의 다른 조직·다른 멤버 할당량 영향도 있으므로 보이는1개만으로 슬롯1개가 남았다고 확정하지 않습니다. 새2개를 무조건 추가하지 않습니다. DB 비밀번호는 사용자가 비밀번호 관리자/보호된 로컬 설정으로 관리하고 명령 문자열·로그에 넣지 않습니다. 생성 명령을 예제 ID로 실행하지 않습니다.

staging 우선 절차:

1. 정확한 ref·URL·실제 서울 리전·Free를 기록합니다. 새 전용 DB 여부, 기존 스키마/함수와 충돌 여부, migration 이력을 확인합니다. `private`는 공용 이름일 수 있으므로 다른 앱 DB를 선택하지 않습니다.
2. `npm.cmd run ranked:check`, `test:ranking`, `server:check` 통과를 확인합니다. 직접 서버 생성 사본을 편집하지 않습니다.
3. 명시적으로 ref를 연결한 뒤 대상과 migration 목록을 다시 확인합니다. 아래 `$nyangProjectRef`에는 실제 확인된 staging ref만 사용합니다.

```powershell
npx.cmd --yes supabase@2.117.0 link --project-ref $nyangProjectRef
npx.cmd --yes supabase@2.117.0 db push --project-ref $nyangProjectRef --dry-run --skip-vault
# 대상/목록을 확인하고 승인 범위의 migration만 적용
npx.cmd --yes supabase@2.117.0 db push --project-ref $nyangProjectRef --skip-vault
npx.cmd --yes supabase@2.117.0 functions deploy leaderboard-api --project-ref $nyangProjectRef --use-api
```

`--use-api`는 실제 help에서 확인한 서버 측 번들 옵션입니다. 이 Edge 배포는 Docker 없이 가능하지만 로컬 Supabase 전체 스택·CLI `db dump`까지 Docker 없이 된다는 뜻은 아닙니다. `db reset`, `--prune`, `--include-all`, `--include-seed`를 여기서 사용하지 않습니다. [공식 배포](https://supabase.com/docs/guides/functions/deploy), [CLI 배포 옵션](https://supabase.com/docs/reference/cli/supabase-functions-deploy).

4. Auth 익명 로그인을 활성화하고 실제 호출 제한과 서명키를 확인합니다. DELETE 재시도는 ES256/RS256와 실제 JWKS가 필요하며 HS256 fallback은 구현하지 않았습니다. CAPTCHA를 켜려면 앱에 실제 검증 토큰 흐름부터 구현해야 합니다. 지금은 그 기능이 없으므로 대시보드 설정만 켜거나 가짜 토큰을 넣지 않습니다. [익명 인증](https://supabase.com/docs/guides/auth/auth-anonymous), [호출 제한](https://supabase.com/docs/guides/auth/rate-limits).
5. 사용자 설정은 서버에만 `RANKING_RATE_LIMIT_SALT`(충분한 무작위32자 이상), `RANKING_ENVIRONMENT=staging`, `RANKING_ALLOWED_ORIGINS`를 설정합니다. 값을 stdout/명령 기록에 출력하지 않습니다. Supabase의 `SUPABASE_*`는 hosted 런타임 자동 주입 예약 이름으로 Secrets에 다시 만들지 않습니다. [환경변수](https://supabase.com/docs/guides/functions/secrets).
6. `index.ts`는 legacy `SUPABASE_SERVICE_ROLE_KEY`를 읽습니다. 이번 staging의 실제 API·SQL·Auth 삭제가 성공해 자동 주입 키가 동작함을 확인했습니다. 키값 조회/재활성화/인증 완화 없이 사용했으며 새 키 어댑터는 필요하지 않았습니다. 향후 legacy 비활성화 시 서버 어댑터와 실제 검사를 먼저 준비합니다. [공식 키 구분·변경](https://supabase.com/docs/guides/getting-started/api-keys).
7. `verify_jwt=false`는 공개 GET/OPTIONS를 handler까지 보내기 위한 설정입니다. 보호 요청의 `auth.getUser`, 직접 쓰기 차단과 CORS 검증은 유지합니다. Origin 없는 native에도 인증은 필수입니다.
8. staging의 자동/수동 증거가 모두 확인된 뒤 같은 migration/규칙 버전을 production에 적용합니다. 테스트와 production을 같은 ref로 사용하지 않습니다.

## 두 로컬 검증 도구

### 2026-09-22 실제 staging 증거

migration202609210001과 leaderboard-api가 배포됐다. 빈 DELETE 스트림 수정 후 실제 smoke14개가 통과했으며 익명Auth/JWKS와 legacy 서버 키가 정상 동작했다. 서버 환경은 staging, 허용origin은 http://127.0.0.1:4173 및 http://localhost:4173, Auth JWT3600초·익명 가입30회/시간·CAPTCHA false다. 기존 CAPTCHA를 끈 것이 아니며 봇방지 완료로 설명하지 않는다.

`scripts/sql/ranking-hosted-audit.sql`은 실제6테이블/12RPC/8helper 권한을 읽기 전용 확인했다. staging 전용 `ranking-staging-permission-negatives.sql`은 실제 역할별96개 거부를 실행했고, 마지막 ROLLBACK 뒤 `assertionsPassed=true`, `rollbackCompleted=true`, `intentGucsCleared=true`를 확인했다. `ranking-staging-fixtures-top30.sql`은31명 합성 공동순위/top30/내31위를 검증한다(기존 `ranking-staging-fixtures.sql`의101명/top100은 역사적 증거). 두 파일은 승인된 정확한 staging ref를 확인하고 **전체 단일 배치**로 실행한다. 사용자 정의 트리거가 있으면 중단하며 production에는 실행하지 않는다. SELECT 보고서만 따로 실행하면 거짓 증거가 된다.

Windows npx.cmd의 다중행 위치 인수는 빈 결과를 반환해 통과로 인정하지 않았다. 공식 [SQL 실행 API](https://supabase.com/docs/reference/api/v1-run-a-query)에 UTF-8 JSON 단일 배치로 보내 실제 결과를 받았다. 인증은 기존 CLI 자격증명을 메모리에서만 사용했으며 파일/출력으로 복사하지 않았다. SQL 파일을 임의로 COMMIT하거나 스키마 노출을 늘려 검사하지 않는다.

최종 Auth/프로필/점수/판/신고 행은0이며 두 번의 smoke 게스트4명이 삭제됐다. completed tombstone4는 의도적인 재시도 보관이고 pending은0이다. 현재 cron은 없고 실제 최대 JWT3600초를 반영한 예약·실행/보관 검사가 다음 작업이다. 조직 entitlement의 로그 보관1일/자동백업 비활성도 확인했다. Gateway IP 신뢰·호출비용·실제 웹·동시성/만료·production 검증은 아직 남아 있다. [공식 XFF 안내](https://github.com/orgs/supabase/discussions/7884)는 헤더 제공을 설명하지만 현재 hosted 마지막hop 위조 방어 보장의 증거로 대체하지 않는다.

환경 파일은 자동으로 읽지 않습니다. `.env.example`을 참고해 각각 무시되는 `.env.ranking.staging`/`.env.ranking.production`에 **공개 값과 대상 메타데이터만** 기록합니다. 프로세스 환경변수가 파일보다 우선하므로 이전 세션의 값이 남아 있다면 먼저 확인합니다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://실제ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=실제_sb_publishable_공개키
EXPO_PUBLIC_ENABLE_MOCK_AD=false
EXPO_PUBLIC_REPLAY_DIAGNOSTICS=false
RANKING_ENVIRONMENT=staging
RANKING_PROJECT_REF=실제stagingref
RANKING_OTHER_PROJECT_REF=실제productionref
```

예제 값은 실행에 사용할 수 없습니다. 위 파일에 service-role/secret/PAT/DB 비밀번호는 필요하지 않습니다. CLI 인증은 별도 로컬 로그인으로 관리합니다. 파일을 복사해 넣어도 Expo가 `.env.ranking.staging`을 자동 선택하는 것은 아닙니다. 실제 웹 빌드에는 선택한 공개 URL/key를 빌드 환경에 명시적으로 주입하고 `web:export`를 다시 실행해야 합니다. CI/EAS 주입 파일은 P03에서 만듭니다.

```powershell
npm.cmd run test:ranking-tools
npm.cmd run ranking:env-check -- --env-file .env.ranking.production
npm.cmd run ranking:verify -- --environment staging --project-ref $nyangProjectRef --env-file .env.ranking.staging --allow-test-writes
```

- `ranking:verify`: 환경·정확한 ref·서로 다른 상대 ref·HTTPS 프로젝트 호스트·공개키를 확인합니다. `--allow-test-writes` 없이는 어떤 요청도 보내지 않습니다. 준비가 부족하면 exit2/`not_run`이며 통과가 아닙니다. 이 플래그는 임시 두 Auth 계정과 공개 닉네임 생성, 진짜 규칙 재생 제출, 자기 프로필 삭제를 허용하는 선택입니다. production도 별도 ref와 명시적 플래그로 실행해야 합니다.
- 판은 서버가 발급한 seed/ID로 직접 재생합니다. 서버 수신 후 monotonic 시간으로3초 카운트다운+누적playing틱을 기다리며 청크를 보냅니다. PC와 서버의 시계 차이를 허용 오차로 우회하지 않습니다.250ms 이하 간격 대기와 진행 안내, Ctrl+C 취소 뒤 scoped cleanup을 사용합니다. 강제 종료/PC 중단까지 정리를 보장하지 않습니다.
- 정상/악성 필드, 타인 판 제출, 동일 ACK 재전송, 변조 seq, 낙하 이후 입력, 동시에 같은 판 finalize, 개명 후 내 점수, 신고를 확인합니다. `finally`는 이번 실행에서 받은 정확한 두 사용자만 정상 DELETE로 정리하고 같은 JWT 재시도와 Auth 접근 거절을 확인합니다. 다른 사용자 열거/관리자 대량 삭제는 없습니다.
- 계정 생성 응답이 유실되면 존재 여부를 추측하지 않고 `signupResponseUncertain`로 표시합니다. 삭제 실패 시 이번 생성 ID만 `cleanupRequired`에 남습니다. 토큰/키/응답 본문/다른 사람 순위 전체는 보고서에 남기지 않습니다. 생성 ID가 있는 보고서는 비밀 키가 없어도 운영 자료로 취급하고 공개하지 않습니다.
- `output/ranking-환경-UUID.json`은 덮어쓰지 않는 무시된 결과입니다. `evidenceSource=hosted`와 `simulated`를 구분하며 `smokePassed=true`여도 `taskComplete=false`입니다. DB 카탈로그·top101·다른 판 경쟁·운영 한도·정리·실제 웹/기기는 별도 `not_run`입니다. 테스트 함수에 가짜 응답을 주입해 통과한 파일을 실제 서버 증거로 바꾸지 않습니다.
- `ranking:env-check`: 명시된 공개 변수와 `dist`의 HTTPS URL/공개키 일치, 알려진 비밀키·서버 변수·가짜 API·개발 진단·환경 파일 유입을 정적으로 검사합니다. 값·경로·일치 원문은 출력하지 않습니다. SDK의 `access_token:"access_token"` 같은 필드 이름 상수만 좁게 예외 처리합니다. 임의 인코딩/바이너리/실제 런타임 광고 비노출까지 증명하지 않습니다.
- 아직 서버 설정이 없는 현재 앱만 `npm.cmd run ranking:env-check -- --allow-unconfigured`로 검사합니다. 이것은 **로컬 전용 합격**이지 운영 연결 합격이 아닙니다. 기본 명령의 설정 없음 실패는 숨기지 않습니다. 실제 앱 빌드 QA는 기존 `web:export`/격리 fixture 빌드/`e2e`를 그대로 수행합니다.

## 자동 smoke 밖의 실제 확인표

- 실제 DB 카탈로그에서 private6테이블·public12RPC의 존재와 소유자, RLS, SECURITY DEFINER, 빈 search_path, 각 역할의 schema/table/function 권한을 확인합니다. REST404만으로는 없는 경로와 권한 거절을 구분할 수 없습니다. 정상 API 실행과 카탈로그 점검 모두 필요합니다.
- `anon`/`authenticated`의 직접 score INSERT/UPDATE 및 RPC 실행 금지, service_role의12RPC 실행/직접 테이블 차단을 실제 세션으로 확인합니다. 공격성 검사는 staging 전용 사용자만 대상으로 하며 운영 다른 사용자를 지정하지 않습니다.
- staging의 통제된101명 순위 fixture는 별도 승인/마이그레이션 또는 test role로 만들고 공동순위1,1,3·100명 밖 내 순위를 실제 DB에서 확인합니다. 합성 순위 fixture와 실제 시간 플레이 증거는 별도입니다. production에는 관리자 가짜 점수를 넣지 않습니다.
- 다른 판의 최고값 경쟁·동점 시간 보존·만료·삭제/개명/운영자 상태변경 경쟁, 신고 저장/제한, 누락된 인증/잘못된JWT/외부origin을 검사합니다. 짧은 smoke의 같은 판 중복 finalize가 모든 경쟁을 입증하지는 않습니다.
- 실제 Gateway의 마지막 forwarded IP 신뢰 경계,1,200틱의 실제 CPU/메모리 비용·호출 제한과429, CAPTCHA/익명 가입 남용 대응을 확인합니다. 현재 서버 rate limiter는 사람/공식 앱/봇을 인증하지 않습니다.
- 실제 staging 브라우저에서 통신 끊김→로컬 결과→복귀 전송·프로필 삭제·재가입·닉네임 UI를 확인합니다. Expo Go/Hermes 진단이 없다면 명시적으로 P03 실기기 필수로 넘깁니다. Web과 Hermes 모두 통과했다고 추정하지 않습니다.

### Staging 만료·운영 상태 SQL fixture

2026-09-24 10:14 UTC 실제 staging 검증 완료: CLI 2.117.0의 `db query --linked --project-ref tadokcpealpwjfyjovuy --file scripts/sql/ranking-staging-lifecycle.sql`로 전체 파일을 실행해 assertionsPassed/rollbackCompleted/intentGucsCleared=true를 확인했습니다. 전후 Auth/players/bests/runs 개수는 모두 0이었습니다. 아래 SQL Editor 설명은 재검증 방법이며, 사용자 수동 실행을 기다리는 상태는 해소됐습니다. 단일 트랜잭션 SQL 검사로, 별도 연결의 경쟁 상태 검증은 남아 있습니다.

`scripts/sql/ranking-staging-lifecycle.sql`은 새 임의 Auth stub 4개와 합성 점수/만료 판만 만들고, 공개 board에서 hidden/banned 점수가 빠지는지, hidden/banned가 판 시작을 거부당하는지, banned board 접근과 만료 판 조회가 각각 `FORBIDDEN`/`EXPIRED`인지 확인한 뒤 전체를 `ROLLBACK`합니다. `npm.cmd run test:ranking-schema`의 23개 검사는 스크립트의 staging guard·owner/trigger guard·rollback 구조를 정적으로 확인할 뿐 SQL을 파싱하거나 실제 DB에서 실행하지 않습니다.

실행 시에는 Supabase Dashboard에서 **nyang-staging ref `tadokcpealpwjfyjovuy`**를 확인하고 SQL Editor에 이 파일 전체를 한 번에 넣어야 합니다. 부분 실행/COMMIT 금지. 최종 행 `assertionsPassed=true`, `rollbackCompleted=true`, `intentGucsCleared=true`, `taskComplete=false`여야 하며, 중간 오류 또는 최종 JSON이 없으면 통과로 보지 말고 멈춥니다. 이 synthetic fixture는 HTTP/Auth middleware나 실제 운영자 절차의 독립 검증을 대신하지 않습니다. Production에서는 절대 실행하지 않습니다.

## 보관·정리·관리자 조치

Staging 프로젝트에는 `nyang-staging-rank-cleanup`이 매일 03:15 UTC에 `private.rank_cleanup(3600)`을 실행하도록 설정되어 있습니다. 단, SQL Editor의 첫 이력 조회에서 job은 보였지만 `cron.job_run_details` 쪽 값은 모두 NULL이어서 실제 예약 실행은 아직 입증되지 않았습니다. 다음 실행 뒤 status/result 및 삭제 전후 행 수를 확인해야 합니다. Production에는 아직 job을 설정하지 않았습니다. 같은 job 이름을 등록하면 기존 작업을 덮어쓸 수 있으므로 새로 만들기 전에 목록을 확인합니다. [Cron 예약·이력](https://supabase.com/docs/guides/cron/quickstart).

| 데이터 | 목적 | 구현된 정리 조건(두 환경 스케줄 적용 확인) |
| :--- | :--- | :--- |
| 프로필/최고점 | 공개 닉네임·랭킹 | 사용자 삭제/승인된 관리 조치까지 |
| 진행/종료 판 | 서버 재생 체크포인트·마지막 입력 지문 | 마지막 유효 청크 후24시간 만료 |
| 완료 영수증 | idempotent finalize | 완료 후7일 |
| 신고 | 검토 |90일 |
| rate bucket | 호출 제한 |24시간 |
| 삭제 tombstone | 지연 JWT/삭제 재시도 안전성 | 완료 후7일+실제 최대 JWT 수명 모두 경과; Auth 없음 확인 |

`pending_auth_delete`는 완료 전에 정리하지 않습니다. 오래됐다는 이유만으로 모든 익명 계정을 삭제하면 정상 게스트 기록도 잃으므로 금지합니다. 사용자 삭제는 DB 공개 데이터 제거→Auth 삭제→완료 표식 순서이며, 만료 JWT로 재시도를 못 하는 경우 운영자는 해당 삭제 표식과 정확한 ID를 확인해야 합니다. 앱에 소유권 우회나 닉네임 복구 통로를 만들지 않습니다.

신고 후 숨김/정지 관리자는 정확한 `public_id`와 대상 사용자 매핑을 먼저 읽기 전용으로 확인하고, 이유·시간·운영자·승인 기록을 남긴 뒤 한 대상만 조치합니다. 대시보드 전체 삭제/와일드카드 UPDATE는 금지합니다. 관리자 도구를 앱·Pages에 넣지 않습니다. 로컬 숨김은 서버 제재가 아닙니다.

## Free 서비스·복구와 출시 인계

2026-09-24 공식 문서 재확인 기준 Free는 2개 active project, 프로젝트당 DB 500 MB, MAU 50,000, egress 5 GB, Edge Function 500,000회 등 한도를 안내합니다. 한도와 사용량은 바뀔 수 있고 조직 단위 합산되는 항목이 있으므로 개인 계정의 현재 실제 값은 Dashboard Usage가 기준입니다. Usage는 `https://supabase.com/dashboard/org/_/usage`에서 확인하고, staging/production 프로젝트 상태와 조직 plan도 함께 기록합니다. 자동 백업·운영 SLA·비용 없는 무제한 사용을 가정하지 않습니다. 초과 사용을 피하기 위해 유료 플랜으로 변경하거나 spend settings를 바꾸지 않습니다. [요금제·현재 쿼터](https://supabase.com/docs/guides/platform/billing-on-supabase), [Usage 확인](https://supabase.com/docs/guides/troubleshooting/understanding-the-usage-summary-on-the-dashboard-D7Gnle), [비용 관리](https://supabase.com/docs/guides/platform/cost-control).

사용이 적은 Free 프로젝트는 낮은 DB 활동이 7일 이어지면 자동 정지 대상이 될 수 있습니다. 알림 메일과 Dashboard를 모니터링하고, 정지되면 Dashboard에서 resume합니다. 복구 가능 기간은 공식 안내상 최대 1년이며 정지를 피하기 위한 artificial keepalive는 만들지 않습니다. 장애/정지 중 앱은 로컬 플레이와 재시도 상태를 유지해야 합니다. 로그 보관은 실제 플랜 값을 개인정보 문구에 반영하며 '서버 로그 없음'이라고 쓰지 않습니다. [정지·복구](https://supabase.com/docs/guides/platform/free-project-pausing).

Free 프로젝트는 자동 일일 백업을 제공한다고 가정하지 말고 Supabase CLI `db dump`로 논리 백업을 주기적으로 export해 암호화된 별도 위치에 보관해야 합니다. CLI는 Docker 컨테이너 안에서 `pg_dump`를 실행합니다. 기본 dump는 Supabase 관리 `auth`/`storage` 스키마를 제외하고 데이터·커스텀 role도 자동 포함하지 않습니다. 따라서 이 게임의 `private.players.user_id → auth.users.id` 관계를 보존하는 전체 서비스 재해 복구 계획은 DB dump만으로 끝나지 않습니다. Auth 게스트 ID/세션 복구 범위는 별도 설계·검증하고, Auth가 복구되지 않으면 기존 기기 익명 신원/랭킹을 잃을 수 있음을 공개해야 합니다. 일반적으로 DB 백업에 Storage API의 실제 파일도 포함되지 않지만 현재 게임은 Storage를 사용하지 않습니다. 복구 리허설은 운영 DB가 아닌 별도 disposable staging project에서 수행하고 테이블/권한/RPC와 앱 smoke까지 확인합니다. 복원은 서비스 중단을 일으킬 수 있으므로 production에서 확인 없이 실행하지 않습니다. 현재 Windows 작업 환경에는 Docker/`pg_dump`가 없어 백업과 복구를 아직 실행하지 않았습니다. [백업 개요](https://supabase.com/docs/guides/platform/backups), [CLI dump 상세](https://supabase.com/docs/reference/cli/supabase-db-dump), [CLI 백업·복구 절차](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

P03 인계: 공개 닉네임/점수, 비공개 게스트ID/기기 세션, 서버 판 상태/지문/영수증, 로컬 임시 입력, 신고와 provider 요청 로그의 목적·수집·보관·삭제·지원 경로를 각각 공개해야 합니다. 실제 운영자/리전/수탁 서비스 값은 프로젝트 생성 후 채웁니다. 예전 오프라인 계획의 '수집 데이터 없음'을 앱스토어 답변에 복사하지 않습니다. Pages/EAS 변수 주입, 실제 iPhone/Hermes/성능/소리, 앱스토어 소개문구·이미지·최종 제출 승인은 P03에서 별도 진행합니다.

## 2026-09-24 · staging 정리 예약

staging `tadokcpealpwjfyjovuy`에서 읽기 전용 확인 결과 `private.rank_cleanup(integer)`는 있었지만 pg_cron/cron schema/job은 없었습니다. 승인 후 pg_cron을 활성화하고 `nyang-staging-rank-cleanup`을 `15 3 * * *` (매일 03:15 UTC)로 등록했습니다. Job ID 1, `active=true`, 명령은 `select private.rank_cleanup(3600)`이며 3600초는 실제 staging JWT 최대 수명입니다. 이후 staging에서 같은 함수 1회 직접 실행이 오류 없이 완료됐고, 사후 조회에서 만료 runs/영수증/신고/rate bucket 및 정리 가능 completed deletion receipt는 모두 0건, pending deletion receipt도 0건이었습니다. 수동 함수 호출은 pg_cron 실행 이력과 별개이므로 예약 job 자체의 첫 주기 실행 결과는 아직 미확인입니다. Production에는 변경을 적용하지 않았습니다.

## 2026-09-24 · staging hosted smoke 재검증

현재 로컬 규칙 버전 `nyang-v1-bc732af6f2a7ea66`과 staging 공개 설정으로 빌드·설정 경계 검사를 통과했습니다. 실제 smoke 14개 assertion이 통과했고 두 임시 익명 계정 모두 정상 삭제됐습니다. sandbox 네트워크 timeout은 hosted 실패로 기록하지 않고, 네트워크 허용 재시도의 실제 hosted 결과와 분리했습니다. 동시 중복 finalize 검증은 포함되지만 cross-run 최고값/동점 경쟁은 아니며 아직 미검증입니다.

## 2026-09-24 · staging cross-run 최고점 검증

Staging 전용 `--verify-cross-run-concurrency`가 통과했습니다. 별도 익명 사용자 둘이 엔진 proof로 각각 101m에 도달하도록 실제 시간에 맞춰 chunk를 제출한 뒤 finalize를 동시에 요청했고, 동점 rank와 보드 순서를 확인했습니다. 이어 한 사용자가 낮은 점수의 적법한 run을 완료해도 101m 최고점과 최초 `achievedAt`이 유지되는 것을 확인했습니다. 두 테스트 계정은 runner가 삭제했고 후속 Auth 삭제도 확인했습니다. 도구 회귀는 `test:ranking-tools` 66/66 통과입니다.

이 결과는 서로 다른 사용자의 동점 finalize를 검증합니다. 같은 사용자의 동시 진행 run 경쟁은 검증하지 않습니다. 서버가 플레이어별 active run을 하나만 허용하고 새 시작 때 이전 run을 무효화하기 때문입니다. 만료·운영자 변경 경쟁, Gateway/한도, cron 예약 실행, 백업/복구, 웹 오프라인 복구는 계속 별도 검증 항목입니다.

## 2026-09-24 · cron 예약 실행 이력은 아직 없음

Staging SQL Editor에서 `cron.job`을 `cron.job_run_details`와 읽기 전용 조인한 결과, jobid 1 / `nyang-staging-rank-cleanup`은 존재했지만 연결된 runid/status/start/end/result는 모두 NULL로 반환됐습니다. 따라서 현재 관찰된 범위에는 scheduler 실행 기록이 없습니다. 이는 실패 기록이 아니라 기록 부재이므로 예약 동작 성공으로 간주하지 않습니다. 수동 cleanup 함수 실행도 cron 이력을 대신하지 않습니다. 다음 예약 시각이 지난 후 같은 조회로 실행 상태와 결과를 확인해야 합니다. Production은 변경하지 않았습니다.

## 2026-09-24 · Gateway와 앱 시작 rate limiter

Staging의 Supabase CLI 설정 조회에서 `leaderboard-api`는 ACTIVE version 4, `verify_jwt=false`였습니다. Gateway가 JWT를 일괄 강제하지 않으므로 보호 API는 Edge Function 사용자 토큰 검증에 의존합니다. hosted smoke에서 익명 쓰기 및 잘못된 JWT 거부를 확인했지만, 실제 공급자 호출 할당량 또는 Gateway CPU/메모리 한도는 이 조회로 알 수 없습니다.

실제 staging 검사는 같은 새 사용자의 `/runs` 시작 30회를 1분 이내로 수행하고 31번째에 429 `RATE_LIMITED` 및 양수 `Retry-After`(최대 60초)를 확인합니다. limiter bucket은 24시간 안에는 보관되며 24시간 초과 행은 cleanup 대상입니다. 실행 후 Auth/players/best_scores/runs/reports는 0건, rate bucket 37건(24시간 초과 0건)이었습니다. bucket을 임의로 수동 삭제하지 마세요. staging에서만 `npm.cmd run ranking:verify -- --environment staging --project-ref tadokcpealpwjfyjovuy --env-file .env.ranking.staging --allow-test-writes --verify-start-rate-limit`을 사용합니다.

미확인: provider/Gateway 실효 한도, 마지막 `X-Forwarded-For` hop 신뢰와 IP 제한 우회 가능성, cron scheduler 실행 이력, 백업 복구 연습. 앱 limiter 429를 provider-level 보호나 완전한 IP 제한으로 설명하지 마세요.

### 2026-09-24 · Gateway IP limiter와 cron 실행 이력

guest limiter는 `cf-connecting-ip`만 사용하고, 없는 경우 하나의 shared `unknown` bucket으로 제한합니다. `x-forwarded-for`는 caller가 값을 보낼 수 있어 신뢰하지 않습니다. Staging version 5에서 XFF를 바꾼 실제 61회 GET이 60회 200/61회 429로 같은 requester bucket에 모였습니다. 공급자 quota나 CPU/메모리 한도는 확인하지 않았습니다.

Cron은 staging에서 임시 분당 schedule로 실제 기록을 만들고, 즉시 원래 `15 3 * * *`로 복구했습니다. runid 1은 `succeeded`, return `1 row`; 현재 job은 active이며 daily schedule입니다. 이력 생성을 위해 조정할 때는 staging에서만 하고 성공 확인 즉시 원래 schedule을 복구하세요.

### 수동 테스트 계정 정리 필요 (2026-09-24)

실제 브라우저 자동화 뒤 사후 count가 Auth6/Profile5/Best1/Run1/Report0입니다. 아래 synthetic ID 6개만 **nyang-staging** Dashboard → Authentication → Users에서 삭제한 뒤 `auth.users`, `private.players`, `private.best_scores`, `private.runs` count가 0인지 확인해야 합니다. DB 직삭제/전체 정리는 하지 마세요.

- `e0053120-ece7-4d77-b709-fec9b1736660` (`검증냥44825`)
- `aff05fd6-6384-4c00-84fe-7526af9a78ee` (`검증냥60622`)
- `a3f4d547-2e9b-4c35-bcf4-b8742ada4c85` (`검증냥13087`)
- `abb74487-6d77-46d1-bdb6-aa8f329fdd5c` (`검증냥03627`)
- `00d1fdaf-82b8-4244-bcf1-f1ff3a299dca` (`검증냥69329`)
- `7c9521df-5e62-400d-935b-309edeed8ccb` (profile 저장 전 생성된 anonymous Auth user)

자동화는 확인창이 떠 있는 동안 버튼이 사라진 것을 삭제 완료로 오판했습니다. 확인창이 닫힌 UI 신호만으로 끝내지 말고 DB 사후 집계를 확인해야 합니다. 대상은 staging 전용이며 Production은 건드리지 않습니다.

아래는 여섯 계정의 정리 결과를 확인하는 **읽기 전용** 쿼리입니다. SQL Editor 상단에서 `nyang-staging` / ref `tadokcpealpwjfyjovuy`가 선택된 것을 먼저 확인한 다음 실행합니다. `auth.users`, profile, score, run, 관련 report 및 미완료 deletion receipt 수가 0이면 정리 완료입니다. `completed_tombstones`는 개인정보 삭제 후 JWT 만료 안전기간 동안 의도적으로 보존될 수 있으므로 0을 요구하지 않습니다. 쿼리는 어떤 데이터를 수정하거나 삭제하지 않습니다.

```sql
with target(user_id) as (values
  ('e0053120-ece7-4d77-b709-fec9b1736660'::uuid),
  ('aff05fd6-6384-4c00-84fe-7526af9a78ee'::uuid),
  ('a3f4d547-2e9b-4c35-bcf4-b8742ada4c85'::uuid),
  ('abb74487-6d77-46d1-bdb6-aa8f329fdd5c'::uuid),
  ('00d1fdaf-82b8-4244-bcf1-f1ff3a299dca'::uuid),
  ('7c9521df-5e62-400d-935b-309edeed8ccb'::uuid)
), public_ids as (
  select p.public_id from private.players p join target t using (user_id)
)
select
  (select count(*) from auth.users u join target t on t.user_id = u.id) as auth_users,
  (select count(*) from private.players p join target t using (user_id)) as players,
  (select count(*) from private.best_scores b join target t using (user_id)) as best_scores,
  (select count(*) from private.runs r join target t using (user_id)) as runs,
  (select count(*) from private.nickname_reports n
    where n.reporter_user_id in (select user_id from target)
       or n.target_public_id in (select public_id from public_ids)) as related_reports,
  (select count(*) from private.deletion_receipts d join target t using (user_id)
    where d.status = 'pending_auth_delete') as pending_deletions,
  (select count(*) from private.deletion_receipts d join target t using (user_id)
    where d.status = 'complete') as completed_tombstones;
```

같은 쿼리를 `scripts/sql/ranking-staging-cleanup-check.sql`에도 저장했습니다. Dashboard SQL Editor에서 직접 실행하거나, CLI 로그인/네트워크가 되는 개발 PC PowerShell에서 아래 읽기 전용 명령으로 실행할 수 있습니다. `completed_tombstones`만 양수여도 정상일 수 있습니다.

```powershell
npx.cmd --yes supabase@2.117.0 db query --linked --project-ref tadokcpealpwjfyjovuy --file scripts/sql/ranking-staging-cleanup-check.sql
```
