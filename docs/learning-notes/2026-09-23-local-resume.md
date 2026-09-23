# 2026-09-23 · DB 없는 홈 이어하기

## 무엇을 바꿨나

일시정지·홈 이동·앱 백그라운드 전환 때 게임 상태를 AsyncStorage에 저장하고, 다음 실행의 제목 화면에 `저장된 게임 이어하기`를 추가했다. Supabase 랭킹과 기존 preferences 저장 키는 변경하지 않았다.

## 왜 이렇게 설계했나

이어하기는 한 기기에서 진행을 보존하는 기능이라 서버 DB 없이 구현할 수 있다. 저장 상태는 paused와 유효한 resumeTo만 허용하고, 버전이 다르거나 손상된 JSON은 무시한다. 엔진 규칙 대신 컨트롤러 전용 복원 메서드를 사용해 ranked replay 규칙과 서버 복사본의 동기화를 유지했다.

## 핵심 개념과 흐름

```text
AppState background / 일시정지 / 홈
  → paused checkpoint 변환
  → AsyncStorage 저장
  → 다음 실행 load → 제목 화면 이어하기
  → controller.restore → RESUME
```

`AsyncStorage`는 기기별 key-value 저장소다. 공용 랭킹이나 기기 간 동기화는 제공하지 않지만 같은 기기에서 앱을 종료한 뒤 이어하기에 적합하다.

## 검증과 디버깅

저장 서비스 테스트와 화면 테스트를 추가했다. TypeScript typecheck, ranked:check, 전체 Jest 44 suites / 659 tests를 통과했다. 처음 전체 테스트에서는 ranked 생성 동기화가 먼저 필요해 1건이 실패했고, `npm run ranked:sync` 후 재실행해 모두 통과했다.

Expo Go 실기기에서도 플레이 중 백그라운드 전환 후 진행 상태가 유지되고, 앱을 다시 열었을 때 이어하기가 가능한 것을 확인했다.

## 다음 연습

저장 데이터에 만료 정책을 추가하고, 오래된 checkpoint를 안전하게 무시하는 테스트를 직접 작성해 본다.

## 알아야 할 점 / 범위 밖

저장 데이터는 한 기기·한 앱 설치에 한정된다. 이번 확인은 Expo Go 실행 환경 기준이며, App Store 빌드와 Hermes 네이티브 릴리스 빌드는 별도 출시 QA가 필요하다. 서버 운영 검증은 이번 Task에서 변경하지 않았다.
