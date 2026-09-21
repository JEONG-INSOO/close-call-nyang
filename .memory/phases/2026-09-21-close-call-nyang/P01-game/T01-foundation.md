# Task: T01 Expo 기반과 검증 도구

## Status: done

## Goal
기존 메모리 스타터 폴더를 보존하면서 루트에서 실행되는 Expo SDK 57 TypeScript 앱과 Jest 검사, 학습노트의 시작점 및 로컬 Git 이력을 만든다.

## Decision Summary
- 게임은 `아슬아슬 냥대리`, 한국어/iPhone 가로/웹, Expo Go + Reanimated/SVG, Router 없음.
- 닉네임·온라인 리더보드는 후속 P02-leaderboard에서 의존성과 화면을 추가한다. 이 Task는 로컬 기반을 먼저 만드는 단계이며 최종 앱에 서버가 없다는 의미가 아니다.
- **실행 시작 조건**: 사용자에게 모델 변경 시점을 알린 뒤 사용자가 개발 실행을 요청했어야 한다. 현재 계획만 작성됐으며 이 조건 전에는 패키지 설치나 앱 코드를 만들지 않는다.

## Implementation

### I01. 앱·패키지·플랫폼 구성
- Related Files:
  - `package.json`, `package-lock.json` :: dependencies/scripts — new
  - `tsconfig.json`, `babel.config.js`, `jest.config.cjs`, `jest.setup.ts` :: 도구 설정 — new
  - `index.ts` :: registerRootComponent — new
  - `App.tsx` :: App — new
  - `app.config.ts` :: ExpoConfig — new
  - `src/config/app.ts` :: 앱 상수/getFeatureFlags — new
  - `src/i18n/ko.ts` :: ko — new
  - `.gitignore`, `.env.example` :: 생성물/환경변수 — new

#### Details
- **Signatures & Types**:
  ```typescript
  export const APP_NAME = '아슬아슬 냥대리';
  export const APP_SLUG = 'close-call-nyang';
  export const IOS_BUNDLE_ID = 'com.mocca.closecallnyang';
  export const PUBLIC_WEB_URL = 'https://jeong-insoo.github.io/close-call-nyang/';
  export type FeatureFlags = Readonly<{ mockAdsEnabled: boolean }>;
  export function getFeatureFlags(isDev: boolean, enableMockAd: string | undefined): FeatureFlags;
  export default function App(): React.JSX.Element;
  // app.config.ts default export는 ExpoConfig (expo/config) 타입.
  ```
- **Data & Schema Fields**:
  - npm package name `close-call-nyang`, private true, version `1.0.0`, main `index.ts`.
  - scripts: `start: expo start`, `web: expo start --web`, `typecheck: tsc --noEmit`, `test: jest`, `test:ci: jest --ci --runInBand`, `web:export: expo export --platform web`.
  - Expo: name/slug/constants above; version `1.0.0`; orientation `landscape`; userInterfaceStyle `light`; platforms `ios,web`; ios.bundleIdentifier above; ios.supportsTablet false; ios.buildNumber `1`; web.bundler `metro`; web.output `single`. Router·서버 출력·OTA 배포 설정은 추가하지 않는다.
  - Audio plugin `expo-audio`: microphonePermission false, recordAudioAndroid false, enableBackgroundRecording false, enableBackgroundPlayback false. Playback-only; no microphone/ATT/notification permissions. `expo-screen-orientation` for runtime Go orientation and standalone landscape settings.
  - `.env.example`: `EXPO_PUBLIC_ENABLE_MOCK_AD=false` (public flag, never a secret). `getFeatureFlags` returns true **only** if `isDev && enableMockAd === 'true'`. Undefined/casing/errors false. Production cannot enable mock with env alone.
  - TypeScript extends `expo/tsconfig.base`, strict true, noEmit true, includes source/tests/config. No custom alias required.
  - `ko` central object starts with title, start `업무 시작`, retry `다시 도전`, pause `일시정지`, resume `이어하기`, settings `설정`, score label `프로젝트 성공률`, best label `최고 기록`. Later tasks add keys; no page literals spread through code.
