# Task: T01 Rookie Side-view Pose Sheet

## Status: done

## Goal
게임 코드를 건드리기 전에 rookie 옆모습 디자인을 한 장의 시트로 사용자 승인받는다.

## Implementation
- 순수 SVG 시안 페이지(로컬 전용, 저장소 밖 scratch 또는 `docs/art/side-view-draft.html`)에서 반복 제작한다. 기존 리그 좌표계 유지: 발밑 원점(0,0), 위쪽 음수 y, 전체 높이 약 200, +x = 진행 방향(오른쪽).
- 몸통·정장·다리·꼬리는 측면(꼬리는 왼쪽 뒤), 머리는 오른쪽을 보되 두 눈이 보이는 반측면(먼 쪽 눈은 작고 안쪽).
- 걷기 4컷: 접촉(앞발 앞) → 통과 → 접촉(반대) → 통과. 앞다리/뒷다리는 몸 앞뒤로 교대하며, 먼 쪽 다리/팔은 한 톤 어둡게 뒤에 그린다. 들린 발의 젤리는 뒤쪽으로 살짝 보일 때만.
- 표정 3종: 평소(큰 눈+미소) / 위험(동그란 눈+벌린 입+땀방울) / 넘어짐(`> <` 눈+일그러진 입).
- 커피 든 모습(앞팔로 컵), 넘어짐(앞으로 +82도 / 뒤로 -82도) 포함.
- 회색 태비 팔레트 `GREY_TABBY_COLORS`, 사원증 ID: 001, 정장/넥타이 유지.

## Acceptance Criteria
- [x] 시트 PNG를 사용자에게 보여주고 승인받음 (승인 원본은 `docs/art/grey-tabby-side-v1.png`로 저장)

## Validation
- 실제 브라우저 캡처 육안 검토; 걷기 컷에서 진행 방향이 한눈에 오른쪽으로 읽히는지.

## Commit Message
```text
docs(art): add the approved side-view rookie sheet

Plan: 2026-09-22-side-view-walk
Phase: P01-rookie-side
Task: T01-pose-sheet
```

## Progress
- [x] 시안 제작
- [x] 사용자 승인
- commit: (this commit) — 시안 v1~v5 폐기 후 생성 이미지 부품 조립본 승인
