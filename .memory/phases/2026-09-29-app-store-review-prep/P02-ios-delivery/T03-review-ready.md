# Task: T03 App Store Connect 심사 직전 상태

## Status: done

## Result — 2026-10-01 실제 심사 접수
- 사용자 “앱심사 제출까지 가자”는 버전1.0/빌드6의 최종 제출을 직접 승인한 요청이다. 기존 소개/개인정보 게시 승인은 소급 변경하지 않고 connect-checkpoint의 별도 authorization에 기록했다. 체크리스트를 항목별로 다시 답한 것으로 주장하지 않는다.
- 실제 화면의 빌드6/이미지5장/승인 소개·지원·저작권·심사메모/수동 출시를 확인했다. Apple 심사에 추가 검증이 차단 경고 없이 준비된 초안1개를 만들었고, 최종 제출 후 “1개의 항목 제출됨” 및 상세 WAITING_FOR_REVIEW를 확인했다.
- iOS1.0 / 1.0.0(6), 제출ID `3d829fe4-2709-47fd-9708-016771fa9d3f`,2026-10-01 11:37 Asia/Seoul. ignored asc-review-submitted-receipt.jpg/asc-review-submitted.jpg. source/build/EASupload/AppReview/publicrelease는 별도 기록이다.
- EU27/중국 본토/베트남 보류 유지, DSA 이름 증빙·문의답변/최종 신고는 미완료로 보존했다. 접수 성공을 법적 적합성 또는 승인/공개로 해석하지 않는다. 전체QA pending/삭제재설치 not_run/기존 계정·기록 유지.
- 초기 최종 버튼의 자동 권한 검토 시간 초과 뒤 실제 초안 상태를 먼저 확인, 허용된 한 번의 재시도로 접수 확인. 중복 제출/취소/법적 동의/원본 증빙 업로드 없음.
- 학습노트 `docs/learning-notes/2026-10-01-app-review-submission.md`. 다음 포인터는 보존된 P01-T03 자료 준비 기록 정리이며 새로운 이미지/메타데이터/빌드 변경과 심사 취소는 하지 않는다.
- 최종 로컬 검증 release11/11·정책/공개페이지26/26·diff-check passed. 기존 QA pending은 이 검증으로 덮어쓰지 않는다.

