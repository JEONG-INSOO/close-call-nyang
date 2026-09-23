# 우당탕탕 냥대리 랭킹 서버 운영 준비

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

## 보관·정리·관리자 조치

현재 DB 함수는 있지만 예약 작업은 없습니다. 운영 owner가 `private.rank_cleanup(실제_최대_JWT_수명_초)`를 매일 실행하도록 pg_cron을 설정해야 합니다. 같은 job 이름을 등록하면 기존 작업을 덮어쓸 수 있으므로 목록부터 확인합니다. `cron.job`/실행 이력의 실제 성공과 삭제 전후 행 수를 확인하고 이력 자체의 보관 주기도 정합니다. [Cron 예약·이력](https://supabase.com/docs/guides/cron/quickstart).

| 데이터 | 목적 | 구현된 정리 조건(스케줄 적용 전) |
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

2026-09-22 공식 요금표 확인 기준 Free는 활성 프로젝트2개, DB500MB, MAU50,000, egress5GB, Edge500,000회 범위를 안내합니다. 자동 백업과 운영 SLA를 가정하지 않습니다. 실제 계정 Usage/조직 슬롯과 한도는 생성 전 다시 확인하며 초과 시 자동 결제하지 않습니다. [요금표](https://supabase.com/pricing).

사용이 적은 Free 프로젝트는 정지될 수 있으므로 Dashboard 상태/Usage를 확인하고 공식 복구 절차를 따릅니다. 제한 회피용 keepalive를 만들지 않습니다. 장애/정지 중 앱은 로컬 플레이와 재시도 상태를 유지해야 합니다. 로그 보관은 실제 플랜 값을 개인정보 문구에 반영하며 '서버 로그 없음'이라고 쓰지 않습니다. [정지·복구](https://supabase.com/docs/guides/platform/free-project-pausing).

출시 전 암호화된 외부 백업과 별도 테스트 환경에서의 복구 연습이 필요합니다. `db dump`는 Docker 기반이므로 Windows의 Docker Desktop 또는 승인된 pg_dump 환경을 별도 준비합니다. 이번에는 Docker 실행·DB 백업·복구도 하지 않았습니다. [백업](https://supabase.com/docs/guides/platform/backups), [CLI 백업 환경](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

P03 인계: 공개 닉네임/점수, 비공개 게스트ID/기기 세션, 서버 판 상태/지문/영수증, 로컬 임시 입력, 신고와 provider 요청 로그의 목적·수집·보관·삭제·지원 경로를 각각 공개해야 합니다. 실제 운영자/리전/수탁 서비스 값은 프로젝트 생성 후 채웁니다. 예전 오프라인 계획의 '수집 데이터 없음'을 앱스토어 답변에 복사하지 않습니다. Pages/EAS 변수 주입, 실제 iPhone/Hermes/성능/소리, 앱스토어 소개문구·이미지·최종 제출 승인은 P03에서 별도 진행합니다.
