# iOS 출시 준비와 Expo Go 검사

## 2026-10-01 · App Review 실제 제출 완료

- 사용자 “앱심사 제출까지 가자” 승인 후 버전1.0/빌드6/자료·수동 출시 확인, 심사에 추가와 실제 최종 제출을 각각 수행했다. Apple “1개의 항목 제출됨” 및 상세 iOS1.0/1.0.0(6)·심사 대기 중·2026-10-01 11:37 확인. AppReview ID `3d829fe4-2709-47fd-9708-016771fa9d3f`는 EAS upload ID와 다르다. ignored asc-review-submitted-receipt.jpg/asc-review-submitted.jpg.
- 초기 자동 권한 검토 시간 초과 뒤 현재 초안 상태를 읽고 단 한 번 재시도했다. 접수 후 취소·재제출 없음. 무료/IAP없음/수동 출시/승인 지역 제외/DSA 별도 문의 및 미검증 QA는 그대로다. 승인/공개 완료가 아니며 새로운 약관 동의·DSA 신고를 수행하지 않았다. 아래 미제출 문장은 과거 기록이다.
- 상세 학습: [App Review 접수](learning-notes/2026-10-01-app-review-submission.md). 심사 결과 확인과 승인 후 수동 공개는 향후 사용자 요청에서 진행한다.

## 2026-10-01 · 중국 본토·베트남 이번 출시 제외

- 사용자1 승인으로 정확한 앱6815771701의 두 지역만 선택 해제/2지역 제외 확인 후 reload했다.146개지역 선택·중국 본토/베트남 사용 불가·EU27 보류 유지, 한국/미국/대만/홍콩 유지. `release-inputs.json` 제외29개 ISO3와 `connect-checkpoint.json`을 맞췄다. ignored `output/store-review/asc-china-vietnam-deferred.jpg`.
- 실제 허가를 취득하거나 임의 번호/증빙을 입력하지 않았다. `chinaVietnamPermits: not_run`은 유지하고 지역 제외만 완료로 기록한다. 새 IPA 필요 없음, App Review 제출/공개 없음. 남은 공식 방침 보완 배포/계정 DSA/최종 경고·체크리스트는 별개다. 과거148지역 기록은 EU만 보류한 당시 상태다.

## 2026-10-01 · 한국 연락처 확인 완료

- 사용자 이메일 확인 완료 보고 후 실제 대한민국 전자상거래법 행은 한국/2026-10-01/활성화됨이며 한국 미완료 배너가 사라졌다. 세부 조회에서 `mocca3232@naver.com`과 한국 App Store 제품 페이지 공개 안내를 확인했다. 이전 마스킹된 입력값의 불일치와 최종 저장값 표시 확인은 별개로 기록한다. 에이전트 인증코드 입력/최종 동의 클릭 없이 실제 결과를 읽었다.
- `koreaCompliance: passed`는 이 연락처 절차의 활성화 증거이며 DSA 신고·중국/베트남 허가·앱 심사 제출 완료는 아니다. 개인정보 없는 행 증거 ignored `output/store-review/asc-korea-compliance-active.jpg`. 다음은 허가 미확인 두 지역의 배포 유지/보류 선택이다.

## 2026-10-01 · 한국 공개 이메일 승인과 인증 인계

- 사용자가 한국 공개 연락처로 `mocca3232@naver.com` 사용에 동의하고 사업자가 없다고 확인했다. 실제 한국 모달 입력/BRN 없음(NO) 선택 후 Next로 Apple 인증 iframe의 `Enter verification code`·입력6칸까지 진행했다. 아직 사용자 직접 코드 입력·최종 이메일 검토/확인은 남았다. 입력값이 readback에서 마스킹되어 정확한 문자열 대조 성공으로 주장하지 않는다.
- `koreaContactApproval`의 공개 동의/BRN 없음/실제 선택과 인증 미완료를 구분한다. 코드/신분 증빙·등록번호 원문은 저장하지 않는다. 개인정보 없는 증거 ignored `output/store-review/asc-korea-email-verification.jpg`. EU 제외/기존 문의 유지, 앱 심사 제출 아님.

## 2026-10-01 · EU27개국 보류와 나머지 심사 준비

- 사용자 요청으로 이 앱만 EU27개국 선택 해제/제외 확인 후 재조회했다.148개지역 선택 및 EU27행 모두 사용 불가; 한국·미국·영국·노르웨이·스위스 유지. `store/release-inputs.json`의 제외 ISO3 목록과 Connect 증거를 맞춘다. 다른 앱/기존 문의/계정 거래자 상태 변경 없음. ignored `output/store-review/asc-eu-deferred.jpg`.
- [Apple DSA 안내](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)는 비EU 배포에도 거래자 상태 신고가 필요하다고 설명한다. 지역 제외가 신고·증빙 검증 완료나 제출 가능 보장이 아니다. EU 증빙만 보류하고 남은 신고 경고는 실제 최종 준비 화면에서 확인한다.
- 한국 실제 모달에는 연락처 이메일 및 ‘대한민국 거주/유효BRN 개발자’ 예·아니요 질문이 있다. 아직 선택/입력/확인하지 않았다. 지원 이메일을 한국 공개 연락처로 쓰는 동의와 BRN 존재 여부만 질문했다. [Apple 한국 안내](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-korea-compliance-information).
- 중국 ICP/베트남 게임 허가는 앱 정보에서 설정되지 않은 상태다. [Apple 지역 요건](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)은 중국 게임 승인번호 및 베트남 게임 허가를 설명한다. 두 국가 제외나 허가 준비는 별도 사용자 선택 필요, 임의 서류/번호 입력 금지.
- 기존 빈 심사 메모에 가로/Korean UI, 조작, 첫 닉네임 설정 경로, 온라인 익명 인증·랭킹, 신고/숨기기·온라인 삭제·정책 링크, 캐릭터 해금, 광고/IAP 없음 안내를 저장했다. reload 후 전체 문자열 일치, ignored `output/store-review/asc-review-notes-saved.jpg`. 심사 제출은 하지 않았다.

