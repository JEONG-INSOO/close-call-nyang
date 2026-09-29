# Task: T01 성실한 냥대리 얼굴 iOS 아이콘

## Status: done

## Goal

연보라 배경에 성실한 냥대리 얼굴·파란 눈·분홍 리본을 크게 보이는 1024×1024 불투명 iOS 앱 아이콘을 적용한다. 웹 파비콘/게임 캐릭터는 이전과 동일하다.

## Decision Summary

- 사용자 선택: 얼굴·리본 클로즈업, 연보라 배경. 기존 `docs/art/source/diligent-four-frame/frame-2.png`는 캐릭터 동일성 참조다.
- 기존 `app.config.ts`의 `icon` 경로와 `favicon` 경로는 유지한다. 생성 원본은 새 파일, 기존 `icon.svg`는 웹 파비콘 원본으로 보존한다.

## Implementation

### I01. 이미지 원본 제작

- Related Files:
  - `docs/art/source/diligent-four-frame/frame-2.png` :: 성실한 냥대리 얼굴·복장·눈·리본 참조; read-only
  - `assets/branding/diligent-app-icon-source.png` :: 이미지 생성 결과의 프로젝트 소유 원본; new
  - `assets/branding/icon.png` :: 1024×1024 불투명 RGB iOS 아이콘; modify (생성 산출물)
  - `assets/branding/icon.svg`, `assets/branding/favicon.png` :: 기존 웹 파비콘 원본·산출물; read-only

#### Details

- **Signatures & Types**: 이미지 생성 도구의 편집 입력은 `frame-2.png`; 출력은 사각 PNG 래스터. `icon.png`는 PNG `width=height=1024`, `channels=3`, `hasAlpha=false`.
- **Data & Schema Fields**: 앱 DB·저장 필드 없음. 파일 경로와 이미지 메타데이터만 변경한다.
- **Execution Flow / Logic**: 원본을 확인한 뒤 얼굴의 크림·연회색 무늬, 큰 파란 눈, 미소, 분홍 리본 및 보라색 카디건 윗부분을 유지하는 정면형 아이콘을 생성한다. 배경은 불투명 연보라. 텍스트/테두리/다른 인물은 넣지 않는다. 원본을 프로젝트에 복사한 후 렌더러로 최종 아이콘을 만든다. 작은 축소판에서 얼굴·리본 식별 여부를 육안 확인한다.
- **Error & Exception Handling**: 생성 결과가 정체성을 잃거나 얼굴·귀·리본이 잘리면 적용하지 않고 한 가지 문제만 명시해 재생성한다. 원본 프레임을 덮어쓰지 않는다.
- **State Transition & Return**: `app.config.ts`가 기존 `icon.png`를 읽으며 새 네이티브 빌드에서만 기기 홈 아이콘이 갱신된다.

### I02. 원본별 렌더러·검증 분리

- Related Files:
  - `scripts/render-branding.mjs` :: `brandingAssets`, `render`, `verifyBranding` — 1024 앱 아이콘은 PNG 원본, 48 파비콘은 기존 SVG 원본을 사용; modify
  - `scripts/release-preparation.test.mjs` :: `brandingAssets` 원본 구분 및 두 출력의 검증/오래된 픽셀 감지; modify
  - `app.config.ts` :: 경로 불변 확인; read-only
  - `docs/learning-notes.md`, `docs/learning-notes/2026-09-29-diligent-app-icon.md` :: 판단 이유·실패·테스트·복습 질문; modify/new
  - `docs/qa-report.md` :: 자동/육안 검증 및 미검증 기기 범위; modify

#### Details

