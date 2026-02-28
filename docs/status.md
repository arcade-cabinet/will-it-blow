# Project Status & Remaining Work

**Last updated:** 2026-02-28

## Completion Status

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 85% | All 5 challenges playable end-to-end |
| 3D visuals | 60% | Horror kitchen with PBR textures, but stations use procedural boxes over GLB |
| Audio (web) | 40% | Procedural synth SFX work, no ambient/music, no sample-based SFX |
| Audio (native) | 0% | Complete no-op stub |
| UI/UX | 65% | Menu/loading/overlays work; hints/settings/continue are stubs |
| Cross-platform | 45% | Web works well; native untested, stub audio |
| Testing | 85% | 172 unit tests + 10 Playwright e2e tests with screenshot capture |
| Git hygiene | 30% | Large uncommitted changes, assets not committed |
| CI/CD | 50% | Tests run; no tsc, no lint, no Android build |
| Production readiness | 25% | No save/load, no settings, no mobile testing |

## What Works

- Full game loop: menu → loading → 5 challenges → results → menu
- All 5 challenge mechanics with scoring
- Horror kitchen environment with PBR textures (IBL + AmbientCG bakes)
- Procedural MrSausage3D character with 9 reaction animations
- CRT television with chromatic aberration shader
- Fluorescent tube flicker animation
- Butcher shop menu screen
- Loading screen with asset preload
- Camera walk animations between stations
- Zustand state management with full reset/progression flow
- Web audio synthesis (7 SFX instruments + 2 melodies)
- Dialogue system with typewriter text and branching choices
- Variant system for replayability (seeded challenge difficulty)
- 172 passing tests
- GitHub Pages deployment

## Untracked Assets (not in git)

- `public/models/kitchen.glb` (15.5 MB) — **Required for game to render**. Consider Git LFS.
- `public/models/kitchen-original.glb` (970 KB)
- `public/models/sausage.glb` (1 MB)
- `public/textures/` (19 texture files, ~10 MB total)

**Large files to NOT commit:**
- `Kitchen Sound Effects.zip` (27 MB)
- `KitchenTools.zip` (55 MB)
- `cocina.glb` (6.1 MB)
- `fbxfileskitchenbystyloo.zip` (3.5 MB)
- `funny sausag.obj` (4.1 MB)

## Parallel Feature Branch

**`feat/3d-fridge-selection`** (in `.worktrees/3d-fridge/`) has 5 commits:
- 3D refrigerator selection scene with Kenney food models
- Transparent selection overlay
- Wired into game flow (replaced old 2D ingredient grid)
- Removed redundant 2D sausage visuals
- Fixed pointer event handling

This work is NOT merged and may conflict with the main branch's FridgeStation changes.

## Remaining Work (Prioritized)

### Priority 1: Ship What Exists

1. **Commit `public/` assets** — The game literally doesn't render without these. Consider Git LFS for kitchen.glb (15.5 MB).
2. **Add `.gitignore` entries** for loose zip files and asset packs.
3. **Fix CI** — Add `npx tsc --noEmit` and lint steps to ci.yml.

### Priority 2: Complete Core Features

4. **Hint system** — Wire HintButton to trigger ingredient glow in FridgeStation. The `hintActive` prop exists but the button is only shown when NO challenge is active (bug in App.tsx line 43-48).
5. **Ingredient challenge audio** — No sound on correct/wrong pick. Add `playCountdownBeep()` on correct, a short low tone on wrong.
6. **Reconcile 3d-fridge worktree** — Decide whether to merge the Kenney food model 3D selection or keep the current procedural approach.

### Priority 3: Polish & Production

7. **BUT FIRST events** — Design referenced in docs, scoring formula accounts for bonus points. Need to implement mid-challenge interruption mechanic.
8. **Settings menu** — Volume control, mute toggle, maybe difficulty selection.
9. **Save/load** — Persist `totalGamesPlayed` and high scores to AsyncStorage/localStorage.
10. **Background music** — Ambient horror drone or dark synth loop.
11. **Ambient SFX** — Fridge hum, dripping water, distant clanking, flickering light buzz.
12. **Integrate Kitchen Sound Effects.zip** — Replace or supplement synth SFX with recorded samples.

### Priority 4: Cross-Platform

13. **Native audio engine** — Implement `AudioEngine.ts` using `expo-av` or `react-native-audio-api`.
14. **Mobile testing** — Verify touch interactions, layout scaling, performance on actual devices.
15. **Android APK build** — Set up in CI (currently documented but not implemented).

### Priority 5: Visual Polish

16. **Remove duplicate fridge geometry** — Either remove FridgeStation's procedural box and use the GLB fridge directly, or remove the GLB fridge mesh. Currently both render (procedural occludes GLB).
17. **Other station polish** — Grinder, stuffer, stove stations may have similar procedural-vs-GLB issues.
18. **Mobile viewport scaling** — Verify 375×667 (iPhone SE) and tablet layouts work.

### Priority 6: Nice-to-Have

19. **Leaderboard** — Local or cloud-based high score tracking.
20. **More ingredients** — Expand from 25 to 50+ for variety.
21. **More variants** — Additional challenge difficulty configs.
22. **Achievements** — "First S Rank", "Complete without hints", etc.

## Architecture Decisions Still Open

1. **Procedural stations vs GLB model:** The current stations create boxes at the same position as GLB model meshes. Should we remove the procedural geometry and interact with the GLB meshes directly? Or remove the GLB station meshes and keep only procedural? The GLB has proper PBR textures but no interactivity; the procedural meshes have interactivity but flat StandardMaterial colors.

2. **3d-fridge branch:** The worktree branch uses Kenney food models (external GLB) for ingredients instead of procedural shapes. This is a significant visual upgrade but adds asset dependencies. Merge or abandon?

3. **Audio strategy:** Continue with pure Tone.js synthesis, switch to sample-based audio from the downloaded pack, or hybrid? Synthesis keeps bundle small but sounds synthetic. Samples sound better but add MB.

4. **Native priority:** Is iOS/Android actually a shipping target, or is web-only sufficient for this project?
