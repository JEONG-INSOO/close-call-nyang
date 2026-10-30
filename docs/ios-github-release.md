# Expo 계정 없이 iOS 업데이트 배포

개발과 Expo Go 사용은 그대로다. 배포는 GitHub Actions의 macos-26/Xcode26.6에서 로컬 Expo CLI로 Xcode 프로젝트를 생성하고 직접 빌드한다. `eas login`, `eas build`, `EXPO_TOKEN`은 사용하지 않는다.

## 1. 인증 자료 없는 컴파일 검사

GitHub 저장소 Actions → **Build iOS without an Expo account** → Run workflow → main → `unsigned-archive`.

이 모드는 Apple 키 없이 prebuild/pods/실제 Release archive를 실행한다. 버전은1.0.1, 빌드 번호는100+워크플로 실행 번호다. 생성 archive의 bundle/version/build를 직접 검증하고3일 보관한다. 서명 없는 archive는 iPhone에 설치하거나 Apple에 제출할 수 없다.

## 2. 서명과 업로드

다음 자료를 **이 저장소의 Actions Secrets**에 저장해야 한다. 값을 공개 코드·이슈·채팅에 붙여넣지 않는다.

| 이름 | 내용 |
|---|---|
| APPLE_SIGNING_CERTIFICATE_P12 | Apple Distribution 인증서와 개인키가 들어 있는 암호화p12의 Base64 |
| APPLE_SIGNING_CERTIFICATE_PASSWORD | 그p12의 암호 |
| APPLE_PROVISIONING_PROFILE | com.mocca.closecallnyang용 App Store profile의 Base64 |
| APP_STORE_CONNECT_PRIVATE_KEY | 기존 Apple 업로드용p8 원문 |
| APP_STORE_CONNECT_KEY_ID | 해당 키ID |
| APP_STORE_CONNECT_ISSUER_ID | 해당 팀 issuerID |

대상은 기존 Apple 팀S9RLQ8474U, 앱6815771701이다. 기존 인증서를 임의 폐기하지 않는다. 새 서명 인증서 발급과 비밀자료의 GitHub 제공은 사용자의 구체적 승인이 필요하다. API키의 실제 팀/역할도 먼저 대조한다.

준비 후 같은 워크플로의 `app-store` 모드를 실행한다. main만 허용되고 동시실행 취소는 하지 않는다. 인증서·프로필은 임시 Mac에 설치하며 앱/팀/배포유형/만료/인증서일치를 검사한다. prebuild와의존성설치는서명secrets전달전별도단계다. 키·프로필 원문을로그나산출물에넣지않고 job종료시자체임시자료만정리한다.

실제 archive의 식별자와1.0.1/빌드번호를 확인한 뒤 IPA를내보내고 Apple에업로드한다. 최종 IPA와민감정보없는receipt만7일보관한다. 업로드성공이AppReview접수/승인/출시라는뜻은아니다. Apple처리후 AppStoreConnect에서정확한빌드연결과심사접수가필요하다.

## 3. 실패와 재시도

- Apple 자료가 없으면 `unsigned-archive`만 가능하다. 성공으로 과장하지 않는다.
- 인증서 수 한도라면 기존 것을 자동 폐기하지 않는다.
- `app-store` 재실행 전 Apple 업로드 결과를 확인한다. 같은 실행의 재시도는 같은 빌드 번호여서 중복 제출할 수 있다. 이미 업로드됐으면 재업로드하지 않는다.
- GitHub hosted Mac만 사용한다. 개인 Mac이나 공유 self-hosted runner에 이 스크립트를 그대로 실행하지 않는다.
- 실제 iPhone 성능·캐릭터 육안 QA는 컴파일 검사와 별도로 확인한다.

근거: [GitHub의 Apple 서명 안내](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications), [Expo CNG](https://docs.expo.dev/workflow/continuous-native-generation/), [GitHub Mac 이미지](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md).
