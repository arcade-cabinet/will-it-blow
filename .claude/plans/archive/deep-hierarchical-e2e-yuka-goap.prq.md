# Feature: Deep Hierarchical E2E Testing with Yuka GOAP Player Governor

**Created**: 2026-04-08
**Version**: 2.88
**Timeframe**: 1 week (Sprint-scoped)
**Project**: Will It Blow?
**Branch**: `feat/deep-hierarchical-e2e-yuka-goap`

## Priority: P0 — Quality foundation for 13-phase horror gameplay

## Overview

Comprehensive **deep hierarchical E2E validation** covering every macro/meso/micro unit
of the "Will It Blow?" game, executed in a **real headed Chrome browser** with
GPU-accelerated WebGL, **screenshots captured at every assertion point**, across
**four viewports** (Desktop 1280x720, Mobile 390x844, Tablet 768x1024, 4K 3840x2160).

A **Yuka-powered GOAP governor** replaces the current synthetic
`window.__WIB_DEBUG__` shortcuts with a real AI player that:

1. **Perceives** the game world through actual DOM + canvas reads (pointer ray picking,
   SurrealText OCR, ECS trait snapshots exposed via a read-only window bridge)
2. **Plans** action sequences using GOAP (Goal-Oriented Action Planning) to satisfy
   each phase's victory conditions
3. **Acts** by issuing **real Playwright mouse/pointer events** into the R3F `<canvas>`
   (not synthetic phase jumps) — pointer lock, drag-to-fill, tap-to-interact
4. **Completes** a full playthrough from TitleScreen → DONE without human intervention

### Hierarchy Definition

```
MACRO (scene-level)              — full playthroughs, multi-phase sequences
  MESO (feature-level)           — individual phase, individual station
    MICRO (component-level)      — single R3F component in isolation
```

Every level is independently testable in the headed browser with screenshots.
A failure at micro level must not cascade into meso/macro failures — each
layer has its own isolation harness.

## Tasks

### Foundation (Priority 1 — infrastructure)

- [ ] **1**: Add Yuka dependency and set up GOAP types
- [ ] **2**: Create `e2e/harness/` isolation harness directory
- [ ] **3**: Extend `window.__WIB_DEBUG__` with read-only perception API
- [ ] **4**: Configure Playwright viewport matrix (desktop, mobile, tablet, 4K)
- [ ] **5**: Create screenshot capture helper with deterministic naming

### Micro-level Tests (Priority 2 — component isolation)

- [ ] **6**: Micro test harness `playwright/micro.html` mounting single components
- [ ] **7**: Micro E2E — `BasementRoom` render + screenshot (4 viewports)
- [ ] **8**: Micro E2E — `Kitchen` render + screenshot (4 viewports)
- [ ] **9**: Micro E2E — each station (Grinder, Stuffer, Stove, Sink, ChoppingBlock, ChestFreezer, BlowoutStation, TV) — 8 components × 4 viewports = 32 screenshots
- [ ] **10**: Micro E2E — `Sausage` physics component (bone chain settling)
- [ ] **11**: Micro E2E — `SurrealText` diegetic text rendering + drip animation
- [ ] **12**: Micro E2E — `FPSCamera` + `PlayerCapsule` isolation
- [ ] **13**: Micro E2E — Koota ECS traits mount/init snapshot

### Meso-level Tests (Priority 3 — phase + station integration)

- [ ] **14**: Meso E2E — TitleScreen → DifficultySelector flow (4 viewports)
- [ ] **15**: Meso E2E — Intro blink/wake-up sequence (4 viewports)
- [ ] **16**: Meso E2E — each of 13 GamePhases in isolation (13 × 4 = 52 screenshots)
- [ ] **17**: Meso E2E — each station interaction (grind, stuff, cook, chop, tie, blowout) with real input events
- [ ] **18**: Meso E2E — Verdict screen per difficulty tier

### Yuka GOAP Governor (Priority 4 — AI player)

- [ ] **19**: Implement `WIBPerception` — read game state via debug window bridge
- [ ] **20**: Implement `WIBActionSet` — Yuka GoapAction definitions for all 13 phases
- [ ] **21**: Implement `WIBGoals` — phase victory conditions as Yuka goals
- [ ] **22**: Implement `WIBPlanner` — Yuka `Think` evaluator selecting next action
- [ ] **23**: Implement `WIBActuator` — real mouse/pointer event dispatcher to canvas
- [ ] **24**: Implement `GoapGovernor` — replaces `WIBGovernor` for real playthroughs

