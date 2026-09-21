# Task: T02 아이콘·스토어 초안·EAS 설정

## Status: pending

## Goal
게임과 일관된 벡터 아이콘, 사용자가 검토할 한국어 스토어 초안, Windows에서 사용할 EAS 배포 설정을 로컬에서 재현 가능하게 준비한다.

## Decision Summary
- Character collection amendment: icon/launch identity uses the default rookie (user option2), sharing the same original SVG style as diligent/veteran. Local-only completedRuns0..10 and selectedCharacter are settings/progress data, not server rank data; privacy inventory and review notes must distinguish them. Unlock1 at the first100% run and unlock3 at10 distinct runs; never claim character stat advantages. User still reviews final store copy/screenshots later.
- 이름 `아슬아슬 냥대리`, slug `close-call-nyang`, bundle `com.mocca.closecallnyang`, 가로 iPhone 게임. 밝은 파스텔과 커피를 든 냥대리 얼굴을 코드 기반 SVG로 제작한다.
- 게임/캐주얼, 4+ 콘텐츠 목표이며 Kids 지정은 하지 않는다. 회원가입/로그인 화면 없이 닉네임·기기별 익명 계정으로 공통 온라인 순위에 참여하며 서버 검증 기록을 저장한다. 문구·스크린샷·최종 제출은 사용자 승인 대상이다. 이 Task는 빌드나 심사 제출을 실행하지 않는다.

## Implementation

### I01. 벡터 아이콘과 재현 가능한 PNG 출력

