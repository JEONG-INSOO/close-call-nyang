# 계정·기록 백업과 격리 복구 검증

## 현재 상태

인수 정리(2026-09-25): T03 최종 검사 완료 후 정확한 경로/크기177382bytes를 확인하고 이번 합성 계정의 `staging-synthetic-recovery.dump.dpapi` 파일만 삭제했다. 휴지통 이동이 아닌 파일 삭제로 복구를 보장하지 않는다. 비밀값 없는 두 보고서·스크립트와 정지된 격리 환경은 유지, 타 프로젝트 파일/컨테이너는 삭제하지 않았다. 아래 archive 보관 상한 안내는 폐기로 해소됐다.

**2026-09-25 KST 최신:** staging의 전용 익명 계정1개와 실제 검증된 게임 기록을 Windows DPAPI로 암호화 백업하고, 별도 로컬 Supabase에 복원했다. 복원된 refresh token으로 같은 사용자 인증, 프로필/랭킹 조회, 정상 입력 재생 제출, 무인증 쓰기401, 정상 삭제/API 인증403·로컬0건 확인까지 통과했다. 운영 서버 덮어쓰기나 원격 설정 변경은 없었다. 아래 구조-only/환경 대기 기록은 이전 단계다.

### 실제 증거와 한계

- 격리 프로젝트 `nyang-recovery-20260925`, PG17.6/Auth v2.197.0, Auth migration `20260831180000`으로 staging과 일치. API55321/DB55322/실제 handler55325 모두 최종127.0.0.1 바인딩.
- 사용자 Docker 이동 완료 확인: `D:/어치/DockerDesktopWSL`, C: 여유26055073792bytes/D:975761682432bytes. 기존 omokgo15컨테이너 보존. 복구용4컨테이너와 재생성 전 원본3컨테이너는 모두 정지 상태로 보존, 해당3포트 리스너 없음.
- 단일 pg_dump custom archive에 `auth/private/public/supabase_migrations` 구조·데이터·소유권·ACL 포함. 로컬에 Supabase 기본 역할이 미리 존재해야 하며 role password/서명키/서버 secret/Storage 객체/cron 설정 백업은 아니다. Windows DPAPI CurrentUser로 보호된 archive를 다시 읽고 복호화해 SHA256 일치 후 restore했다. 평문 dump/token 파일은 만들지 않았다.
- 소유권을 유지한 `pg_restore --exit-on-error --single-transaction` 성공. 사용자/session/refresh/profile/best/run 각1, 원본 API receipt와 같은 publicId/닉네임/score0 복원 확인. private6테이블/RLS6/service-role RPC12허용/anon·authenticated RPC0허용/Auth FK/마이그레이션2개 확인.
- 짧은 낙하의 정상 score0 기록이다. 100% 장시간 복구나 운영 장애 시간·모든 Supabase 서비스 전체복구의 증거는 아니다. 복원한 refresh token으로 새 로컬 JWT를 발급했고, 원격용 기존 access token의 서명·연속성 보존은 주장하지 않는다. 앱의 기기 간 계정 복구 기능을 추가한 것도 아니다.
- 로컬 handler는 소스 그대로 Deno에 올려 실제 로컬 Auth/PostgREST에 연결했다. 서버 검증 우회/직접 점수 삽입은 없다. Hosted Edge Gateway 복원을 한 것은 아니며 hosted 권한·재생 검증은 기존 smoke 증거와 구분한다.
- 원격 테스트 계정은 정상 DELETE/API 후Auth403. 최종 staging read-only15:29:41UTC: users/identities/sessions/refresh/players/best/runs/reports/pending deletion 모두0, completed tombstones18/rate buckets77은 정상 보존. 로컬도 정상 DELETE 후 user/profile/best/run0/Auth403.

보고서: ignored `output/nyang-recovery-20260925/recovery-report.json`은 최초 비교 실패와 원격 정리까지, `local-recovery-report.json`은 새 원격 계정을 만들지 않은 로컬 후속5검사 통과를 보존한다. 최초 비교는 매번 바뀌는 board `fetchedAt`까지 비교한 검사 오류였다. 다음 harness는 이 필드만 제외하고 `achievedAt` 등 저장된 값은 비교한다. 실패 기록은 지우지 않는다.