### Macro-level Tests (Priority 5 — full playthroughs)

- [ ] **25**: Macro E2E — synthetic full playthrough (debug shortcut) regression
- [ ] **26**: Macro E2E — **Yuka GOAP full playthrough** (real clicks, all 13 phases, Easy difficulty)
- [ ] **27**: Macro E2E — Yuka GOAP Medium difficulty
- [ ] **28**: Macro E2E — Yuka GOAP Hard difficulty
- [ ] **29**: Macro E2E — Yuka GOAP runs in all 4 viewports
- [ ] **30**: Macro E2E — adversarial playthrough: Yuka deliberately fails objectives, assert strikes/verdict

### Reporting & CI (Priority 6)

- [ ] **31**: Screenshot diff report generator (`scripts/generate-e2e-report.ts`)
- [ ] **32**: Update `pnpm test:e2e` scripts — `:micro`, `:meso`, `:macro`, `:goap`, `:all`
- [ ] **33**: Document test matrix in `docs/testing/deep-e2e.md`
- [ ] **34**: Update `AGENTS.md` with new E2E commands

## Dependencies

| Task | Depends On | Reason |
|------|-----------|--------|
| 2 | 1 | harness dir imports Yuka types |
| 3 | 2 | perception API lives in harness/ |
| 4 | — | independent playwright.config.ts edit |
| 5 | 4 | screenshot helper uses viewport matrix |
| 6 | 2, 5 | micro harness needs dir + helper |
| 7-13 | 6 | all micro tests use micro.html |
| 14-18 | 3, 5 | meso tests need perception + screenshots |
| 19 | 3 | perception reads from window bridge |
| 20 | 1 | actions use Yuka GoapAction |
| 21 | 1 | goals use Yuka interfaces |
| 22 | 19, 20, 21 | planner glues perception + actions + goals |
| 23 | 4 | actuator dispatches real Playwright events |
| 24 | 22, 23 | governor orchestrates planner + actuator |
| 25 | 3 | synthetic regression uses existing WIBGovernor |
| 26-30 | 24 | macro Yuka tests need GoapGovernor |
| 31 | 7-30 | report needs all screenshots to exist |
| 32 | 7-30 | scripts reference all test files |
| 33 | 32 | docs reference final scripts |
| 34 | 33 | AGENTS.md references docs |

No circular dependencies. Execution fan-out is safe after task 6.

## Acceptance Criteria

### 1. Add Yuka dependency and set up GOAP types
- `yuka` package installed via `pnpm add yuka` at version ^0.7.8 or later
- `pnpm-lock.yaml` updated
- `pnpm typecheck` passes with no new errors
- `node_modules/yuka/build/yuka.module.js` exists

### 2. Create `e2e/harness/` isolation harness directory
- Directory `e2e/harness/` exists
- Contains `README.md` describing macro/meso/micro split
- Contains subdirs: `perception/`, `actuation/`, `goap/`, `viewports/`

### 3. Extend `window.__WIB_DEBUG__` with read-only perception API
- `src/debug/wibDebug.ts` exports `installWibDebug()`
- Adds read-only fields: `getPerception()`, `getKootaSnapshot()`, `getCurrentSurrealText()`, `getStationBounds()`
- ONLY installed when `import.meta.env.DEV === true` or `?e2e=1` query param present
- Unit test in `src/debug/__tests__/wibDebug.test.ts` asserts read-only enforcement

### 4. Configure Playwright viewport matrix
- `playwright.config.ts` declares 4 projects: `desktop-1280`, `mobile-390`, `tablet-768`, `uhd-3840`
- All four use `headless: false` and `GPU_ARGS`
- `pnpm test:e2e --list` shows all 4 projects × all test files

### 5. Deterministic screenshot capture helper
- `e2e/utils/snapshot.ts` exports `captureSnapshot(page, name)`
- Naming convention: `{level}-{feature}-{viewport}-{timestamp}.png`
- Saves under `e2e-screenshots/{level}/{feature}/{viewport}.png`
- Waits for 2 RAF frames before capture to stabilize R3F renders

