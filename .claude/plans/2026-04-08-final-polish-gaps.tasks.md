# Batch: Final Polish Gaps — Will It Blow?

**Created**: 2026-04-08
**Config**: stop_on_failure=false, auto_commit=true
**Branch**: feat/deep-hierarchical-validation
**PRD**: .claude/plans/2026-04-08-final-polish-gaps.prq.md

## Tasks

1. [P1] Wire SurrealText bridge subscriber — `onSurrealMessage()` into SurrealText.tsx
   - Files: src/components/environment/SurrealText.tsx
   - Criteria: `grep -n "onSurrealMessage" src/components/environment/SurrealText.tsx` returns hit; bridge messages render as 3D text; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

2. [P1] SurrealText slide-down animation for bridge messages — use messageQueue FSM
   - Files: src/components/environment/SurrealText.tsx
   - Criteria: Bridge messages fade in, dwell, slide down, fade out per FSM states; existing 3 layers unchanged; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

3. [P2] Variable ingredient count in PhysicsFreezerChest — respect ingredientCountHint
   - Files: src/components/stations/PhysicsFreezerChest.tsx
   - Criteria: Reads clue's ingredientCountHint; shock-me allows any count with done-tap; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

4. [P3] Stove grease pool reads compositeMix — colour + sizzle from selection
   - Files: src/components/stations/Stove.tsx
   - Criteria: `grep -n "compositeMix" src/components/stations/Stove.tsx` returns hit; grease colour varies by selection; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

5. [P3] Grinder particles tinted by mix.color — composition-driven particle colour
   - Files: src/components/stations/Grinder.tsx
   - Criteria: `grep -n "compositeMix" src/components/stations/Grinder.tsx` returns hit; particles tint by selection; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

6. [P3] Sausage.tsx reads composition — links/thickness/color/fat from selection
   - Files: src/App.tsx, src/components/sausage/Sausage.tsx
   - Criteria: Sausage appearance varies by selection; no more hardcoded defaults for active game; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

7. [P4] Fix PresentationFlow / RoundTransition timing race — presentation first
   - Files: src/App.tsx
   - Criteria: RoundTransition only appears AFTER PresentationFlow completes (12s sequence); nextRound not called until presentation done; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

8. [P5] Mount SlaughterhouseDressing in App.tsx scene tree
   - Files: src/App.tsx
   - Criteria: `grep -n "SlaughterhouseDressing" src/App.tsx` returns import + render; horror props visible; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

9. [P6] Add 12+ misdirection clue templates — replayability
   - Files: src/engine/ClueGenerator.ts
   - Criteria: MISDIRECTION_TEMPLATES.length >= 20; all traits valid; existing tests green; typecheck + tests green
   - Verify: pnpm typecheck && pnpm test -- --run

10. [P6] Audit ingredient trait diversity — ensure clue generator can produce varied puzzles
    - Files: src/config/ingredients.json
    - Criteria: >=15 traits with >=2 ingredients each; no ingredient has <3 traits; typecheck + tests green
    - Verify: pnpm typecheck && pnpm test -- --run

11. [P7] Push branch + open PR to main with comprehensive summary
    - Files: (none — git operations only)
    - Criteria: PR exists on GitHub; CI passes; all 10 tasks committed
    - Verify: gh pr view --json state

## Execution Order

P1-T1 → P1-T2 → P2-T1 → P3-T1 | P3-T2 | P3-T3 → P4-T1 → P5-T1 → P6-T1 | P6-T2 → P7-T1

## Skipped Gaps (already wired — verified during audit)

- Gap 7: CerealBoxTarget mounted in BlowoutStation.tsx line 280
- Gap 9: nextRound() resets StationGameplayTrait in hooks.ts line 354
- Gap 13: TV reads mrSausageReaction, GameOrchestrator sets it from deduction results
