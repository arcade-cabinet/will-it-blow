# Batch: deep-hierarchical-e2e-yuka-goap

**Created**: 2026-04-08
**Config**: stop_on_failure=false, auto_commit=true
**Teammates**: scene-architect, challenge-dev, store-warden, asset-pipeline, doc-keeper

## Tasks

1. [P1] Add Yuka dependency and set up GOAP types
   - Files: `package.json`, `pnpm-lock.yaml`, `tsconfig.json` (paths if needed)
   - Criteria:
     - `pnpm add yuka` succeeds
     - `import { GoapPlanner } from 'yuka'` typechecks
     - `pnpm typecheck` passes

2. [P1] Create `e2e/harness/` isolation harness directory
   - Files: `e2e/harness/README.md`, `e2e/harness/perception/`, `e2e/harness/actuation/`, `e2e/harness/goap/`, `e2e/harness/viewports/`
   - Criteria:
     - All 4 subdirs exist
     - README documents layer split

3. [P1] Extend `window.__WIB_DEBUG__` with read-only perception API
   - Files: `src/debug/wibDebug.ts`, `src/debug/__tests__/wibDebug.test.ts`, `src/main.tsx` (install call)
   - Criteria:
     - Exports `installWibDebug()` + `PerceptionSnapshot` type
     - Only installs in DEV or `?e2e=1`
     - All returned objects frozen
     - Unit test passes

4. [P1] Configure Playwright viewport matrix (desktop, mobile, tablet, 4K)
   - Files: `playwright.config.ts`
   - Criteria:
     - 4 projects declared: `desktop-1280`, `mobile-390`, `tablet-768`, `uhd-3840`
     - `pnpm test:e2e --list` shows 4x test count

5. [P1] Create screenshot capture helper with deterministic naming
   - Files: `e2e/utils/snapshot.ts`, `e2e/utils/__tests__/snapshot.test.ts`
   - Criteria:
     - `captureSnapshot(page, { level, feature, viewport })` exported
     - Waits 2 RAF before capture
     - Writes under `e2e-screenshots/{level}/{feature}/{viewport}.png`

6. [P2] Micro test harness page
   - Files: `playwright/micro.html`, `playwright/micro.tsx`, `vite.config.ts` (input entry)
   - Criteria:
     - Served at `/micro.html?component=Grinder`
     - Mounts single component in isolation
     - Supports all 13 component names

7. [P2] Micro E2E — BasementRoom
   - Files: `e2e/micro/BasementRoom.spec.ts`
   - Criteria:
     - Test passes across all 4 viewports
     - Screenshot saved to `e2e-screenshots/micro/BasementRoom/{viewport}.png`
     - Canvas not blank (pixel count > 1000)

8. [P2] Micro E2E — Kitchen
   - Files: `e2e/micro/Kitchen.spec.ts`
   - Criteria: same as task 7 for Kitchen

9. [P2] Micro E2E — all 8 stations
   - Files: `e2e/micro/stations/Grinder.spec.ts`, `Stuffer.spec.ts`, `Stove.spec.ts`, `Sink.spec.ts`, `ChoppingBlock.spec.ts`, `ChestFreezer.spec.ts`, `BlowoutStation.spec.ts`, `TV.spec.ts`
   - Criteria:
     - 8 specs × 4 viewports = 32 screenshots
     - Each asserts canvas visible + no console errors

10. [P2] Micro E2E — Sausage physics
    - Files: `e2e/micro/Sausage.spec.ts`
    - Criteria:
      - Sausage settles (bone chain stable)
      - Screenshot captured post-settle
      - 4 viewports pass

11. [P2] Micro E2E — SurrealText
    - Files: `e2e/micro/SurrealText.spec.ts`
    - Criteria:
      - Text visible on wall
      - Drip animation present
      - 4 viewports pass

12. [P2] Micro E2E — FPSCamera + PlayerCapsule
    - Files: `e2e/micro/FPSCamera.spec.ts`
    - Criteria:
      - Camera mounts at eye height
      - Mouse move updates yaw/pitch
      - 4 viewports pass

