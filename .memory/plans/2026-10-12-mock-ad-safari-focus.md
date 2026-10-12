# Plan: 공개 가상 광고와 Safari 포커스 유예

## Goal
짧은 visible blur를 무시하되 진짜 이탈은 정지하고, 정상 기록을 유지하면서 DEXCONSULTING 가상 광고 부활을 공개 웹에 배포한다.

## Decisions
[선택과 범위](../decisions/2026-10-12-mock-ad-safari-focus.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | done | 3/3·0786111/run38210229901 공식 배포·내용 확인 | [P01](../phases/2026-10-12-mock-ad-safari-focus/P01-web-update/phase.md) |

## Result
Jest716/Chromium55pass·11skip, 새 광고와 500ms foreground를 source0786111로 게시하고 공개 번들/방침을 확인했다. 실제 iPhone Safari/새 IPA/스토어 설문은 별도 미완료다.

## Return pointer
`2026-09-29-app-store-review-prep/P01-readiness/T03-store-assets.md` pending. App Store 심사/빌드6 기록과 나라 설정은 유지한다.
