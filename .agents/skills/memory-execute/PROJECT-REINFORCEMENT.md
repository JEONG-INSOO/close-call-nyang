# 프로젝트 학습 목표 보강

실행 완료 조건은 구현과 테스트 통과만이 아니다. 다음을 모두 충족해야 한다.

1. 활성 Task의 청사진을 정확히 구현한다.
2. 청사진의 검증 명령을 실제로 실행하고 결과를 기록한다.
3. 기존 작업 트리 변경을 보존하며 Task 범위만 커밋한다.
4. 규칙 변경 시 Supabase 복사본, 웹 번들, replay fixture를 재생성한다.
5. docs/learning-notes.md에 변경 이유, 핵심 개념, 데이터 흐름, 테스트, 실패에서 배운 점, 다음 연습을 기록한다.
6. .memory/current.md와 Phase의 상태를 pending | in_progress | blocked | done 중 하나로 일치시킨다.

외부 환경 차단이 반복되면 성공으로 보고하지 말고 blocked와 재현 단계·필요한 사용자 조치를 남긴다. 커밋과 GitHub push는 별개이며 push는 사용자가 명시적으로 요청한 경우에만 한다.