13. [P2] Micro E2E — Koota ECS init
    - Files: `e2e/micro/KootaWorld.spec.ts`
    - Criteria:
      - `window.__WIB_DEBUG__.getKootaSnapshot()` returns 16 traits
      - All traits match expected schema
      - 4 viewports pass (same snapshot across viewports)

14. [P3] Meso E2E — TitleScreen → DifficultySelector
    - Files: `e2e/meso/title-flow.spec.ts`
    - Criteria:
      - Title renders, START COOKING clickable, all 3 difficulties selectable
      - Screenshots at each step
      - 4 viewports pass

15. [P3] Meso E2E — Intro blink/wake-up sequence
    - Files: `e2e/meso/intro.spec.ts`
    - Criteria:
      - Intro completes within 10s
      - Eyelid animation screenshots captured
      - 4 viewports pass

16. [P3] Meso E2E — each of 13 GamePhases
    - Files: `e2e/meso/phases/{phase}.spec.ts` (13 files)
    - Criteria:
      - Each phase loads in isolation via `__WIB_DEBUG__.jumpToPhase()`
      - SurrealText matches expected phase instruction
      - 4 viewports pass (52 screenshots total)

17. [P3] Meso E2E — station interactions with real input
    - Files: `e2e/meso/stations/{station}-interaction.spec.ts` (8 files)
    - Criteria:
      - Real mouse click / drag events
      - Interaction advances meter (e.g., grinder fill > 0)
      - Screenshot at start + mid + end
      - 4 viewports pass

18. [P3] Meso E2E — Verdict screen per difficulty
    - Files: `e2e/meso/verdict.spec.ts`
    - Criteria:
      - 3 difficulty verdicts rendered (Easy, Medium, Hard)
      - Screenshots captured
      - 4 viewports pass

19. [P4] Implement WIBPerception
    - Files: `e2e/harness/perception/WIBPerception.ts`, `__tests__/WIBPerception.test.ts`
    - Criteria:
      - `observe(page)` returns PerceptionSnapshot
      - No mutation of game state
      - Unit test passes with mocked page

20. [P4] Implement WIBActionSet
    - Files: `e2e/harness/goap/WIBActionSet.ts`, `__tests__/WIBActionSet.test.ts`
    - Criteria:
      - 13 GoapAction subclasses (one per phase)
      - Each has preconditions, effects, cost
      - Unit test asserts plan can form

21. [P4] Implement WIBGoals
    - Files: `e2e/harness/goap/WIBGoals.ts`
    - Criteria:
      - CompleteRoundGoal, MaximizeScoreGoal, AvoidStrikeGoal defined
      - Goals compose as CompositeGoal
      - Evaluator selects goal based on perception

22. [P4] Implement WIBPlanner
    - Files: `e2e/harness/goap/WIBPlanner.ts`, `__tests__/WIBPlanner.test.ts`
    - Criteria:
      - `plan(perception, goal)` returns GoapAction[]
      - Uses Yuka GoapPlanner
      - Empty array triggers test failure
      - Unit test asserts plan length for each starting phase

23. [P4] Implement WIBActuator
    - Files: `e2e/harness/actuation/WIBActuator.ts`, `__tests__/WIBActuator.test.ts`
    - Criteria:
      - `click`, `drag`, `pointerLockMove`, `keyPress` methods
      - All dispatch through Playwright page.mouse / page.keyboard
      - No synthetic event dispatching
      - Unit test verifies real event path

24. [P4] Implement GoapGovernor
    - Files: `e2e/harness/goap/GoapGovernor.ts`, `__tests__/GoapGovernor.test.ts`
    - Criteria:
      - `playFullRound(difficulty)` runs perceive → plan → act loop
      - Logs every action to `e2e-screenshots/goap/{run-id}/actions.log`
      - 10-minute timeout per playthrough