## 2026-10-01 · Apple DSA 증빙 문의 접수 완료

- 사용자1이 아래 문의와 현재 회원 이름/Apple 계정 이메일의 Apple 지원 전달을 승인했다. 초안 문자열 일치·발송 버튼 활성화를 확인하고 한 번 발송했다. 실제 접수 화면의 감사 문구·케이스 생성·이메일 회신 안내를 확인했다. 계정 이메일/케이스 ID 원문은 저장하지 않는다. 개인정보 없는 증거: ignored `output/store-review/apple-dsa-support-sent.jpg`.
- 상태는 `submitted_awaiting_reply`이며 답변/허용 서류 확인/증빙 업로드/DSA 최종 신고/앱 심사 제출은 아직 아니다. 답변의 인정 서류·가림·번역 기준을 확인한 뒤 실제 발급 서류와 구체적 업로드 승인을 받아야 한다. 아래 미발송 기록은 초안 당시 상태다.

## 2026-10-01 · DSA 개인 증빙 지원 문의 초안

- 사용자에게 사업/법원 증빙이 없으며 대체 허용 서류를 Apple에 문의하는1번 경로를 선택했다. 실제 Apple Developer Support → 새로운 문제 → 멤버십 및 계정 → 계약 및 계약서 → 이메일 양식에 아래 초안을 입력하고 문자열 일치 확인. 아직 메시지 보내기 미실행/답변 없음. 신분증·주소·전화 원문 및 회원 이메일은 저장하지 않는다. 지원 답변으로 허용 여부와 가림 범위를 확인하기 전 임의 증빙 생성/업로드하지 않는다.

문의 제목: 개인 개발자의 DSA 거래자 이름·주소 증빙 대체 서류 문의

안녕하세요. 대한민국에서 Apple Developer Program 개인 회원으로 등록되어 있으며, EU App Store 배포를 위해 DSA 거래자 정보를 확인하는 중입니다.

App Store Connect에서 문서 언어를 한국어로 선택한 뒤 “이름 확인 문서” 단계에 진입했습니다. 화면에서는 이름을 확인할 수 있는 비즈니스 문서 또는 법원 문서 사본을 요구하지만, 현재 해당 서류를 보유하고 있지 않습니다.

아래 사항을 안내해 주시기 바랍니다.

1. 개인 회원은 이름 확인용으로 어떤 대체 서류를 제출할 수 있나요? 정부 발급 신분증 또는 증명서도 허용되는지, 허용되는 서류의 정확한 명칭을 알려 주세요.
2. 주소 확인에는 어떤 공식 서류가 허용되나요? 이름 확인과 주소 확인에 동일한 서류를 사용할 수 있나요?
3. 주민등록번호, 신분증 번호, 생년월일 등 불필요한 개인정보를 가려도 되나요? 반드시 보여야 하는 항목을 알려 주세요.
4. 한국어 서류의 영문 번역이나 공증이 필요한가요? 계정의 영문 이름과 한국어 서류의 이름은 어떻게 대조하나요?

실제로 발급받은 허용 서류를 준비한 후 제출하고자 합니다. 안전한 제출 방법과 기준을 안내해 주시면 감사하겠습니다.

- 공식 문의 경로: https://developer.apple.com/contact/ . 지원 답변은 아직 없으며, 특정 서류가 수락된다는 뜻이 아니다. 문서 문의와 DSA 최종 신고/앱 심사 제출은 별도다.

## 2026-10-01 · DSA 공개 연락처 단계 인계

- 사용자가 향후 광고 수익·사업·홍보 목적을 확인했다. 거래자 경로 선택 후 공개 주소/전화/이메일 입력 모달로 진행했다. 실제 필드 모두 비어 있음, 기존 회원/심사 연락처 복사나 새 정보 입력 없음. 검증/증빙/최종 신고/앱 심사 제출도 하지 않았다.
- 공개용 연락처 승인과 최종 준수 확인은 사용자 직접 진행을 권장한다. private 회원정보가 배경에 보여 모달 부분만 캡처한 ignored asc-dsa-contact-entry.jpg로 인계한다. T03 in_progress, 완료 커밋/정책 보완 공식 재배포 대기 유지.

## 2026-10-01 · 콘텐츠 권한 저장, EU 자격 신고 대기