## Handoff — 2026-09-30
- 2026-10-01 최신: 선행 policy-supplement-deploy P01 2/2 완료. source f2d9dd1/run36804961625 build·deploy success, 공식 privacy/support200 UTF8/privacyhash완전일치·한영 문단 가독성/증거 확인. store/policy-deployment.json과 전용 학습노트 참조. 원래 T03 복귀/in_progress, 기존 DSA 문의·계정 신고 미완료/최종 경고·사용자 체크리스트·별도 심사 승인 남음. 이 T03 미완료 문서는 방침 commit에서 제외.
- 2026-10-01 최신: 사용자1로 중국 본토/베트남 이번 출시 제외 승인. 두 checkbox만 해제/2지역 확인 후 reload:146지역·두 행 사용 불가·EU27 보류 유지, 한국/미국/대만/홍콩 유지. 제외 ISO3 총29개와 로컬 테스트 동기화. 허가 승인으로 기록하지 않고 chinaVietnamPermits not_run 유지. ignored asc-china-vietnam-deferred.jpg. 방침 공식 보완 배포/계정 DSA/최종 경고·체크리스트/별도 심사 승인 남음, T03 미완료.
- 2026-10-01 최신: 사용자 이메일 확인 완료 보고. 실제 모달0개/대한민국 전자상거래법 행 ACTIVE·2026-10-01/한국 경고 없음 확인. 행의 공개 연락처 상세를 읽고 승인 지원 이메일 표시 일치/한국 제품 페이지 공개 안내 확인. 에이전트 OTP 입력·최종 확인 클릭 없음. koreaCompliance passed/ignored asc-korea-compliance-active.jpg. 다음 중국/베트남 허가 확인 또는 별도 제외 선택, T03/DSA 신고·최종 심사 미완료.
- 2026-10-01 최신: 사용자 한국 이메일 공개 동의/사업자 없음. 한국 모달 승인 이메일 입력/NO 선택·checked 확인 후 Next→Apple 이메일 인증 iframe heading/code6칸 실제 확인. input 원문은 redacted여서 일치 확인 불가, 최종 육안 검토 필요. tab7 인증 직접 입력 인계/ignored asc-korea-email-verification.jpg. OTP/BRN 원문 없음, 한국 인증/최종 확인·T03/심사 제출 미완료.
- 2026-10-01 最新: 사용자 “EU 보류하고 다른거 진행”. 이 앱의 EU27개국만 선택 해제·27개지역 제외 확인·재조회 후148개 유지/27행 사용 불가 검증. UK/스위스/노르웨이/한국/미국 유지. EU 증빙은 보류지만 계정 거래자 상태/기존 Apple 문의는 변경하지 않았고 DSA 신고 미완료. 한국 연락처 모달의 이메일·유효BRN 보유 여부 질문을 확인, 한국 이메일 공개 승인/BRN 여부 답변 대기(원문번호 요구 안 함). 중국/베트남 허가 미설정·별도 지역 선택 필요. 빈 심사 메모에 소스 검증한 안내 입력/저장/reload 문자열 일치, ignored asc-review-notes-saved.jpg. T03 in_progress, 심사 제출 미실행.
- 2026-10-01 사용자1로 지원 문의 및 현재 회원 이름/계정 이메일 전달 승인. 초안 일치 후 발송1회, 실제 감사/케이스 생성/회신 안내 확인. submitted_awaiting_reply/답변 없음, 원문 계정/케이스 ID 저장 없음. 개인정보 없는 ignored apple-dsa-support-sent.jpg. 증빙 업로드·최종 DSA 신고·App Review 미실행, T03 in_progress 유지. 다음은 Apple 인정 서류/가림/번역 답변 확인과 구체적 파일 업로드 승인.
- 2026-10-01 사용자 대체 서류 문의1 선택. Apple Developer Support 실제 멤버십 및 계정→계약 및 계약서→이메일 양식에서 docs/ios-release.md 문의 초안을 입력/문자열 일치 확인. 계정 정보 원문·신분증·서류 첨부 없음, 메시지 보내기 미실행. tab8문의/tab7증빙 인계, 발송 내용·기존 회원 이름/계정 이메일 전달 확인부터 필요. T03/최종 DSA 신고/심사 제출 미완료.
- 2026-10-01 최신: 사용자 이메일 코드 입력 완료 보고, 실제 확인 문서 언어 단계 관찰. 한국어 선택/Next→이름 확인 문서(비즈니스/법원 문서 사본, PDF/JPEG/PNG max10MB). 특정 파일/Apple 업로드 승인 없으므로 개인 파일 검색·선택·업로드 미실행. 다음은 증빙 준비/업로드 승인 또는 사용자 직접 업로드; 최종 연락처 검토/법적 확인은 별도. ignored asc-dsa-name-document-required.png. T03 전체 notdone.
- 2026-10-01 공개 승인2 후 기존 주소/심사 전화/지원 이메일만 입력, Next로 이메일 확인 단계 진입. 실제 인증 iframe heading/code textbox6개 확인. 연락처 원문/OTP 미저장, 최종 동의 미승인. 입력 DOM 완전일치 검사 false(원인 미확정)이므로 최종 연락처 육안 검토 필수. ignored asc-dsa-email-verification-title.png 및 빈 인증칸만 캡처. 이메일/전화 인증·증빙·최종 신고·Task 완료는 아직 아니다.
- 2026-10-01 최신 위임 요청으로 거래자 선택 및 Next를 다시 실행해 빈 연락처 입력7개/Next 비활성화 확인. 공개 대상 연락처의 구체적 승인부터 필요, 기존 회원 주소/심사 전화 임의 복사 없음. ignored asc-dsa-contact-agent-start.png. T03 전체 완료/최종 DSA 동의/심사 제출 없음.
- 2026-10-01 사용자 후속1: 공개용 연락처를 Apple에서 직접 입력·인증하는 방식 선택. 실제 연락처 확인 모달 표시를 재확인하고 인계했으며 완료 확인은 아직 없다. dsaContactHandoff는 방식 선택과 완료 여부를 분리하고 원문 값은 저장하지 않는다. 최종 신고/심사 제출 아님; T03 in_progress 유지.
- 2026-10-01 DSA 후속: 사용자1로 향후 광고 수익·사업·홍보 목적 확인. 거래자 경로 선택/Next 후 연락처 입력 모달 실제 확인, 모든 주소/전화/이메일 필드는 비어 있음. 연락처 원문 입력·회원정보 복사·공개·검증·증빙 업로드·최종 신고 없음. 사용자 Apple 직접 입력을 권장; 최종 신고 동의는 별도. 개인정보 없는 모달만 캡처 output/store-review/asc-dsa-contact-entry.jpg. 전체 T03/커밋 미완료.
- 저장 재검증: 콘텐츠 모달 완료 외에 상위 앱 정보 페이지 저장까지 실행해 ‘저장 완료’를 확인하고 reload 후 필요한 권한 문구 유지 확인. 저장 후 원래 ‘저장’ 버튼이 돌아올 것으로 예상한 locator wait는 실패했지만 실제 ‘저장 완료’ 응답을 읽고 정상 저장으로 확인했다. 게시/권한 저장의 중간 화면을 영구 저장 증거로 단정하지 않는다.
- 2026-10-01 콘텐츠 후속 검증: test:release10/10, 공개 페이지 안전22/22, git diff --check exit0(LF/CRLF 알림만) 통과. 콘텐츠 저장과 지역 규정 미완료를 구분하는 회귀 검사 추가. T03 전체 완료/커밋/푸시/공식 방침 보완 배포/심사 제출은 미실행.
- 2026-10-01 콘텐츠 후속: 사용자1로 캐릭터 자체 제작/AI 생성 및 배포 권한 확인. 자체 생성 오디오/사용자 닉네임 공개를 대조해 ASC USES_THIRD_PARTY_CONTENT 저장, 모달 닫힘과 필요한 권한 문구 확인. 이는 타사 게임 원본 사용이나 법적 독립 검증/Apple 승인 진술이 아니다. Business DSA 자격 선택 둘 다 미선택, 사업/수익화 목적 사용자 확인 전 신고 금지. Korea compliance 안내도 미완료이며 세부 미확인; 무료 계약 활성, 유료 미서명. 공식 방침 보완 재배포/지역 규정/최종 체크리스트 남아 T03 in_progress/완료 커밋 없음.
- 2026-10-01 최신: 사용자 개인정보 초안1 승인과 별도 게시 동의 후 ASC 공개표 게시 완료. 실제 ‘몇 초 전에 게시함’/7유형/기능목적·계정연결 확인; 추적no 설정 저장. 증빙 ignored asc-privacy-published.jpg, privacy-approval.json의 승인 범위와 게시 동의 기록. 한영 방침 보완 로컬 적용/기존 삭제·보존·연락처 유지, test:release9/9·페이지 안전22/22·web:verify passed. 공식 사이트 보완 재배포 미실행, 콘텐츠 권한 미선택/이미지 사용권 확인부터 필요. 지역 규정·최종 체크리스트/별도 심사 제출 게이트 남음, T03 in_progress/전체 완료 커밋 없음. 아래 미게시/승인 대기 문장은 당시 기록이다.
- 2026-10-01: 사용자 준비 계속 요청으로 공개 방침의 IP 기반 대략 위치·진단·계정 로그 한/영 보완 문구를 privacy-inventory에 작성했다. HTML/공식 사이트/ASC 변경 없음. 개인정보7유형·목적·연결·추적 답변과 방침 보완의 명시적 저장·게시 승인부터 확인한다. 최종 심사 제출 승인으로 확대하지 않는다. 실제 test:release8/8와 diff-check 통과, T03 전체 완료/커밋 없음.
- 최종 후속: 사용자가 GitHub OAuth를 직접 승인해 로그인 완료. 실제 운영 finalize 로그의 IP·도시/국가/지역·계정 subject·처리시간 존재 및 위도/경도 null 확인. 원문 값 미기록, 읽기만 수행. privacy-inventory에7유형/기능목적/연결yes/추적no 초안 작성. 사용자 초안 승인·공개 정책 일치 검토가 남아 ASC 데이터 유형 미저장/미게시. test:release8/8 및 diff-check 통과.
- 최신 후속: 사용자가13+ 초안 저장 승인, ASC 저장 완료/설문 닫힘 및 글로벌13+172개 지역·대한민국12+·베트남12+ 확인. 기존 모로코·아프가니스탄 제한 유지. 아래 연령 승인 대기는 과거 기록이다.
- 운영 Auth DB 감사 로그 SELECT-only 조회0건/boolean null. 외부 로그 없음으로 해석하지 않는다. Supabase 브라우저 로그인은 GitHub OAuth 이메일 읽기 권한 승인 화면에서 사용자 인계 중. App Privacy 수집 항목 미저장/게시 없음. 공급자 실제 로그 범위·콘텐츠 권한·지역 규정·최종 체크리스트 남음. T03 in_progress, 완료 커밋·심사 제출 없음.
- 最新: 사용자가 파일의 한·영 name/subtitle/promotionalText/description/keywords를 승인했다. listing-approval.json의 정규화 해시로 원문을 고정했다. ASC en-US/ko-KR 설명·프로모션·키워드와 부제, Games/Casual을 저장했다. 버전 화면 재방문 후 두 언어의 설명/프로모션/쉼표 키워드 SHA-256이 로컬과 일치함을 확인했다.
- 무료 가격 AUTO_FREE/0 및 출시 후 175개 국가 사용 가능 설정, 미검증 Mac/Vision Pro opt-in 해제를 저장했다. 이는 즉시 출시 또는 모든 국가의 법적 허가 완료가 아니다. 연령 설문 초안은 UGC yes/시합 frequent/그 외 없음으로13+ 계산, 모로코·아프가니스탄 제한 표시. 최종 저장 전 사용자 승인 대기(실제 저장/등급 확정 아님).
- 공개 support/privacy 한·영 내용 확인, privacy URL을 en-US/ko-KR 각각 저장했다. App Privacy 수집 설문/게시, 콘텐츠 권한·DSA·지역 허가 및 최종 누락 경고 검토는 남았다. test:release8/8 passed; 심사 제출·공개·Task 완료 커밋 없음.
- 사용자 “다 해줘”로 남은 등록 준비 계속 진행한다. 미확정 문구/설문은 여전히 근거 확인과 사용자 최종 검토를 거친다. 영어 초안은 새 en-US/metadata.json에 한국어 description의 정확한 번역과 실제 한국어 UI 안내를 작성하고 승인 전 원격 저장하지 않는다.
- 추가 연락처: 사용자가 Apple 심사 연락처용 전화번호를 제공해 국제 형식으로 입력, 공개 승인 이메일·Insoo Jeong과 함께 저장했다. reload 후 이름 유지와 전화/이메일 비어 있지 않은 마스킹 표시 확인. 브라우저가 원문을 가려 값의 정확한 일치까지 독립 확인한 것으로 표현하지 않는다. 번호 원문은 저장소에 남기지 않았다. test:release 8/8 passed. 아래 전화번호 대기 문장은 과거 기록이다.
- T02 사용자 확정 범위 완료496b133 후 진행. 삭제·재설치 2개 not_run/전체 QA pending을 보존한다. 현재 앱·계정·기록 초기화나 staging 재개는 하지 않는다.
- 로그인된 앱6815771701 배포 버전1.0에 1.0.0(6), Apple build103a4776-f5b9-4ef1-9428-8f72ea8c1539를 연결했다. 수동 출시·지원URL·2026 Insoo Jeong·로그인 필요 해제를 저장하고 reload 후 값 유지 확인했다. 로그인 해제는 심사 데모 계정 필요 여부이며 서버 인증 비활성화가 아니다.
- 승인된2868×1320 PNG5장을 기본 en-US의 iPhone6.9 슬롯에 업로드했다. 병렬 전송 완료 순서가 바뀌어 접근성 키보드 정렬로 gameplay→characters→home→ready→pause 순서를 맞췄고 reload 후5장/순서 유지 확인. 6.5는6.9 자산 재사용 표시다. 공개 게시·App Review 제출 아님.
- evidence: ignored output/store-review/asc-screenshots-saved.jpg, store/screenshots/approval.json.uploadEvidence. 업로드 파일은 승인된 원본 그대로이며 이미지 픽셀 변경 없음.
- 현재 설명·키워드·프로모션은 기본 영어 칸에 미입력, ko-KR 추가/승인된 한국어 description 입력도 아직 안 했다. 영문 자료가 없고 P01-T03 초안/최종 문구 승인 게이트 유지. 가격/국가·연령등급·App Privacy는 이번에 설정하지 않았다. 심사 연락처 전화번호는 사용자 직접 입력 권장 질문을 보냈으며 전화번호 추측/기존 비공개 데이터 복사 없음.

