# Task: T01 Web preflight

## Status

done

## Scope

- 최신 웹 export 생성
- 로컬 4173 서버 실행
- 브라우저 접속 및 게임 시작·입력·결과 화면 스모크 테스트
- 실행한 명령과 결과를 학습노트에 기록

## Acceptance criteria

- 빌드가 오류 없이 생성된다.
- 4173 주소가 HTTP 200으로 응답한다.
- 게임 시작, 좌우 입력, 실패/결과 흐름이 브라우저에서 동작한다.
- 실행하지 않은 검사는 통과로 표시하지 않는다.

## Blocker

없음. 서버를 실행한 뒤 브라우저 스모크를 진행한다.

## Progress

- [x] staging-config export 생성 및 `ranking:env-check` 통과
- [x] 4173 HTTP 200 및 제목 확인
- [x] 데스크톱 핵심 브라우저 흐름 3개 통과(키보드 입력/실패·재시작, 일시정지·포커스, A·ArrowLeft 독립 입력)
- [x] 두 손가락 터치 포인터 케이스 — `phone-landscape`에서 동시 입력·부분 해제·취소 통과
- 참고: Playwright 본문은 통과했으나 다중 webServer 종료가 지연되어 프로세스는 수동 종료함
