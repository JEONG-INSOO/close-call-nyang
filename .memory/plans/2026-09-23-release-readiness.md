# Plan: 2026-09-23 Release Readiness

## Goal

게임·웹·서버를 출시 후보 수준으로 검증한 뒤 Expo Go 기기 테스트와 EAS iOS 배포 준비로 넘어간다.

## Phase

- P01 Web preflight: 최신 웹 빌드, 4173 서버, 브라우저 스모크 테스트
- P02 Hosted web: GitHub Pages 실제 배포와 접속 검증
- P03 Expo Go: QR 실행, 가로 화면, 터치, 저장, 랭킹 스모크 테스트
- P04 Backend: Supabase 환경변수·저장·랭킹·오류 상태 검증
- P05 Release QA: 광고 비활성, 규칙 버전, 캐릭터 해금, 학습노트
- P06 iOS: EAS cloud build와 TestFlight/App Store 제출 준비

## Learning outcome

각 Task 완료 시 docs/learning-notes.md에 설계 이유, 핵심 개념, 데이터 흐름, 검증 결과, 디버깅 교훈, 다음 연습을 기록한다.
