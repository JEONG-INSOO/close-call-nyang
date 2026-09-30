# 실제 iPhone 스크린샷 — 수신 / 제출본 pending

## JPG 확대 시안 v1 — 사용자 검토 대기

사용자가 현재 JPG로 진행하는2번을 선택했다. `iphone-landscape/drafts-v1/`에2868×1320 불투명 RGB PNG5장을 만들었다. 출근길→캐릭터→홈→업무준비→일시정지 순서다. `manifest.json`에는 원본1280×590과원형/메타데이터제거후SHA256, 출력/문구, 아직 모르는기종·iOS·빌드번호null을 기록했다. 확대본이지 원본고해상도촬영물이 아니다. 원형JPG는ignored output/store-screenshots/originals에보존했으며공개source에서는EXIF/IPTC/COM만재인코딩없이제거하고디코드픽셀동일확인했다.

- 캡처바깥의연보라/민트/크림장식만built-in imagegen생성. 정확한prompt는 `design/prompt.md`,장식원본은 `design/soft-background-v1.png`.
- 실제앱영역은 원형JPG를비율유지Lanczos3확대한것과픽셀일치. 점수·캐릭터·잠금·버튼·홈바·기존화면여백은변경/삭제하지않았다. 다른플레이어닉네임이있는4번은저장/출력대상에서제외했다.
- 재현: `node scripts/render-store-screenshots.mjs`, 읽기검사: `node scripts/render-store-screenshots.mjs --check`, 테스트: `node --test scripts/render-store-screenshots.test.mjs`. Windows맑은고딕폰트파일을사용한다. 별도장치에서재현하려면동일폰트가필요하다.
- 5장육안확인/Node6tests/release8tests통과. 원격업로드·심사제출없음. 문구·이미지승인/원래P02-T02실기기QA는별도다.

2026-09-30 사용자가 실제 플레이 캡처 JPG6장을 제공했다. 모두1280×590이며 파일 크기는47,326~72,582bytes다. 홈/캐릭터선택/랭킹/카운트다운/일시정지/4%의 기울어진 플레이 화면을 확인했다. 기종·iOS·TestFlight 빌드번호는 이미지로 확인되지 않는다. 수신을 전체 기기QA 통과로 대신하지 않는다.

Apple 공식6.9인치 가로 규격에는2868×1320/2796×1290/2736×1260이 포함된다. 수신JPG는 그 규격이 아니며, 단순 확대는 원래 해상도·세부정보를 복원하지 않는다. 최초 검사 후 사용자가 저해상도 확대 시안을 선택했다. 플레이 화면·문구·점수·캐릭터를 AI로 재해석해 실제 캡처인 것처럼 제출하지 않는다.

4번 랭킹에는 다른 플레이어로 보이는 닉네임이 있어 공개 제출 후보에서 우선 제외한다. 본인/합성 테스트 데이터라는 확인 없이는 게시하지 않는다. 화면1/3은 같은 출근길의 다른 상태이고, 커피·사무실·100% 달성은 이번6장에 없다. 이를 이미지 편집으로 만들어 QA를 통과시키지 않는다.

참고: [Apple 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [실제 사용 화면·가상 계정 정보 지침2.3.3/2.3.9](https://developer.apple.com/app-store/review/guidelines/). 최종 캡처·문구와 실제 버전은 사용자 확인 후 제출한다.

| 장면 | 문구 초안 | 상태 |
| --- | --- | --- |
| 출근길 | 오늘도 쉽지 않은 냥대리 출근길 | pending |
| 15% 이후 커피 | 커피 한 잔, 바빠진 발걸음 | pending |
| 51% 이후 사무실 | 사무실에서도 균형은 필수! | pending |
| 결과·등록 안내 | 100% 너머까지 도전해 볼까요? | pending |

필수: 실제 게임과 일치, 가로 화면, 잘린 버튼/노치 없음. 캡처와 문구는 사용자 최종 확인 후 제출한다. 가상 광고나 개발 진단 화면을 출시 화면처럼 쓰지 않는다.