## Goal

최신 검증 빌드를 App Store Connect 앱 버전에 연결하고 필수 가격/국가·한/영 소개·스크린샷·지원/개인정보 URL·연령등급·개인정보 답변을 실제 앱과 맞춰 검토 가능한 상태로 만든다. 사용자의 최종 승인 없이 Submit for Review를 누르지 않는다.

## Decision Summary
- 최초 전 세계 요청에서 2026-10-01 EU27개국 보류 후 사용자1로 중국 본토/베트남도 제외: 총29개 제외/146개지역 선택. 무료, IAP 없음, 수동 공개, `2026 Insoo Jeong`, 지원 `mocca3232@naver.com`. 제외는 허가 취득이나 계정 DSA 완료가 아니다.
- 스토어 소개 문구는 사용자의 마지막 확인 대상이고 Privacy Nutrition Label 답변은 `store/privacy-inventory.md`와 실제 SDK/서버 운영 확인을 기반으로 한다.

## Implementation

### I01. Connect 메타데이터·정책 답변
- Related Files:
  - `store/ko-KR/metadata.json` :: 기존 한국어 description 승인 원문 보존, 사용자 승인 후 다른 문구 상태만 반영
  - `store/en-US/metadata.json` :: 미존재 영어 번역 초안 작성(new), 최종 사용자 승인 후 등록
  - `store/release-inputs.json` :: 사용자가 명시 승인한 가격·지역·공개 연락처만 반영
  - `store/listing-approval.json` :: 한·영 등록 문구 승인 범위와 정규화 필드 SHA-256(new), 심사 제출 승인과 분리
  - `store/connect-checkpoint.json` :: 실제 UI/재조회 필드와 미확정 항목의 증거(new), 비공개 연락처 제외
  - `scripts/sql/store-privacy-audit.sql` :: 운영 Auth 로그의 컬럼·존재 여부만 읽기 확인(new), 원문 IP/사용자 ID/토큰 출력 금지
  - `scripts/release-preparation.test.mjs` :: 한·영 길이 제한·승인 해시·확정 운영 입력 검증
  - `store/privacy-inventory.md` :: 데이터 항목 근거; read-only/modify only for verified changes
  - `store/privacy-approval.json` :: 사용자가 승인한7유형·목적·연결·추적·한영 보완 문구와 별도 제출 게이트 기록(new)
  - `web-static/privacy/index.html` :: 승인된 IP 기반 대략 위치·진단·인증 로그 설명만 한영 추가, 기존 삭제·보존·연락처 보존
  - `store/release-state.json` :: `reviewStatus`, 연결된 buildNumber, `releaseMode`; modify after evidence
  - `store/screenshots/approval.json` :: 업로드 대상 언어·디스플레이·순서와 reload 증거; modify after actual upload
  - `docs/ios-release.md`, `docs/learning-notes.md` :: UI 입력/검증 기록; modify selectively
