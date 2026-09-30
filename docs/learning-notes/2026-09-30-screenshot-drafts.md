# 실제 앱 캡처를 보존하면서 App Store 시안 만들기

## 무엇을, 왜

사용자가 현재1280×590 JPG를확대하는2번을선택했다. 원본5개를해시일치복사하고manifest에순서·문구·출처를고정했다. 캡처바깥장식배경만built-in imagegen으로생성했으며정확한prompt는 `store/screenshots/design/prompt.md`에있다. 한글은Windows맑은고딕을사용해별도합성했으므로AI가게임UI나문구를그리지않는다.

```js
const height = Math.round(2300 * 590 / 1280);
sharp(jpg).resize(2300, height, { kernel: sharp.kernel.lanczos3 });
```

비율을유지해캡처전체를넣고캡처영역에는마스크/그림자/텍스트를겹치지않았다. 위쪽제목·설명과바깥얇은테두리만추가했다. 실제점수4%/0%,잠긴캐릭터,홈26%와기존버튼은그대로다.

## 검증 결과

- 원본복사5개의SHA256일치.4번랭킹은타인닉네임이보여공개시안/복사/커밋대상에서제외.
- 생성/`--check`통과:5장모두2868×1320 PNG,RGB3채널,불투명·EXIF없음. 전체산출물이재현픽셀과일치하며,앱영역을추출해원본비율확대픽셀과별도비교해일치.
- `node --test scripts/render-store-screenshots.test.mjs` 6/6:JPEG메타데이터lossless제거/입력순서/랭킹제외/해시·치수/경로탈출·중복output방지/레이아웃/실제픽셀검증.
- `npm.cmd run test:release` 8/8 및diff-check.5장육안확인:한글읽기/바깥문구여백/기존버튼·발·홈바보존. 캐릭터해금달성·실제조작손맛을정지사진으로확인했다고주장하지않는다.

## 실패·제약에서 배운 점

- 원본JPG5개에EXIF/IPTC가있음을필드존재여부검사로발견했다. 값은출력하지않았다. 원형을ignored output/store-screenshots/originals에hash일치보존하고공개source에서는APP1/APP13/COM세그먼트만lossless제거했다. JPEG압축이미지데이터·ICC/Adobe색정보는유지했다. 처리전후Sharpraw픽셀동일、EXIF/IPTC/XMP없음、기존5장시안재현픽셀도그대로임을확인했다. sourceOriginalSha256와sourceSha256를분리해개인메타데이터는Git에올리지않고출처도잃지않았다.
- Sharp폰트렌더러가샌드박스밖기본fontconfig캐시경로를쓸수없다고경고했다. 실제생성은성공했고명시적malgun/malgunbd폰트파일과육안검증으로한글을확인했다. 권한을넓히거나사용자캐시를삭제하지않았다. Windows밖재생성은같은폰트가없으면동일픽셀을보장못한다.
- 저해상도JPG를PNG로확대해도원본세부가복구되지는않는다. 출력캔버스규격검사통과는화질·Apple심사승인을보장하지않는다.
- captureBuildNumber/deviceModel/iosVersion은null유지. 최신TestFlight6의실제촬영확인과오프라인·삭제·Safari복귀등기기QA는원래Task미완료.
- 이미지/캡션시안승인전에는원격업로드·AppReview제출하지않았다. 원래스토어소개최종확인약속도유지한다. 게임·서버·package-lock·아이콘·IPA불변.

## 요청 밖 발견

이전학습노트의운영입력null/옛심사노트설명부채는별도스토어자료Task에서정리한다. 이번시안작업에서임의변경하지않았다.

## 복습·다음 연습

1. 이미지크기가Apple규격이어도화질이좋다고할수없는이유는?
2. 전체산출물비교와캡처영역비교를따로하면어떤실수를잡을수있을까?
3. 사진에없는해금/랭킹/네트워크동작은어떤실기기테스트로확인해야할까?
