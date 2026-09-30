# Task: T01 실제 JPG 캡처 가로 시안

## Status: done

## Goal
사용자 JPG5개를 보존해 제출 규격의 검토 시안과 재현 검증을 만들고 화면을 보여준다.

## Decision Summary
- 사용자2번 선택: 저해상도 JPG 확대 시안.2868×1320,RGB PNG. 실제 앱 영역은 재그림/점수변경/잘림 금지.4번 랭킹 제외.
- 사용자 최종 이미지·소개 승인 및 P02-T02 실제QA는 별개. 심사/원격 업로드/공개/새IPA/push는 이 Task에서 실행하지 않는다.

## Implementation

### I01. 입력·합성
- Related Files:
  - `store/screenshots/source/2026-09-30/photo-{1,2,3,5,6}.jpg` :: EXIF/IPTC/COM 제거 JPEG; new decoded-pixel equality. 원형 bytes는ignored output/store-screenshots/originals에hash일치보존.
  - `store/screenshots/design/soft-background-v1.png`, `prompt.md` :: imagegen built-in 장식 배경 및 정확한 prompt; new
  - `store/screenshots/iphone-landscape/drafts-v1/{01..05}.png` ::2868×1320 불투명 RGB; new
  - `store/screenshots/manifest.json` :: source metadata와시안계약; new
  - `scripts/render-store-screenshots.mjs` :: renderScreenshots/verifyScreenshots; new
  - `scripts/render-store-screenshots.test.mjs` :: invariants; new
  - `scripts/sanitize-screenshot-sources.mjs` :: JPEG APP1/APP13/COM만제거,재인코딩없음; new
  - `store/screenshots/README.md`, `docs/learning-notes/2026-09-30-screenshot-drafts.md`, `docs/learning-notes.md` :: 학습·품질·다음게이트; modify/new selectively
- Signatures & Types: `renderScreenshots({check:boolean}):Promise<void>`, `verifyScreenshots():Promise<string[]>`. manifest `{schemaVersion:1,status:'draft_awaiting_approval',width:2868,height:1320,captureBuildNumber:null,deviceModel:null,iosVersion:null,background:{path:string,sha256:string},items:Array<{order:number,source:string,sourceSha256:string,sourceWidth:1280,sourceHeight:590,output:string,title:string,subtitle:string}>}`.
- Data: 순서 출근길1/캐릭터5/홈6/준비3/일시정지2. 원본은첨부디렉터리의1-사진-1.jpg등,ignored보존복사SHA256동일. 실제JPG에EXIF/IPTC가확인돼개인메타데이터를공개하지않도록JPEG APP1/APP13/COM만lossless제거하고그후디코드픽셀동일비교. 원본sourceOriginalSha256와sanitized sourceSha256를분리.4번은저장/커밋하지않는다.
- Logic: 모든 입력읽기·해시/치수검사 후 Sharp Lanczos3 비율유지2300×1060 근사(정확계산), x284/y210 근처정렬; 바깥배경/상단큰한글제목·설명만 합성. 원본 네모영역은 마스킹·노치/홈바삭제하지않는다. RGB opaque PNG. 개인정보/EXIF는 파생 PNG에서 제거한다. 제목은앱관찰과기존규칙내초안,승인확정아님.
- Errors: 잘못된원본해시/없는배경/치수/중복output/path탈출시throw,검사전쓰기금지. `--check`는 생성하지 않고 기존 산출물 픽셀/치수/알파/캡처영역을 검증한다.
- Return:5장시안/sha256 provenance,저해상도경고. 기존게임/서버/lockfile/앱아이콘불변.

### I02. 테스트와 학습
- Tests:5개순서/4번제외/경로안전/2868×1320 RGB/원본해시·치수/앱영역이원본비율확대픽셀과동일/산출물재현. 육안:한글누락·읽기·버튼잘림·잠금/점수변경없음.
- Learn:고정입력→배경→비율유지합성→PNG검사→시안승인. 확대와진짜해상도,정지사진QA한계,개인정보/출처.

## Acceptance Criteria
- [x]5개sourcehash일치·시안RGB/규격·원본앱영역보존검증.
- [x]육안검사와학습노트·사용자미승인상태/원격미업로드명시.

## Validation Results — 2026-09-30
- 생성/읽기check와Node6/6、release8/8/diff-check통과.5장2868×1320 RGB opaque EXIF없음、앱영역 원본확대픽셀동일. 원형hash일치ignored보존、public source EXIF/IPTC/COM lossless제거(디코드픽셀동일/메타데이터0/출력픽셀불변)、4번랭킹복사/출력제외.
- 5장육안검사:한글읽기/제목여백/버튼·발·홈바·점수/잠금보존. 배경장식만imagegen builtin、prompt저장. Sharp fontconfig캐시권한경고있으나명시맑은고딕으로성공、사용자캐시변경없음. 실제기기QA/빌드촬영번호와이미지·소개승인은미확인。
- ZIP5장저장:ignored output/store-screenshots/nyang-app-store-drafts-v1.zip. 원격업로드·심사제출·공개·push없음、원래P02-T02미완료보존。

## Validation
- `node scripts/render-store-screenshots.mjs`
- `node scripts/render-store-screenshots.mjs --check`
- `node --test scripts/render-store-screenshots.test.mjs`
- `npm.cmd run test:release`
- `git diff --check`
- view_image5장,필요시문구교정·재실행.

## Commit Message
```text
feat(store): prepare faithful landscape screenshot drafts

Plan: 2026-09-30-store-screenshot-drafts
Phase: P01-assets
Task: T01-screenshot-drafts

- Preserve supplied JPG captures and validate draft dimensions and source pixels.
- Keep image approval and full native QA separate from screenshot preparation.
```

## Progress
- [x]시안·검증·학습완료
- commit: `2fe32ec`