- **Signatures & Types**: Connect 체크 `{field:string, expected:string|boolean, observed:string|boolean|null, status:'passed'|'failed'|'not_run', source:string}`. 기존 `release-state` schemaVersion 1 유지. 비밀 세션/API 토큰·개인 계정 식별자는 저장하지 않는다.
- **Data & Schema Fields**: 가격 `free`, availability `worldwide`, release mode `manual`; locale `ko-KR`/`en-US`; copyright `2026 Insoo Jeong`; support/privacy URLs; iPhone landscape screenshots; `madeForKids:false` 초안은 실제 연령등급 답변과 일치시켜야 한다. 익명 인증 ID·닉네임·점수/사용 데이터·신고·공급자 로그 여부는 App Privacy 질문별로 사실 확인한다.
- **Execution Flow / Logic**:
  1. 사용자가 App Store Connect에 직접 로그인한다. 기존 앱 `6815771701`, bundle ID, 팀을 읽기 확인하고 다른 앱에 입력하지 않는다.
  2. 실제 공개된 support/privacy URL을 브라우저에서 열어 연락처·삭제 안내를 확인한다. 한/영 텍스트를 사용자에게 보여 최종 확인받는다.
  - P01-T03의 draft를 최종 사용자 확인 전 `user_approved`로 바꾸지 않는다. 이 단계에서 실제 문구 승인 사실을 파일 상태/증거에 반영한다. 승인 없는 소개 저장·심사 제출은 하지 않는다.
  3. 현재 빌드번호를 버전에 연결하고 실제 iPhone 캡처, 설명/키워드/부제, 카테고리, 연령등급, 광고/IAP 없음, 가격/국가, 수동 출시를 저장한다. Apple이 요구하는 추가 개인정보·수출 규정·콘텐츠/권리 질문은 현행 화면과 코드 근거를 대조해 답한다.
  4. App Privacy 답변은 목록대로 소스/서버 확인을 기록하며 '수집 없음'을 자동 선택하지 않는다. 원본 이미지 저작권·게시 권한, 신고/삭제 운영 연락 경로를 확인한다.
  5. 화면의 누락 경고를 모두 검토하고 제출 직전 화면/체크리스트를 사용자에게 공유한다. 이 Task의 기본 종료는 **ready_to_submit**이지 심사 제출/승인/공개 완료가 아니다.
