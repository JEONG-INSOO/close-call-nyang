# 아슬아슬 냥대리 학습노트

실제로 실행한 작업과 계획을 구분해 누적합니다. 게임 완성·배포·실기기 검증을 미리 완료로 적지 않습니다.

## 세 스킬의 역할

- `grill-me`: 코딩 전에 모호한 요구사항을 한 질문씩 결정하고 decisions에 저장합니다. 구현 도중 큰 방향이 바뀌는 비용을 줄입니다.
- `memory-plan`: 확정 내용을 파일·타입·로직·검증·커밋 단위 청사진으로 나눕니다. 이 단계는 구현 코드가 아닌 계획만 작성합니다.
- `memory-execute`: current가 가리킨 한 Task를 구현하고 검사한 뒤 커밋·진행률·다음 포인터를 갱신합니다. 검사 실패를 완료로 넘기지 않습니다.

## 선택한 게임과 기술 기본값

사용자 선택은 귀여운 냥대리, 가로 횡스크롤, 15% 커피와 가속, 51% 사무실, 100%를 넘는 기록, 균형 게이지 없음, 출시 광고 비활성화입니다. 닉네임 중복을 허용하고 가입 화면 없이 iOS/웹이 같은 온라인 순위표를 봅니다.

기술 기본값은 Expo/TypeScript/SVG/Reanimated, 순수 게임 규칙과 화면·저장·서버의 분리, 최고 기록 상위100명과 내 순위입니다. 현재는 개발 기반만 구현했고, 서버/Supabase나 랭킹을 연결한 것은 아닙니다.

## 2026-09-21 · P01-T01 개발 기반

### 무엇을, 왜 바꿨나

- `package.json`/lockfile: Expo57.0.24, React19.2.3, RN0.86.3과 Expo가 제시한 패키지 버전을 설치했습니다. Expo Go와 네이티브 라이브러리 호환을 맞추기 위해 버전을 임의로 섞지 않습니다.
- `app.config.ts`: iPhone 가로/iOS·웹/light, 녹음·백그라운드 오디오 비활성화, status-bar/asset/orientation 플러그인을 구성했습니다.
- `App.tsx`/`index.ts`: safe area 안의 파스텔 제목·개발 준비 메시지와 Expo 진입점입니다. 아직 동작하지 않는 게임 버튼을 만들어 완성된 것처럼 보이지 않게 했습니다.
- `src/config/app.ts`: 식별자와 광고 가드. 핵심은 `mockAdsEnabled: isDev && enableMockAd === 'true'`입니다. 앱에서 읽는 환경변수는 사용자가 볼 수 있으므로 보안 비밀이 아닙니다.
- `src/i18n/ko.ts`: 문구를 한곳에 모아 이후 변경 시 화면별 불일치를 줄입니다.
- TypeScript/Jest 설정과 두 테스트 파일: 광고 가드, 설정 일치, 첫 화면 표시를 검사합니다. 네이티브 모의 구현은 Node 검사 환경의 한계를 보완하는 것이며 실제 iPhone 검사를 대체하지 않습니다.
- `.gitignore`: 다운로드·빌드 산출물, 환경 파일, 서명 자료 및 기존 사용량 로그를 제외합니다. 기존 스타터/예시/test 파일은 삭제하거나 덮어쓰지 않았습니다.

### 실패와 해결

1. 제한된 네트워크에서 npm 조회가 EACCES로 실패해 승인된 네트워크 실행으로 다시 설치했습니다. 시스템 실행 정책은 바꾸지 않았습니다.
2. app.config.ts에서 확장자 없는 앱 TS import가 Expo의 초기 설정 평가에서 실패했습니다. 설정을 독립시키고 앱 식별자와의 일치 테스트를 추가했습니다.
3. Expo는 동적 설정 파일을 자동 수정하지 않으므로 status-bar와 asset 플러그인을 직접 반영했습니다. Doctor가 찾은 expo-audio의 expo-asset peer도 추가했습니다.
4. TypeScript6에서 Jest 전역이 누락되어 compilerOptions.types에 react/react-native/jest/node를 명시했습니다.
5. test-renderer1.3의 하위 reconciler가 React19.3을 요구해 React19.2 호환1.2.0으로 고정했습니다. 강제 peer 무시 옵션은 사용하지 않았습니다.
6. Reanimated 테스트 초기화가 네이티브 Worklets 런타임을 불러와 실패하여 패키지가 제공하는 모의 구현을 테스트 경계에 적용했습니다.
7. Windows 샌드박스 파일 도구 오류 이후 승인된 정식 apply_patch 실행으로 작업했습니다. Git 소유자 차이는 단일 저장소 경로의 명령별 신뢰 설정으로 처리했습니다.

### 검증 기록

- 타입 검사: 최종 통과, 오류0.
- Expo 호환 패키지 검사: 최종 통과, Dependencies are up to date.
- Expo Doctor: 21/21 통과.
- 웹 export: 최종 통과, dist/index.html과 웹 JavaScript 번들 생성.
- Jest: 최종2개 suite/12개 테스트 통과. safe-area 모의 모듈은 default export로 연결해야 한다는 점도 확인했습니다.
- 보안 검사: 중간 등급10개 경고가 남아 있음. high/critical0. xcode의 uuid 하위 의존성 경로이며 강제 Expo 하향은 적용하지 않음.
- 미검증: 실제 iPhone/Expo Go, 브라우저 육안 실행, EAS/TestFlight, 온라인 서버, 스토어 제출.

### Git 및 다음 단계

기획 문서·워크플로 규칙24개를 `2a1c426`, 검증된 첫 구현 작업을 `e2d066a`로 저장했습니다. 사용자 인증 후 실제 GitHub 계정 JEONG-INSOO에 공개 저장소 https://github.com/JEONG-INSOO/close-call-nyang 을 생성했습니다. 종전 mocca/close-call-nyang 주소는 계획값이었고 조회에서 Repository not found였습니다. 앱·계획의 Pages/CORS 주소를 실제 계정으로 수정했으며 사이트 배포는 후속 Task입니다.

T01은 필수 검사를 통과했으며 구현 커밋 후 current를 P01-T02 게임 엔진으로 전진합니다. 출시 문구와 스크린샷은 나중에 다시 확인받으며 전체 출시와 학습노트 마감은 아직 대기입니다.

## 요청 범위 밖 발견 사항

위 하위 의존성 보안 경고 외 기존 사용자 파일의 결함은 발견하지 않았습니다. 이번 Task에서 기존 스타터 예시나 사용량 도구를 임의 수정하지 않았습니다.

## 참고 자료

- [Expo 프로젝트 시작](https://docs.expo.dev/get-started/create-a-project/)
- [Expo 단위 테스트](https://docs.expo.dev/develop/unit-testing/)
- [Expo Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/)