- 사용자 캐릭터 자체 제작/AI 생성·배포 권한 확인과 자체 합성 오디오 근거 확보. 랭킹에 다른 사용자의 닉네임 표시가 있으므로 ASC 콘텐츠 권한은 필요한 권한 있음으로 저장하고 모달 닫힘/실제 문구 확인했다. ignored asc-content-rights-saved.jpg. 심사 승인이나 독립적인 권리 심사 결과는 아니다.
- Business 화면은 DSA 거래자 자격 신고 및 Korea compliance 안내를 표시한다. DSA 선택은 둘 다 미선택, 사용자 상업/사업 목적 확인 필요. 계정의 비공개 주소/전화 원문을 기록·공개하지 않았고 계약 서명/신고 제출도 하지 않았다. T03·정책 보완 공식 배포·지역 요건·최종 제출 게이트 계속 미완료.

## 2026-10-01 · App Privacy 공개표 게시 완료

- 기존 ASC6815771701의7개 수집 유형을 기능목적/계정연결/추적no로 승인받고 저장했다. 사용자 게시 동의를 별도로 받은 뒤 게시 완료 문구를 실제 확인했다. ignored output/store-review/asc-privacy-published.jpg, store/privacy-approval.json 및 connect-checkpoint.json에 근거 기록. 심사 제출/공개 출시는 아니다.
- 승인 정책 보완은 한영2문단/날짜만 로컬 적용; release9/9·페이지 안전22/22·기존dist web:verify passed. 이 보완의 공식 사이트 재배포는 아직 미실행, 새 IPA는 생성하지 않았다. 콘텐츠 권한/지역 규정·최종 검토가 남아 T03 in_progress/완료 커밋 대기, 전체QA pending/삭제·재설치 생략 유지.

## 2026-09-30 · 최신 설정 링크·성실 아이콘 TestFlight 1.0.0(6)

- 소스 `09a7a0949efc21554fee29a3e77e14c18328efe3`(089c8bd 포함). archive112파일 전부 커밋 blob과 일치, untracked/비밀/로그0. 기존 dirty 작업 보존. branding/release8/type/ranked8 통과, 직전 runtime700 tests 유지.
- build `3fd87f8b-5d8e-479a-8fc8-e7cc3a8de37a` FINISHED2026-09-30T02:23:28.174Z,1.0.0(6). 정확한 이 ID를 ASC6815771701로 제출한 `e0347b70-45bb-4aac-a9f2-d76c8d8cf60d`도 FINISHED2026-09-30T02:24:43.663Z.
- Apple 최종 재조회에서6번 processingState=VALID/internalState=IN_BETA_TESTING/externalState=READY_FOR_BETA_SUBMISSION/expired=false 확인(uploadedDate2026-09-30T11:25:45+09:00). 내부 TestFlight 테스트 상태이며 실제 기기 설치·QA는 미확인. 사용자 기기에서6번 업데이트 후 아이콘/설정 링크·Safari 복귀/걷기·터치/닉네임 안내를 확인한다. App Review/공개 출시/외부 초대/웹 재배포는 실행하지 않았다.
- remote 서명 재사용·freeze-credentials, production 공개2변수 확인, 모의 광고·replay진단off. 이전5번 상태는 store/build-history/2026-09-29-build5.json에 보존했다. 로컬 app.config 번호1이 아니라 원격 번호6으로 실제 IPA를 식별한다.

## 2026-09-30 · 공개 페이지 게시 및 앱 링크 구현

- `03c6753`/Actions36655593459의 공식 웹 재배포 성공. support/privacy HTTP200·소스 hash 일치·원격 브라우저6 통과.
- 설정 하단의 개인정보처리방침·고객지원과 랭킹 문의를 공통 공식 주소에 연결했다. Expo Go 지원 유지, 새 SDK 없음. Jest700/50 suites·타입/ranked8/release8·웹 링크3 통과.
- 앱 링크는 로컬 소스 구현/검증이며 이 최신 코드의 웹 재배포/IPA 업로드는 아직 미실행이다. 실제 iPhone Safari 복귀, 새 아이콘/화면 캡처·개인정보 설문·소개 최종 승인은 후속 출시 Task에서 확인한다.

## 2026-09-30 · 공개 안내 페이지 준비

- 사용자 승인된 운영자 `Insoo Jeong`/지원메일로 한·영 지원·개인정보 HTML을 준비했다. `web:export`가 정적 페이지를 포함하며 `web:verify`와 Pages CI가 누락·base·알려진 비밀/추적 리소스를 검사한다.
- 로컬 격리 운영 export, 페이지 Node22/release8/타입·ranked8/브라우저6 통과. 기존 dist는 보존했다. 공식 공개 URL의 활성 여부는 원격 배포 완료 후 별도로 기록한다.
- 앱 내 개인정보 링크·기존 랭킹 지원 링크 연결, 공급자 로그/백업·지원메일 보관 설정, 실제 최신 TestFlight 캡처·개인정보 설문/최종 문구 승인은 남았다. HTML/웹 검사만으로 App Store 심사 준비 완료라고 하지 않는다.