- **Error & Exception Handling**: App Store Connect 접근권한/인증/Apple 서버 오류, 누락 캡처, 법적/개인정보 미확정 답변은 `blocked`로 남긴다. 추측으로 답변하거나 유료 플랜/팀 변경·새 앱 생성·심사 제출을 하지 않는다.
- **State Transition & Return**: 사용자 승인 대기 중인 정확한 제출 후보 버전과 Connect 필드 증거.

### I02. 학습 기록
- Related Files: `docs/learning-notes.md` :: 바이너리/스토어 메타데이터/공개 URL의 독립 배포와 App Privacy 판단; modify.
- 왜 카테고리·가격·출시 모드가 빌드 파일과 별도로 설정되는지, 왜 익명 ID도 수집 데이터일 수 있는지 기록한다.

## Acceptance Criteria
- [x] 정확한 빌드/앱에 필수 메타데이터·지원/개인정보 URL·실제 캡처가 들어가 있다.
- [x] 가격·승인 지역 제외·수동 출시·연령/개인정보 근거와 미완료 DSA를 분리 기록했다. Apple 접수는 법적 허가 증거가 아니다.
- [x] 기존 사용자 소개 승인과 최신 최종 제출 직접 요청을 근거로 사전 검증/체크리스트를 확인하고 별도 승인 이후 실제 접수했다.

