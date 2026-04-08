# Deep Browser Validation

The `tests/` directory hosts a four-tier validation suite that runs every
component, every phase transition, and every full playthrough through a
**real headed Chromium** browser. It replaces the previous Playwright `e2e/`
suite with `@vitest/browser` (which uses Playwright as its provider under
the hood) so the entire stack lives behind a single test runner.

## The four tiers

```
macro    full playthroughs driven by the Yuka GOAP governor
  meso   single phase, single station, title→difficulty flow,
         intro sequence, verdict screen
    micro  one R3F component in isolation via renderR3F() harness
      unit  pure logic that needs WebGL/Rapier but no game state
```

A failure at one tier should never cascade into the tier above; each
layer is independently runnable and isolated by the harness's
per-test cleanup.

## Running

```sh
pnpm test                  # jsdom unit suite (fast, default)
pnpm test:browser          # the full browser matrix
pnpm test:browser:unit     # unit-tier browser specs
pnpm test:browser:micro    # micro-tier browser specs
pnpm test:browser:meso     # meso-tier browser specs
pnpm test:browser:macro    # macro-tier browser specs (Yuka playthroughs)
pnpm test:browser:harness  # harness self-tests
pnpm test:browser:src      # colocated browser tests under src/
pnpm report:browser        # rebuild test-results/browser/report.html
```

The chunked scripts exist because Vitest browser's WebSocket
connection to the orchestrator can drop on long single runs. Each
chunk gets its own connection and stays well under the timeout.

## Viewports

Every browser-mode spec runs across four sub-projects defined in
`vitest.config.ts`:

| Project       | Width | Height | Notes                                  |
|---------------|-------|--------|----------------------------------------|
| desktop-1280  | 1280  |   720  | Primary desktop target                 |
| mobile-390    |  390  |   844  | iPhone-class touch target              |
| tablet-768    |  768  |  1024  | iPad-class                             |
| uhd-3840      | 3840  |  2160  | 4K. devicePixelRatio clamped to 1 to   |
|               |       |        | stay under the 16 MP texture limit     |

The runner is **headless**, but with three backgrounding flags
unset (`--disable-backgrounding-occluded-windows`,
`--disable-background-timer-throttling`,
`--disable-renderer-backgrounding`) so Chromium doesn't throttle
`requestAnimationFrame` and starve R3F's render loop.

## Harness

`tests/harness/` is the shared kit every test relies on.

### `render/renderR3F.tsx`

Mounts an R3F scene inside `vitest-browser-react` with all the
gotchas pre-handled:

- `frameloop="demand"` — the test drives frames manually via
  `state.advance()` instead of waiting for Chromium's throttled
  internal RAF
- An in-tree `<StateProbe>` component publishes the live `RootState`
  into a closure the test can read via `handle.getState()`
- `installR3FTestHooks()` registers the per-file `afterEach(cleanup)`
  hook AND resets the shared `playerPosition` singleton between
  tests; without it Chromium runs out of WebGL contexts after a
  handful of mounts in the same file
- Helper utilities: `waitForR3F`, `countMeshes`, `countLitPixels`

### `defineMicroSpec.tsx`

Declarative wrapper for "mount a single component in isolation,
screenshot it, assert it has meshes + lit pixels". A typical micro
test file is ~10 lines:

```tsx
import {Grinder} from '../../src/components/stations/Grinder';
import {defineMicroSpec} from '../harness/defineMicroSpec';

defineMicroSpec({
  name: 'Grinder',
  mountChildren: () => <Grinder />,
  physics: true,
  cameraPosition: [-0.5, 1.5, 0],
  cameraTarget: [-2.5, 1.0, -1.0],
});
```

### `snapshot.ts`

`captureSnapshot({layer, feature, step?, scope?})` writes PNGs to
`test-results/browser/{layer}/{feature}/{viewport}[_step].png`. The
viewport name is read live from
`window.__vitest_browser_runner__.config.name` so the same spec
emits one screenshot per active Vitest browser instance with no
per-test plumbing.

### `perception/WIBPerception.ts`

Read-only adapter around the game's `__WIB_DEBUG__.getPerception()`
bridge. The Yuka GOAP governor uses this exclusively — it never
touches `useGameStore.setState`. Direct store mutation is allowed
in `beforeEach` setup but is forbidden once the governor starts.

### `actuation/WIBActuator.ts`

Real-input dispatcher built on `@vitest/browser/context`'s
`userEvent`. Methods: `clickSelector`, `clickButtonByText`, `type`,
`pressKey`, `clickPoint` (canvas coordinates — stub for now).

**Never** dispatches synthetic events. Pointer + keyboard events
flow through Playwright's underlying primitives.

## The Yuka GOAP governor

`tests/harness/goap/GoapGovernor.ts` is the AI player. It runs a
classic perceive → select-goal → execute → settle loop:

```
   ┌──────────────────────────┐
   │  GoapGovernor.tick()     │
   └────────────┬─────────────┘
                ▼
    ┌──────────────────────┐         ┌─────────────────────┐
    │  WIBPerception       │ ◀────── │  __WIB_DEBUG__      │
    │  .observe()          │         │  .getPerception()   │
    └──────────┬───────────┘         └─────────────────────┘
               │  PerceptionSnapshot
               ▼
    ┌──────────────────────────┐
    │  CompleteRoundGoal       │
    │  .selectGoalForPhase()   │
    └──────────┬───────────────┘
               │  WIBGoal
               ▼
    ┌──────────────────────────┐         ┌─────────────────────┐
    │  goal.run({              │         │   Real Playwright   │
    │    perception, actuator  │ ──────▶ │   page.mouse / keys │
    │  })                      │         │   via @vitest/      │
    └──────────────────────────┘         │   browser/context   │
                                         └─────────────────────┘
```

Top-level goal: `CompleteRoundGoal` extends Yuka's `CompositeGoal`.
On each tick it maps the current `gamePhase` to the right per-phase
subgoal (`SelectIngredientsGoal`, `ChopGoal`, `FillGrinderGoal`,
`StuffGoal`, `TieGoal`, `BlowoutGoal`, `CookGoal`,
`SyntheticAdvanceGoal` for trivial passthrough phases). The
`hostile: true` constructor flag swaps `CookGoal` for
`UnderCookGoal` to test the failure branch.

Per-phase subgoals are currently a mix of real-DOM clicks and
debug-bridge shortcuts. Each subgoal is independently replaceable —
the macro layer's "real Yuka clicks" tests will swap each shortcut
for actual pointer events one at a time.

## Screenshot report

`pnpm report:browser` rebuilds `test-results/browser/report.html` —
a single self-contained HTML page that walks `test-results/browser/`
and groups every captured screenshot by layer → feature → viewport.
Open it directly in a browser to scan for visual regressions; no
build step or external assets.
