# Task: T01 위험 효과음 제거

## Status: done

## Goal / Decision Summary
위험 소리만 없앤다. 위험 진동과 엔진 이벤트는 보존한다. 원본 wav는 삭제하지 않는다.

## Implementation
### I01. 소리와 진동 경로 분리
- `App.tsx` subscribeEffects: runId 검사 후 audio.cue에는 footstep/coffee/fall만, playHaptic에는 wobble/coffee/fall을 전달한다.
- `src/services/audioCore.ts`: `AudioCue = 'footstep' | 'fall' | 'coffee'`; AudioKey는 music 또는 AudioCue. AUDIO_KEYS 순서는 music, footstep, fall, coffee. COOLDOWN/DURATION에서 wobble만 제거한다. 플레이어 설명은 four로 변경한다.
- `src/services/audio.ts` useGameAudio: wobble useAudioPlayer와 ports/의존성 제거.
- `src/services/audio.web.ts` SOURCES: wobble require 제거.
- 기존 seek 취소·중복 pause 억제·설정·오류 처리·사용자 제스처 정책은 변경하지 않는다. 새 스키마/상태 전이 없음.
- `src/services/haptics.ts`, 엔진/Supabase 복사본은 read-only.

### I02. 회귀검증과 학습 기록
- `src/screens/__tests__/settings-and-ad.test.tsx`: 한 번의 합성 effect batch로 wobble은 진동만, 나머지 소리 유지 검증. runId를 현재 run.id로 맞춘다.
- `src/services/__tests__/feedback.test.tsx`: 네이티브와 웹 4개 플레이어, 새 fall/coffee 인덱스, 두 일반 효과음 중첩과 fall 우선순위 검증. 기존 비동기/설정/진동 검증 유지.
- `docs/learning-notes/2026-09-28-remove-danger-sound.md` 작성, `docs/learning-notes.md`에 링크 추가. 이미 더티인 인덱스와 배포 문서는 그대로 보존하고 소스 커밋에서 제외.
- 엔진 변경 없으므로 ranked:check만 수행하며 복사본/fixture 재생성 불필요. 웹 번들/클라우드 빌드는 이번 범위 밖이며 기존 배포는 갱신되지 않는다.

## Acceptance Criteria
- [x] 위험 소리 전달/플레이어 제거, 위험 진동/다른 소리 보존
- [x] 아래 검증 통과 및 학습 기록 작성

## Validation
- `npm.cmd test -- --runInBand src/services/__tests__/feedback.test.tsx src/screens/__tests__/settings-and-ad.test.tsx`
- `npm.cmd test -- --runInBand`
- `npm.cmd run typecheck`
- `npm.cmd run ranked:check`
- `npm.cmd run test:release`
- `git -c safe.directory=D:/GrillmeEDU diff --check`

## 학습 개념 / 디버깅
게임 사건과 그 사건의 표현(소리/진동)은 별개다. 볼륨 0과 플레이어 제거는 다르다. 고정 인덱스 기반 테스트는 플레이어 삭제 후 잘못된 대상을 검증할 수 있다.
학습노트 질문: 왜 엔진 wobble은 남기는가? 왜 음소거 대신 플레이어도 제거하는가? 단위 테스트가 실제 iPhone FPS 개선을 증명하는가?

## Commit Message
```text
fix(audio): remove danger sound while preserving haptics

Plan: 2026-09-28-remove-danger-sound
Phase: P01-audio
Task: T01-remove
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: targeted25, full676/45suites, typecheck, ranked8, release7, diff-check
- 회귀 테스트: 변경 전 위험 소리 호출로 1건 실패, 변경 후 통과.
- commit: this task completion commit
- 웹 재배포/새 iOS 빌드/실기기 성능 검증은 수행하지 않음.
