# Feature: Final Polish Pass — Will It Blow?

**Created**: 2026-04-08
**Version**: 2.88
**Timeframe**: Single session
**Project**: Will It Blow?
**Branch**: `feat/deep-hierarchical-validation` (28 commits ahead of main)
**Authoritative reading**: `AGENTS.md` (7 design pillars + 12 build principles)
**Companion task list**: `.claude/plans/2026-04-08-final-polish-gaps.tasks.md`
**Companion JSON**: `.claude/plans/2026-04-08-final-polish-gaps.json`

## Priority: P0 — Close remaining loose wires

## Overview

The core skeleton is done (28 commits, 690 tests, deduction loop wired end-to-end). An audit of the codebase reveals 10 real gaps: bridge subscribers that were never connected, composition data that flows to some stations but not others, a timing race in the round transition, and a set dressing component that exists but was never mounted. Three gaps (CerealBoxTarget mounting, station state reset, TV reaction chain) were already wired by previous batches.

This is a VERIFY-FIRST batch: each task reads the code, confirms the gap is real, then fixes it. Tasks that are already wired get a commit noting the verification.

---

## Audit Results (Pre-Verified)

| Gap | Verdict | Action Required |
|-----|---------|-----------------|
| 1. SurrealText bridge subscriber | CONFIRMED BUG | Wire `onSurrealMessage()` into SurrealText.tsx |
| 2. SurrealText slide-down animation | CONFIRMED BUG | Use messageQueue FSM for new bridge messages |
| 3. Freezer hardcoded 3-pick limit | CONFIRMED BUG | Respect `ingredientCountHint` or add done-tap |
| 4. Stove grease pool ignores composition | CONFIRMED BUG | Wire `compositeMix` into grease colour + sizzle |
| 5. Grinder particles hardcoded colour | CONFIRMED BUG | Tint particles by `mix.color` |
| 6. Sausage.tsx hardcoded props | CONFIRMED BUG | Read `compositeMix` for links/thickness/color |
| 7. CerealBoxTarget not mounted | ALREADY WIRED | Skip (mounted in BlowoutStation line 280) |
| 8. PresentationFlow onComplete no-op | CONFIRMED BUG | Fix timing: presentation must finish before round advance |
| 9. Station state not reset | ALREADY WIRED | Skip (nextRound() already resets StationGameplayTrait) |
| 10. SlaughterhouseDressing not mounted | CONFIRMED BUG | Import + mount in App.tsx |
| 11. Only 8 misdirection templates | CONFIRMED | Add 12+ more templates |
| 12. Ingredient trait diversity | PARTIAL | Verify current 20 ingredients have sufficient spread |
| 13. TV reaction not driven by deduction | ALREADY WIRED | Skip (chain connected via GameOrchestrator) |
| 14. Push + PR | PENDING | Final step after all gaps closed |

---

## Tasks

### Priority 1: SurrealText Bridge (Gaps 1-2) — Clues don't render without this

- [ ] P1-T1: Wire `onSurrealMessage()` subscriber into SurrealText.tsx
- [ ] P1-T2: Use messageQueue FSM for bridge-sourced messages with slide-down animation

### Priority 2: Variable Ingredient Count (Gap 3) — Core deduction UX

- [ ] P2-T1: Replace hardcoded 3-pick transition with clue-aware count or done-tap

### Priority 3: Composition Consumers (Gaps 4-6) — Visual fidelity

- [ ] P3-T1: Stove grease pool reads `compositeMix` for colour and sizzle intensity
- [ ] P3-T2: Grinder particles tinted by `mix.color`
- [ ] P3-T3: Sausage.tsx reads composition for links/thickness/color/fatRatio

### Priority 4: Round Flow Fix (Gap 8) — Presentation completes before advance

- [ ] P4-T1: Fix PresentationFlow/RoundTransition timing race

### Priority 5: Scene Mounting (Gap 10) — Atmosphere

- [ ] P5-T1: Mount SlaughterhouseDressing in App.tsx scene tree

