# 승인 개인정보 방침 보완을 공식 사이트에 게시하기

## 왜 별도 Task인가?
기존 심사 준비 T03는 계정 신고·최종 체크리스트 때문에 끝나지 않았다. 하지만 승인된 공개 방침 보완은 먼저 배포해야 한다. 사용자1로 T01 로컬 검증·커밋과 T02 push·실제 배포 확인을 분리했다. App Review 제출/계정 신고/새 IPA는 포함하지 않는다.

## 핵심 변경과 데이터 흐름
승인된 `policySupplement` 두 string → 기존 HTML의 한국어/영어 Providers 문단 → Expo export에 정적 페이지 복사 → Pages CI → 공개 URL.

`scripts/policy-supplement.test.mjs`는 `html.split(paragraph).length - 1 === 1`에 해당하는 검사로 두 문단의 중복/누락을 잡는다. 두 문단과 날짜만 역변환한 HTML의 SHA-256을 기존 정책과 대조해 삭제/보존 문구 등 인접 변경도 막는다. SHA-256은 내용의 바이트가 달라졌는지 확인하는 값이지 법적 적합성 인증이 아니다.

새 `policy-supplement-approval.json`에는 이미 승인한 문구/게시 승인만 담았다. 기존 미커밋 T03 승인 파일 전체에 새 CI가 의존하면 원격 checkout에서 파일 누락이 발생한다. 독립된 최소 계약을 함께 커밋해 그 문제를 피한다. CI의 공개 페이지 검사 명령에 새 검사를 추가하며 비밀키/원본 로그는 포함하지 않는다.

## 알아야 할 점
- 소스 commit·push·빌드 성공·배포 성공·공개 내용 반영은 별도 상태다. 로컬 테스트 통과나 HTTP200만으로 최신 문구가 게시됐다고 할 수 없다.
- 기존 dist와 사용자 아트/T03 문서·test는 보존한다. 공유 memory/학습노트는 이 Task 포인터·새 노트 링크만 선택 stage한다.
- 게임/물리/DB 변경 없음. 한국 인증·EU/중국/베트남 제외 또는 AppReview 상태를 이 웹 배포로 완료 처리하지 않는다.

## 검증 기록
- T01: 승인 계약4개+공개 페이지 안전22개=26/26, release10/10, isolated Expo web export와 static verify passed(스크립트1/자산18/한영support/privacy). 기존 사용자 dist를 덮어쓰지 않았다. local env가 적용된 export의 production 연결 여부는 이번 검사의 보장이 아니며 T02 CI가 production env를 검증한다.
- `git diff --check` 통과(LF/CRLF 경고만). 공유 문서 index 패치가 처음엔 문맥 부족으로 거절돼 `--check --recount --unidiff-zero`로 지정 hunk를 검증한 뒤 적용한다. 원본 dirty 파일을 되돌리거나 전체 stage하지 않는다.
- 원격 배포·공개 hash/UI 증거는 T02에서 확인할 때만 추가한다.

## 요청 밖 발견
추가 게임 결함 없음. Sandbox 네트워크 차단으로 CLI 인증 확인이 실패했지만 승인된 네트워크 접근에서는 기존 GitHub 인증이 정상이다. 실패 메시지 하나로 토큰 만료를 단정하거나 불필요한 재로그인을 하지 않았다.

## 다음 연습
1. export가 성공해도 공개 URL이 옛 문구를 표시할 수 있는 이유는?
2. 승인 문구 계약과 사용자 요청 로그 원문을 왜 분리하는가?
3. dirty worktree에서 `git add -A`가 왜 위험한가?