## 2026-09-28 · 위험 효과음 제거 — 1.0.0 (4) 제출 예약

- 사용자 요청: 새 빌드 제출 후 TestFlight 표시/설치 가능 여부는 사용자가 확인한다. 반복 모니터링/Apple 처리 확인은 수행하지 않는다.
- 소스 `d8e8dbd14107670e7b08ac1fcab2c90175a746bd` (6c2bd59 포함), 새 빌드 `f8d4ccb3-edc9-41af-99a9-11843efc33a3`, 제출 `eb4df011-0fc4-4f21-8569-8f92218306ae`. EAS가 1.0.0/build4 생성 및 제출 예약을 접수했다. 클라우드 완료/Apple 업로드 성공/설치 가능 상태는 아직 미확인이다. release-state의 submittedAt은 업로드 성공 증거가 없으므로 null, testflightStatus는 not_started를 유지한다.
- 변경: 위험 효과음/플레이어만 제거, 위험 진동·다른 소리 유지. 직전 전체676/45suites, 이번 release7/ranked8/env10 및 공개 GET200/rules 일치. 기존 dist 검사는 환경 경계 확인이며 새 웹 배포가 아니다.
- 실제 archive201파일/비공개경로0/소스·설정8파일 해시 일치 후 사본만 삭제. EXPO_NO_DOTENV=1, EAS production 공개변수2, 광고/진단 false. 기존 서명/요금제 유지. Apple 프로필 재검증401은 기존 로컬 검증 결과로 진행됐으며 새 인증서 발급은 하지 않았다.
- 기존3번의 빌드 FINISHED06:00:29.820UTC, 제출 FINISHED06:02:13.117UTC를 읽기 재확인했다. 3번을 재제출하지 않았다. 새4번은 완료 여부를 추측하지 않는다. App Review/GitHub push/웹 재배포 없음.

## 2026-09-28 · 오디오 전환 개선 TestFlight 업데이트

- 사용자 피드백off 비교에서 개선보고, 중복오디오처리수정과업로드승인. 소스8e5f95ca5a1af835a807d2215c39a92fc07742c2, EAS build32b1ca9b-eb95-4fc1-b675-b8d1c0144500,1.0.0(3). 물리/광고/햅틱정책/래스터캐릭터변경없음.
- 신규회귀3개oldfail→대상15pass, 전체675/45suites, release7/types/ranked8/env10/운영publicGET200/rulesmatch. Archive201파일/인증·비공개경로0/주요7파일해시일치; 정확한검사사본만삭제. 이전dist는보존했고이번환경검사는기존production구성에대한검사이지새웹배포가아니다.
- EASproduction공개변수2로드, mock/diagnosticsfalse. Apple프로필재조회401후기존서명localvalidation으로계속됨; 자격재발급/요금제변경없음. 기존CLI24.7.0유지; TestFlight설명Enterprise옵션미사용.
- 이전build2 FINISHED05:08:39.350UTC, submissionbac21516-a95a-4811-bec4-977c50454df2 FINISHED05:10:28.745UTC(독립재조회). 새3번은오디오수정,2번은버튼/표시memo수정으로구분한다. 실기기FPS미측정, 사용자빌드번호미확인.

## 2026-09-28 · 터치 개선 TestFlight 업데이트

- 사용자 요청에 따라 터치 수정756c005 및 제출 설정을 포함한 소스4084834e0f54c8edaaa9dcc58c80fade722b0b7c로 새 빌드를 생성했다. EAS ID b679d4dc-c1c8-45f3-b401-6d7ba769e722, 버전1.0.0/원격 buildNumber2, 생성05:04:06UTC. 최초 확인 IN_PROGRESS; 기존1번을 재제출하지 않는다.
- 전송 전 archive201파일, 비공개/인증 경로0, 주요 소스·설정6파일 해시 일치. 검사 사본만 제거했다. release7/typecheck/ranked8/public-env10 및 운영 공개GET200/rules일치 확인; 직전 터치 변경 전체Jest672/browser2 통과 증거 보존. 광고/진단 false, production 공개변수2 로드 확인.
- 비대화형 Apple 프로필 재조회401 경고 후 기존 remote 서명(local validation active/2027-09-13만료)을 사용해 빌드 요청이 생성됐다. 인증서나 API키를 교체하지 않았다. `--what-to-test` 자동 설명 첨부는 Enterprise 한도 오류로 제출 예약 실패; 요금제 변경 없이 그 선택 옵션만 제거해 재시도한다. 업로드 완료·Apple처리·실기기 성공은 서로 구분한다.
- 이전 빌드5b46dbe0-2511-485a-aa05-386a3222dfb9 및 제출7efac989-7ff8-4768-9de0-b7e3de61a179는 재조회FINISHED, 이전 제출 완료2026-09-24T20:43:33.355Z. 기존 문서의 예약 대기 기록은 당시 시점이다.
- Build2는2026-09-28T05:08:39.350Z에 FINISHED(한국14:08:39). 제출 bac21516-a95a-4811-bec4-977c50454df2는 IN_PROGRESS. 로컬 `submit:status`는Apple API401이므로 앱이 없다고 해석하지 않는다. Apple 처리/설치 가능 상태는 아직 독립 확인되지 않았다.

