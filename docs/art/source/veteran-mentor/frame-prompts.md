# 베테랑 냥대리 게임용 원본

## 현재 선택한 걷기 원본

사용자가 채팅에서 고른 네 장은 `C:/Users/mocca/Documents/Codex/2026-09-29/1-4-1-2-1-2/outputs/tabby-walk-frame-01.png`부터 `04.png`까지다. 숫자 순서대로 `frame-1.png`~`frame-4.png`에 **원본 바이트 그대로** 복사했고 SHA-256 일치를 확인했다. 네 장 모두 1186×1326의 실제 투명 RGBA PNG다. 위험·넘어짐 두 장은 앞서 기본 제공 이미지 생성 도구로 만든 후보를 유지한다. 모든 원본은 게임에서 직접 로드하지 않고 `scripts/build-veteran-frames.mjs`로 작은 아틀라스를 만든다.

| 게임 원본 | 사용자 원본 | 눈으로 확인한 포즈 |
| --- | --- | --- |
| `frame-1.png` | `tabby-walk-frame-01.png` | 화면 오른발을 크게 들어 젤리 표시, 양팔 벌림 |
| `frame-2.png` | `tabby-walk-frame-02.png` | 양팔 내림, 왼쪽 발을 뒤로 든 듯한 중간 포즈, 젤리 없음 |
| `frame-3.png` | `tabby-walk-frame-03.png` | 화면 오른발을 크게 들어 젤리 표시, 앞쪽 팔 흔듦 |
| `frame-4.png` | `tabby-walk-frame-04.png` | 양팔 내림, 왼쪽 발을 뒤로 든 듯한 중간 포즈, 젤리 없음 |

**사용자 확정:** `frame-1`과 `frame-3`은 둘 다 화면 오른쪽 발의 분홍 젤리를 보여준다. 기존 좌우 발 교대 요구와 다른 이 점을 설명한 뒤 사용자가 **네 장을 수정 없이 그대로 사용**하기로 했다. 아틀라스 자동 검사는 파일 형식·정렬·바이트 재현만 검증하고 이 동작 의미를 보장하지 않는다. 실제 재생이 어색하면 차후 아트 수정이 필요하다.

## 이전 생성 후보 기록 (현재 선택한 네 걷기 원본의 프롬프트가 아님)

아래 기록은 처음 제시했던 별도 6칸 미리보기의 제작 과정이다. 이후 사용자가 네 장을 새로 선택했으므로 아래 `frame-1`~`frame-4` 설명과 생성 프롬프트는 **현재 게임용 원본에 적용되지 않는다**. 다만 생성 실패와 수정 과정을 학습용으로 보존한다.

## 장면별 지시

| 파일 | 생성 지시의 핵심 | 확인 사항 |
| --- | --- | --- |
| `frame-1.png` | 승인 시안 그대로, 화면 오른쪽 발을 앞으로 올려 작은 젤리 표시 | 원본 바이트 보존 |
| `frame-2.png` | 동일한 인물·복장·무늬·펜 위치를 고정하고 두 발이 몸통 아래에서 지나가는 중간 포즈, 젤리 없음 | 발이 나란히 지나감 |
| `frame-3.png` | 기준 이미지의 다리 아래 부분만 변경. 화면 **왼쪽** 발을 올려 젤리가 왼쪽에 보이고 오른쪽 발은 착지 | 반대 발 교대, 전신 미러링 금지 |
| `frame-4.png` | `frame-3`의 왼발을 내려 두 발이 지나가는 다음 중간 포즈, 젤리 없음 | 양발 기준선 일치 |
| `alarm-expression.png` | `frame-2`를 기준으로 얼굴만 수정. 눈 크게, 눈썹 올림, 작은 땀방울과 긴장한 닫힌 입 | 몸체·복장 유지 |
| `fall-expression.png` | `frame-2`를 기준으로 얼굴만 수정. 눈 질끈, 작게 놀라 벌린 입 | 몸체·복장 유지 |

공통 지시: 우측 진행 3/4 시점, 원래 주황/흰 털과 올리브 눈, 숲색 니트 조끼, 아이보리 소매, 화면 오른쪽 가슴주머니 펜, 중앙 사원증, 화면 왼쪽의 줄무늬 꼬리, 굵은 갈색 외곽선을 유지한다. 정확히 두 팔·두 다리·꼬리 하나. 진짜 투명 배경. 전신 반전, 분리된 팔다리, 신발, 안경, 넥타이, 텍스트, 다른 캐릭터, 바닥 그림자 금지.

`frame-3` 첫 두 시도는 화면 오른쪽 발이 또 올라가서 폐기했다. 마지막 시도는 좌측 젤리와 우측 착지를 명시해 발 교대를 바로잡았다. 네 걷기 원본과 표정 두 장은 사용자 육안 승인 전까지 후보이며 게임 런타임에 연결하지 않는다.

