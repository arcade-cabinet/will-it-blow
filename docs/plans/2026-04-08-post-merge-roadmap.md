<!--
title: Post-Merge Roadmap — From Green Loop to Shippable
domain: planning
status: proposed
engine: react-three-fiber
last-verified: 2026-04-08
depends-on: AGENTS.md, docs/plans/2026-04-08-lost-requirements-restoration.md
agent-context: This is the authoritative task list for the `feat/post-merge-polish` branch. Every agent working in this branch should start here, pick the next unblocked task, and leave the list consistent with ground truth when done.
summary: Comprehensive plan covering gameplay flow polish, diegetic UI restoration, visual polish, sound design, mobile optimization, and release prep after PR #53 merged.
-->

# Post-Merge Roadmap — Will It Blow?

**Branch:** `feat/post-merge-polish`
**Baseline:** `main @ 1058e37` (PR #53 merged 2026-04-08)
**Owner:** tbd (pick up per task)

## Executive summary

PR #53 landed the full deduction substrate, all 13 game phases, the composition
pipeline across every station, the 4-tier browser validation suite (722 tests),
and the final polish pass. The gameplay loop now runs end-to-end through the
`/n`/`/p` dev-shortcut keys, and every major visual subsystem (grinder, stuffer,
stove, blowout, presentation, verdict) is wired to the compositeMix.

**What this plan is not**: a backlog of nice-to-haves. Every task below closes
a measured gap between the current build and the design pillars in `AGENTS.md`.

**What's left**, in descending priority order:

1. **Diegetic-UI pillar violations** — `TieGesture` and `RoundTransition` are
   full-screen 2D overlays that flatly contradict pillar 7 ("zero 2D overlays
   during gameplay"). They shipped as temporary bridges and never got the
   diegetic replacement.
2. **Invisible disgust meter** — the disgust threshold drives game-over but has
   no visual representation anywhere in the 3D scene. The player has no
   feedback on how close they are to dying.
3. **Dead UI code** — 10 HUD components (`BlowoutHUD`, `CookingHUD`,
   `GrindingHUD`, `StuffingHUD`, `StrikeCounter`, `ProgressGauge`,
   `ChallengeHeader`, `TastingChallenge`, `IngredientChallenge`,
   `SettingsScreen`) are unreferenced by `App.tsx` but still in the repo with
   full test coverage. They inflate LOC, slow CI, and confuse new contributors.
4. **Review-flagged drift** — perception bridge coordinates don't match
   App.tsx, `computePhaseText` diverges from `SurrealText.tsx`, CodeRabbit
   flagged doc frontmatter and stale plan path references.
5. **Visual polish gaps** — 4K CI shadows, physical materials, emissive
   tuning, and the specific micro failures the screenshot report uncovers.
6. **Sound design gaps** — the horror atmosphere is carried mostly by the
   drone; SFX for individual ingredient interactions, phase transitions, and
   Mr. Sausage reactions is still sparse.
7. **Mobile optimization** — the 4-viewport browser matrix proves the game
   lays out correctly on phone/tablet, but there's been no performance
   profiling, touch ergonomics pass, or iOS Safari quirk hunt on a real
   device.
8. **Release prep** — Capacitor iOS/Android smoke tests, app icons, splash
   screens, privacy policy, store listings.

Priorities 1-4 are blockers for calling the build "design-pillar-compliant".
Priorities 5-6 are the polish layer. Priorities 7-8 are ship prep.

---

## Phase A — Diegetic-UI restoration (priority: BLOCKER)

**Goal**: remove every 2D overlay from the gameplay path. Title and results
screens keep their DaisyUI styling; everything else moves into the 3D world.

### A.1 — Replace `TieGesture` with diegetic tie interaction

**Current state** (violation): `src/components/challenges/TieGesture.tsx` is an
HTML `<div>` overlay with yellow "TIE THE CASING" banner, two button-dots that
render as `<button>` elements, and a status row. It's full-screen, inside the
React tree but outside the Canvas, and covers the 3D view.

**Target state**: when `gamePhase === 'TIE_CASING'`, the Sausage component
highlights both ends with subtle diegetic markers (pulsing red emissive dots
on the casing ends) and the player taps them via raycasted pointer events on
real 3D meshes. No HTML. Completion advances the phase.

**Deliverables**:
- Delete `src/components/challenges/TieGesture.tsx` and its test file
- Extend `src/components/sausage/Sausage.tsx` with a `tieMode` prop driven
  from `gamePhase === 'TIE_CASING'`
- Add two `<mesh>` knot-indicator dots at the sausage head+tail, each with
  pointer handlers that set `leftTied`/`rightTied` refs
- When both tied, call `setCasingTied(true)` and advance to `BLOWOUT`
- Browser test in `tests/meso/tie-casing.browser.test.tsx` that mounts App,
  drives to TIE_CASING, clicks both dots via real `userEvent.click`, asserts
  the phase advances to BLOWOUT
- Update AGENTS.md entry point doc — no more `TieGesture` in `App.tsx`
- Update `docs/memory-bank/progress.md` entry for TieGesture

**Acceptance**: zero HTML `<div>` or `<button>` elements rendered during
`TIE_CASING` phase. The only visible UI is the sausage with pulsing dots.

### A.2 — Replace `RoundTransition` with diegetic round advance

**Current state** (violation): `src/components/ui/RoundTransition.tsx` is a
full-screen `fixed inset-0 z-[100] bg-black/95` overlay with Bangers-font
"ROUND 2 OF 3" text + a diagonal red slash + horror shake animation. It's
2 seconds long and covers the entire viewport. The `aria-label` was even
flagged by Biome.

**Target state**: between rounds, the Jigsaw Billy TV itself cuts to a
between-rounds broadcast — a close-up of the Billy puppet showing the round
number with his own servo swivel + CRT flicker. The trapdoor closes over the
kitchen while this plays. When the next round starts, the kitchen reveals
itself again (lights flicker back on, trapdoor opens, fridge door clicks).

**Deliverables**:
- Delete `src/components/ui/RoundTransition.tsx` and its test file
- Extend `src/components/stations/TV.tsx` with a `broadcastMode` prop:
  `'live' | 'between-rounds' | 'static'`
- Between-rounds mode renders a text overlay ON the CRT screen texture
  (drei `<Html>` inside the CRT frame is fine if it's positioned on a
  3D plane that occludes the kitchen behind it) showing "ROUND X OF Y"
- The TrapDoorAnimation component gains a `closed` state that it enters
  when `gamePhase === 'DONE' && currentRound < totalRounds` and re-opens
  when the next SELECT_INGREDIENTS phase begins
- Audio: switch the drone to a muffled variant during between-rounds,
  clear it when the new round begins
- App.tsx loses the `showRoundTransition` state entirely — the ECS
  `gamePhase` + `currentRound` drive the TV and trapdoor directly
- Browser test `tests/meso/round-transition.browser.test.tsx` that
  synthetically advances from round 1 DONE to round 2 SELECT_INGREDIENTS
  and asserts the TV shows "ROUND 2" during the handoff, then reverts

**Acceptance**: zero HTML overlay during round transitions. Player sees the
Billy TV broadcast the round number, trapdoor closes, kitchen rests, kitchen
re-lights, play resumes.

### A.3 — Delete dead HUD components

**Current state**: 10 UI component files exist but are not imported by
`App.tsx` or any production code path. They have full jsdom unit test
coverage that slows CI without testing anything shipped.

**Files to delete** (and their tests):
- `src/components/ui/BlowoutHUD.tsx` + `__tests__/BlowoutHUD.test.tsx`
- `src/components/ui/ChallengeHeader.tsx` + test
- `src/components/ui/CookingHUD.tsx` + test
- `src/components/ui/GrindingHUD.tsx` + test
- `src/components/ui/IngredientChallenge.tsx` + test
- `src/components/ui/ProgressGauge.tsx` + test
- `src/components/ui/SettingsScreen.tsx` + test
- `src/components/ui/StrikeCounter.tsx` + test
- `src/components/ui/StuffingHUD.tsx` + test
- `src/components/ui/TastingChallenge.tsx` + test

**Deliverables**:
- `git rm` all 20 files in a single commit
- Verify `pnpm typecheck && pnpm test && pnpm lint` still green after
- Remove any stale imports from `docs/memory-bank/progress.md`

**Acceptance**: files gone, ~3000 LOC of dead code removed, CI faster.

### A.4 — Add diegetic disgust meter

**Current state**: `hungerDisgustMeter` is tracked in ECS and drives the
game-over branch in `GameOrchestrator.tsx`, but no component reads it for
rendering. The player has zero feedback on their proximity to failure.

**Target state**: the disgust meter renders as a physical indicator inside
the scene. Proposed: a row of translucent test-tube vials on a shelf next
to the Jigsaw TV, each vial fills with thick red fluid as disgust climbs.
Alternative: a single big industrial pressure gauge mounted on the wall
above the TV, needle swings from green to red.

**Deliverables**:
- New component `src/components/environment/DisgustIndicator.tsx` that
  reads `hungerDisgustMeter` + `hungerDisgustThreshold` from the store
- GLBs sourced from the asset library (pressure gauge or test tubes)
- Micro spec `tests/micro/DisgustIndicator.browser.test.tsx`
- Mount inside `App.tsx` `<GameContent>` next to the TV
- When disgust passes 50%, the indicator starts pulsing. When it passes
  75%, a low-frequency heartbeat SFX layers into the drone. When it hits
  100%, the TV cuts to static + the game-over transition fires.

**Acceptance**: player can see their disgust at any time during gameplay,
reads it diegetically, gets escalating feedback as it climbs.

### A.5 — Wire the `currentClue` text into the back wall properly

**Current state**: clue text is enqueued via `enqueueSurrealMessage` and
picked up by `SurrealText`, which chooses the camera surface. This works for
in-flight messages but may not always land on the most visible wall from the
player's current position.

**Target state**: the active clue is ALWAYS rendered on the wall facing the
fridge, even if the player isn't looking at it. Other surreal messages
(verdicts, reactions, scoring feedback) use the transient cameraSurface
picker; the clue is pinned.

**Deliverables**:
- Extend `SurrealText.tsx` with a pinned-clue layer separate from the
  transient queue
- Read `currentClueJson` and always render its `text` on a designated
  fridge-facing wall mesh
- Browser test asserting the clue text is present on the wall during
  SELECT_INGREDIENTS regardless of camera yaw

**Acceptance**: player can always find the clue without hunting. Transient
messages still surface where the camera is looking.

---

## Phase B — Review-flagged drift (priority: HIGH)

These are all legitimate issues flagged by CodeRabbit/Copilot/Gemini on
PR #53 that are out of scope for a hotfix but need resolution.

### B.1 — Reconcile perception bridge coordinates with App.tsx

**Current state**: `src/debug/perception.ts` has a hardcoded `STATION_BOUNDS`
map with centers like `Grinder: [-2.5, 1.0, -1.0]` that the GOAP governor
uses for teleport targeting. Copilot flagged that multiple centers don't
match the actual station component placements in `App.tsx`.

**Deliverables**:
- Audit every `StationBounds.center` against the actual station component
  transform in `App.tsx` + the station `<group position={...}>` inside
  each component
- Fix every mismatch
- Add a static assertion helper that runs at import time in dev mode
  comparing the declared bounds against the scene graph once mounted
  (optional, could be a `__DEV__` console warning)
- Macro test `tests/macro/goap-teleport-accuracy.browser.test.ts` that
  asks the governor to teleport to each station and asserts the player
  ends up within the declared halfExtents

**Acceptance**: zero coordinate mismatches, macro test passes.

### B.2 — Align `computePhaseText` with `SurrealText.tsx`

**Current state**: `src/debug/phaseText.ts` implements `computePhaseText`
which is supposed to mirror the text that `SurrealText.tsx` picks for each
phase. Copilot flagged that the two diverge on intro handling and
posture-specific "wake up" messaging.

**Deliverables**:
- Diff `computePhaseText` against the actual text-picking logic in
  `SurrealText.tsx`
- Refactor so there's a single source of truth (a shared module both
  consume) — the cleanest option is to move the picker into a standalone
  module that both `SurrealText.tsx` and `phaseText.ts` wrap
- Update unit tests in `src/debug/__tests__/perception.test.ts` to cover
  the intro and posture edge cases
- Remove `phaseText.ts` entirely if the shared module subsumes it

**Acceptance**: the meso/macro tests that assert on
`getCurrentSurrealText()` see exactly what the player sees.

### B.3 — Add `hasTouch`/`isMobile` to mobile-390 Playwright context

**Current state**: `vitest.config.ts` has a `mobile-390` viewport but the
Playwright browser context doesn't set `hasTouch: true` or `isMobile: true`,
so it behaves like a narrow desktop. Copilot flagged this as a potential
miss of touch-specific regressions.

**Deliverables**:
- Update the `VIEWPORTS` array in `vitest.config.ts` to carry a `isMobile`
  flag, and the browser instance map to pass `hasTouch: true`,
  `isMobile: true` when set
- Verify that `tests/meso/touch-interactions.browser.test.tsx` (create if
  missing) passes with the new context and uses real touch gestures via
  `page.touchscreen` instead of mouse events

**Acceptance**: the mobile-390 project exercises real touch paths.

### B.4 — Add doc frontmatter to `deep-browser-validation.md`

**Current state**: CodeRabbit flagged that `docs/testing/deep-browser-validation.md`
is missing the required HTML comment frontmatter that every file under `docs/`
is supposed to have.

**Deliverables**:
- Add the frontmatter block (`title`, `domain`, `status`, `engine`,
  `last-verified`, `depends-on`, `agent-context`, `summary`)

**Acceptance**: file matches the docs convention.

### B.5 — Update AGENTS.md commands section

**Current state**: AGENTS.md "Testing" section still says Playwright handles
E2E. It should reference Vitest browser mode.

**Deliverables**:
- Update AGENTS.md lines 83-86 (Testing section) to reference the new
  browser test commands and remove the Playwright mention
- Add `pnpm test:browser:src` to the commands block

**Acceptance**: AGENTS.md reflects actual workflow.

### B.6 — Fix goal execution error handling in GoapGovernor

**Current state**: CodeRabbit flagged that `GoapGovernor.ts` at line 93 lets
`goal.run()` throw and propagate, and that `SyntheticAdvanceGoal` throws while
other goals return `false` — an inconsistency.

**Deliverables**:
- Wrap `goal.run()` in try/catch in `GoapGovernor.tick()`; on throw, log
  the error with the current phase and return a tick that advances nothing
- Standardize goal-result semantics: all goals return `{ok: boolean, reason?: string}`
  instead of bare booleans
- Update all existing goals to the new shape
- Update macro tests that asserted on the old shape

**Acceptance**: no thrown-error failures in the GOAP governor; hostile tests
get clear `{ok: false, reason}` diagnostics.

### B.7 — Implement `WIBActuator.clickPoint`

**Current state**: `tests/harness/actuation/WIBActuator.ts` has a
`clickPoint` method that throws unconditionally. The comment says it's
intentional for now, but CodeRabbit flagged that any GOAP goal calling
canvas-coordinate clicks will fail.

**Deliverables**:
- Implement `clickPoint(u: number, v: number)` that translates canvas
  UV coordinates to page pixel coordinates and dispatches a real
  Playwright pointer click via `page.mouse.click`
- Add a harness self-test that verifies clickPoint lands on the right
  mesh for each viewport size

**Acceptance**: GOAP goals can drive real canvas-coordinate clicks.

### B.8 — Gate `StateProbe` behind an option

**Current state**: Copilot flagged that `StateProbe` is mounted unconditionally
in `renderR3F` and increments `renders` on every render, adding noise to
render-count-based assertions across the whole browser suite.

**Deliverables**:
- Add a `probeRenderCount?: boolean` option to `RenderR3FOptions`; default
  off
- When off, don't mount the increment logic (still mount the state-capture
  probe)
