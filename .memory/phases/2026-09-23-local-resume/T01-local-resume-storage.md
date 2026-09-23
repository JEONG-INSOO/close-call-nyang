# Task: T01 Local resume storage

## Status

done

## Scope

- AsyncStorage 저장 키와 버전 스키마 정의
- 일시정지·홈 이동·앱 백그라운드 이벤트 연결
- 저장 실패 시 오류를 기록하되 게임 플레이는 계속
- 기존 랭킹·서버 저장과 분리

## Acceptance criteria

- 저장된 상태가 JSON으로 직렬화·복원된다.
- 앱 백그라운드 전환 시 저장 함수가 호출된다.
- 손상되거나 버전이 다른 저장 데이터는 무시된다.
- DB/Supabase 호출이 추가되지 않는다.

## Validation

- npm run typecheck
- 관련 preferences/game controller 테스트
- 웹 export 후 기존 브라우저 스모크 테스트

## Commit

feat(game): persist local resume state
Plan: 2026-09-23-local-resume

## Result

- Added versioned AsyncStorage checkpoint validation and controller restore path.
- Lifecycle and pause/home flows save paused checkpoints.
- Typecheck, focused tests, full Jest, and ranked:check passed.
