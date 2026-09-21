# Task: T03 냥대리와 횡스크롤 벡터 장면

## Status: done

## Goal
가로 게임판 안에 두 발로 걷는 오리지널 고양이 3종과 커피·출근길·회사 입구·사무실을 같은 파스텔 벡터 스타일로 표현하고, 엔진 상태에 맞춰 부드럽게 움직인다.

## Decision Summary
- 코드 기반 SVG + Reanimated, 가로 횡스크롤. 균형 게이지 없음, 기울기는 몸/꼬리/표정으로만 전달.
- 15m 카페 커피, 50~51m 회사 문 통과, 51m 이후 책상/복사기/화분/서류/상사와 혼나는 동료. 모든 배경 인물은 장식.
- 3종 모두 제작: 기본 `rookie`(허둥대는 신입), 서로 다른 플레이에서 100%를 1회 달성하면 `diligent`(성실하지만 조금 지친 직장인), 10회 달성하면 `veteran`(능청스러운 베테랑). 외형만 다르며 물리·난이도·판정은 동일하다. 해금 집계·저장·선택 UI는 T04/T05, 이 작업은 카탈로그와 렌더링을 담당한다.
- 제공 이미지는 큰 머리·작은 몸·짧은 팔다리라는 일반 비율 참고로만 사용한다. 윤곽·눈/입·무늬·복장·포즈를 새로 설계하며 원본 에셋, 특징적인 표정/액세서리 조합이나 로고를 복제하지 않는다.

## Implementation

### I01. 표시 전용 계약과 비주얼 시스템
- Related Files:
  - `src/theme/tokens.ts` :: palette/layout — new
  - `src/characters/catalog.ts` :: CharacterId/CharacterDefinition/CHARACTERS/DEFAULT_CHARACTER_ID/getUnlockedCharacterIds — new
  - `src/i18n/ko.ts` :: characterRookie/characterDiligent/characterVeteran — modify
  - `src/scene/types.ts` :: SceneFrame/SceneProps — new
  - `src/scene/NyangCharacter.tsx` :: NyangCharacter — new
  - `src/scene/StreetScene.tsx`, `OfficeScene.tsx`, `SceneryProps.tsx` :: SVG props — new
  - `src/scene/GameScene.tsx` :: GameScene — new
  - `src/scene/layout.ts` :: getViewport/getSceneModel — new
  - `src/scene/svgMotion.ts` :: svgTransform/svgTransformAdapter — new (native matrix/web transform boundary)
  - `src/game/types.ts` :: RunState/Stage (contracts below) — read-only
#### Details
- **Signatures & Types**:
  ```typescript
  export type CharacterId = 'rookie' | 'diligent' | 'veteran';
  export interface CharacterDefinition {
    id: CharacterId;
    nameKey: 'characterRookie' | 'characterDiligent' | 'characterVeteran';
    requiredCompletions: 0 | 1 | 10;
  }
  export const CHARACTERS: readonly CharacterDefinition[];
  export const DEFAULT_CHARACTER_ID: CharacterId = 'rookie';
  export function getUnlockedCharacterIds(completedRuns: number): readonly CharacterId[];
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
    characterId?: CharacterId; // omitted => DEFAULT_CHARACTER_ID
  }
  export function GameScene(props: SceneProps): React.JSX.Element;
  // Character accepts the same frame shared value and does not read the controller.
  export function NyangCharacter(props: SceneProps): React.JSX.Element;
  ```
- **Data & Schema Fields**:
  - Design viewBox `0 0 960 540`, groundY425, character anchor `(270,425)`, total character height205: head including ears118, torso51, legs/shoes36 (about1.74 head-heights). World scale40 design px/m. Every variant shares the same bounding size, support/feet pivot, limb anchors, cup grip and tail attachment; rotation origin is never the center of the whole screen. No appearance may change a physics hitbox, fall threshold or input response.
  - Palette engineering defaults: background `#FFF8F0`, sky `#DDEFF7`, lavender `#BEB6E8`, mint `#BFE3D1`, peach `#FFD5BD`, ink `#394352`, body cream `#F9E4C8`, darker ears/tail accents. Use dark outline2~4px; score/buttons readable dark text.
  - Character: newly drawn rounded triangular ears, small muzzle/whiskers, visible tail, navy jacket/white shirt/mint tie and small employee badge, two separate short legs and shoes, one cup-holding arm after15. The head is intentionally larger than the torso. Use side-facing/three-quarter construction that keeps both stepping feet, the tail, cup silhouette and lean readable rather than overlapping under the head. Use limb groups and simple paths, no downloaded art or text-to-image.
  - `CHARACTERS` order and entries are exactly `{id:'rookie',nameKey:'characterRookie',requiredCompletions:0}`, `{id:'diligent',nameKey:'characterDiligent',requiredCompletions:1}`, `{id:'veteran',nameKey:'characterVeteran',requiredCompletions:10}`. Korean values are `허둥대는 냥대리`, `성실한 냥대리`, `베테랑 냥대리`. Pure `getUnlockedCharacterIds` normalizes finite input to `max(0,floor(completedRuns))`; non-finite values become0, then returns eligible IDs in catalog order. This function neither increments progress nor persists anything.
  - Shared cream/navy/mint base, with distinct original face/clothing details: `rookie` has round alert eyes, raised brows, small uncertain mouth and slightly crooked tie; `diligent` has kind eyes, gently lowered brows, small tired mouth and loosened neat tie; `veteran` has relaxed eyes, one subtly raised brow, small asymmetric smile and tidy tie with rolled cuffs. All three retain the same geometry/rig and ordinary workplace outfit; do not reproduce the reference's stripe design, sailor outfit, top hat, props or facial shapes. Expression changes with lean retain each personality without becoming a balance meter.
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
  9. `GameScene` forwards `characterId` to `NyangCharacter`; both use rookie when omitted. Use the shared catalog type, not a second scene-local union. Variant selection only changes SVG face/clothing groups; it cannot read/write completion totals, dispatch game actions, fetch the leaderboard or choose physics parameters. T04 supplies the selected character for a run. Unlock feedback is outside active gameplay; the existing 100% score-color change remains the only in-game milestone cue.