- Tests that depend on render counts opt in explicitly

**Acceptance**: no cross-test contamination of render counts.

### B.9 — Update stale `e2e/` path references in plan docs

**Current state**: `.claude/plans/deep-hierarchical-e2e-yuka-goap.prq.md` and
related planning docs reference `e2e/harness/` paths that don't exist
anymore (they're `tests/harness/`).

**Deliverables**:
- Option A: archive the plan docs (move to `docs/plans/archive/`) and mark
  as historical
- Option B: update the references in place
- Pick A — the plans are done, they don't need updating

**Acceptance**: no plan doc references a non-existent path.

---

## Phase C — Gameplay flow polish (priority: HIGH)

Fill in the small gaps where the loop runs but the experience is rough.

### C.1 — Lead the player into the first clue

**Current state**: after the intro, the player is standing in the kitchen
looking at nothing in particular. The clue appears on SOME wall via the
cameraSurface picker, but a first-time player doesn't know where to look.

**Deliverables**:
- On first SELECT_INGREDIENTS entry after intro, smoothly rotate the
  camera over ~1.5s to face the wall with the clue (gated on a flag so it
  only happens once per run)
- Play a "here" SFX — a sharp metallic ping on the first clue
- Mr. Sausage's TV turns to face the same wall

**Acceptance**: new player knows where to look within 2 seconds of waking up.

### C.2 — Fridge door open/close polish

**Current state**: the `PhysicsFreezerChest` has a draggable door but the
player can open/close it freely even outside SELECT_INGREDIENTS. The door
tap-confirm for shock-me clues isn't visually distinct from normal taps.

**Deliverables**:
- Door is locked closed outside SELECT_INGREDIENTS (physics-joint-locked,
  not just ignored)
- During SELECT_INGREDIENTS, the door glows faintly on its edges to
  indicate "interactable"
- Door-tap confirm for shock-me clues shows a subtle colour flash on the
  door itself (red to green)
- Audio: creak-open on open, metallic clunk on close, different ping
  for shock-me confirm

**Acceptance**: fridge door behaviour matches player expectations,
confirms are unambiguous.

### C.3 — Chopping block target clarity

**Current state**: the ChoppingBlock lets the player chop ingredients, but
the target (which ingredient from the selection is being chopped) isn't
visually clear.

**Deliverables**:
- Highlight the "currently chopping" ingredient with a subtle red-lit
  pulse while it sits on the block
- SFX for each chop varies by ingredient composition (wet → splat, hard → thunk)
- After the last chop, a brief pause + the next ingredient hops into place
  automatically (or disappears if chopping is complete)

**Acceptance**: player always knows what they're chopping and when they're done.

### C.4 — Stove hand-off clarity

**Current state**: the Stove has the sizzle/grease pool driven by compositeMix
but the "move sausage to pan, move pan to stove" subsequence is fiddly and
doesn't feel like a natural progression.

**Deliverables**:
- Outline the pan in a faint red glow when it's the next thing to grab
- Outline the stove in a faint red glow when the pan is in hand
- Audio: sizzle ramp-up when the pan contacts the stove
- Brief cutaway to Mr. Sausage's TV showing a nod of approval when the
  cooking begins

**Acceptance**: the two move-phases feel like a flow, not a puzzle.

### C.5 — Empty-fridge win sequence

**Current state**: when the fridge empties, `GameOrchestrator` enqueues
"The fridge is empty. You are free." and transitions to results after 3s.
No visual change to the environment, no trapdoor, no walking out.

**Deliverables**:
- The ceiling trapdoor opens and a ladder descends
- A warmer light pours down through the opening
- The surreal text on the wall reads "YOU ARE FREE" in 3D blood text
- The drone audio cuts to silence with a soft wind track
- After 5 seconds (or player clicks the ladder), the game transitions
  to a win state in the GameOverScreen with a unique "escaped" rank

**Acceptance**: winning feels different from losing, and the environment
itself signals victory.

### C.6 — Lose sequence beats

**Current state**: when disgust maxes out, the orchestrator enqueues "You
have failed me for the last time." and transitions to results after 3s.

**Deliverables**:
- The TV cuts to static + horror whine
- All lights flicker out except a single red overhead
- Camera forced into a slow downward pan (player watching themselves
  get dragged into the grinder off-screen)
- After the beat, transition to results with "F — you are tomorrow's
  sausage"
- Audio cue: grinder motor ramps up, then a wet crunch, then cuts

**Acceptance**: losing has dramatic weight; not just an instant fade.

---

## Phase D — Visual polish (priority: MEDIUM)

Post-merge, review the screenshot regression report and close the gap
between what the art direction targets and what ships.

### D.1 — Screenshot audit review + fix pass

**Deliverables**:
- Run `pnpm test:browser && pnpm report:browser`
- Open `test-results/browser/report.html`
- For each micro/meso screenshot that looks wrong (misalignment,
  bad lighting, missing mesh, wrong color), file a sub-task
- Fix sub-tasks in a single commit per component

**Acceptance**: every screenshot in the report looks intentional.

### D.2 — BlowoutStation 4K performance

**Current state**: the CI fix for BlowoutStation uhd-3840 bumps the
timeout to 90s, which is a smell. The real problem is the
shadow pre-pass over 1000 instanced particles on Mesa ANGLE.

**Deliverables**:
- Drop `castShadow` on the BlowoutStation spotLight (or the particle
  InstancedMesh — whichever has more visual impact)
- Replace the 1000-particle InstancedMesh with a GPU particle system
  (drei `<Particles>` or a custom shader) that doesn't fake shadows
  per instance
- Verify on 4K CI that the test completes in <30s

**Acceptance**: BlowoutStation uhd-3840 test completes in normal time.

### D.3 — Sausage bone-chain visuals

**Current state**: the sausage uses a bone chain for physical links but
the visual thickness/color/fat variations added in the polish pass
haven't been screenshot-verified in the browser suite.

**Deliverables**:
- Browser test `tests/micro/Sausage-compositeMix.browser.test.tsx`
  that mounts sausages with 3 distinct compositeMix presets
  (raw-meat, mostly-fat, mostly-plant) and screenshots each
- Visual review of the screenshots; fix any that look wrong

**Acceptance**: composition is visually distinguishable in sausage form.

### D.4 — SurrealText tuning across wall surfaces

**Current state**: the SurrealText blood-red text renders on multiple
wall surfaces via the cameraSurface picker. Some surfaces (concrete,
tile, metal) read the text clearly; others (wood, fabric) don't.

**Deliverables**:
- Audit every wall surface material in BasementRoom + kitchen set pieces
- For each, test SurrealText at 3 common phrases (short, medium, long)
- Adjust emissive intensity, stroke width, or the surface material to
  make text legible on every one

**Acceptance**: player can always read surreal text regardless of which
wall it lands on.

### D.5 — Horror lighting pass refinement

**Current state**: FlickeringFluorescent tubes provide the primary
horror lighting. The SAW hospital aesthetic is mostly there but the
flicker timings and colours aren't tuned per scene mood.

**Deliverables**:
- Per-phase lighting mood: SELECT_INGREDIENTS is slightly warmer,
  COOKING has more amber, DONE has a cold blue tint
- BlowoutStation explosion triggers a brief white-flash from the
  ceiling lights
- Game-over triggers all fluorescents to cut except one red overhead

**Acceptance**: lighting modulates with gameplay beats, not just
constant-flicker ambient.

---

## Phase E — Sound design (priority: MEDIUM)

### E.1 — Per-ingredient SFX library

**Current state**: chopping/grinding/stuffing all use a small library
of generic sounds. The design bar is "every ingredient sounds different
because every ingredient IS different".

**Deliverables**:
- Catalog the 20 ingredients by composition archetype (meat, plant,
  plastic, metal, liquid, other)
- Source or synthesize 5-6 SFX per archetype (chop, grind, pour, hit,
  sizzle, stuff)
- Route the compositeMix into a per-ingredient SFX picker in
  `AudioEngine.ts`
- Browser smoke test that chopping different ingredients fires
  different sound paths

**Acceptance**: player can close their eyes and hear what they're
working with.

### E.2 — Mr. Sausage reaction SFX + voice

**Current state**: Mr. Sausage reacts visually but there's no voice
line + no breath/laugh/growl audio.

**Deliverables**:
- Source or synthesize 4 reaction tracks (excitement, nod, disgust,
  laugh) that layer over the drone
- Route `mrSausageReaction` changes through AudioEngine
- Per-reaction TV audio cue (static burst + reaction)
- Optional: one-off text-to-speech voice lines for the verdict
  (procedurally generated so we don't ship voiceover files)

**Acceptance**: Mr. Sausage feels alive on the TV, not just a
still image.

### E.3 — Phase transition stingers

**Current state**: transitions between phases are silent except for
whatever ambient drone is playing.

**Deliverables**:
- 13 one-shot stingers, one per phase entry
- Design the stingers to fit the horror aesthetic (no happy jingles)
- Route phase changes through AudioEngine.playPhaseStinger(phase)

**Acceptance**: phase transitions are audibly punctuated.

---

## Phase F — Mobile optimization (priority: MEDIUM)

### F.1 — iOS Capacitor smoke test

**Deliverables**:
- `pnpm cap:ios` → open in Xcode → run on a real device
- Fix any loading/rendering issues
- Verify touch controls work (SwipeFPSControls dual-zone)
- Verify audio initialization works on iOS (requires user interaction)
- Document any iOS-specific quirks in AGENTS.md

**Acceptance**: game runs end-to-end on iOS device.

### F.2 — Android Capacitor smoke test

Same as F.1 but for Android.

### F.3 — Touch ergonomics pass

**Current state**: touch controls exist but haven't been tuned for
actual finger sizes and reachability on common phone sizes.

**Deliverables**:
- Test on iPhone 13 mini (smallest current), iPhone 16 Pro Max
  (largest), iPad mini, iPad Pro
- Adjust dual-zone breakpoints, button hit areas, and camera look
  sensitivity per device class
- Add a sensitivity slider to the pre-game settings (deferred from
  earlier)

**Acceptance**: game is playable on every device size without
frustration.

### F.4 — Performance profiling on mid-tier mobile

**Deliverables**:
- Profile on an older Android device (Pixel 6 or similar) via
  Chrome DevTools remote debugging
- Identify frame-time hot spots
- Adjust fidelity config for mobile (particle counts, shadow
  resolution, FBO sizes)
- Keep desktop fidelity at POC target

**Acceptance**: hits 30 fps on mid-tier mobile without visual
regression on desktop.

---

## Phase G — Release prep (priority: LOW)

### G.1 — App icons + splash screens

**Deliverables**:
- Source a custom icon (Jigsaw Billy bust, probably)
- Generate all required sizes for iOS + Android via Capacitor
  asset pipeline
- Splash screens for each platform

### G.2 — Store listing copy + screenshots

**Deliverables**:
- 50-word pitch
- 1000-word description
- 10 screenshots showing the horror kitchen, the TV, the blowout
  climax, the verdict
- Feature video (30 seconds)

### G.3 — Privacy policy + terms

**Deliverables**:
- Standard privacy policy (no data collection, no accounts)
- Hosted as a static page

### G.4 — TestFlight beta + Google Play internal testing

**Deliverables**:
- Upload first build to TestFlight
- Recruit 5-10 testers
- Collect feedback + crash reports
- Iterate for ~2 weeks before public launch

### G.5 — Launch

**Deliverables**:
- Ship to App Store + Google Play
- Social media + itch.io + YouTube devlog writeup

---

## Task dependencies

```
A.1 TieGesture diegetic       ← blocks nothing
A.2 RoundTransition diegetic  ← blocks nothing
A.3 Delete dead UI            ← blocks nothing
A.4 Disgust meter             ← blocks nothing
A.5 Pinned clue               ← blocks nothing

B.1 Perception coords         ← blocks macro-layer test reliability
B.2 phaseText alignment       ← blocks meso-layer assertions
B.3 mobile-390 touch          ← blocks touch regression coverage
B.4 Frontmatter               ← isolated
B.5 AGENTS.md Testing         ← isolated
B.6 GoapGovernor errors       ← blocks macro error diagnostics
B.7 clickPoint                ← blocks canvas-coordinate GOAP goals
B.8 StateProbe gating         ← blocks render-count tests
B.9 Plan docs                 ← isolated

C.1 Lead to clue              ← depends on A.5 (pinned clue)
C.2 Fridge polish             ← isolated
C.3 Chopping clarity          ← isolated
C.4 Stove handoff             ← isolated
C.5 Win sequence              ← depends on A.3 (dead UI gone)
C.6 Lose sequence             ← depends on A.4 (disgust meter)

D.1 Screenshot audit          ← depends on A+B+C done
D.2 BlowoutStation 4K         ← isolated
D.3 Sausage composition       ← isolated
D.4 SurrealText tuning        ← isolated
D.5 Horror lighting           ← isolated

E.1 Ingredient SFX            ← isolated
E.2 Mr Sausage audio          ← isolated
E.3 Phase stingers            ← isolated

F.1 iOS smoke                 ← depends on A+C (shippable loop)
F.2 Android smoke             ← depends on A+C
F.3 Touch ergonomics          ← depends on F.1/F.2
F.4 Mobile perf               ← depends on F.1/F.2

G.1 Icons                     ← blocks launch
G.2 Store copy                ← blocks launch
G.3 Privacy                   ← blocks launch
G.4 Beta                      ← depends on F + G.1-3
G.5 Launch                    ← depends on G.4
```

## Suggested execution order

1. **Sprint 1 (diegetic)**: A.1 → A.2 → A.3 → A.4 → A.5. One PR per
   item, squash merge.
2. **Sprint 2 (review drift)**: B.1 → B.2 → B.6 → B.7 → B.8 in parallel
   with Sprint 1 where possible. B.3 + B.4 + B.5 + B.9 batched as a single
   housekeeping PR.
3. **Sprint 3 (flow polish)**: C.1 → C.2 → C.3 → C.4 → C.5 → C.6. One
   commit per item; PR every 2-3 commits.
4. **Sprint 4 (visual polish)**: D.1 first, then D.2/D.3/D.4/D.5 based on
   what D.1 surfaces.
5. **Sprint 5 (audio)**: E.1 → E.2 → E.3.
6. **Sprint 6 (mobile)**: F.1 → F.2 → F.3 → F.4.
7. **Sprint 7 (release)**: G.1 + G.2 + G.3 → G.4 → G.5.

## Non-goals for this plan

- New features (ingredients, phases, stations) — the existing design is
  complete; this plan is about finishing it.
- Multiplayer / online leaderboards — out of scope.
- Additional platforms (web standalone, Steam, Switch) — ship mobile
  first, then revisit.
- Engine rewrites — Koota ECS + R3F + Rapier stays.

## Quality gates

Every PR against `feat/post-merge-polish` must:
- Pass `pnpm typecheck`
- Pass `pnpm test` (jsdom unit)
- Pass `pnpm test:browser` (all 4 viewports × all layers)
- Pass `pnpm lint`
- Include a browser test for any new gameplay behavior
- Include a screenshot of the change (paste into PR description)
- Include a line in `docs/memory-bank/progress.md` when the last task
  in a phase is done

## Open questions

- **Q**: Should the disgust meter be a single gauge or multiple vials?
  **A**: Picking vials because they fit the horror aesthetic; one gauge
  is too clean.
- **Q**: Should we ship with voice-over for Mr. Sausage?
  **A**: Procedurally generated text-to-speech only — no recorded
  audio, so localization is free.
- **Q**: Is there a reason `TieGesture` was a 2D overlay in the first
  place?
  **A**: It was a React Native bridge from before the Capacitor pivot.
  Never got the diegetic replacement.
- **Q**: Do we want a tutorial?
  **A**: No. The clue system IS the tutorial — the first clue is
  always a literal `(ingredient X)` instead of a trait query, so the
  player can grok the loop from the first round.
