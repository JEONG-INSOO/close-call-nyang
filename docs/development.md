# 아슬아슬 냥대리 개발 안내

## 현재 구현 범위

P01 로컬 게임을 구현했습니다. 균형 조작·횡스크롤·세 캐릭터·설정/최고 기록 저장·수집 보상·소리·공유·개발 전용 텍스트 광고가 연결돼 있습니다. 온라인 닉네임/랭킹은 다음 P02, GitHub Pages 공개 배포와 iPhone 검증은 P03입니다. 기존 스타터 README와 예시는 보존했습니다. 실제 검증 범위는 [QA 기록](./qa-report.md)을 확인하세요.

## Windows 실행

- Node 24, npm 11 사용. PowerShell 실행 정책을 바꾸지 말고 `npm.cmd`와 `npx.cmd`를 사용합니다.
- 재설치: `npm.cmd ci` — 커밋된 package-lock.json의 버전을 재현합니다.
- iPhone 개발: `npx.cmd expo login` 후 같은 Expo 계정으로 iPhone Expo Go에 로그인하고 `npm.cmd start`의 QR을 엽니다. PC와 휴대폰의 네트워크 연결도 확인합니다.
- 웹 개발: `npm.cmd run web`.
- 검사: `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npx.cmd expo install --check`, `npx.cmd expo-doctor@latest`.
- 웹 산출물: `npm.cmd run web:export`. `/close-call-nyang/` 하위 경로를 적용한 production `dist`를 생성합니다. 공개 배포 workflow는 후속 작업입니다.