암호화 파일 `staging-synthetic-recovery.dump.dpapi`는 해당 Windows 사용자에서만 복호화 가능하다. 실사용자 데이터가 아닌 이번 합성 계정만 포함한다. T03 인수 확인 시 폐기하며, 보관 상한은2026-10-02 KST로 둔다(자동 삭제 예약은 하지 않음). 무심코 원격에 복원하면 삭제한 계정을 되살릴 수 있으므로 절대 원격 복원에 사용하지 않는다. 암호화 파일만 다른 PC로 복사해도 복구할 수 있다는 뜻이 아니다.

### 환경 준비에서 발견한 주의점

공식 안내의 loopback-default Docker network를 사용했지만 이 PC의 실제 생성 컨테이너는 처음 `0.0.0.0`에 바인딩됐다. 데이터를 넣기 전에 새 DB/Kong만 정지하고 명시적127.0.0.1로 재생성했다. CLI가 컨테이너 파일시스템에 주입한 Kong 설정/로컬 인증서도 원본에서 메모리 경유 복사해야 했다. 설정 의도 대신 실제 `docker ps/inspect` 포트를 검사한다. 앞으로 이 scratch에 무조건 `supabase start`하지 말고 바인딩·Auth 버전을 재검사한다.

CLI 기본 Auth v2.196.0은 hosted보다 낮아 격리 Auth만 v2.197.0으로 맞췄다. 임시 remote login은 SQL에서 명시적 `SET ROLE postgres`가 필요했으며 권한을 추가 부여하지 않았다. 로컬 CLI status는 키 조회가 실패해 로컬 Auth의 기존 secret을 메모리에서만 읽어 짧은 수명의 검증용 role JWT를 생성했다. 원격 secret 조회·변경은 없었다.

기존 staging private/public 구조-only archive의 로컬 복원은 통과했다. Auth는 빈 합성 테이블이었으므로 로그인·세션 복구 증거가 아니다. 원격은 PostgreSQL17.6, 기존 로컬 시험은18.6이다.

2026-09-24 14:39UTC 읽기 preflight: Auth27테이블, users/identities/sessions/refresh_tokens 각각0, players/best_scores/runs/reports0, pending deletion0/completed17/rate bucket72. profile→auth.users 외래키와 예상 migration2개 확인. 빈 계정으로 복원을 반복해도 실제 계정 복구를 증명하지 못한다.

Docker 설치 상태 정정: 사용자 확인 후 권한을 갖춘 읽기 조회로 `C:/Users/mocca/AppData/Local/Programs/DockerDesktop`의 기존 설치를 발견했다. PATH/Program Files 경로 부재와 sandbox 접근 거부를 미설치로 단정했던 판단은 잘못됐다. 기존 앱을 실행해 Docker Desktop4.90.0/Engine29.7.2/Linux amd64/WSL2 연결 확인,18CPU·약7.5GiB 메모리, 실행 중 컨테이너0개. 재설치/WSL 설정 변경 없이 엔진 준비 완료. 아직 로컬 Supabase 컨테이너나 복원은 실행하지 않았다. CLI는 위 경로의 `resources/bin/docker.exe`를 사용한다.

## 백업 범위

### 2026-09-25 환경 준비 중 저장 공간 확인

Docker는 정상 연결되지만 C: 여유2633674752bytes(약2.45GiB), D: 여유999256207360bytes다. 실제 Docker 데이터는 C:의 `LocalAppData/Docker/wsl/disk/docker_data.vhdx`에 있다. 작업 폴더를 D:로 잡아도 Docker 이미지/볼륨 저장 위치까지 바뀌지는 않는다. 다운로드 중 C: 고갈 위험 때문에 이미지 pull 전에 멈췄다.

`docker ps`의 실행 중0개와 달리 `docker ps -a`에서는 기존 omokgo 중지 컨테이너15개가 확인됐다. 이들의 이미지·볼륨·네트워크는 보존한다. 후보 포트55320..55329 충돌 없음. 신규 네트워크/컨테이너/볼륨 생성, 이미지 다운로드, 원격 계정 생성·백업·복원은 하지 않았다.