### I02. Boundary and visual checks
- Related Files:
  - `src/scene/__tests__/layout.test.ts` :: geometric boundary tests — new
  - `src/scene/__tests__/GameScene.test.tsx` :: rendering contract — new
  - `src/scene/__tests__/svgMotion.test.ts` :: native/web adapter contract — new
  - `src/characters/__tests__/catalog.test.ts` :: default/order/unlock threshold contracts — new
  - `docs/art-direction.md` :: reusable vector style and QA poses — new
  - `docs/learning-notes.md` :: SVG/Reanimated and rendering/physics distinction — modify
#### Details
- Tests: contain viewport calculations for960x540,844x390,1366x768; finite zero layout handling; cafe aligns at15; entrance transition50,50.5,51; long run10000m remains bounded; hasCoffee false/true at14.9/15; reduceMotion never changes inputs or thresholds.
- Catalog tests: default rookie; completedRuns0/1/9/10 returns `[rookie]`, `[rookie,diligent]`, `[rookie,diligent]`, `[rookie,diligent,veteran]`; negative/NaN/Infinity normalize to0, 1.9 normalizes to1. Catalog thresholds/order/name keys are exact and returned arrays do not mutate catalog entries. Render each of the three explicit IDs and the omitted default with coffee off/on; assert identical root pivot, bounding dimensions and limb/cup anchors with distinct face/clothing groups. At ±0.55 lean verify transform contracts without treating Jest snapshots as proof of visual quality.
- In docs list visual inspection poses at m0,14.9,15,50,50.5,51,100,250; angles±0.55; falling and protection. T04 will wire to actual play; do not add a production debug screen just to display fixtures. For test rendering use explicit SceneFrame fixtures only.
- At this task, module compile/tests validate props; completed visual browser QA is recorded in T06 and native device QA in P03, not claimed now.
- In `docs/art-direction.md` record the 205/118/51/36 proportion, original silhouette/face choices, each personality and all three coffee/lean poses. In `docs/learning-notes.md` record why broad proportion reference is separated from original visual construction, and why a cosmetic catalog does not modify the game engine. Do not claim a proportion change guarantees legal clearance. Record only actual implementation/inspection results when this task executes.

## Acceptance Criteria
- [x] Three original approximately1.74-head-height cats implement separate legs, tail and cup; rookie is default. Rig/props contracts pass; visual readability remains the specified T06/P03 inspection.
- [x] Shared catalog exposes exact0/1/10 thresholds and Korean labels; variant changes preserve the same pivot, dimensions and physics behavior.
- [x] Cafe and doorway use actual score positions; office scenery remains bounded during long runs.
- [x] Reanimated displays engine lean and walking; pause and reduced-motion respect gameplay invariants in structural tests.
- [x] No gauge,100% celebration, third-party artwork, or physics changes from rendering.

## Validation
- `npm.cmd test -- --runInBand src/scene/__tests__` — boundary/rendering contracts pass.
- `npm.cmd test -- --runInBand src/characters/__tests__/catalog.test.ts` — default/threshold/invalid-input contracts pass.
- `npm.cmd run typecheck` — components compile on shared platform typings.
- `npm.cmd run web:export` — SVG/Reanimated bundle succeeds.
- `git diff --check` — clean.

## Commit Message
```text
feat(scene): draw Nyang and the scrolling commute

Plan: 2026-09-21-close-call-nyang
Phase: P01-game
Task: T03-vector-scene

- Animate three original pastel cat personalities with coffee and readable balance poses
- Add a cosmetic character catalog with rookie default and 1/10 completion thresholds
- Add cafe-to-office transition and bounded repeating office scenery
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- validation: scene76 + catalog16 =92 new tests; full Jest177/177 across9suites; typecheck0errors; app web export and separate GameScene web bundle passed; git diff --check passed.
- regression: replacement SharedValue retained stale scenery subscriptions; explicit [frame] dependencies and replacement-frame test fix this without changing physics.
- visual QA: not completed. Preview bundled but browser tool failed twice with trusted Node process exited unexpectedly. T06 browser/P03 native QA remain; App.tsx still foundation screen pendingT04.
- commit: ce14e74
