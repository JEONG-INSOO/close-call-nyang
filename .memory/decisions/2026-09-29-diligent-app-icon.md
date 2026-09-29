# Decisions: 성실한 냥대리 iOS 앱 아이콘

- Date: 2026-09-29
- Status: Confirmed

## D01. 아이콘 주인공과 구도
- **Chosen (user)**: 성실한 냥대리의 얼굴·파란 눈·분홍 리본을 크게 보여주는 클로즈업, 불투명 연보라 배경.
- **Rationale**: 작은 홈 화면에서도 기존 회색 신입 캐릭터와 구별하고 성실한 냥대리의 정체성을 유지한다.

## D02. 적용 범위
- **Chosen (request + code inspection)**: `app.config.ts`가 가리키는 iOS용 `assets/branding/icon.png`만 새 이미지로 교체한다. 웹용 `favicon.png`와 게임 스프라이트는 유지한다.
- **Rationale**: 사용자는 앱스토어 앱 아이콘을 요청했다. 기존 SVG는 48px 웹 파비콘의 원본이고 두 산출물이 한 스크립트로 연결되어 있으므로 렌더 경로만 분리한다.

## D03. 원본·검증·배포 경계
- **Chosen (code inspection)**: `docs/art/source/diligent-four-frame/frame-2.png`를 캐릭터 참조로 사용하되 얼굴 특징을 임의로 재설계하지 않는다. 생성 원본을 `assets/branding/diligent-app-icon-source.png`에 보존하고 `scripts/render-branding.mjs`가 불투명 1024×1024 RGB `icon.png`를 재생성/검증하게 한다. 이번 작업은 로컬 에셋·설정 검증까지만 하고 EAS 빌드·TestFlight·App Store 제출은 하지 않는다.
- **Rationale**: Expo는 이미 `icon.png`를 참조하므로 경로를 바꿀 필요가 없다. 실제 설치 아이콘 갱신에는 새 네이티브 빌드가 필요하고, 이번 턴의 사용자는 배포를 요청하지 않았다.

## Out of scope
- 웹 파비콘/스토어 스크린샷·메타데이터, 캐릭터 스프라이트·해금, 온라인 서버, 자동 푸시/배포.
