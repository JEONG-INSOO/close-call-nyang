# Task: T01 Approved Grey Tabby

## Status: done

## Goal
로컬 게임 기본rookie가 승인시안의회색태비/큰밝은눈/정장/목걸이ID001로보이며4포즈를동일그림부품으로볼수있다. 보상과물리는보존한다.

## Decision Summary
- 사용자 승인시안이 기본신입외형의새기준. 전체3종변경확인은없으므로rookie우선이라고사용자에게명시. 이전두보상외형유지.
- SVG를직접재구성하여기존걷기/실제각도/구독유지. 별도시트의물병/run/notes는엔진기능아님.

## Implementation

### I01. SVG parts and shared animation
- Related Files:
  - src/scene/GreyTabbyParts.tsx — new static head/face/suit/paws/props parts and GREY_TABBY_COLORS
  - src/scene/NyangCharacter.tsx — modify rookie's parts only, pose props, retain shared animation
  - src/scene/EmployeeCharacterSheet.tsx — new same-renderer 4-pose presentation
  - src/scene/types.ts, src/characters/catalog.ts, src/game/*, src/online/rulesVersion.ts — read-only
  - docs/art/grey-tabby-approved-v1.png — copy approved source PNG non-destructively

#### Details
- **Signatures & Types**: export type EmployeePose='game'|'walk'|'water'|'run'|'notes'; NyangCharacterProps extends SceneProps {pose?:EmployeePose}; NyangCharacter({frame,reduceMotion,characterId='rookie',pose='game'}):React.JSX.Element. Non-rookie ignoresartpose. EmployeeCharacterSheet():React.JSX.Element can use4child components with their ownuseSharedValue.
- **Data & Schema Fields**: SceneFrame unchanged {distanceM,elapsedSeconds,angleRad,angularVelocity,protectionSeconds,seed:number;hasCoffee,playing,fallen:boolean}. GameState/storage/schema/IDs unchanged. GREY_TABBY_COLORS strings outline/fur/stripe/muzzle/pink/suit/shirt/tie/lanyard/iris/pupil. Pose is display-only React prop, never stored or sent in proof.
- **Execution Flow / Logic**:
  1. Keep rigfeet0,legs±25/18,cup64,-60,200ishheight. Head silhouette roundedwide~150,earsnear-200,chin~-94. Large cream/olive openirises+darkpupils+smallwhiteglints,white triangular muzzle,openfriendlysmile,pinknose,greystripes(no sleepy eyebrows). No brightbodygloss/texture gradients.
  2. Dark slate/navy jacket/lapels,whitecollar,blue smalltie,shortsuithem abovegreybarepaws. LanyardVfromshoulders tobadgeinfrontcenter; badgeportrait + exactID:001 viaSVGText, native/browser fontfallback. KeeptestIDsface-rookie/outfit-rookie/head-contour/nyang-root/cup/leg-/paw-/tail/protection.
  3. Conditionalparts onlyforrookie. Retainexistingcream palette, faces/accessories/pathcoordinatesforotherIDs. KeepwalkPhaseAt period. Addsmallarm swing onlynewrookie, drivenbydistance. No useState/setInterval/Date/rng writes. Allnewanimatedpropsdependon[frame,pose] asappropriate; freeze naturallywhenpaused; rootalwaysactualangleand82degtumble.
  4. Game mode cupvisibilitystillhasCoffee, notdistance. Water/notes showonlyinexplicitpose, neverreplacegamecoffee. Sheetwalk/runuseexplicitfixedstride/runlift/bodyangleindependentfromgame; water/notesstationaryshortarms+props. Whenartposeisactive,hidegamecoffee regardlessincominghasCoffee; do notmutateinputframe. Nonrookiealwaysgame.
  5. Keepallhookscallsunconditional. Composepartsinsidemainrender; don'tduplicateroot engineanimation. PortraitreuseminiheadnotwholeNyangCharacter toavoidrecursion.

### I02. Tests, sheet and local build
- Related Files:
  - src/scene/__tests__/GameScene.test.tsx — modify oldaccessory-onlyassertion torewardIDsonly; retainroot/cup/pause/subscription/rigtests
  - src/scene/__tests__/GreyTabby.test.tsx — new brightface/suit/badge/poseprecedence/frameimmutable/bonusunchanged/armreplacementtests
  - e2e/fixtures/SceneFixtures.tsx — addseparatesheetsection, retain54originalposes
  - e2e/fixtures.spec.ts — add4sheetposechecks/capture, existingboundsmuststillpass
  - e2e/layout.spec.ts — assertactualrookiepreviewnewidentity+badge; rewardslocked
  - docs/learning-notes/2026-09-22-grey-tabby-rookie.md — new implementation rationale/evidence/limits
  - docs/learning-notes.md, docs/art-direction.md, docs/qa-report.md, .memory/current.md — appendpreservingprior dirtyhistory, excludeentirefilesfromsourcecommit

#### Details
- Sheet has4 labeledposes onlightbackground, sameNyangCharacter/frame API, no gamecontroller. Use 2x2wrap andSVGviewBox-120 -220 240 240orvisuallyverifiedcrop; no clipping. Testids employee-sheet, employee-pose-{walk,water,run,notes}, grey-tabby-{eyes/stripes/etc}, water-bottle,note-pad,pencil,badge-text/badge-portrait.
- Testsposegamecoffeepriority, exacttext, shortpaws/pads, actualSVGgeometry, nochangesframe; inspectactualsmallgame/previewandnew4posesPNG. Keep54poseboundsincluding±60/±82andcoffee for3IDs. Ifcropadjusted, preservegamepixelscaleandrecordwhy.
- Builddistlocal-only,fixtures,onlinefixturessequentially; preserveuser4173serveruseverifiedexistingtemporaryoutput/plush-playwright.config.ts. Fullbrowser noautopauseweaken. SaveactualimplementedsheetPNGdocs/art frombrowsercapture, notgeneratedassetmasqueradingasimplementation.
- No remote/DB/push/nicknames/storagechanges. Physicsrulesmustremainf7245064c9459310; verifyhash. Never stageoldT03/userfiles; onlynewtasksource/tests/docs/assets.

## Acceptance Criteria
- [x] Approvedidentityrecognizableinactualgame,3characterIDs and reward appearances preserved.
- [x] SameSVG4posescompletewithwater/run/notes notnewgamepowerups.
- [x] Fullunit/type/rule/build/browserchecksandPNGreviewcomplete.
- [x] Learningnotecomplete; scopedcommit and phase/current sync in completion workflow, no remotechanges.

## Validation
- npm.cmd run typecheck
- npm.cmd run test:ci
- npm.cmd run ranked:check
- node scripts/generate-ranked-replays.mjs --check
- npm.cmd run web:export
- npm.cmd run fixtures:build
- npm.cmd run online-fixtures:build
- npm.cmd run e2e -- --config output/plush-playwright.config.ts
- npm.cmd run ranking:env-check -- --allow-unconfigured
- git diff --check; compare4173HTTPdistidentity; inspectactualPNG

## Commit Message
```text
feat(art): bring approved grey tabby rookie into the game

Plan: 2026-09-22-grey-tabby-rookie
Phase: P01-art
Task: T01-grey-tabby

- Redraw the rookie with bright eyes, a suit and lanyard ID
- Share the game renderer with four employee sheet poses
- Preserve reward cats, physics and coffee progression
- Verify small-screen gameplay and document the approved design
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: ce13976

## Completion evidence
- Typecheck/Jest648(43suites,41.01sec),ranked:check/generator--check,3webbuilds,localenvscan,diffcheck passed. Fullbrowser34pass/11intentional-skips/0fail/0flaky202.046sec.
- Same rules f7245064c9459310, game/catalog/storage/servercopydiff empty. Sourceimage+actualSVGsheetPNG in docs/art; originalimageuntouched.
- Worklet forward-capture failure57/65 fixedbydependencydeclarationorder; narrowedtestMutabletrue fixedwithexplicittype; first2browsercropfailfixedsheetviewBox(-130,-220,260,250), no gamecropchange; memo poseextra handfixedaftervisualreview.
- Actualphonegame/3pickerportraits/fourposes/coffee60and82degreePNGreviewed. HTTP4173HTML/JSidenticaltonewdist. Native/Hermes/humanfeelunverified. No remote/push.
- [Learning notes](../../../../docs/learning-notes/2026-09-22-grey-tabby-rookie.md).