사용자 선택 후 [공식 WSL2 안내](https://docs.docker.com/desktop/features/wsl/)의 Docker Desktop `Settings > Resources > Advanced`에서 디스크 위치를 D:의 전용 경로로 옮기거나, 사용자가 C: 공간을 확보한다. 이전은 다른 Docker 프로젝트 전체에 영향을 주므로 임의 실행하지 않는다. 실행 중 VHDX 직접 이동/전체 prune/reset 금지. 변경 후 엔진·기존 컨테이너·디스크 위치/여유를 다시 확인하고 격리 복구를 재개한다.

- private 구조·게임 데이터, public rank RPC·권한, RLS·역할·필수 확장.
- Auth 구조·사용자·identity·session/refresh 상태. users만 복사하지 않는다.
- supabase_migrations 이력. 실제 데이터와 일관된 시점의 snapshot을 유지한다.
- 별도 관리: Auth 설정과 서명/암호화 관련 설정, Edge Function·server secret·cron. DB archive만으로 이들이 모두 복원된다고 가정하지 않는다.
- Storage는 현재 미사용. 향후 사용하면 객체 파일과 DB 메타데이터를 별도 관리한다.

session/refresh 데이터는 인증정보처럼 취급해 암호화·접근 제한·Git 제외·보관 기한을 적용한다. `.gitignore`만으로 보안이 보장되지는 않는다. 토큰/secret/비밀번호는 보고서·채팅에 출력하지 않는다.

## 환경 준비 후 실행 순서

1. 기존 Docker 엔진 실행 확인 후 별도 작업 디렉터리·프로젝트 ID·미사용 포트로 로컬 Supabase 실행. 원격17과 호환되는 DB/Auth 버전을 확인한다. 기존 PostgreSQL 서비스/개발 서버/컨테이너/볼륨은 보존한다. 재설치나 전체 prune/reset은 하지 않는다.
2. 원본은 staging `tadokcpealpwjfyjovuy`만 지정. `scripts/sql/ranking-backup-preflight.sql`을 명시적 ref로 재실행한다. 타 사용자 데이터가 발견되면 전체 데이터를 임의로 내려받지 말고 범위/보관을 재확인한다.
3. 환경이 준비된 후 정상 Auth/API로 이번 검증 전용 익명 계정과 유효 입력 검증 기록 생성. 정확한 cleanup ID는 기록하고 token은 비밀 취급한다.
4. 지원되는 절차로 Auth/게임 데이터·구조·migration/역할을 일관된 시점에 백업. 독립 dump 간 시점 차이로 FK가 어긋나지 않도록 snapshot/쓰기 경계를 설계하고 범위·제외 객체를 manifest로 기록한다.
5. 로컬 격리 URL/포트/프로젝트 ID를 확인한 뒤에만 복원. 에러 무시 금지. 같은 사용자 ID/닉네임/최고 기록, FK/RLS/grant, migration 이력을 비교한다.
6. 복원된 Auth에 실제 HTTP 신원 확인/갱신 요청을 보낸다. 같은 계정의 랭킹 조회·정상 기록 제출·타인 접근 거부·삭제도 확인한다. 원본용 token의 서명키/issuer 차이는 DB 복원과 구분하고 기존 세션 유지 성공으로 주장하지 않는다.
7. 이번 staging 테스트 계정만 정상 삭제 API로 정리하고 응답·후속 인증 거부 확인. 복구 실험 데이터를 운영에 되살리지 않는다. 격리 서버 종료와 백업 보관/폐기 상태를 기록한다.

성공은 파일 생성이 아니라 백업 복원→데이터/권한 일치→실제 Auth 인증→같은 사용자 기록→테스트 정리까지다. 현재는 구조 복원과 읽기 preflight만 통과했다. 유료 프로젝트, 원격 덮어쓰기, 키 변경이나 실제 사용자 인증정보 취급 확대가 필요하면 멈추고 선택을 받는다. 설치를 보류하면 복구 미검증을 유지하며 T03 완료로 처리하지 않는다.

참고: [공식 백업·복원](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [로컬 복원 안내](https://supabase.com/docs/guides/local-development/restoring-downloaded-backup). DB와 별도로 Auth·서버 설정을 검사하는 것은 이 프로젝트의 추가 검증 범위다.
