# Task: T03 냥대리와 횡스크롤 벡터 장면

## Status: pending

## Goal
가로 게임판 안에 두 발로 걷는 귀여운 고양이와 커피·출근길·회사 입구·사무실을 같은 파스텔 벡터 스타일로 표현하고, 엔진 상태에 맞춰 부드럽게 움직인다.

## Decision Summary
- 코드 기반 SVG + Reanimated, 가로 횡스크롤. 균형 게이지 없음, 기울기는 몸/꼬리/표정으로만 전달.
- 15m 카페 커피, 50~51m 회사 문 통과, 51m 이후 책상/복사기/화분/서류/상사와 혼나는 동료. 모든 배경 인물은 장식.

## Implementation

### I01. 표시 전용 계약과 비주얼 시스템
- Related Files:
  - `src/theme/tokens.ts` :: palette/layout — new
  - `src/scene/types.ts` :: SceneFrame/SceneProps — new
  - `src/scene/NyangCharacter.tsx` :: NyangCharacter — new
  - `src/scene/StreetScene.tsx`, `OfficeScene.tsx`, `SceneryProps.tsx` :: SVG props — new
  - `src/scene/GameScene.tsx` :: GameScene — new
  - `src/scene/layout.ts` :: getViewport/getSceneModel — new
  - `src/game/types.ts` :: RunState/Stage (contracts below) — read-only
#### Details
- **Signatures & Types**:
  ```typescript
  export interface SceneFrame {
    distanceM: number; elapsedSeconds: number; angleRad: number;
    angularVelocity: number; hasCoffee: boolean; protectionSeconds: number;
    playing: boolean; fallen: boolean; seed: number;
  }
  export interface Viewport { width: number; height: number; scale: number; left: number; top: number }
  export interface SceneModel { cafeX: number; entranceX: number; officeBlend: number; stage: 'street' | 'office' }
  export function getViewport(width: number, height: number): Viewport;
  export function getSceneModel(distanceM: number): SceneModel;
  export interface SceneProps {
    frame: import('react-native-reanimated').SharedValue<SceneFrame>;
    reduceMotion: boolean;
  }
  export function GameScene(props: SceneProps): React.JSX.Element;
  // Character accepts the same frame shared value and does not read the controller.
  export function NyangCharacter(props: SceneProps): React.JSX.Element;
  ```
- **Data & Schema Fields**:
  - Design viewBox `0 0 960 540`, groundY425, character anchor `(270,425)`, body height about205, head about82. World scale40 design px/m. Character remains screen anchor; rotation origin at support/feet, never center of whole screen.
  - Palette engineering defaults: background `#FFF8F0`, sky `#DDEFF7`, lavender `#BEB6E8`, mint `#BFE3D1`, peach `#FFD5BD`, ink `#394352`, body cream `#F9E4C8`, darker ears/tail accents. Use dark outline2~4px; score/buttons readable dark text.
  - Character: rounded triangular ears, small muzzle/whiskers, tail, shirt/tie/jacket, two separate legs and shoes, one cup-holding arm after15. Body slightly taller than head so posture/lean clear. Use limb groups and simple paths, no downloaded art or text-to-image.
  - Frame comes from controller (T04), no UI timing/physics backchannels. Model `stage` is street for m<51; office otherwise; officeBlend=`clamp(m-50,0,1)` used only behind passing doorway for seamless visual transition. cafeX=270+(15-m)*40; entranceX=270+(50.5-m)*40. All story thresholds use meters, not scroll wrapping coordinates.
- **Execution Flow / Logic**:
  1. Validate viewport finite positive; contain16:9 game canvas with letterbox (no crop of controls later). If zero size, render safe empty layout rather than NaN. Web portrait rotation prompt belongs to T04, not this scene.
  2. Define SVG groups and transforms for far/mid/near layers. Background scroll based on distance so pause freezes naturally. Use modulo tile widths for infinite office and loop decorative objects without unbounded arrays/distance-dependent object creation.
  3. Street: pastel buildings/windows, sidewalk, trees, bus-stop-like sign, café at15. Cafe is not random nor repeated after entrance. Character gets cup from engine hasCoffee flag at15; brief pickup pose can use distance15~16, no score or pause change.
  4. Company façade/door masks transition across50~51. At floor(score)51 foreground is inside, behind doorway is office. No hard full-screen flash/fade or elevator cutaway. Street remains at0~50 as narrative boundary; slight visible interior through door before51 is decorative.
  5. Office repeat includes desk/monitor/chair, copier, plants, stacked papers, manager gesturing and sheepish employee. Gentle body language, no hitting/threats/abusive speech. At least two background arrangements avoid exact repetitive wall. Seeded props optional but stable across re-render; no random in worklet.
  6. Reanimated shared frame drives animated SVG G transforms/props and optional Animated.View camera. Body rotation is directly engine angle (radian→degrees), legs swing antiphase from elapsedSeconds and speed; use feet translation/bend to read as walking, not sliding single stick. Tail counter-swings but never counterforces physics. Pause freezes all walking. Result shows a brief visually completed tumble based on local animation, score already frozen.
  7. Reduced motion disables camera shake/flash/overshoot while body lean and legs remain informative. No numerical balance indicator or hidden gauge; no100% visual celebration here. Protect pose uses small soft outline, not flashing.
  8. Compatibility: use react-native-svg primitives supported in native/web; no DOM-only filters or foreignObject. Keep typography UI in RN Text where possible. Reanimated mocks test structural state, not actual device frame rates. Memoize static decoration and bound node counts.

### I02. Boundary and visual checks
- Related Files:
  - `src/scene/__tests__/layout.test.ts` :: geometric boundary tests — new
  - `src/scene/__tests__/GameScene.test.tsx` :: rendering contract — new
  - `docs/art-direction.md` :: reusable vector style and QA poses — new
  - `docs/learning-notes.md` :: SVG/Reanimated and rendering/physics distinction — modify
#### Details
- Tests: contain viewport calculations for960x540,844x390,1366x768; finite zero layout handling; cafe aligns at15; entrance transition50,50.5,51; long run10000m remains bounded; hasCoffee false/true at14.9/15; reduceMotion never changes inputs or thresholds.
- In docs list visual inspection poses at m0,14.9,15,50,50.5,51,100,250; angles±0.55; falling and protection. T04 will wire to actual play; do not add a production debug screen just to display fixtures. For test rendering use explicit SceneFrame fixtures only.
- At this task, module compile/tests validate props; completed visual browser QA is recorded in T06 and native device QA in P03, not claimed now.

## Acceptance Criteria
- [ ] Obvious two-legged suited cat, visible tail, recognizable cup and matching original vector assets.
- [ ] Cafe and doorway use actual score positions; office scenery remains bounded during long runs.
- [ ] Reanimated displays engine lean and walking; pause and reduced-motion respect gameplay invariants.
- [ ] No gauge,100% celebration, third-party artwork, or physics changes from rendering.

## Validation
- `npm.cmd test -- --runInBand src/scene/__tests__` — boundary/rendering contracts pass.
- `npm.cmd run typecheck` — components compile on shared platform typings.
- `npm.cmd run web:export` — SVG/Reanimated bundle succeeds.
- `git diff --check` — clean.

## Commit Message
```text
feat(scene): draw Nyang and the scrolling commute

Plan: 2026-09-21-close-call-nyang
Phase: P01-game
Task: T03-vector-scene

- Animate an original pastel cat with coffee and readable balance poses
- Add cafe-to-office transition and bounded repeating office scenery
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