25. [P5] Macro E2E — synthetic playthrough regression
    - Files: `e2e/macro/synthetic-playthrough.spec.ts`
    - Criteria:
      - Uses existing WIBGovernor
      - Completes in all 4 viewports
      - Asserts DONE phase reached

26. [P5] Macro E2E — Yuka GOAP Easy playthrough
    - Files: `e2e/macro/goap-playthrough-easy.spec.ts`
    - Criteria:
      - GoapGovernor completes Easy round with real clicks
      - DONE phase reached
      - Phase-strip screenshots captured
      - 4 viewports pass

27. [P5] Macro E2E — Yuka GOAP Medium playthrough
    - Files: `e2e/macro/goap-playthrough-medium.spec.ts`
    - Criteria: same as 26 for Medium

28. [P5] Macro E2E — Yuka GOAP Hard playthrough
    - Files: `e2e/macro/goap-playthrough-hard.spec.ts`
    - Criteria: same as 26 for Hard

29. [P5] Macro E2E — viewport matrix
    - Files: none new (uses existing playwright.config.ts projects)
    - Criteria:
      - All macro specs tagged with all 4 projects
      - Verified via `pnpm test:e2e:macro --list`

30. [P5] Macro E2E — adversarial Yuka playthrough
    - Files: `e2e/macro/goap-adversarial.spec.ts`
    - Criteria:
      - Yuka deliberately fails objectives (e.g., under-grinds)
      - Strikes accumulate as expected
      - Verdict reflects poor performance
      - 4 viewports pass

31. [P6] Screenshot diff report generator
    - Files: `scripts/generate-e2e-report.ts`, `scripts/__tests__/generate-e2e-report.test.ts`
    - Criteria:
      - `pnpm report:e2e` produces `e2e-screenshots/report.html`
      - HTML groups by macro/meso/micro → feature → viewport
      - Includes pass/fail counts + GOAP action logs

32. [P6] Test scripts
    - Files: `package.json`
    - Criteria:
      - New scripts: `test:e2e:micro`, `test:e2e:meso`, `test:e2e:macro`, `test:e2e:goap`, `test:e2e:all`, `test:e2e:viewport`, `report:e2e`
      - `pnpm test:e2e:micro` runs micro specs only

33. [P6] Documentation — deep-e2e.md
    - Files: `docs/testing/deep-e2e.md`
    - Criteria:
      - Documents macro/meso/micro hierarchy
      - Documents Yuka GOAP architecture
      - Documents viewport matrix
      - ASCII diagram of perceive → plan → act loop

34. [P6] AGENTS.md updates
    - Files: `AGENTS.md`
    - Criteria:
      - New "Deep E2E Testing" section
      - Links to `docs/testing/deep-e2e.md`
      - Lists new pnpm scripts

## Execution Order

### Wave 1 — Foundation (sequential, blocks everything)
1 → 2 → 3 → 4 → 5

### Wave 2 — Micro layer (parallel after Wave 1)
6 → [7, 8, 9, 10, 11, 12, 13] (parallel)

### Wave 3 — Meso layer (parallel after 6)
[14, 15, 16, 17, 18] (parallel)

### Wave 4 — Yuka GOAP harness (sequential, Yuka-internal deps)
19 → 20 → 21 → 22 → 23 → 24

### Wave 5 — Macro playthroughs (parallel after 24)
[25, 26, 27, 28, 29, 30] (parallel)

### Wave 6 — Reporting + docs (sequential after Wave 5)
31 → 32 → 33 → 34

## Agent Routing

| Wave | Agent | Reason |
|------|-------|--------|
| 1 | scene-architect | Playwright config + harness scaffolding |
| 2 (micro) | scene-architect + store-warden | R3F components + ECS perception |
| 3 (meso) | challenge-dev | Station interaction + phase transitions |
| 4 (Yuka) | challenge-dev | Gameplay AI logic |
| 5 (macro) | challenge-dev | Full playthroughs |
| 6 (docs) | doc-keeper | AGENTS.md + docs/testing/deep-e2e.md |
