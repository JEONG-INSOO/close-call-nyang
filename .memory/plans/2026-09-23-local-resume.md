# Plan: 2026-09-23 Local Resume

## Goal

DB 없이 AsyncStorage로 게임 진행 상태를 저장하고 홈 화면에서 이어할 수 있게 한다.

## Phase

- P01 Local resume: 저장 스키마, lifecycle 저장, 복원 UI, 삭제 규칙, 테스트

## Boundaries

- Supabase·랭킹·서버 API·게임 규칙은 수정하지 않는다.
- 저장 데이터는 현재 기기와 앱 설치에 한정한다.
- 저장 실패 시 게임을 중단하지 않고 새 게임 경로를 유지한다.

## Learning outcome

React Native 앱 수명주기, AsyncStorage 직렬화, 복원 가능한 게임 상태, 실패 허용 저장을 학습한다.
