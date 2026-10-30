# Task: T03 App Store 업데이트 심사 제출
## Status: pending
## Goal
처리된1.0.1 빌드를새업데이트에연결하고사용자승인범위에서심사제출까지진행한다.
## Implementation
- App Store Connect6815771701현재출시/수정가능버전조회. 없을때만iOS1.0.1생성. 기존국가/가격/콘텐츠권한/저작권/지원메일/공개방침그대로유지.
- store/ko-KR, en-US metadata 및심사메모: 배경다양화/후반난이도/1회가상광고부활점수/첫닉네임입력실제동작설명. 영문은게임UI한국어안내유지. 새소개초안은사용자기존‘앱소개문구다시확인’조건에따라필요한변경만보여주고승인받은뒤등록. 사용자에게기존승인정보다시묻지않음.
- 광고설문을현재가상텍스트광고와대조; tracking없음/SDK없음은실제근거에서판단. 법적확인/정책동의는사용자범위와컴퓨터사용확인규칙적용. 새증빙임의생성금지.
- 정확한T02build연결, 암호화usesNonExemptEncryptionfalse 유지, 심사메모업데이트후reload일치. 심사제출승인은이번‘앱스토어에도배포’로존재; 별도법적동의·문구변경승인필요할경우에만질문. 제출이차단되면구체적Apple오류와해결을기록하고가능한작업계속.
- store/release-update-2026-10-30.json에ascVersionId/reviewStatus/observedAt/releaseMode관찰값추가. 토큰/인증코드저장금지. 승인/출시는미관찰이면false.
## Validation
- npm.cmd run test:release; 새자료검사.
- ASC reload후version/build一致, 최종receipt/Waiting for Review실제확인. TestFlight업로드만으로심사접수라말하지않음.
## Acceptance
- [ ] 최신처리된build연결/스토어내용일치
- [ ] 실제심사접수또는정확한외부차단상태
## Learning
마케팅등록/바이너리업로드/심사접수/승인/출시5단계차이. 질문: Submit성공이공개인가? 가상광고가설문에영향을주는이유? 이전심사상태를덮어쓰면왜안되나?
## Commit Message
```text
docs(ios): record version 1.0.1 App Store submission

Plan: 2026-10-30-release-update
Phase: P01-release
Task: T03-app-review
```
