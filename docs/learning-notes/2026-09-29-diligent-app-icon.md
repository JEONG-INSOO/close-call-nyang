# 성실한 냥대리 얼굴을 iOS 앱 아이콘으로 적용하기

## 무엇을, 왜 바꿨나

사용자는 App Store 배포 전 앱 아이콘의 주인공을 회색 신입에서 성실한 렉돌 냥대리로 바꾸고 연보라 배경의 얼굴·리본 클로즈업을 골랐다. 기존 게임 PNG를 직접 수정하지 않고 [프롬프트](../art/source/diligent-app-icon-prompt.md)와 생성 원본 `assets/branding/diligent-app-icon-source.png`를 별도로 보존했다. 작은 64px에서도 파란 눈·크림/회색 얼굴·분홍 리본이 보여야 하므로 어깨와 나머지 몸을 크게 줄였다.

## 데이터 흐름과 핵심 개념

`frame-2.png`(정체성 참조) → 이미지 생성 원본 PNG → `scripts/render-branding.mjs`의 `kind: 'png'` → 불투명 RGB 1024×1024 `assets/branding/icon.png` → Expo 네이티브 빌드의 iOS 앱 아이콘이다. 웹 파비콘은 기존 `icon.svg` → `kind: 'svg'` → 48px `favicon.png`로 따로 흐른다. `app.config.ts`의 두 경로는 그대로다. `kind`를 구분하지 않았다면 기존 SVG 렌더 작업이 새 아이콘을 다시 회색 신입으로 덮어썼을 것이다.

`branding:verify`는 생성 원본으로 다시 계산한 픽셀과 실제 출력 파일을 비교하지만 **파일을 고치지 않는다**. 원본과 출력이 어긋나는 것을 검사 중 조용히 복구하면 배포 직전 실수를 발견하지 못한다. PNG의 알파(투명도)를 제거하고 RGB로 저장하는 이유는 설치 아이콘의 배경이 의도치 않게 비치거나 규격 검사에서 문제가 되는 것을 막기 위해서다.

## 검증과 한계

1024px와 64px 축소판을 육안 확인했다. `branding:render`, `branding:verify`, `test:release` 8/8, `typecheck`가 통과했다. 웹 파비콘의 전후 SHA-256은 `DE661B48C0681E50E8AAF18E48EC70EF81E95AE6FC50617934C57C7EDFFFBF86`으로 동일하다. 너무 작은 PNG를 원본으로 넣으면 렌더가 거부되고, 출력이 오래되면 검증이 실패하는 테스트도 있다. 실제 TestFlight 설치 아이콘과 App Store 노출은 **아직 확인하지 않았다**. Expo Go는 개발 앱이므로 새 네이티브 아이콘 검증을 대신하지 못한다.

## 복습 질문

1. 생성 원본 PNG와 최종 `icon.png`를 별도로 두는 이유는 무엇일까?
2. iOS 아이콘을 불투명 RGB로 정규화하는 이유는 무엇일까?
3. Expo Go에서 화면이 잘 떠도 홈 화면의 새 아이콘을 검증했다고 말할 수 없는 이유는 무엇일까?