업데이트 후 사용자 검사: TestFlight에 표시된1.0.0(2)인지 확인하고 앱을 삭제하지 말고 업데이트한다. 같은 기기에서 무입력/한쪽 길게 누르기/빠른 좌우 교차/양쪽 누른 뒤 한쪽만 떼기/일시정지 후 재개를 비교한다. iPhone 모델·iOS 버전·빌드번호·끊기는 상황을 함께 기록한다. 실기기 통과 전T03를done으로 바꾸지 않는다.

## 2026-09-25 · 실제 서명 확인과 업로드 요청

실제 실행: source commit `a54835786507e00eac6c366eda77262345fedf84` → EAS build `5b46dbe0-2511-485a-aa05-386a3222dfb9`, version1.0.0/build1 (2026-09-24 17:46:38UTC 생성). 원격 번호를 처음1로 초기화했고 이후 autoIncrement다. Expo Go 관련 권고 경고는 SDK57 개발방식을 바꾸라는 오류가 아니며 독립 앱 검증은 계속 필요하다. 비대화형 빌드는 Apple 서버의 서명 재검증을 건너뛰고 기존 인증서를 그대로 사용했다.

최종 archive199파일/필수입력원본일치, .git/env/키/비공개폴더제외 확인. config SHA256 `63a654695b60a2430508e101e596a6146b4852501fb293d0aa65d1dea84c367e`. 검사 사본v1..v4는 원본경로가 아님을 확인한 후 제거했다. release7/typecheck/Jest666/ranked8, 운영 공개GET200/rules일치 및 EAS 공개값2readback 통과.

저장된 공식 Apple 세션을 재사용해 새 ASC 앱 `6815771701` 생성, 동일팀 기존 API키를 EASSubmit에 연결했다. 비밀키 내용/쿠키를 열거나 저장소로 복사하지 않았다. `submit --id ... --no-wait --no-auto-testflight-setup` 실행에도 CLI가 `Team (Expo)` 내부 그룹과 소유자 접근을 만들었다. 외부 사용자를 초대하거나 App Review를 제출하지 않았다.

정확한 제출ID `7efac989-7ff8-4768-9de0-b7e3de61a179`, 생성시각2026-09-24 17:48:47UTC, 최초상태AWAITING_BUILD. 예약 성공은 Apple 업로드 완료가 아니다. 현재 상태는 store/release-state.json 및 아래 후속 기록을 따른다. 새 ascAppId 제출 설정은 바이너리를 바꾸지 않으므로 이것만으로 재빌드하지 않는다.

EAS credentials 읽기 조회로 bundle `com.mocca.closecallnyang`의 Apple Team `S9RLQ8474U`, 배포 인증서 및 active provisioning profile을 확인했다. 프로필은 조회 직전 갱신되어 있었고 두 항목 만료는 2027-09-13이다. 인증서/개인키를 다운로드하거나 재생성·폐기하지 않았다. 사용자가 TestFlight 업로드를 명시적으로 요청했다.

암호화 검토: 앱은 Supabase HTTPS 인증/요청을 사용하며 자체 암호화 프로토콜·VPN·암호화 메시징 기능은 없다. expo-crypto iOS의 digest는 Apple CommonCrypto, 포함된 AES 구현은 CryptoKit을 호출한다. 앱의 digest 사용은 개발 재현 검사이며 Supabase helper는 WebCrypto SHA-256을 사용한다. 플랫폼 암호화만 사용하는 현재 소스/의존성 검토에 따라 `ios.config.usesNonExemptEncryption: false`로 설정했다. 이는 HTTPS를 쓰지 않는다는 뜻이 아니며, 암호 라이브러리/기능 추가 시 다시 검토해야 한다. [Apple 기준](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations), [plist 의미](https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption).

빌드 준비 소스의 Team ID만 실제 확인값으로 반영했다. ASC 앱 ID는 아직 추측하지 않는다. archive 비밀 파일 제외·환경·검사 후 source-only commit → cloud build → 정확한 성공 build ID submit 순서. 빌드 성공·업로드 접수·Apple 처리 완료·실기기 QA는 각각 따로 기록한다.

## 2026-09-25 · 새 앱 선택 / P03-T02 준비 완료

사용자는 기존 App Store Connect 앱이 없어 새 앱 준비를 선택했다. **아직 Apple 앱 생성·서명·IPA 빌드·TestFlight 업로드를 실행한 것은 아니다.** 다음 P03-T03에서 공식 인증과 팀/앱 식별자를 실제 확인한다. 비밀번호/2FA는 채팅에 보내지 않는다.

