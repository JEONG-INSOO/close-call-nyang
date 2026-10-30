# Task: T03 App Store 업데이트 심사 제출
## Status: in_progress
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
## Listing copy (user approved 2026-10-30)
- 사용자답변: ‘한·영 업데이트 문구 승인’. 아래추가문구와새기능등록승인. 기존소개문단의광고부활없는해금조건명확화포함.
- 기존제목/부제/프로모션/키워드/지원URL유지. 기존장문소개에아래문단추가, 캐릭터조건만‘광고부활없이’로명확화.
- ko: ‘넘어진 뒤 DEXCONSULTING 텍스트 가상 광고를 끝까지 보면 한 번 다시 일어설 수 있어요. 닉네임을 설정하고 온라인으로 시작한 도전에서는 부활 후 추가 기록도 서버 검증을 거쳐 랭킹에 반영됩니다. 캐릭터 해금 횟수는 부활 없이 100%를 달성한 도전만 셉니다.’
- en: ‘After a fall, finish a DEXCONSULTING text-based mock ad to get back up once. For runs started online with a nickname, your additional progress after revival can also count toward the leaderboard after server verification. Character unlocks count only runs that reach 100% without revival.’
- ko what's new: ‘사무실의 일상과 사표를 들고 뛰는 동료를 만나보세요.\n진행할수록 더 빨라지고 균형 잡기가 어려워집니다.\n가상 광고로 한 번 다시 일어서고, 이어서 올린 기록도 랭킹에 도전하세요.\n첫 닉네임 입력 안내를 개선했습니다.’
- en what's new: ‘Discover more office scenes and a coworker rushing out with a resignation letter.\nThe pace and balance challenge increase as you progress.\nGet back up once after a mock ad and compete with your continued score.\nImproved the first nickname setup prompt.’
- 승인후 store/updates/1.0.1/ko-KR.json/en-US.json에버전별소개·새기능·승인근거저장. 이전출시승인hash파일은역사보존해덮어쓰지않음. age답변advertising은새앱내가상브랜드광고와일치하도록확인/수정, 추적·수집추가없음.
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