- Related Files:
  - `assets/branding/icon.svg` :: 냥대리 아이콘 원본; new
  - `assets/branding/icon.png`, `assets/branding/favicon.png` :: 1024/48 PNG 산출물; new
  - `scripts/render-branding.mjs` :: `renderBranding`, `verifyBranding`; new
  - `package.json`, `package-lock.json` :: dev dependency `sharp`, `branding:render`, `branding:verify`; modify
  - `app.config.ts` :: `icon`, `web.favicon`; modify
  - `src/scene/`, `src/theme/` :: P01 캐릭터·팔레트; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  type BrandingAsset = { source: string; destination: string; width: number; height: number; opaque: boolean };
  function renderBranding(assets: readonly BrandingAsset[]): Promise<void>;
  function verifyBranding(assets: readonly BrandingAsset[]): Promise<string[]>;
  // CLI: node scripts/render-branding.mjs [--check]
  ```
- **Data & Schema Fields**: SVG viewBox `0 0 1024 1024`, 불투명 파스텔 배경, 정장을 암시하는 얼굴/상체와 한 손 커피, 글자 없음. `icon.png` 1024×1024 RGB 불투명, `favicon.png` 48×48. 원본 SVG는 외부 이미지·폰트·스크립트를 참조하지 않는다. asset 경로는 모두 위 지정 폴더 안이다. npm scripts는 `branding:render = node scripts/render-branding.mjs`, `branding:verify = node scripts/render-branding.mjs --check`로 정의한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: P01 캐릭터의 털색·귀·정장·커피 색상과 맞춘다. 원작 에셋이나 AI 이미지로 대체하지 않는다. Windows/Node 24에 호환되는 sharp를 dev dependency로 고정한다.
  2. Core Processing: sharp로 원본을 읽어 PNG를 렌더링하고 알파를 제거한다. 둥근 모서리를 원본에 구워 넣지 않는다. 48px와 1024px 결과를 실제 이미지로 열어 얼굴과 커피의 식별성·잘림을 확인한다.
  3. Error & Exception Handling: 원본 누락·잘못된 SVG·크기/알파 불일치는 명확한 stderr와 exit 1. 검증 모드는 파일을 재생성하지 않는다. 출력 도중 실패 시 성공으로 보고하거나 config 경로를 미존재 파일로 바꾸지 않는다.
  4. State Transition & Return: `app.config.ts`의 `icon`은 `./assets/branding/icon.png`, web favicon은 해당 48px 파일. 앱의 기존 이름·orientation·iOS bundle/supportsTablet false·Pages baseUrl은 유지한다.

### I02. 스토어 운영 입력과 초안

- Related Files:
  - `store/release-inputs.json` :: 사용자 제공 운영 정보; new
  - `store/ko-KR/metadata.json` :: `StoreMetadataDraft`; new
  - `store/ko-KR/review-notes.md` :: 심사자 안내 초안; new
  - `store/privacy-inventory.md` :: 실제 익명 ID/닉네임/기록·리플레이 데이터와 Apple 개인정보 응답 근거; new
  - `store/screenshots/README.md` :: 실제 iPhone 캡처·문구 검토 계획; new
  - `docs/ios-release.md` :: Windows/Expo Go/EAS/심사 절차; new

#### Details
- **Signatures & Types**:
  ```typescript
  type ReleaseInputs = {
    schemaVersion: 1; supportEmail: string | null; copyrightHolder: string | null;
    price: 'free' | { currency: string; amount: number } | null;
    territories: string[] | null; appleTeamId: string | null; ascAppId: string | null;
  };
  type StoreMetadataDraft = {
    locale: 'ko-KR'; name: '아슬아슬 냥대리'; subtitle: string;
    promotionalText: string; description: string; keywords: string[];
    primaryCategory: 'GAMES'; gameSubcategory: 'CASUAL'; madeForKids: false;
    supportUrl: 'https://jeong-insoo.github.io/close-call-nyang/support/';
    privacyPolicyUrl: 'https://jeong-insoo.github.io/close-call-nyang/privacy/';
    status: 'draft' | 'approved';
  };
  ```
- **Data & Schema Fields**: 운영 입력은 모두 실제 사용자가 제공한 값만 채우고 미정은 null. price/territories를 추정하지 않는다. 앱 이름 외 한국어 문구는 귀여운 직장 코미디 초안으로 작성하고 `status=draft`. 가격·광고 시청·무제한 부활 등 미확정/미구현 기능을 홍보하지 않는다. 100% 초과 점수, 15% 커피, 51% 사무실, 균형 감각, 닉네임 기반 공통 순위를 실제 구현대로 설명한다. 공개 기록은 익명 플레이어별 누적 최고 정수 %, 상위 100명/본인 순위, 동점 공동 순위이며 동일 닉네임 계정 병합이나 로그인 복구를 약속하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 이름·설명 등 현재 App Store 필드 제한을 공식 App Store Connect 도움말에서 실행 시 재확인한다. 4+는 목표이고 실제 설문 결과라고 미리 확정하지 않는다.
  2. Core Processing: 출근길, 커피 획득 후, 사무실, 결과의 네 가지 실제 iOS 캡처 목록과 한 줄 홍보 문구 초안을 준비한다. 네 번째 결과 화면에서 실제 구현된 순위 진입/기록 제출 표시를 포함할 수 있으나 별도 다섯 장을 요구하지 않는다. 캡처가 없으면 README에 pending으로만 남긴다. review notes에는 회원가입/로그인 UI 없음, 선택적 닉네임·순위 참여 시 기기별 익명 인증, 닉네임 변경/신고/내 온라인 데이터 삭제 위치, 서버 검증 점수, 오프라인 게임 가능/오프라인 시작 판 순위 제외, 가로 조작, 출시 광고 없음, 개인정보 URL을 적는다. 심사자가 새 게스트로 직접 테스트할 수 있어야 하며 타인의 session token을 제공하지 않는다.
  3. Error & Exception Handling: 운영 입력 누락은 `docs/ios-release.md`의 남은 준비 목록에 기록한다. 공개 연락처를 받았다면 P03-T01의 support/privacy 초안 표식을 실제 내용으로 교체한다. Apple 로그인 비밀번호·2FA·서버 secret/service-role key·private key·플레이어 인증 token·심사 연락용 비공개 전화번호를 Git에 저장하지 않는다. 공개 publishable key와 서버 비밀을 구별한다.
  4. State Transition & Return: 문구/이미지는 여전히 사용자 미승인 초안이다. P03-T04에서 구체적 결과를 다시 보여주고 승인받는다. 실제 캡처 없이 웹 이미지를 iPhone 스크린샷으로 표시하지 않는다.

- `store/privacy-inventory.md`의 각 항목은 `data`, `source`, `purpose`, `storedWhere`, `linkedToAnonymousPlayer`, `publicVisibility`, `retention`, `deletionPath`, `appleQuestionnaireMapping`, `evidence`를 기록한다. 익명 Auth UUID/비공개 session과 별도의 publicId·닉네임·최고 기록, run seed/checkpoint/digest/receipt·입력 proof의 일시 처리, 신고/차단 및 운영 로그를 구별한다. `docs/leaderboard-operations.md`와 실제 schema/함수/호스팅 설정을 근거로 작성한다. native 세션은 AsyncStorage이며 암호화 저장이라고 설명하지 않는다. 분석·광고 추적을 하지 않더라도 계정에 연결된 온라인 데이터를 처리하므로 자동으로 '데이터 수집 없음'에 답하지 않는다. 닉네임 입력/노출 때문에 필요한 신고/로컬 숨김·기본 moderation과 실제 4+ 설문 적합성을 다시 확인하되 Kids로 바꾸지 않는다.

### I03. 클라우드 빌드 설정

- Related Files:
  - `eas.json` :: production build/submit profiles; new
  - `app.config.ts` :: `version`, `ios` 및 향후 `extra.eas.projectId`; modify
  - `.gitignore` :: 인증파일·개인 연락정보 보호; modify
  - `docs/learning-notes.md` :: P03-T02 구현 근거/검증; modify

#### Details
- 설정 계약: `cli.appVersionSource="remote"`; `build.production.distribution="store"`, `environment="production"`, `autoIncrement=true`, `env.EXPO_PUBLIC_ENABLE_MOCK_AD="false"`; `submit.production.ios.ascAppId`는 실제 ID 확보 후만 지정한다. EAS production 환경에는 실제 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 공개 클라이언트 설정으로 제공한다. 두 값은 Pages와 같은 검증된 hosted 프로젝트를 가리켜야 한다. 서버 secret/service-role key는 EAS 클라이언트 env에도 넣지 않고 Supabase 서버에서만 관리한다. 임시 UUID/Apple Team ID를 생성하지 않는다. `developmentClient=true`를 production에 두지 않는다. 최초 마케팅 version은 `1.0.0`이며 이미 더 높은 실제 값이 있으면 낮추지 않는다.
- Expo Go 개발은 일반 SDK57 호스트 + PC/iPhone의 동일 Expo 계정 로그인으로 문서화한다. `eas go`는 필요 시 현재 help와 지원을 확인하는 선택 대안이다. 배포용 독립 앱과 Expo Go를 구별한다.
- SDK57 최신 호환 패치·Node 최소 22.13.x·프로젝트 Node 24를 확인하고 EAS 이미지/Xcode 호환은 P03-T03에서 선택한다. Xcode27을 쓸 경우 SDK57 scene 지원 요구를 재확인한다. 로컬 Windows에서 `expo run:ios` 또는 Xcode가 필요하다고 안내하지 않는다.
- config에 `extra.eas.projectId`를 넣는 계정 연결은 다음 Task의 실제 EAS 인증 후 수행한다. `ITSAppUsesNonExemptEncryption`은 실제 라이브러리/기능 검토 전 미리 false로 단정하지 않는다. 오디오 설정은 녹음/백그라운드 권한 미요구를 유지한다.

## Acceptance Criteria
- [ ] 아이콘이 게임 캐릭터와 일관되고 PNG 크기/불투명 조건을 만족한다.
- [ ] 스토어 문구와 캡처 계획이 draft로 보관되며 모든 미정 운영 입력은 null이다.
- [ ] EAS production에 개발 client·가상 광고 활성화·실제 광고 SDK가 없고 bundle ID가 정확하다.
- [ ] EAS/Pages의 공개 backend env 계약과 서버 비밀 경계가 명확하고, 원격 데이터/신고/삭제를 설명하는 개인정보 근거 및 심사 노트가 있다.
- [ ] `docs/ios-release.md`와 학습노트가 아이콘 생성, Expo Go/독립 빌드/심사 제출의 차이를 설명한다.

## Validation
- 작업 폴더 `D:\GrillmeEDU`: `npm.cmd run branding:render`, `npm.cmd run branding:verify` — 생성/메타데이터 검사 통과, 결과 이미지 직접 확인.
- `npx.cmd expo config --type public` — 일반 개발 환경에서 이름·version·가로·iPhone·bundle·icon을 읽기 검증하고 Pages baseUrl이 없는지 확인한다. 인증정보 출력 금지.
- `npx.cmd expo-doctor@latest`, `npm.cmd run typecheck`, `npm.cmd run test:ci` — 기존 동작/의존성 검사 통과.
- `npm.cmd run ranked:check` 및 `npm.cmd run ranking:env-check` — rules drift 없이 올바른 공개 backend 설정/비밀 분리 확인.
- `npm.cmd run web:export` 및 `npm.cmd run web:verify` — 기존 wrapper가 자식 Expo CLI에만 `GITHUB_PAGES=true`를 전달하고 `/close-call-nyang` baseUrl 및 favicon/정적 문서가 포함된 산출물을 생성·검증한다. 개발 shell의 env를 상시 변경하지 않는다.
- `git diff --check` — 오류 없음. 아직 EAS 빌드·스토어 승인·캡처를 완료했다고 기록하지 않는다.

## Commit Message
```text
feat(release): prepare Nyang branding and store drafts

Plan: 2026-09-21-close-call-nyang
Phase: P03-release
Task: T02-store-preparation

- Render original vector branding into release assets
- Prepare Korean store drafts and production EAS profiles
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
