# Plan: App Store 공개 심사 준비

## Goal

사용자가 승인한 최신 게임·성실한 냥대리 아이콘을 재현 가능한 소스로 고정하고, 전 세계 무료 출시용 공개 안내와 한·영 메타데이터, 실제 iPhone 캡처, 새 TestFlight 빌드 및 기기 QA를 갖춰 App Store Connect에서 공개 심사 제출 직전까지 준비한다. **실제 App Review 제출·자동 공개는 별도 최종 승인 전에는 하지 않는다.**

## Basis and guardrails

- [확정 결정](../decisions/2026-09-29-app-store-review-prep.md). 공개 지원 이메일 `mocca3232@naver.com`, `2026 Insoo Jeong`, 무료·IAP 없음·전 세계·수동 출시.
- 이전 1.0.0(5)의 EAS 완료는 새 아이콘 포함, Apple 처리, 기기 QA의 증거가 아니다.
- 기존 베테랑 T03와 iOS P03-T03는 `in_progress`로 보존한다. 새 계획의 첫 Task가 기존 QA 증거를 검토하지만 미검증 작업을 임의 완료 처리하지 않는다. 이전 current 포인터는 이 계획으로 일시 전환하며 추적 링크를 유지한다.
- 현재 더티 작업 트리의 `test`, 미승인 자산·문서, `dist`와 사용자 데이터는 일괄 stage/삭제하지 않는다. 각 Task는 정확한 파일만 선택해 커밋한다.
- 사용자가 최신 TestFlight의 iPhone 가로 원본을 촬영·전달하고, 조수가 편집·규격·내용 확인을 맡는다. 실제 파일을 받기 전에는 화면 자료와 심사 제출을 완료할 수 없다.

## Phases

### 2026-09-30 순서 보강
- 사용자 [TestFlight 우선 요청](../decisions/2026-09-30-testflight-first.md)에 따라 최신 소스의 P02-T01 전달을 먼저 실행한다. P01-T03은 pending 보존. 서명·아카이브·QA 게이트는 유지하고 스토어 설명/심사 제출은 실행하지 않는다.
- 공개 페이지 T02 완료 후 사용자 승인 [앱 정책 링크 단일 Task](./2026-09-30-store-policy-links.md)를 먼저 실행하고 이 계획 P01-T03로 복귀한다. 웹 게시만으로 앱 안의 개인정보 접근 경로가 생기지는 않는다.
- P01-T03는 소개 초안·승인된 운영 입력·촬영 계약 준비까지다. 실제 최신 원본 캡처는 P02-T01의 새 빌드 후 P02-T02에서 확보·검증하고 최종 소개/제출 자료 승인은 P02-T03에서 확인한다. 원래 최종 승인 게이트를 유지하되 캡처가 빌드보다 먼저 필요했던 순환 의존성을 제거한다.

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 소스·QA 고정, 공개 지원/개인정보 페이지, 한·영 스토어 자료 | [P01](../phases/2026-09-29-app-store-review-prep/P01-readiness/phase.md) |
| P02 | `in_progress` | 사용자 요청으로 새 TestFlight 전달 우선, 심사·문구 승인은 별도 | [P02](../phases/2026-09-29-app-store-review-prep/P02-ios-delivery/phase.md) |

## Exit condition

App Store Connect의 빌드·가격/국가·연령등급·개인정보 답변·지원/개인정보 URL·한/영 문구·실제 가로 캡처가 정확히 채워지고, 최신 빌드의 iPhone 테스트 기록과 사용자의 문구/제출 승인 요청까지 준비되면 계획 완료. 미확인 항목은 `not_run` 또는 `blocked`로 남긴다.
