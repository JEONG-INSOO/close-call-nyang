# 광고 부활 점수와 기존 최고 기록을 함께 인정하기

## 바뀐 흐름
첫 낙하 기록은 이전처럼 서버에 확정한다. 가상 광고가 끝나면 서버가 확인한 낙하 상태를 부모로 새 child challenge를1회만 발급한다. 누적거리/seed/rng/게임시간은 유지하고 child의 입력 틱 번호만0에서 시작한다. 이후 점수도 서버가 입력을 재생해 거리에서 계산한다. 클라이언트가 점수 숫자를 제출하는 경로는 추가하지 않았다.

unique parent_run_id와 subject/player/parent 잠금이 한 번 발급을 보장한다. 부모가 정리되어도 자식 영수증의 보관 기간을 줄이지 않도록 FK는 SET NULL이다. verifyProof는 DB가 발급한 parentRunId가 있는 checkpoint에만 reviveUsed/protection을 허용한다. 보통 판에 부활 필드를 끼워넣는 요청은 계속 거절한다.

## UI와 취소
첫 기록 확인→child 발급을 기다릴 때 물리를 멈추고 ‘기록을 이어가는 중이에요…’를 표시한다. 응답 뒤3초 준비 시간부터 시작한다. 홈/화면이탈/계정변경/삭제로 generation이 바뀌면 늦은 응답이 게임을 다시 켜지 못한다. 네트워크 실패는 로컬 플레이로 이어가되 온라인 부활 기록을 등록하지 못했음을 알린다. SDK 없이 실제 외부 광고를 봤다는 증명을 검증하는 것은 아니다.

## 통합 랭킹
사용자가 기존·새 난이도 점수를 같은 순위표에 합산하도록 선택했다. best_scores의 기존 행은 삭제/복사하지 않고 user별 max를 계산한다. Top30/개인순위/점수만으로 공동등수는 유지한다. finalize의 bestScore/rank도 같은 기준이다. 난이도가 달랐던 기록이 같이 표시된다는 공정성 차이는 사용자 선택이다. 오똥비131도 유지된다.

## 기존 iPhone 앱 호환
새 물리만 배포하면 예전 앱의 정상 입력도 다른 결과가 되어 등록을 못 한다. 마지막 공개 커밋9aa47db의 순수 엔진을 불변 legacy 폴더에 생성해 `nyang-v1-bc732af6f2a7ea66` 요청은 그 엔진으로 재생한다. 새 규칙은 `nyang-v1-a0542434d2300583`이다. 허용하지 않은 버전은 여전히 거절한다. 새 기능은 새 웹/앱 코드가 있어야 사용하며, 이 서버 배포가 기존 IPA를 바꾸지는 않는다.

## 검증과 실패
- Jest52 suites/737개, Deno53개, SQL static29개, 타입 통과. 모의 API 브라우저에서 광고 후 두 번째 proof/finalize 제출1개 통과.
- 검증용 Supabase는 INACTIVE이며 복원은 무료 활성 프로젝트2개 한도로 거절됐다. 사용자 승인대로 운영 적용 전에 별도 PostgreSQL18을127.0.0.1:55439의 output/pg-revival-qa에 만들었다. 기존 DB를 사용하지 않았다.
- 로컬 SQL에서 단일 child/재시도동일ID/다른소유자 거절/재부활 거절/전역131유지/영수증멱등/anon권한차단을 실제 실행했고, 변경과 synthetic 계정은 전부 rollback 확인. 첫 fixture가 finalized 행의 digest/receipt 제약을 충족하지 않아 수정했다. 종료 후 이 검증 서버도 정지했다.
- 운영 migration202610300001 적용, leaderboard-api v5 ACTIVE. production smoke에서 기존131유지/1회child/부활점수재생·영수증/재부활거절/양버전통합/구앱challenge 통과. 자체 테스트계정 삭제API 성공, cleanupRequired0/signupResponseUncertainfalse. 운영 원래 사용자 기록 삭제 없음.
- 자동 승인 검토가 최초 `--no-verify-jwt` 포함 명령을 신규 보안 변경으로 거절했다. 실제 운영 v4 verify_jwt=false와 기존 config동일을 읽기 확인한 뒤, 보안변경 옵션 없이 배포했다. 사후v5도false. 보호 요청은 계속 auth.getUser검증한다.
- C드라이브 npm ENOSPC로 npx 메타데이터 조회가 실패했다. 설치된 CLI를 직접 실행해 읽기 확인했다. 실제 기능 검증 실패와 환경 디스크 오류를 구분한다.

## 생성과 복습
ranked:sync/golden은T01규칙 그대로 유지한다. legacy는 scripts/build-legacy-kernel.mjs, 로컬 rollback SQL은 scripts/build-revival-db-check.mjs로 생성한다. 운영 smoke는 scripts/verify-ranked-revival.mjs --allow-test-writes이며 결과는 ignored output에 토큰 없이 저장한다.

질문: 부모와 자식의 누적거리/틱번호가 왜 다른가? 한 번만 발급은 UI 버튼 숨기기로 충분한가? 기존 앱의 정상 입력이 새 서버에서 거절되는 이유는? 범위 밖 추가 결함 특이사항 없음. iPhone 실기기 QA와 새 웹 게시/IPA 갱신은 별도다.
