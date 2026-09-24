# P02 랭킹 서버 → P03 출시 인계

2026-09-25 KST 기준. 서버 검증 완료와 공개 웹/iOS 출시 완료는 다르다. 이 문서는 출력 폴더의 검증 증거를 요약하며 키·토큰·백업 데이터는 포함하지 않는다.

최종 인수 테스트: Jest659/44suites, Deno50, 도구67, SQL27, 타입/사본8,웹3종빌드/공개설정검사, Chromium34pass/11intentional-skip/0fail 및3numericgoldens 통과. 합성 계정 암호화 archive는 인수 시점에 정확한 파일만 삭제했고 비밀값 없는 보고서는 보존했다.

## 완료 조건별 증거

| 조건 | 확인한 증거 | 범위·주의 |
| --- | --- | --- |
| 실제 환경·권한·소유권 | staging/production migration `202609210001`, `202609230002`; hosted catalog6테이블/RLS·12RPC·8helper 검사; smoke의 ownership/direct REST·RPC 거부 | `verify_jwt=false`는 공개 GET을 위한 Gateway 설정이며 보호 경로는 handler의 실제 Auth 검증을 거친다. |
| 정상 재생·조작 거부·중복 finalize | production 보고서 `ranking-production-14c82633-59f9-42b2-87d4-f82a739f651b.json`14pass; staging `ranking-staging-3eefa6e3-4769-4abd-af45-e3b6f2b72de4.json`14pass | 두 보고서 cleanupRequired0, signupResponseUncertain=false. smoke의 manual not_run은 아래 별도 증거로 판정하며 원본 보고서를 조작하지 않는다. |
| 공동 순위·최고점 유지 | staging `ranking-staging-43a7d520-61ca-4f61-95c6-8c076ffd052e.json`의 CROSS_RUN_MAX_CONCURRENCY 통과; 실제2명101점 동시finalize·이후 낮은 점수 최고기록 불변 | Top30/동점/31위 내순위는 별도의 rollback SQL fixture. 동일 사용자 다중 활성 판은 정책상 허용하지 않는다. |
| 닉네임 중복·변경·신고·삭제 | 위 hosted smoke의 TWO_EXPLICIT_ANONYMOUS_PROFILES/RENAME_RANK_AND_REPORT/DELETE_RETRY_AUTH_A·B | 초기 브라우저에서 남긴6명은 사용자 UUID별 삭제 후 독립0건 확인. 새 계정 삭제를 과거 계정 정리 증거로 바꾸지 않는다. |
| 오프라인 자동 재전송 | `staging-browser-auto-retry-20260924.json`8pass; 실제 Chromium이 reconnect 후 수동 클릭 없이2012ms 내 finalize/queue clear | 로컬 허용origin에서 실제 staging 연결. 공개 Pages·iPhone 검증은 아직 아니다. |
| 만료·관리·한도 | hosted lifecycle 전체배치 assertion/rollback/GUC-clear true; start31번째429; 수정 후 위조XFF61번째429 | SQLfixture와 HTTP 증거 구분. `cf-connecting-ip` 누락 시 공통bucket. 사람/공식 앱 인증·완전한 봇방지 또는 부하 한계 보장이 아니다. |
| 보관·비용·복구 | 두 환경 정리cron 실제 성공, User Usage 화면 quota 미초과, 합성Auth/게임 encrypted dump→실제 local Auth 재인증/랭킹/재생/삭제 | [백업·복구 범위](./backup-recovery.md). 계정 동기화 기능·서명키/Storage/전체클라우드 재해복구는 아님. |

2026-09-24 15:43:49/56UTC 최종 읽기 조회에서 두환경 공개GET200/CORS/규칙 `nyang-v1-bc732af6f2a7ea66` 일치, users/players/bests/runs/pending deletion0, 마이그레이션2개 일치. 두환경 cron 모두 active `15 3 * * *`, 성공run1개 이상. 신규 데이터 생성/cron 변경 없이 확인했다(`output/t03-final-readonly-20260925.json`).

## P03에서 반드시 할 것

1. GitHub Pages Source/공개 변수/CI 배포/실제 공개origin 온라인 연결 검사. 기존 `.github/workflows/deploy-pages.yml`을 재사용하며 fixture를 배포하지 않는다. 현재 웹 `dist`는 최종 로컬 QA용 비연결 빌드이므로 그대로 온라인 출시용으로 쓰지 않는다. 운영변수로 다시 export해야 한다.
2. 개인정보/지원 안내: 공개 닉네임·최고점, 비공개 익명ID·세션, 서버 판 상태/지문·영수증, 로컬 보류입력, 신고, 제공자 요청 로그를 구분해 목적/보관/삭제/문의 경로를 설명한다. Supabase Seoul의 staging/production을 분리했다. 법적 운영자 표시와 공개 지원 연락처는 사용자 승인값을 확인하고, Git 작성자 이메일을 임의로 공개 문의처로 사용하지 않는다. App Store에서 '수집 데이터 없음'을 단정하지 않는다.
3. 보관: profile/best는 삭제·승인 관리조치까지, idle run24h, finalized receipt7일, report90일, rate bucket24h, 완료삭제표식은7일 및JWT최대수명 경과·Auth부재 후 정리. pending deletion은 자동 삭제하지 않는다. provider 로그 보관은 실제 플랜 설정에 맞춰 고지한다.
4. Expo Go/iPhone의 Hermes 골든 해시, 웹과 공통 순위, 멀티터치·백그라운드/복귀·이어가기·오프라인 queue·세션삭제·소리/진동·가로화면·장시간성능을 실제 기기로 확인한다. 로컬 저장 이어가기는 DB 없이 유지, 랭킹은 기존 Supabase 방식 유지.
5. EAS iOS cloud build/TestFlight/앱스토어 소개·이미지·최종 심사 제출은 별도 절차. 사용자는 Apple 유료계정 보유를 알려줬지만 현재 인증/서명 준비 완료로 추정하지 않는다. 스토어 문구와 최종 제출은 사용자에게 다시 확인한다.

## 운영 한계와 후속 조치

- Free quota/정지 가능성은 운영 제약이다. 대규모 부하/제공자 CPU·메모리 한계 도달 테스트는 하지 않았다. Usage와 실패율·429·cleanup 이력을 모니터링하며, 유료 상향/설정 변경은 별도 승인한다.
- CAPTCHA는 현재 false이며 기존 보호를 끈 것은 아니다. 도입하려면 실제 Expo/web 토큰 전달 설계가 필요하다. 서버 검증된 입력도 공식 클라이언트·사람임을 증명하지 않는다.
- 익명 세션은 기기별이다. 앱 삭제/브라우저 저장 삭제 시 닉네임만으로 계정을 회복할 수 없다. 다른 기기에 로그인해 같은 기록을 복구하는 기능은 없다.
- 컴퓨터의 복구용 컨테이너는 정지 상태다. 원래 타 프로젝트15컨테이너는 유지했다. 테스트 암호화 archive는 인수 시 폐기하며, DB백업 운영 자동화/외부 보관 위치는 이 일회성 리허설과 별개다.
