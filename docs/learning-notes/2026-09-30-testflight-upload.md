# 최신 설정 링크·아이콘을 TestFlight에 전달하기

## 무엇을, 왜

사용자가 최신 앱을 직접 테스트하도록 요청해 스토어 소개 초안보다 TestFlight 전달을 우선했다. 소개·실제 iPhone 캡처·심사 승인은 pending으로 보존한다. TestFlight 업로드와 App Store 공개 심사 제출은 다른 작업이다.

```sh
eas build --platform ios --profile production --freeze-credentials --wait
eas submit --platform ios --profile production --id <확인한-build-ID> --no-auto-testflight-setup --wait
```

실제 실행은 이미 설치한 EAS CLI24.7.0을 사용한다. `--id`는 다른 최신 빌드를 잘못 올리는 것을 막고, `--freeze-credentials`는 기존 원격 서명 재사용을 유지한다. `--no-auto-testflight-setup`을 사용하고 그룹 생성·외부 초대는 요청하지 않는다.

## 소스 → 아카이브 → 빌드 → 업로드 → Apple 처리

- 앱 링크 구현 `089c8bd`를 포함한 빌드 소스 `09a7a0949efc21554fee29a3e77e14c18328efe3`를 고정했다. `.easignore`에 로컬 `debug.log`를 제외했다. 로그 내용은 출력하지 않았고 원본도 삭제하지 않았다.
- `build:inspect --stage archive`의 실제 파일112개를 HEAD의 Git blob과 대조했다. 텍스트는 Git의 줄바꿈 필터를 적용해 해시를 비교하고 PNG 같은 바이너리는 그대로 비교했다. mismatch0/untracked0/forbidden0, 새 아이콘·공통 링크·두 캐릭터 아틀라스·package lock 존재를 확인했다.
- EAS계정 insoojeong/프로젝트315e87a2-f405-4f65-ae45-c91f1d2c59bf/ASC앱6815771701/bundle com.mocca.closecallnyang/team S9RLQ8474U 유지. production 공개 환경은 운영 URL과 publishable key 두 개만 메모리에서 검증하고 값은 출력/저장하지 않았다. 광고·replay진단은 false.
- branding 원본일치/불투명1024, release8, typecheck, ranked8(`nyang-v1-bc732af6f2a7ea66`) 통과. 앱 소스는 직전 전체700/50 suites와 웹 링크3건 검증 결과를 유지한다. 게임 규칙/서버는 바꾸지 않았다.
- 이전 dirty release-state의 build5 사실을 `store/build-history/2026-09-29-build5.json`에 정확히 보존했다. 새 상태로 덮어써 과거 증거를 잃지 않도록 했다.
- 원격 번호 autoIncrement로5→6, 기존 프로비저닝 active 확인·5.5MB 업로드 완료. 새 build/submission의 실제 완료 ID/시각은 확인 후 아래에 기록한다. 업로드 요청 접수만으로 설치 가능이라 하지 않는다.

## 실패·주의에서 배운 점

- history 하위 폴더 생성이 첫 patch 호출에서 실패해 `New-Item -ItemType Directory`로 정확한 폴더만 만든 후 재시도했다. 앱 파일을 일괄 커밋하거나 사용자 변경을 지우지 않았다.
- CLI JSON의 전체 결과에는 서명된 로그 다운로드 URL이 포함된다. 최초 최근 빌드 조회에서 이 전체 출력을 사용했고, 이후 조회는 필요한 상태/ID/버전/소스 필드만 골라 출력하도록 바꾼다. 일반 보고서에 로그 URL이나 인증 값을 저장하지 않는다.
- 로컬 app.config의 buildNumber1은 원격 번호를 쓰는 EAS에선 실제 IPA 번호가 아니다. 이번 번호는 원격 build metadata로 확인한다. 로컬 필드 제거는 별도 설정 정리 대상이며 업로드 중 런타임 소스를 바꾸지 않는다.

## 실제 전달 결과

- EAS build `3fd87f8b-5d8e-479a-8fc8-e7cc3a8de37a` FINISHED, 1.0.0(6), completed2026-09-30T02:23:28.174Z. readback의 bundle/번호/source가 고정 입력과 일치했다.
- 이 정확한 ID를 ASC앱6815771701로 제출한 submission `e0347b70-45bb-4aac-a9f2-d76c8d8cf60d`도 FINISHED, completed2026-09-30T02:24:43.663Z. 별도 submit:view readback에서 buildID/ASC앱 연결 일치와 업로드 완료를 확인했다.
- Apple submit:status 첫 조회에서는6번이 아직 없었지만 최종 재조회에서1.0.0(6)의 processingState=VALID, internalState=IN_BETA_TESTING, externalState=READY_FOR_BETA_SUBMISSION, expired=false를 확인했다. uploadedDate=2026-09-30T11:25:45+09:00. 내부 TestFlight 테스트 상태이며 외부 베타 심사/App Review/공개 출시를 제출하지 않았다. 실제 iPhone 설치·기기 QA는 아직 사용자 확인이 필요하다.
- 확인 링크: [빌드](https://expo.dev/accounts/insoojeong/projects/close-call-nyang/builds/3fd87f8b-5d8e-479a-8fc8-e7cc3a8de37a), [업로드](https://expo.dev/accounts/insoojeong/projects/close-call-nyang/submissions/e0347b70-45bb-4aac-a9f2-d76c8d8cf60d), [Apple TestFlight](https://appstoreconnect.apple.com/apps/6815771701/testflight/ios).

## 복습·다음 연습

1. 작업 트리가 dirty여도 실제 업로드 입력을 커밋과 대조해야 하는 이유는?
2. build FINISHED와 submission FINISHED는 각각 무엇을 증명할까?
3. TestFlight에서 실제 빌드 번호6을 확인한 뒤 새 아이콘, 설정 두 링크·Safari복귀, 걷기/터치, 닉네임 안내를 테스트해 보자. 자동 게임 재개가 없는지도 확인한다.