## Validation
- App Store Connect 앱/버전 화면 필수 필드/경고 및 빌드번호 readback.
- 브라우저에서 공개 support/privacy URL HTTP/내용 확인.
- `node --test scripts/verify-web.test.mjs` — 공개 페이지 안전 경계 회귀 검사.
- `npm.cmd run test:release` — 로컬 메타데이터·브랜딩 제한.
- `git -c safe.directory=D:/GrillmeEDU diff --check`.

## Learning
- 개념: App Store Connect 메타데이터와 IPA의 분리, 데이터 공개표의 실제 수집 기준, 수동 출시와 심사 제출의 차이.
- 예상 디버깅: 다른 ASC 앱 선택, Apple 계정 401, 정책 URL 404, 초안 문구와 버튼 불일치.
- 복습 질문: IPA만 올리면 App Store 공개가 되지 않는 이유는? 개인정보 답변에서 로컬 데이터와 서버 데이터를 왜 나눠 보는가? 수동 공개는 언제 작동하는가?

## Commit Message
```text
docs(store): record App Store review-ready verification

Plan: 2026-09-29-app-store-review-prep
Phase: P02-ios-delivery
Task: T03-review-ready

- Reconcile Connect listing, privacy and release settings with the tested build.
- Record explicit user approval gate before review submission.
```

## Progress
- [x] Connect 준비·사용자 최종 제출 요청 및 실제 접수 완료
- [x] 검증·범위 한정 완료 커밋
- commit: this T03 completion commit using the blueprint message