- **Execution Flow / Logic**:
  1. Inspect root and preserve `.agents`, `.codeburn`, `.memory`, `examples`, `README.md`, `AGENTS.md`, `CODEBURN-SETUP.md`, `test`. Do not scaffold over the whole directory with a generator.
  2. With apply_patch create minimal package and config. Resolve latest SDK57 stable patch at execution (known corrected minimum 57.0.17), not unqualified SDK latest; install Expo first, then `expo install` compatible runtime packages. Commit lockfile with actual resolved versions.
  3. Runtime deps: expo, react, react-native, react-dom, react-native-web, @expo/metro-runtime, react-native-reanimated, react-native-worklets, react-native-svg, react-native-safe-area-context, @react-native-async-storage/async-storage, expo-audio, expo-haptics, expo-clipboard, expo-screen-orientation, expo-status-bar. SDK57 reference: React19.2.3/RN0.86/RNWeb0.21; installed Expo's supported mapping is authoritative for patch versions.
  4. Dev deps: typescript, @types/react, @types/node, jest, jest-expo, @types/jest, @testing-library/react-native; use versions compatible with React19/SDK57. `babel-preset-expo` configures Reanimated automatically; do not install duplicate old Babel plugins. Jest uses jest-expo, Reanimated test setup, mocks only native boundaries. Do not add obsolete react-test-renderer by habit; check actual testing-library peers if needed.
  5. `index.ts` registers App. App renders centered pastel title and a startup-ready status, wrapped in safe area provider. T04 replaces placeholder with actual stateful screens; do not create fake playable controls now.
  6. Errors: package download/network failures require normal environment approval flow, never global execution-policy relaxation. On incompatible peers use Expo install/doctor guidance, not `--force`/`--legacy-peer-deps` masking. Record evidence.
  7. `.gitignore`: node_modules, .expo, dist, coverage, test-results, playwright-report, output QA binaries, .env/local credentials, signing p8/p12/mobileprovision, .codeburn generated logs. Track `.env.example` and source assets. Never ignore all `.memory` or lockfiles.

### I02. 첫 동작 검증과 개발 로그
- Related Files:
  - `src/config/__tests__/app.test.ts` :: flags test — new
  - `src/__tests__/App.test.tsx` :: initial title smoke — new
  - `docs/learning-notes.md` :: master learning log — new
  - `docs/development.md` :: Windows/Expo Go instructions — new
  - `.memory/` :: planning files & progress — read-only except this task/normal progress synchronization
  - Git metadata :: local repository — new
#### Details
- Test production+true still hides ad, development+true enables, development+undefined/false disables. Screen test reads Korean title without snapshotting implementation details.
- `docs/development.md`: Windows `.cmd` commands; Node24 confirmed; `npx.cmd expo login` and same account in iPhone Go; `npx.cmd expo start`; QR; web start; no local iOS simulator on Windows; latest Go supports SDK57 per [Sep3 update](https://expo.dev/changelog/expo-go-57-login). No actual login/build required in this foundation task.
- Learning note sections: three skills explained (decision → blueprint → one task+verification+commit+pointer), selected design vs technical defaults, architecture, per-task actual changes/results/errors, tests not yet run on real phone, release section marked pending. Include [Expo setup](https://docs.expo.dev/get-started/create-a-project/), [testing](https://docs.expo.dev/develop/unit-testing/), [Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/) links.
- Initialize `git init -b main` only after checking no existing repository (user authorized local Git). Do not overwrite global Git config or invent author. If user.name/email still absent, finish implementation/validation then request actual identity to create task commit; keep pointer here until committed. `.git` writes may need sandbox approval.
- Stage only generated/modified source and planning files relevant to this task. Do not include unrelated existing `test`, codeburn output, credentials, or all existing starter assets with indiscriminate `git add .`.

## Acceptance Criteria
- [x] Root Expo app renders title in component test; TypeScript strict and first Jest tests pass. Real phone/browser visual QA remains pending.
- [x] Resolved packages match SDK57; Expo dependency check and Doctor21/21 pass. No Router or ad SDK.
- [x] Audio permissions and production mock-ad guard are configured and tested.
- [x] Existing starter files are preserved; development and learning notes distinguish pending work.
- [x] Actual Git identity confirmed; implementation commit e2d066a. User separately authorized public remote creation/push on2026-09-21; GitHub authenticated as JEONG-INSOO and the public repository was created.

## Validation
- `npm.cmd run typecheck` — zero errors.
- `npm.cmd run test:ci` — flags and screen tests pass.
- `npx.cmd expo install --check` — SDK dependencies compatible.
- `npx.cmd expo-doctor@latest` — relevant checks pass; record external network failures separately, never call them success.
- `npm.cmd run web:export` — dist generated without runtime dependency errors.
- `git diff --check` — clean once repository initialized.

## Commit Message
```text
chore(app): bootstrap Expo game workspace and checks

Plan: 2026-09-21-close-call-nyang
Phase: P01-game
Task: T01-foundation

- Configure Expo SDK57, landscape iPhone/web and test toolchain
- Document Windows development and start the learning log
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: e2d066a
- Actual validation: typecheck0errors; Jest2suites/12tests; expo install --check passed; expo-doctor21/21; web export passed.
- Remaining advisory: npm audit10moderate via Expo/xcode/uuid,0high/critical; no forced downgrade. Actual iPhone/browser visual tests not performed in this Task.