### Priority 6: Clue Templates + Trait Diversity (Gaps 11-12) — Replayability

- [ ] P6-T1: Add 12+ misdirection clue templates to ClueGenerator.ts
- [ ] P6-T2: Audit ingredient trait diversity and fill gaps

### Priority 7: Push + PR (Gap 14)

- [ ] P7-T1: Push branch, open PR with comprehensive summary

---

## Task Details

### P1-T1: Wire SurrealText bridge subscriber

**Problem**: `enqueueSurrealMessage()` in `surrealTextBridge.ts` publishes to listeners, but `SurrealText.tsx` never calls `onSurrealMessage()` to subscribe. All clue messages from GameOrchestrator, PresentationFlow verdict text, and fridge-empty messages go to `/dev/null`.

**Fix**:
- Import `onSurrealMessage` from `../../engine/surrealTextBridge`
- In a `useEffect`, subscribe to `onSurrealMessage` and push received messages into a new `bridgeMessages` state array (same `MessageEntry` shape)
- Render bridge messages alongside the existing phase/demand/taunt layers
- Unsubscribe on cleanup

**Files**: `src/components/environment/SurrealText.tsx`

**Acceptance**:
- `grep -n "onSurrealMessage" src/components/environment/SurrealText.tsx` returns a hit
- Bridge messages render as blood-red 3D text on the named surface
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P1-T2: Slide-down animation for bridge messages

**Problem**: The messageQueue FSM (`surrealText/messageQueue.ts`) has MOUNTED->SEEN->READING->DROPPING->REMOVED states with `dropOffset` and `opacity` fields, but SurrealText.tsx doesn't use the FSM for its rendering. Bridge-sourced messages should use the FSM so they slide down and fade when done being read.

**Fix**:
- Import `createMessage`, `createQueueEntry`, `tickQueue`, `QueueEntry` from `./surrealText/messageQueue`
- Maintain a `QueueEntry[]` ref for bridge messages
- In `useFrame`, call `tickQueue(queue, delta * 1000, isSeenFn)` to advance the FSM
- Map queue entries to `SurrealMessage` components with `surface.position[1] - entry.dropOffset` for the Y offset and `entry.opacity` for material opacity
- The `isSeen` function can default to `true` for now (camera-aware SEEN detection is a follow-up)

**Files**: `src/components/environment/SurrealText.tsx`

**Acceptance**:
- Bridge messages fade in, dwell, then slide downward and fade out
- Existing phase/demand/taunt messages unchanged
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P2-T1: Variable ingredient count in PhysicsFreezerChest

**Problem**: Line 132 of `PhysicsFreezerChest.tsx` advances to CHOPPING when `selectedIngredientIds.length >= 2` (i.e., on the 3rd pick). But the Zoombinis deduction system has variable ingredient counts per round via `clue.ingredientCountHint`. The current code always demands exactly 3 regardless of the clue.