일반 Expo Go의 SDK57 지원은 [공식 안내](https://expo.dev/changelog/expo-go-57-login)를 기준으로 합니다. Windows에서 로컬 iOS 시뮬레이터를 실행하는 구성은 아닙니다. App Store용 독립 앱은 이후 EAS 클라우드 빌드로 준비합니다. 이번 작업에서는 Expo/Apple 로그인, 실기기 실행, EAS 빌드를 수행하지 않았습니다.

## 구성 원칙

- `app.config.ts`: iPhone 전용, 가로, 밝은 테마, iOS/web, Metro single 출력. Router는 없습니다.
- 동적 Expo 설정은 Metro 이전에 읽힙니다. 앱 TypeScript 모듈을 확장자 없이 import하면 초기 설정 평가가 실패할 수 있어 설정을 독립시켰습니다. 앱 식별자와 설정 값 일치는 테스트로 검사합니다.
- `src/i18n/ko.ts`에서 사용자 문구를 관리합니다.
- 광고 가상 흐름은 개발 빌드에서만 사용할 수 있습니다. 가드는 `isDev && enableMockAd === 'true'`이며 production은 공개 환경변수만 바꿔도 켜지지 않습니다. 실제 광고 SDK는 없습니다.
- 오디오의 녹음·마이크·백그라운드 재생 설정은 끕니다. `expo-asset`은 expo-audio의 필수 네이티브 의존성입니다.
- `babel-preset-expo`가 Reanimated를 구성합니다. 별도 구형 Babel 플러그인을 중복 설치하지 않습니다.
- TypeScript6의 테스트 전역 타입을 명시했습니다. Jest는 Worklets/safe area와 AsyncStorage·오디오·햅틱·OS 공유 등의 플랫폼 경계를 테스트별로 모의 처리합니다. 실제 폰의 UI 스레드·디스크·소리·OS 동작을 검증한 것으로 해석하지 않습니다.
- `test-renderer`는 React19.2와 맞는1.2.0으로 정확히 고정합니다.1.3.0의 내부 react-reconciler는 React19.3을 요구했습니다.

## Production 웹 QA 재현

개발 서버가 아니라 실제 배포 번들을 검사합니다. PowerShell에서 아래 순서로 실행합니다. Chromium 설치는 최초 또는 Playwright 버전 변경 시에만 필요합니다.

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run typecheck
npm.cmd run test:ci
npm.cmd run test:server
$nyangPreviousMockAd = $env:EXPO_PUBLIC_ENABLE_MOCK_AD
try {
  $env:EXPO_PUBLIC_ENABLE_MOCK_AD = 'true'
  npm.cmd run web:export
} finally {
  $env:EXPO_PUBLIC_ENABLE_MOCK_AD = $nyangPreviousMockAd
}
npm.cmd run fixtures:build
npm.cmd run e2e
npx.cmd expo install --check
```

명령은 한 줄씩(try/finally만 하나의 블록으로) 실행하고, 실패하면 멈춰 원인을 해결합니다. PowerShell에서 native 명령의 실패가 다음 줄을 자동 중단시키지는 않으므로 전체 블록을 무작정 연속 실행하지 마세요. `e2e`는 이미 생성된 두 번들을 사용하므로 소스 변경 후 export/fixtures 빌드를 다시 실행해야 합니다. `EXPO_PUBLIC_ENABLE_MOCK_AD=true`는 production 광고 차단을 시험하기 위한 의도적인 입력이지 출시 광고 활성화 설정이 아닙니다.

- Playwright가 `127.0.0.1:4173/close-call-nyang/`(실제 앱)과 `127.0.0.1:4174/fixtures/`(합성 그림 검사) 서버를 시작·종료합니다. 해당 포트가 사용 중이면 기존 프로세스를 임의로 종료하지 말고 먼저 확인하세요.
- 직접 웹을 볼 때는 `npm.cmd run web:serve` 후 첫 주소를 엽니다. 로컬 전용 서버이므로 휴대폰 LAN 접속용이 아닙니다. iPhone 개발은 위 Expo QR 절차를 사용하세요.
- `npx.cmd playwright show-report`로 결과를 엽니다. `test-results/results.json`, 스크린샷, `playwright-report/`는 생성 결과이고 Git에서 제외합니다. 다음 실행 시 이전 결과가 교체될 수 있습니다.
- `e2e/fixtures/index.tsx`는 실제 앱과 독립된 진입점입니다. 합성 거리/포즈를 렌더링할 뿐 저장·해금·엔진을 조작하지 않습니다. `output/qa-fixtures`를 배포 dist에 복사하거나 iOS 스토어 캡처로 사용하지 마세요.
- 잠깐의 렌더 정체에도 게임이 자동 정지할 수 있으므로 브라우저 검사 중 CPU 부하를 피하세요. 이 보호 규칙을 테스트 통과 목적으로 끄지 않습니다.
- CDP 멀티터치 검사는 lockfile의 Playwright/Chromium 조합 기준입니다. 브라우저 업그레이드 시 한 손가락 종료의 실제 동작을 다시 확인해야 합니다.

## 로컬 파일과 보안

node_modules/dist/.expo/환경 파일/서명 자료/사용량 로그는 커밋하지 않습니다. `.env.example`만 추적합니다. 아직 서버 키나 온라인 API 설정은 없습니다.

`npm audit`에 Expo → config-plugins → xcode → uuid 경로의 중간 등급 경고10개가 남아 있습니다. 이는 하위 취약점의 상위 영향 패키지를 포함한 수입니다. 자동 제안이 Expo46으로 하향하는 경로여서 `npm audit fix --force`는 실행하지 않았습니다. 이후 SDK 호환 패치 및 출시 전에 재검토해야 합니다. 경고를 숨기거나 보안 검사가 통과했다고 표시하지 않습니다.

Git 작성자는 이 저장소에만 `mocca3232 / mocca3232@naver.com`으로 설정했습니다. 커밋·공개 푸시 시 이 작성자 이메일도 공개 이력에 포함됩니다. 샌드박스가 만든 저장소를 다른 실행 계정이 읽을 때는 해당 경로에만 한정한 `git -c safe.directory=D:/GrillmeEDU ...`를 사용했으며 전역 safe.directory 예외는 추가하지 않았습니다.

## 참고

- [Expo 시작](https://docs.expo.dev/get-started/create-a-project/)
- [Expo 단위 테스트](https://docs.expo.dev/develop/unit-testing/)
- [Reanimated 설치](https://docs.expo.dev/versions/latest/sdk/reanimated/)