## 최종 원본을 만든 프롬프트

`frame-1`은 새로 생성하지 않고 승인 시안을 바이트 그대로 복사했다. 나머지는 각 파일마다 기본 제공 이미지 생성 도구를 한 번씩 호출했다. `frame-3`은 앞서 실패한 두 후보를 사용하지 않고 마지막 편집 결과만 저장했다.

### frame-2

> Use case: identity-preserve. Asset type: production 2D game walking-animation frame 2, single full-body transparent PNG. The attached image is the exact character identity and style reference. Preserve the SAME orange-and-white short-haired veteran office cat: identical large head/ears, pale forehead stripes, olive-green eyes, pink nose, friendly calm smile, dark brown thick contour, slim striped tail on viewer-left, forest-green knitted vest, ivory rolled-sleeve shirt, pen in the viewer-right chest pocket, centered lanyard ID badge with abstract marks. Preserve the face and all markings/props in their original sides; do NOT mirror the whole cat. Change ONLY the walking pose from the reference: both short legs pass close together beneath the body at the neutral midpoint of a step, both bare paws pointed mostly downward with no prominent pink paw pads; short arms swing halfway in opposition to the legs. Same right-facing three-quarter/front angle, same head size and body scale, centered in the same canvas with same head top and foot baseline. Soft flat sticker-like 2D illustration, minimally shaded, crisp clean silhouette. Genuinely transparent background. Exactly two arms, two legs, one tail; no extra limbs, no detached body parts, no scene, shoes, glasses, necktie, text, logos, watermark, shadow, glossy highlights, or opaque background.

### frame-3

> Use case: precise-object-edit. Input image 1 is the EDIT TARGET, not merely a style reference. Create the opposite walking keyframe by editing ONLY the two legs and their paws below the bottom hem of the green sweater vest. Lock every pixel above the hem, and lock the tail, vest, pen, ID, arms, head, face, ears, outline style, and transparent canvas exactly as they are. In the source, a white paw with pink pads sticks out at the LOWER RIGHT. Remove that right-hand protruding pad-foot. Draw that RIGHT leg as a short planted leg straight down on the ground. Instead raise the LEFT leg (the leg starting on the viewer-left side below the vest), bend it forward toward viewer-left, and turn its white foot so its pink pad faces us. The pink pads must be on the LEFT half of the character, clearly left of the centerline of the ID badge; NO pink pads on the RIGHT half. Keep two legs total, no duplicated foot or floating limb. This is a motion edit, not character redesign. Same full body on genuine transparent PNG, no background or extra objects.

### frame-4

> Use case: precise-object-edit. Asset type: frame 4 of a seamless 2D walk cycle. This is the same exact veteran orange-and-white office cat; preserve face, olive eyes, forehead stripes, forest-green sweater vest, rolled ivory sleeves, pen on viewer-right pocket, centered ID badge, left striped tail, proportions and dark brown contour. Edit only the leg pose from the attached raised-left-paw frame: the viewer-left raised paw now comes down and passes the planted viewer-right paw under the body; both short bare feet are near the ground, with the viewer-left paw just behind the viewer-right paw. No visible pink sole pads in this in-between frame. Arms gently pass their opposite neutral positions, attached naturally. Keep the same head position, rightward three-quarter camera angle, full body, genuinely transparent canvas. Exactly two arms, two short legs and one tail; no extra parts, no mirror, no background, shadows, text, logos or redesign.

### alarm-expression

> Use case: precise-object-edit. Image 1 is the edit target and exact character. Asset type: alarm facial-expression frame of the same 2D office-cat game sprite. Lock every pixel of the body below the chin, all clothes, forest-green vest, shirt, pen, ID badge, arms, both neutral feet and viewer-left striped tail. Keep face shape, fur markings, ears, olive-green iris colors, outline and proportions unchanged. Change ONLY the facial expression: eyes open wider with alert pupils, eyebrows slightly raised, one small sweat bead at viewer-right temple, mouth a tiny tense closed wavy line. It should feel worried and precarious but still cute, not crying, angry or falling. Same single full-body centered composition, true transparent PNG, no scene, text, logo, extra parts or shadow.

### fall-expression

> Use case: precise-object-edit. Image 1 is the edit target and exact character. Asset type: fallen facial-expression frame of the same 2D office-cat game sprite. Lock every pixel of the body below the chin, all clothes, forest-green vest, shirt, pen, ID badge, arms, both neutral feet and viewer-left striped tail. Keep face shape, fur markings, ears, outline and proportions unchanged. Change ONLY facial expression: both eyes squeezed shut into two small curved arcs, eyebrows distressed, tiny open surprised mouth. Cute momentary tumble reaction, not injured, crying or angry. Same single full-body centered composition, true transparent PNG, no scene, text, logo, extra parts or shadow.