- `assets/branding/icon.svg`는 회색 태비·정장·사원증·커피의 새 원본 아이콘 초안이다. 게임의 PNG 캐릭터는 그대로 유지했다. `npm.cmd run branding:render`로 sharp0.35.4를 사용해 RGB 불투명 1024/48 PNG를 생성한다. `branding:verify`는 재생성 없이 원본과 픽셀을 비교한다. 두 크기 육안 확인 완료, 사용자 최종 디자인 승인은 별도다.
- store/에 한국어 소개·심사 안내·개인정보 데이터 근거·실제 iPhone 캡처 계획을 저장했다. `status: draft`, 운영자/공개 연락처/가격/지역/Apple 식별자 null. 개인정보/지원 URL은 **예정 주소**이며 이번 export에도 아직 없다. App Review 전 실제 게시·문구 승인 필요.
- 기존 빈 EAS production 환경을 확인한 다음 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 두 개만 project/plaintext로 등록하고 CLI readback을 메모리에서 대조했다. Pages와 같은 운영 ref `fgojrxmpxpzdiwsktjsx`. 키 내용은 문서/출력/Git에 남기지 않았으며 서버 키는 등록하지 않았다. 광고/진단 false는 기존 eas.json 프로필 유지.
- 실제 검증: branding 생성·읽기검사/1024·48 이미지 확인, release 검사7, 전체 Jest666(44 suites), typecheck, Doctor21/21, ranked canonical8 통과. 개발 public config에 Pages baseUrl 없음·가로·iPhone-only·bundle/icon 정확.
- 올바른 production 공개 입력과 두 개발 flag=false로 `scripts/export-web.mjs`(web:export와 동일 진입점)를 실행했다. dist의 JS1/참조 asset17/불투명48프레임 ICO 검사 및 공개 설정·알려진 비밀 패턴 검사10 통과. 현재 로컬 dist는 운영 설정이며 **사이트 재배포는 하지 않았다**. 게임을 시작해도 온라인 참여/등록은 별도 사용자 행위다.
- 초기 web:verify는 PNG만 예상해 Expo의 ICO에서 실패했다. 실제 Expo 인코더의 16/32/48 BGRA 출력·마스크 생략 형식을 읽고 검사를 교정했으며 깨진/투명 ICO 회귀 검사를 추가했다. 서버나 게임 로직 문제는 아니었다.

남은 사항: Apple 인증·서명 권한·암호화 수출 답변 검토·빌드 업로드 archive 확인·실제 클라우드 빌드·TestFlight 처리 상태 확인·실제 iPhone/Hermes/온라인 QA. 기존 npm audit moderate10은 강제 변경하지 않았다. Go 실행과 독립 앱, TestFlight 업로드와 App Review는 각각 별도 검증이다.

## TestFlight 준비 · 2026-09-25 후속

- 사용자 요청으로 TestFlight 준비를 진행했다. EAS CLI24.7.0, 계정insoojeong; 실제 프로젝트 `315e87a2-f405-4f65-ae45-c91f1d2c59bf` 생성/연결 후 project:info의 `@insoojeong/close-call-nyang` 일치 확인.
- eas.json production은 store/remote version/autoIncrement, Node24.19.0 및 SDK57용 macos-tahoe-26.5-xcode-26.6 이미지. 광고/진단false, developmentClient 없음. submit.production은 실제Apple앱ID 미확인이라 빈설정이다.
- .easignore는 gitignore의기존보호를승계하고 작업노트/문서/서버코드 제외. 앱src/assets/test-fixtures는유지. 로컬공개env도업로드되지않으므로 EAS운영환경의URL/publishable설정을 별도로 검증하기 전 build하지 않는다.
- 타입/Expo설정20검사/EAS프로필·ignore2검사 통과. **아직IPA빌드/Apple로그인·서명/TestFlight업로드·처리를 실행하지 않았다.** 실제기기QA도미확인이다.
- 다음: 사용자에게이미질문한AppStoreConnect앱유무확인 → 기존P03-T02의아이콘/필수자료·EAS운영공개env → Apple공식CLI로그인·팀/앱ID확인 → 빌드/정확한buildID업로드. 기존앱중복생성금지, 인증코드/비밀번호채팅수집금지. AppReview제출은별도최종승인.