- **Signatures & Types**: `brandingAssets: Array<{source:string;destination:string;width:number;height:number;opaque:boolean;kind:'png'|'svg'}>`; `renderBranding(assets=brandingAssets):Promise<void>`와 `verifyBranding(assets=brandingAssets):Promise<string[]>`는 기존 외부 계약 유지. `validateSvg(source:string):void`는 SVG만 검사한다.
- **Data & Schema Fields**: 앱 아이콘 원본은 래스터 PNG, 웹 파비콘 원본은 자기완결 SVG. 최종 두 파일은 각각 RGB PNG 1024/48이고 알파 없음.
- **Execution Flow / Logic**: `render()`에서 `kind==='svg'`면 UTF-8 소스+`validateSvg`, `kind==='png'`면 바이너리를 읽고 `sharp(...).metadata()`의 PNG/정사각형을 검증한다. 둘 다 `resize(width,height).flatten(...).removeAlpha().toColourspace('srgb').png()`로 산출. 기존 `--check`는 재생성 픽셀과 비교만 한다. 48px 파비콘 바이트/픽셀 불변을 비교한다.
- **Error & Exception Handling**: 누락·잘못된 형식/비율 원본은 렌더 전에 예외; `verifyBranding`은 오류를 배열로 보고, `--check`는 파일을 변경하지 않는다. 테스트 임시 산출물 외 사용자의 기존 파일을 제거하지 않는다.
- **State Transition & Return**: `npm.cmd run branding:render`가 아이콘을 생성하고 `branding:verify`가 source-match를 판정한다. 웹 favicon은 기존 원본으로 재생성돼 동일해야 한다.

## Acceptance Criteria

- [x] 1024px 앱 아이콘은 성실한 냥대리 얼굴·파란 눈·리본이 읽히고 불투명 연보라 배경이다.
- [x] `app.config.ts` 경로와 웹 파비콘 픽셀은 불변, `branding:verify`는 새 아이콘 원본과 일치·오래된 산출물 감지.
- [x] TestFlight/App Store 재배포 없이 코드·자산만 검증하고 학습·QA 기록을 남긴다.
- [x] 기존 dirty 파일을 보존하고 이번 Task 범위만 커밋한 뒤 베테랑 T03 포인터로 복귀한다.

## Validation

- `npm.cmd run branding:render` — 새 원본으로 1024/48 PNG 렌더.
- `npm.cmd run branding:verify` — 원본 일치 및 불투명 RGB 확인.
- `npm.cmd run test:release` — 브랜딩·Expo 경로·스토어 회귀.
- `npm.cmd run typecheck` — 설정/스크립트 외 앱 타입 불변.
- `git -c safe.directory=D:/GrillmeEDU diff --check` — 텍스트 변경.
- `assets/branding/icon.png` 1024px 및 64px 축소판 육안 확인, `favicon.png` 이전 픽셀/해시와 비교.

## Learning

- 배울 개념: Expo 앱 아이콘 원본→1024px 산출물→네이티브 빌드와 웹 파비콘의 별도 경로, PNG RGB/알파, source-match 검증.
- 예상 디버깅: 기존 SVG-동시 렌더가 PNG 원본 아이콘을 덮어씀, `branding:verify` 오래된 픽셀, 48px에서 얼굴이 너무 작음, Expo Go 아이콘과 네이티브 설치 아이콘 혼동.
- 복습 질문 3개: 왜 원본 PNG와 최종 `icon.png`를 별도로 보존할까? `hasAlpha=false`는 왜 중요한가? Expo Go 화면에서 보이는 아이콘이 App Store 설치 아이콘 검증이 아닌 이유는?

## Commit Message

```text
feat(branding): use diligent cat face for iOS icon

Plan: 2026-09-29-diligent-app-icon
Phase: P01-branding
Task: T01-diligent-icon

- Render the approved diligent cat close-up into an opaque app icon.
- Preserve the web favicon and verify each output against its own source.
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 — 1024/64px 육안, branding:render/verify, release 8/8, typecheck, diff --check, favicon SHA-256 불변.
- commit: `e809381` (이번 아이콘 원본·출력·검증·학습 기록)
