# Decisions: 공개 가상 광고와 Safari 포커스 유예

- Date: 2026-10-12
- Status: confirmed
- 사용자 요청: SDK 없이 DEXCONSULTING 가상 광고/광고 보고 일어서기를 켜고, Safari의 짧은 포커스 이탈에 0.5초 유예를 적용한 뒤 GitHub에 업로드한다.

## D01. 광고
- Chosen: 출시 소스/Pages/EAS 설정에 텍스트 가상 광고를 명시적으로 활성화한다. 기존 5초, 중도 닫기 보상 없음, 판당 부활 1회, 카운트다운과 보호 시간을 유지한다. 외부 SDK/요청/추적 추가 없음.
- 조사로 확인: `isDev` 가드와 CI/EAS false 설정이 공개 광고를 막았다. 기존 flag는 일반 기록/해금도 전부 차단했다.
- 구현 기본: 일반 플레이의 랭킹/100% 해금은 유지하고 실제 부활 뒤 추가 기록만 온라인/해금 제외한다. 최초 실패까지의 온라인 대기 기록은 부활 중에도 정상 제출한다. 로컬 최고기록은 유지한다.

## D02. 포커스
- Chosen: visible 상태의 blur는 500ms 뒤에도 포커스가 없을 때 비활성 처리한다. focus 복귀 시 타이머 취소, hidden/pagehide는 즉시 정지. 게임 자동 재개 없음.
- 조사로 확인: 현재 web lifecycle과 ranked start 각각 blur에 즉시 반응한다. 두 경로가 같은 foreground 판정을 사용해야 한다. 입력 해제/긴 프레임 보호/native AppState는 유지한다.
- 근거: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API 는 blur와 실제 숨김을 구분한다. Safari 실기기 원인을 계측한 결과는 아니며 자동 회귀 후 사용자가 실제 기기에서 확인한다.

## D03. 범위
- Chosen: 소스 커밋·정상 main push·기존 Pages CI 확인. 국가 변경, 심사 취소/재제출, 새 TestFlight/IPA, DB/서버 엔진 변경은 제외한다.
- 기존 사용자 더티 아트/test/QA 문서를 보존한다. 현재 스토어 자료 정리 포인터는 별도 보존 후 이 계획 종료 시 복귀한다.
- 공개 방침의 개발 전용 가상 광고 표현만 현재 텍스트 홍보와 맞춘다. Apple 광고 설문/새 빌드 제출은 별도 후속이며 이번에 변경하지 않는다.
