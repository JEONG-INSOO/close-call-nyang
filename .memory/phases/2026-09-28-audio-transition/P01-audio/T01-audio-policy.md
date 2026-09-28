# Task: T01 오디오 중복 정지 제거
## Status: done
## Goal
동일 비재생 알림30회에 native pause0회; 종료 전환은 실제 재생 중인 플레이어만 정지. 무음/중단/웹 priming 안전 유지.
## Decision Summary
사용자가 시작/위험/종료 끊김을 보고했고 모든 피드백off시 개선됐다고 확인. nativeFPS 확정 아님. 게임물리/햅틱/그림/광고 불변.
## Implementation
### I01. 중복 side effect 제거
- Related Files: `src/services/audioCore.ts` :: useAudioCoordinator — modify; `src/services/audio.ts`, `audio.web.ts` — read-only.
- Signature: 기존 AudioPort 및 반환 {unlock():void,setPlaying(value:boolean):void,cue(cue:AudioCue):void} 유지.
- Data: useMemo closure내 `needsPause = new Set<AudioKey>()` 기본빈집합. 실제play 호출 직전에 추가(웹 priming 포함), 성공pause 또는 정상 ended에서삭제. 영속스키마없음.
- Flow: safePause는 기존 playTickets무효화/expected와wasPlaying삭제를 반드시 먼저하고, livepriming이면기존처럼return. needsPause없는경우네이티브pause생략. pause성공시delete,예외시재시도가능하게보존. play/priming 전에추가;예상밖playing상태수신시추가하여강제정지보장. ended에서삭제. stopEffects generation취소/active초기화는유지.
- setPlaying은동일boolean이면return; 변경일때만기존처리. result fall 이후반복false가fall을잘라서는안됨. unlock은!playing일때stopEffects해서새시작/재시도전이전fall/seek를취소; priming세대보호유지.
- Error: 예외흡수/lateplayrejection tickets/lifetime/seekgeneration/중단시다시gesture필요 조건은보존. keepAudioSessionActive false 유지; session활성재설계안함.
### I02. 회귀 테스트와 노트
- Related Files: `src/services/__tests__/feedback.test.tsx` — modify; `docs/learning-notes/2026-09-28-audio-transition.md` — new; `docs/learning-notes.md` — 링크추가(기존dirty보존); `docs/qa-report.md` — 검사기록추가(기존dirty보존).
- 먼저추가검사만기존코드에실행하여실패확인: idlefalse30회pause0; playingtrue반복중음악1play; music+step에서결과전환과fall시pause2회/idleplayer0; 반복false가fallseek취소안함; 명시적retryunlock이이전fall정지; 중단후lateplaying은반드시pause. 기존웹priming/지연promise/오류/설정off/cleanup검사전체보존.
- 안정적인테스트만으로FPS개선확정금지. readonly구조재현(기존150→0pause,10→실제재생2pause)과실기기후속구분.
## Acceptance Criteria
- [x] Red/green 및 전체Jest/types/ranked/release 검증통과.
- [x] 같은플레이어중복pause없음, latepromise/웹priming/정지후fall재생/재시도취소유지.
- [x] 학습노트와한계기록; 기존dirty배포기록보존.
## Validation
- `npm.cmd test -- --runInBand src/services/__tests__/feedback.test.tsx`
- `npm.cmd run test:ci`; `npm.cmd run typecheck`; `npm.cmd run ranked:check`; `npm.cmd run test:release`; `git -c safe.directory=D:/GrillmeEDU diff --check`
- 렌더/엔진변경없음. 웹어댑터mock5회귀포함; 실iOS성능/사파리오디오별도not_run.
## Learning
개념: 멱등상태전이, 명령전송과상태알림구분, 비동기취소세대. 질문: 같은행동을반복해도안전하려면? pause생략시왜promise취소는유지해야하나? 자동검사와체감FPS는왜다른가?
## Commit Message
```text
perf(audio): avoid redundant pause calls across game transitions

Plan: 2026-09-28-audio-transition
Phase: P01-audio
Task: T01-audio-policy
```
## Progress
- [x] 구현 완료
- [x] 검증 통과
- Evidence: old3failed/12passed → target15passed; full675/45suites; typecheck/ranked8/release7/diff passed. No native FPS claim.
- commit: this completion commit, hash recorded in phase afterward.
