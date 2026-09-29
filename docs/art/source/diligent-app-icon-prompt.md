# 성실한 냥대리 iOS 앱 아이콘 생성 프롬프트

- 도구: 내장 `image_gen` (기존 이미지 편집)
- 참조/편집 입력: `docs/art/source/diligent-four-frame/frame-2.png`
- 선택 결과 원본: `assets/branding/diligent-app-icon-source.png`

```text
Use case: precise-object-edit / logo-brand. Asset type: square iOS app icon artwork for the game 우당탕탕 냥대리. Input image: the supplied PNG is the exact character identity reference and edit target: a cream and soft gray ragdoll cat employee with large bright blue eyes, dark brown clean outlines, pink nose and cheeks, friendly smile, white collar, small pink bow, lavender cardigan. Primary request: recompose ONLY this same character into a tightly framed frontal face-and-bow portrait for a home-screen app icon. Keep both ears fully visible, face large and centered, bow visible near bottom center, and just a small hint of the lavender cardigan shoulders. Replace the transparent background with an opaque smooth light lavender background, one flat color or very subtle tone, full bleed to all four corners. Style: preserve the original cute 2D sticker illustration, soft flat coloring, dark brown outlines, not glossy or realistic. Composition: square, face occupies most of icon but stays within safe margins; eyes readable at 64 px, no detached body parts. Constraints: retain the character's original cream/gray facial marking, blue eyes, smile, bow and outfit identity; no changes to face design; no other characters; no text, logo, badge, coffee, frame, rounded-corner mask, watermark, heavy shadows, or transparent pixels. Output one clean square icon image.
```

원본은 생성 결과 그대로 보존한다. `npm.cmd run branding:render`는 이 파일을 1024px 불투명 RGB PNG로 정규화해 `assets/branding/icon.png`에 쓴다.