참고: [TestFlight 공식절차](https://docs.expo.dev/submit/testflight/), [SDK57 빌드이미지](https://docs.expo.dev/build-reference/infrastructure/), [.easignore 우선순위](https://docs.expo.dev/build-reference/easignore/). 지원URL/개인정보·스토어문구는공개심사전필수작업이며내부TestFlight 업로드와구별한다.

## 현재 상태 · 2026-09-25

- PC Expo 계정 insoojeong 확인. Expo57.0.24 ->57.0.25 권장패치 적용, SDK major/앱ID/서버규칙 불변.
- `expo install --check` 최신호환, `expo-doctor`21/21, typecheck/전체Jest665(44suites)/ranked8 통과. npm audit의 기존 moderate10건은 남아 있으며 강제수정하지 않았다.
- Metro8081 running/HTTP200, iOS manifest200/name·SDK57·bundleIdentifier 일치. 이는 빌드 준비 확인이며 실기기 실행통과가 아니다.
- ExpoGoQA pending: 실제기기/iOS/Go버전·관찰 결과 아직 미제공. EAS프로젝트/서명/TestFlight/심사 미실행. 기존유료Apple계정은 사용자보고이며 현재서명권한 검증은 별도.

## 실행

현재 실행한 서버는 dotenv자동읽기와 backend공개환경변수를 끈 local-only QA다. 재실행할 때 프로젝트 PowerShell에서:

```powershell
Set-Location D:\GrillmeEDU
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_PUBLIC_REPLAY_DIAGNOSTICS = 'true'
$env:EXPO_PUBLIC_ENABLE_MOCK_AD = 'false'
Remove-Item Env:EXPO_PUBLIC_SUPABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
npx.cmd expo start --go --lan --clear
```

기존서버가 켜져 있으면 중복실행하지 않는다. 같은네트워크에서 iPhone Expo Go에 PC와 같은계정으로 로그인하고 개발서버를 연다. 현재LAN주소는172.30.1.23:8081이며 네트워크변경 시 달라진다. 연결이안되면 오류문구를 먼저확인하며 방화벽전체해제나 무조건tunnel설치를 하지 않는다. [Expo공식SDK57 로그인 안내](https://expo.dev/changelog/expo-go-57-login).

## 실제 iPhone 체크리스트

검사기록에는 기종/iOS버전/ExpoGo버전/일시/사용자관찰임을 함께 남긴다. 현재 전항목 not_run.

- 실행: 가로화면/노치영역/오류없음, 결과버튼동일한세로배치·스크롤접근.
- 입력: 좌우/동시누름/교차/손뗌, 실패·재도전.
- 상태: 일시정지→홈→이어가기, 앱전환/잠금복귀 시 정지·수동재개·입력해제.
- 보존: 최고기록/설정/캐릭터가 앱을 완전히 닫고 재실행해도 유지.
- 기기기능: 음악/효과음/햅틱설정, 무음·오디오중단복귀, 공유완료/취소.
- 게임:15%커피/가속,51%실내,100%색상,장시간프레임/발열(약10분).
- 숫자재현: 제목화면 `재현 검사 (개발용)`→`현재 런타임 검사`, 3행runtime=hermes/passed=true. JSON에는fixture/rules/digest/fallTick만 있으므로 스크린샷으로 확인가능.

개발판은 코드상 `eligible: !__DEV__ && !flags.mockAdsEnabled` 때문에 운영랭킹제출 검사와 다르다. 이번에는 backend미설정이므로 랭킹미연결 안내가 나올 수 있다. 독립TestFlight에서 승인된환경으로 실제제출/오프라인큐/삭제를 별도검증한다.

## 배포로 넘어가기 전

실기기 결과확인 → 기존 PagesT03·개인정보/지원URL·아이콘/스토어자료·EAS설정 준비 → 서명된iOS클라우드빌드 → 정확한빌드TestFlight업로드/처리/실기기검사 → 앱스토어소개문구/최종심사제출사용자승인. ExpoGo테스트통과를 AppStore출시완료로 표시하지 않는다. TeamID/ascAppID/EASprojectID를 추측하거나 비밀번호/2FA를 채팅/문서에 저장하지 않는다.
# 2026-09-29 · 베테랑 냥대리 TestFlight 후보 1.0.0(5)

- EAS iOS build `bf4c00e9-6e5c-4d5b-bf0e-51ddf6b92e40`가 `FINISHED`(2026-09-29 06:45:34 UTC). [빌드 확인](https://expo.dev/accounts/insoojeong/projects/close-call-nyang/builds/bf4c00e9-6e5c-4d5b-bf0e-51ddf6b92e40).
- 정확히 이 build를 App Store Connect 앱 `6815771701`에 제출했고 EAS submission `40e5d3cf-97e8-41c4-a470-8a8767976ac8`도 `FINISHED`(2026-09-29 06:47:04 UTC). [제출 확인](https://expo.dev/accounts/insoojeong/projects/close-call-nyang/submissions/40e5d3cf-97e8-41c4-a470-8a8767976ac8).
- Apple TestFlight 처리·테스터 그룹 배정·설치 가능 상태는 **미확인**이다. `eas submit:status`가 App Store Connect API 키 401을 반환했다. 제출 중 그룹 설정도 Apple 401로 건너뛰었으므로 App Store Connect에서 빌드 처리 결과와 그룹 배정을 별도 확인해야 한다. App Review/공개 출시는 하지 않았다.
- 소스 표기 HEAD는 `4f42251344202dc4e412034cdace4e1a4ddb51d5`지만 **업로드 아카이브에는 커밋되지 않은 현재 작업 트리 변경도 포함**되어 있어 이 해시만으로 바이너리를 재현할 수 없다. 특히 베테랑·성실한 냥대리 최신 아틀라스와 런타임 변경을 포함한 아카이브 파일 해시를 대조했다. 향후 배포는 소스 커밋 후 재현 가능한 스냅샷으로 고정한다.
- production EAS 환경의 공개 Supabase URL·publishable key가 설정된 것을 확인했고 모의 광고와 replay 진단은 꺼진 상태다. 개발용 전체 캐릭터 해금은 `__DEV__`에 한정되므로 배포 빌드의 베테랑 해금은 원래 100% 완료 10회 규칙을 따른다. 로컬 `ranking:env-check`의 `dist-config-match`는 오래된 `dist` 때문에 실패했으며, 이번 iOS 원격 빌드의 성공 근거로 삼지 않았다.
- 검증: Jest 696/696, typecheck, ranked:check, release 7/7, 베테랑 아틀라스 `--check`, iOS export 통과. 사용자는 Expo Go에서 “잘돼”라고 보고했지만 TestFlight 5번 빌드의 실제 기기 QA와 상세 장면 매트릭스는 아직 남아 있다. 원래 베테랑 T03와 iOS 출시 P03-T03는 완료 처리하지 않는다.
## 2026-09-30 · App Store 등록 준비 진행(심사 미제출)

- 앱6815771701의 스토어 버전1.0에 TestFlight1.0.0(6)을 연결했다. Apple build ID103a4776-f5b9-4ef1-9428-8f72ea8c1539. 저장 후 reload에서 연결 유지 확인했다. IPA 새 빌드/재업로드가 아닌 스토어 후보 연결이다.
- 지원URL `https://jeong-insoo.github.io/close-call-nyang/support/`, 저작권 `2026 Insoo Jeong`, 수동 출시를 저장하고 재조회했다. 심사 ‘로그인 필요’ 해제는 비밀번호 없는 앱의 데모 계정 정보 설정일 뿐 Supabase 인증을 꺼둔 것이 아니다.
- 승인된 가로 이미지5장을 en-US/iPhone6.9 슬롯에 업로드하고 gameplay→characters→home→ready→pause로 정렬, reload에서5장/순서 확인했다. 6.5는 해당 자산을 재사용한다. 근거: `store/screenshots/approval.json.uploadEvidence`; 화면 캡처는 ignored `output/store-review/asc-screenshots-saved.jpg`.
- 남음: 한/영 문구 최종 승인·한국어 등록, 전화번호 등 심사 연락처, 가격/전세계 설정, 연령등급·App Privacy 근거 확인 및 최종 제출 승인. 전체 QA pending, 삭제·재설치 사용자 생략2개 not_run을 유지한다. 앱/기존 기록 삭제와 App Review 제출/공개는 하지 않았다.
- 후속 연락처: 사용자가 Apple 심사 용도로 제공한 전화번호와 공개 승인 이메일, Insoo Jeong을 입력·저장했다. reload 후 이름 유지와 전화/이메일의 비어 있지 않은 개인정보 마스킹 표시를 확인했다. 브라우저 마스킹 때문에 숫자/이메일 원문 일치는 독립 확인하지 못했다. 전화번호 원문은 저장소에 기록하지 않는다.
- 검증: npm.cmd run test:release 8/8 passed, exit 0. 자료 등록은 부분 진행이며 최종 심사 제출은 하지 않았다.

### 한·영 문구 승인 후 등록 — 2026-09-30

- 사용자 승인한 name/subtitle/promotionalText/description/keywords를 listing-approval.json으로 고정했다. 두 언어의 설명·프로모션·키워드를 ASC 버전 화면에 저장하고 다시 방문해 로컬과 해시 일치를 확인했다. 부제와 Games/Casual도 저장했다. 지원/개인정보 공개 페이지의 실제 한·영 내용을 읽고 en-US/ko-KR privacy URL을 등록했다.
- 무료 가격 및175개 국가의 출시 후 사용 가능 설정 저장, 테스트하지 않은 Mac/Vision Pro 배포 opt-in 제외. 이는 각 국가의 추가 허가 완료나 공개 출시가 아니다.
- 연령 설문 초안: 공개 닉네임 UGC yes, 상시 랭킹 시합 frequent, 그 외 광고·채팅·도박·폭력 등 없음으로13+ 계산. Apple이 모로코·아프가니스탄 제한 안내를 표시했다. 아직 최종 저장하지 않았으며 사용자 검토 중이다. App Privacy 수집 답변·콘텐츠 권한·DSA/지역 허가·최종 누락 경고·사용자 제출 승인도 남았다.
- 근거 store/connect-checkpoint.json. npm.cmd run test:release8/8 passed. 전체 nativeQa/leaderboardQa pending과 삭제·재설치2개 not_run 유지. T03 완료 커밋/심사 제출/공개 없음.

### 연령 저장 후 개인정보 확인 — 2026-09-30

- 사용자13+ 초안 저장 승인 후 ASC 저장 완료 확인. 글로벌13+172개 지역, 한국12+, 베트남12+, 이전OS 글로벌12+ 표시이며 모로코·아프가니스탄 제한은 유지한다. 위 승인 대기 항목은 이전 기록이다.
- production Auth 감사 로그를 읽기 전용 조회한 결과0건/boolean 집계 null. 외부 Supabase 로그 범위/보존은 별도 확인이 필요하다. 브라우저 로그인이 GitHub Supabase OAuth 이메일 읽기 권한 승인 단계여서 사용자 직접 승인을 요청했다. App Privacy 공개표 미저장/미게시, 콘텐츠 권한·지역 규정·최종 제출 승인 남음. 기존 계정·기록 변경/심사 제출 없음.
- 로그인 후 실제 finalize 로그에서 IP 기반 지역·계정 subject·실행시간 존재 확인.7유형 초안은 store/privacy-inventory.md 참조, 사용자 승인 대기이며 수집 설문 미저장/미게시. 정확한 제공자 보존기간과 공개 정책의 대략 위치 설명 일치 검토는 남아 있다. 로그 원문 다운로드/계정 변경 없음.
