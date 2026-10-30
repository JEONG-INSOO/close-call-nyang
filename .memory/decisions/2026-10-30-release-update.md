# Decision: 웹과 App Store 업데이트
- 사용자 승인: ‘1, 앱스토어에도 배포’. 완료된 d3b83d2까지의 게임 변경을 GitHub main에 정상 push하고 공식 Pages 재배포, 새 iOS build와 App Store 업데이트를 진행한다.
- Apple 공개 lookup에서6815771701/우당탕탕 냥대리/1.0/2026-10-25 출시 확인. 다음 앱 버전은1.0.1, bundle com.mocca.closecallnyang/팀S9RLQ8474U/Expo project315e87a2-f405-4f65-ae45-c91f1d2c59bf 유지. 원격 buildNumber autoIncrement.
- 최초 EAS 사용 계획은 아래 사용자 후속 요청으로 대체됐다.
- 사용자 후속: ‘EXPO 계정말고 다르게 배포해줘’. Expo 로그인/EAS 빌드·업로드를 사용하지 않는다. GitHub Actions macos-26/Xcode26.6에서 Expo CLI prebuild(계정불필요)→xcodebuild→Apple 업로드. Expo Go 개발 흐름은 유지한다. 유료 runner/별도과금/SDK추가 없음.
- GitHub에 Apple 서명/업로드 secrets가 없으며 프로젝트 루트에도p8/p12/profile 없음. 먼저 계정불필요 unsigned archive로 실제네이티브컴파일검증, 서명 업로드는 Apple자료준비와새보안접근승인이 필요하다. 기존인증서폐기금지/기존EAS계정로그아웃금지.
- 운영 migration202610300001/functionv5는 이미 적용/검증 완료. 기존 점수와131 및 구규칙앱 지원 유지. DB 재적용/다른프로젝트중지 없음.
- 승인된 DEXCONSULTING 가상 텍스트광고만 켜짐. 실제SDK·추적 없음. 스토어 광고 답변과 소개/심사메모는 새 앱 실제 동작과 대조하여 필요한 갱신을 준비한다. 새로운 법적 동의·권한 승인은 자동 수락하지 않는다.
- 기존 사용자 dirty 아트/QA/학습노트 보존. EAS에는 검증된 커밋의 격리된 소스만 업로드한다. 비밀키·개인정보·토큰을 로그/커밋에 넣지 않는다.
- Apple 심사 접수와 승인/출시는 구별한다. 기존 국가 제한/가격/연령답변을 임의로 확대하지 않는다. 출시 방식은 현재 설정을 확인하고 유지한다.