### 6. Micro harness mount point
- `playwright/micro.html` + `playwright/micro.tsx` created
- Mounts any component by `?component=<name>` query param
- Supports: BasementRoom, Kitchen, Grinder, Stuffer, Stove, Sink, ChoppingBlock, ChestFreezer, BlowoutStation, TV, Sausage, SurrealText, FPSCamera
- Vite dev server serves it at `/micro.html`

### 7-13. Micro component E2E tests
- Each test file under `e2e/micro/{component}.spec.ts`
- Each test runs across all 4 viewports (via `test.describe` + `project`)
- Asserts: no console errors, canvas `gl.getError() === 0`, non-blank pixels > 1000
- Screenshot saved to `e2e-screenshots/micro/{component}/{viewport}.png`

### 14-18. Meso phase/station E2E tests
- Each of 13 phases has a dedicated spec under `e2e/meso/phases/{phase}.spec.ts`
- Each station interaction test under `e2e/meso/stations/{station}.spec.ts`
- Uses real pointer events (no debug phase jumps)
- Asserts SurrealText visible on wall matches expected phase text
- Screenshot captured at phase entry and phase exit

### 19. WIBPerception
- `e2e/harness/perception/WIBPerception.ts` class
- Method `observe(page)` returns `PerceptionSnapshot { phase, score, strikes, stationBounds, meterValues, surrealText, sausagePosition }`
- All data sourced from `window.__WIB_DEBUG__` read-only API (no writes)
- Unit test with mocked page asserts perception shape

### 20. WIBActionSet
- `e2e/harness/goap/WIBActionSet.ts` defines 13+ Yuka `GoapAction` subclasses
- One action per phase: SelectIngredients, Chop, FillGrinder, Grind, MoveBowl, AttachCasing, Stuff, Tie, Blowout, MoveSausage, MovePan, Cook, FinishRound
- Each action declares `preconditions`, `effects`, `cost`
- Each action's `execute(actuator, perception)` returns a Promise<boolean>

### 21. WIBGoals
- `e2e/harness/goap/WIBGoals.ts` defines goals: `CompleteRoundGoal`, `MaximizeScoreGoal`, `AvoidStrikeGoal`
- Goals composed as Yuka `CompositeGoal`
- Evaluator picks goal based on current perception

### 22. WIBPlanner
- `e2e/harness/goap/WIBPlanner.ts` exports `plan(perception, goal): GoapAction[]`
- Uses Yuka `GoapPlanner` to generate sequence
- Returns empty array if no plan possible (triggers test failure)

### 23. WIBActuator
- `e2e/harness/actuation/WIBActuator.ts` class
- Methods: `click(x, y)`, `drag(from, to, duration)`, `pointerLockMove(dx, dy)`, `keyPress(key)`
- All dispatch through Playwright `page.mouse` / `page.keyboard` — **no synthetic events**
- Coordinate math: screen → normalized device coords → canvas pixel
- Unit test asserts pointer events reach the canvas element

### 24. GoapGovernor
- `e2e/harness/goap/GoapGovernor.ts` replaces `WIBGovernor` for real playthroughs
- Exposes `playFullRound(difficulty)` that runs the perceive → plan → act loop
- Logs every action taken with timestamp to `e2e-screenshots/goap/{run-id}/actions.log`
- Times out after 10 minutes per playthrough

### 25-30. Macro playthrough tests
- `e2e/macro/synthetic-playthrough.spec.ts` regression of existing `WIBGovernor` path
- `e2e/macro/goap-playthrough-easy.spec.ts` Yuka runs Easy
- `e2e/macro/goap-playthrough-medium.spec.ts` Yuka runs Medium
- `e2e/macro/goap-playthrough-hard.spec.ts` Yuka runs Hard
- All run across 4 viewports (`projects` matrix)
- Each asserts `governor.getGamePhase() === 'DONE'`
- Each saves a full phase-by-phase screenshot strip

### 31. Screenshot diff report generator
- `scripts/generate-e2e-report.ts` produces `e2e-screenshots/report.html`
- Groups by macro/meso/micro, then by feature, then by viewport
- Shows pass/fail counts, screenshot thumbnails, GOAP action logs
- `pnpm report:e2e` runs it

### 32. Test scripts
- `package.json` has new scripts:
  - `test:e2e:micro` — runs `e2e/micro/**`
  - `test:e2e:meso` — runs `e2e/meso/**`
  - `test:e2e:macro` — runs `e2e/macro/**`
  - `test:e2e:goap` — runs `e2e/macro/goap-*.spec.ts`
  - `test:e2e:all` — runs everything
  - `test:e2e:viewport` — runs all specs across all 4 viewports
