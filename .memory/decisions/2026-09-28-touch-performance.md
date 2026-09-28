# Decisions: 터치 입력 화면 갱신 비용 완화
- Date: 2026-09-28
- Status: Confirmed

## D01. 사용자 선택
- 선택3: 광고는 현재 비활성 정책 그대로 유지하고 터치 끊김만 우선 처리한다. 광고 SDK/부활/랭킹 자격/난이도를 바꾸지 않는다.
## D02. 코드 조사에 따른 범위
- ControlButton은 눌림 시 borderWidth2→3 및 React 상태 갱신, 부모의 동일 props 재렌더링을 그대로 따른다. GameScreen은 10Hz 전체 snapshot을 받지만 표시에는 screen/score/event id·phase·direction만 사용한다. SceneFrame SharedValue의 애니메이션은 독립 갱신이다.
- 최소 변경: 입력 패드 memo 및 고정 테두리, 표시용 GameScreen 비교로 불필요한 부모 업데이트 차단. tick·입력 registry·랭킹 증거·동시 누름 의미는 그대로.
- 이것이 실기기 끊김의 유일 원인이라고 단정하지 않는다. 자동검사는 줄어든 렌더 작업·입력 회귀를 입증하며 실제 FPS/손맛은 새 iPhone 빌드에서 확인한다.
## Out of scope
- JS 엔진을 UI thread로 옮기기, SVG 전체 교체, 가상 광고 복구, 서버 재배포, 기존 업로드 기록 정리. 이전 release dirty 파일 보존. 새 TestFlight 업로드는 별도 단계로 원래 P03-T03에 복귀한다.
