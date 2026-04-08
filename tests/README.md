# `tests/` — Deep hierarchical validation suite

All real-browser tests for Will It Blow? live here. Powered by
[`@vitest/browser`](https://vitest.dev/guide/browser/) + Playwright provider,
so every spec runs in a real headed Chromium with GPU-accelerated WebGL — not
jsdom, not a mock.

This directory **replaces** the previous `e2e/` Playwright suite and the
stand-alone `playwright.config.ts`. Vitest browser mode uses Playwright under
the hood, so we keep the real-browser capabilities while collapsing the
testing stack from three tiers down to two (`unit` jsdom + `browser` real
browser).

## Hierarchy

```
macro   — full playthroughs, multi-phase sequences, the Yuka GOAP player
          simulating an actual human completing a round
  meso  — a single phase, a single station interaction, title→difficulty
          flow, intro eyelid sequence, verdict screen
    micro — a single R3F component in isolation, mounted through the
            `renderR3F()` harness with no game-level state
```

A failure at a lower layer should **not** cascade into the upper layers.
Each layer has its own setup via the `harness/` helpers.

## Layout

| Path | What lives here |
|------|-----------------|
| `tests/unit/*.browser.test.ts` | Targeted behaviour tests that need WebGL/Rapier but aren't mounting game components. Example: "the shared `playerPosition` singleton updates under real Rapier gravity." |
| `tests/micro/*.browser.test.tsx` | Single-component mounts via `renderR3F()`. Asserts rendering + screenshots. |
| `tests/meso/*.browser.test.ts` | Full-page tests via `page.goto('/')`. Exercise phases, station interactions, and top-level flows. |
| `tests/macro/*.browser.test.ts` | End-to-end playthroughs: synthetic (debug shortcut) baselines and **Yuka GOAP** AI-driven real-click playthroughs at every difficulty plus an adversarial run. |
| `tests/harness/render/` | `renderR3F()` + React 19 / `@vitest/browser` canvas cleanup helpers. |
| `tests/harness/perception/` | `WIBPerception` — read-only game-state reader the Yuka governor uses. |
| `tests/harness/actuation/` | `WIBActuator` — real mouse/pointer/keyboard dispatch; **never** synthetic events. |
| `tests/harness/goap/` | `WIBActionSet`, `WIBGoals`, `WIBPlanner`, `GoapGovernor`. |

## Screenshots

Every layer captures screenshots on every assertion point. Output lands in
`test-results/browser/{layer}/{feature}/{viewport}.png`. The generator in
`scripts/generate-test-report.ts` walks that directory to produce an HTML
report grouped by layer → feature → viewport.

## Viewports

Browser tests run across four viewports, expressed as Vitest browser
sub-projects so they run in parallel:

| Project | Size | DPR | Notes |
|---------|------|-----|-------|
| `desktop-1280` | 1280×720 | default | Primary desktop target |
| `mobile-390` | 390×844 | default | iPhone-class touch target |
| `tablet-768` | 768×1024 | default | iPad-class |
| `uhd-3840` | 3840×2160 | **1** | 4K; DPR clamped to 1 to stay under the 16MP texture limit |

## Running

```sh
pnpm test:browser                # full matrix, all 4 viewports × all layers
pnpm test:browser -- --project desktop-1280 tests/micro
pnpm test:browser -- tests/macro/goap-easy.browser.test.ts
```

`pnpm test` is still jsdom-only unit coverage. The two tiers do not overlap.
