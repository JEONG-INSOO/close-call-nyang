# Plan: 설정·랭킹의 공개 안내 링크 연결

## Goal

누구나 설정에서 개인정보·고객지원 페이지에 접근하고, 랭킹 문의도 같은 공식 지원 주소를 열도록 만든다. 게시된 정책과 앱 UX를 연결하되 Expo Go/기존 저장·게임 동작을 유지한다.

## Basis

- [사용자 확정 결정](../decisions/2026-09-30-store-policy-links.md).
- 선행: 원래 출시 준비 P01-T02의 실제 공개 페이지 배포 검증 완료.
- 완료 후 복귀: `2026-09-29-app-store-review-prep/P01-readiness/T03-store-assets.md`.
- 단일 UI 기능이므로 Phase를 분할하지 않는다. 앱 수정과 오류/공유 URL 회귀는 함께 검증해야 독립 실행이 가능하다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 공통 URL·설정 링크·랭킹 문의 연결 및 실패 회귀 | [P01](../phases/2026-09-30-store-policy-links/P01-links/phase.md) |

## Guardrails

기존 더티 작업과 dist는 보존한다. 서버·엔진·인증·닉네임 변경 정책과 실제 광고를 바꾸지 않는다. 외부 브라우저는 사용자 탭에서만 연다. 개인정보·실제 iPhone 캡처·최종 문구 승인 게이트는 원래 P02에서 계속 확인한다.