**Fix**:
- Read `currentClue` from the store (via `getCurrentClueJson()` or a new selector)
- If `ingredientCountHint > 0`, use that as the target count
- If `ingredientCountHint === 0` (shock-me / misdirection with no hint), show a "DONE" interaction on the fridge door — a tappable region that confirms selection
- Update the transition condition: `selectedIngredientIds.length >= targetCount`
- Fallback: if no clue exists (shouldn't happen), default to 3

**Files**: `src/components/stations/PhysicsFreezerChest.tsx`

**Acceptance**:
- Round 1 with hint=2 allows 2 picks before advancing
- Shock-me clue allows any count until player taps "DONE"
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P3-T1: Stove grease pool reads composition

**Problem**: `Stove.tsx` grease pool material has hardcoded colour `0xcca600` (line 142). The composition pillar provides `compositeMix(selection).color` which should drive the grease colour (fattier = more amber, leaner = clearer) and `mix.moisture` should drive sizzle intensity.

**Fix**:
- Import `compositeMix` from `../../engine/IngredientComposition`
- Read `currentRoundSelection` from `useGameStore`
- Compute `mix = compositeMix(currentRoundSelection)` in a `useMemo`
- Drive `greasePoolMat.color` from `mix.color` (converted to Three.js Color)
- Modulate sizzle audio level by `mix.moisture * mix.fat` instead of just burner level
- Keep the cook-level color lerp but use `mix.color` as the base instead of `0xcca600`

**Files**: `src/components/stations/Stove.tsx`

**Acceptance**:
- Grease pool colour changes based on selected ingredients
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P3-T2: Grinder particles tinted by composition

**Problem**: `Grinder.tsx` line 383 has particle material hardcoded to `color="#822424"`. The composition pillar provides `mix.color` per selection.

**Fix**:
- Import `compositeMix` from `../../engine/IngredientComposition`
- Read `currentRoundSelection` from `useGameStore`
- Compute `mix = compositeMix(currentRoundSelection)` in a `useMemo`
- Set the particle InstancedMesh material color to `mix.color` (fallback to `#822424` if no selection)
- Also tint the ground-meat ball in the bowl (line 309) to `mix.color`

**Files**: `src/components/stations/Grinder.tsx`

**Acceptance**:
- Grinding banana produces yellowish particles; grinding steak produces dark red
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P3-T3: Sausage.tsx reads composition

**Problem**: `Sausage.tsx` receives hardcoded default props (`links=4, thickness=0.6, meatType='pork', fatRatio=0.5, greaseLevel=0.8`). These should derive from the composition of the current round's selection.

**Fix**:
- In `App.tsx` where `<Sausage>` is mounted (line 126), read `currentRoundSelection` and compute `compositeMix(selection)`
- Pass composition-derived props:
  - `meatType`: map `mix.dominantIngredient` to closest meat type, or add a new color-based path
  - `fatRatio`: `mix.fat`
  - `greaseLevel`: `mix.moisture * 0.8 + mix.fat * 0.2`
  - `links`: `Math.max(2, Math.min(8, selection.length + 1))`
  - `thickness`: `0.3 + mix.density * 0.5`
- OR refactor Sausage to read composition internally via `useGameStore`

**Files**: `src/App.tsx`, `src/components/sausage/Sausage.tsx`

**Acceptance**:
- Sausage appearance changes based on ingredient selection
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P4-T1: Fix PresentationFlow / RoundTransition timing race

**Problem**: When gamePhase reaches DONE:
1. `PresentationFlow` renders and starts its 12-second sequence
2. `showRoundTransition` is set to `true` immediately by the App useEffect
3. `RoundTransition` auto-advances after 2 seconds, calling `nextRound()` which resets gamePhase to SELECT_INGREDIENTS
4. PresentationFlow unmounts (it's guarded by `gamePhase === 'DONE'`) after only 2 seconds of its 12-second sequence

**Fix**: The RoundTransition should not appear until the PresentationFlow completes. Options:
- **Option A**: Make `handlePresentationComplete` set a flag (`presentationDone`) and gate `showRoundTransition` on both `gamePhase === 'DONE'` AND `presentationDone`
- **Option B**: Have PresentationFlow's `onComplete` trigger the round transition directly instead of it being automatic

Option A is simpler and doesn't change the PresentationFlow contract.

**Files**: `src/App.tsx`

**Acceptance**:
- PresentationFlow completes its full 12-second sequence before round transition appears
- Round transition still shows "ROUND X/Y" with slash animation
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P5-T1: Mount SlaughterhouseDressing in App.tsx

**Problem**: `SlaughterhouseDressing.tsx` and its 6 sub-components exist but are never imported or rendered in App.tsx. The ~55 horror GLBs are invisible.

**Fix**:
- Import `SlaughterhouseDressing` from `./components/environment/dressing/SlaughterhouseDressing`
- Mount inside the `<Physics>` group in `GameContent`, alongside existing `<ScatterProps>` and `<Prop>`

**Files**: `src/App.tsx`

**Acceptance**:
- Horror set dressing (chainsaw, bear trap, cage, pipes, debris, shelf) visible in scene
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P6-T1: Add 12+ misdirection clue templates

**Problem**: `ClueGenerator.ts` has only 8 MISDIRECTION_TEMPLATES. For replayability across 5-10 round games, the player will see repeats quickly.

**Fix**: Add 12+ new templates with creative Mr. Sausage hunger riddles:
- Cover all trait categories: texture, temperature, origin, processing, taste
- Include absurdist Ordinary Sausage flavour: "I once put a calculator in a sausage and it was divine..."
- Ensure each template maps to 2-4 valid IngredientTraits from VALID_TRAITS

**Files**: `src/engine/ClueGenerator.ts`

**Acceptance**:
- `MISDIRECTION_TEMPLATES.length >= 20`
- Each template's traits are all valid (in VALID_TRAITS set)
- Existing ClueGenerator tests still green
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P6-T2: Audit ingredient trait diversity

**Problem**: 20 ingredients exist. Need to verify trait spread is diverse enough for the clue generator to produce interesting puzzles across 5-10 rounds.

**Fix**:
- Read `src/config/ingredients.json` and analyze trait distribution
- Identify any traits with <2 ingredients (ClueGenerator's `findSharedTraits` filters to >=2)
- If diversity is low, add 2-3 traits to under-represented ingredients
- Verify each ingredient has composition data (color, density, moisture, fat, etc.)

**Files**: `src/config/ingredients.json`

**Acceptance**:
- At least 15 traits have >=2 ingredients carrying them
- No ingredient has fewer than 3 traits
- `pnpm typecheck` clean, `pnpm test -- --run` green

---

### P7-T1: Push branch + open PR

**Action**: After all gaps are verified closed:
- `pnpm typecheck` clean
- `pnpm test -- --run` green
- `pnpm lint` clean
- Push `feat/deep-hierarchical-validation` to remote
- Open PR to `main` with comprehensive summary listing all 28+ commits

**Acceptance**:
- PR exists and is reviewable
- CI passes (if configured)

---

## Dependencies

```
P1-T1 (bridge subscriber)
  └─> P1-T2 (slide-down animation)

P2-T1 (variable ingredient count) — independent

P3-T1 (stove composition)  ─┐
P3-T2 (grinder composition) ├─ all independent, can parallel
P3-T3 (sausage composition) ─┘

P4-T1 (timing race) — independent

P5-T1 (mount dressing) — independent

P6-T1 (clue templates) ─┐
P6-T2 (trait diversity)  ├─ can parallel
                         ┘

P7-T1 (push + PR) — depends on all above
```

## Execution Order

Sequential by priority group (parallelize within groups if possible):

1. P1-T1 then P1-T2
2. P2-T1
3. P3-T1, P3-T2, P3-T3 (parallel)
4. P4-T1
5. P5-T1
6. P6-T1, P6-T2 (parallel)
7. P7-T1

## Quality Gates (per task)

- `pnpm typecheck` clean
- `pnpm test -- --run` green
- Conventional commit: `feat(surreal-text):`, `feat(freezer):`, `feat(composition):`, etc.
- No new files > 400 LOC
- Named exports only
- Zero 2D overlays added during gameplay

## Risks

1. **P1-T2 complexity** — integrating the messageQueue FSM into SurrealText.tsx may require refactoring the existing 3-layer message system. Mitigation: keep existing layers untouched; add bridge messages as a 4th layer using the FSM.
2. **P4-T1 timing** — gating round transition on presentation completion requires shared state between GameContent (3D canvas) and App (2D overlay). Mitigation: use a simple ref or ECS flag.
3. **P3-T3 Sausage remounting** — changing Sausage props on composition change may cause expensive remounts (geometry recreation). Mitigation: make composition-driven values mutable refs rather than props.

---

## Technical Notes

- **Branch**: `feat/deep-hierarchical-validation` (do not switch)
- **Commit per gap** with conventional commit messages
- **Gate on typecheck + tests** before each commit
- **No push until P7-T1**
- **Mock `useGLTF`** in any new jsdom unit tests touching R3F components
- **Skipped gaps** (7, 9, 13): already wired — verify via grep/read, document in commit