- `pnpm test:e2e:micro` passes locally

### 33. Documentation
- `docs/testing/deep-e2e.md` created
- Documents hierarchy (macro/meso/micro)
- Documents Yuka GOAP architecture
- Documents viewport matrix
- Includes ASCII diagram of the perception → plan → act loop

### 34. AGENTS.md updates
- New "Deep E2E Testing" section added to `AGENTS.md`
- Lists all new commands
- Links to `docs/testing/deep-e2e.md`

## Technical Notes

### Screenshot Capture Strategy
- Use `page.screenshot({ fullPage: false, animations: 'disabled' })` for R3F canvas
- Wait for 2 `requestAnimationFrame` ticks before capture (R3F reconciliation)
- For Sausage physics settling, wait for `world.bodies.length > 0` + 500ms

### Headed Chrome in CI
- Requires `xvfb-run` on Linux CI runners, or `@playwright/test` with `display-server` action
- Local dev uses native display — `headless: false` already configured
- GPU args (`--use-angle=gl`, `--enable-webgl`, `--ignore-gpu-blocklist`) mandatory

### Yuka Integration Considerations
- Yuka is a standalone library — no React bindings needed
- GOAP planner runs in the **test process** (Node), not in the browser
- Only the perception reads happen in-browser via `page.evaluate`
- The actuator fires events via Playwright's `page.mouse` API

### Real Clicks vs Synthetic
- Current `WIBGovernor` uses `window.__WIB_DEBUG__.nextPhase()` — **synthetic**
- New `GoapGovernor` uses `page.mouse.click(x, y)` → R3F raycaster → station hit — **real**
- Synthetic path kept as regression baseline (task 25)

### Perception API Safety
- `window.__WIB_DEBUG__.getPerception()` MUST be read-only
- Freeze returned objects with `Object.freeze`
- Do NOT expose action mutators on this surface — actions only via real input

### ECS Integration
- Perception reads Koota traits via `world.get(entity, Trait)` — no subscriptions
- Snapshot converted to plain JSON before crossing page.evaluate boundary

## Risks

- **GPU instability in headed mode**: macOS Metal + ANGLE sometimes crashes. Mitigation: swap to `--use-angle=metal` if `gl` fails, retry with `--disable-gpu-sandbox`.
- **Yuka planner performance**: GOAP planning can explode combinatorially. Mitigation: cap action count to 13 (one per phase), set max plan depth to 20.
- **Real click flakiness**: R3F raycaster may miss small stations. Mitigation: station bounds exposed via perception, click center of bounding box.
- **Viewport rendering differences**: 4K may OOM. Mitigation: use `devicePixelRatio: 1` for UHD project to stay under 16MP.
- **Pointer lock in Playwright**: `page.mouse.move` doesn't trigger pointer lock events reliably. Mitigation: toggle pointer lock via `page.evaluate` to call `canvas.requestPointerLock()`, then use `page.mouse` for look deltas.
- **Screenshot storage bloat**: 34 micro + 52 meso + 12 macro × 4 viewports ≈ 400+ PNGs. Mitigation: `.gitignore` adds `e2e-screenshots/runs/`, keep only golden baseline under version control.
- **Full playthrough runtime**: Yuka playthrough could take 3-5 minutes per viewport. Mitigation: run viewports in parallel via `fullyParallel: true`, set per-test timeout to 10 minutes.
- **SurrealText OCR accuracy**: If Yuka reads SurrealText via canvas pixel OCR, it will be flaky. Mitigation: expose current text directly via `getCurrentSurrealText()` from the SurrealText component's internal state.

## Open Questions (non-blocking, assume defaults)

1. Should the GOAP planner be allowed to fail deliberately to test strike accumulation? → **Yes**, task 30 covers adversarial mode.
2. Should screenshots be compared against golden baselines or just captured? → **Capture-only for now**; pixel diff is out of scope for this batch (pre-existing `screenshot-regression.spec.ts` handles diffs).
3. Should Yuka governor support save/resume? → **No**, out of scope.
4. Should we test Safari / Firefox too? → **No**, Chromium only. Capacitor production target is WebKit but dev is Chrome.
