# Native-First Pivot — Design Spec

**Date:** 2026-03-13
**Status:** Approved
**Branch:** feat/greenfield-complete

## Problem Statement

The web platform is a minefield for this game. Rapier WASM race conditions crash the Canvas before physics initialize. `@use-gesture/react` crashes on R3F web elements via `Object.entries(null)`. SharedArrayBuffer requires COI service workers and COEP/COOP headers. Pointer lock fails in headless Chrome. Every browser workaround introduces new breakage.

Meanwhile, the game's identity — first-person horror with physical station interactions — maps naturally to native mobile. The entire rendering stack (`react-native-wgpu` → Metal/Vulkan → Three.js WebGPU) already exists and bypasses every web issue.

## Decision

**Drop web. Go native-first. Eliminate all WASM.**

- Primary targets: iOS and Android via Expo
- Renderer: R3F + Three.js WebGPU via `react-native-wgpu` (Metal/Vulkan)
- Physics: `react-native-rapier` (native Rapier bindings, no WASM)
- Database: `op-sqlite` + `drizzle-orm/op-sqlite` (native SQLite, no WASM)
- Audio: `expo-audio` (native, replaces Tone.js browser audio)
- UI: React Native Reusables (worklet-based components)
- Testing: Maestro YAML flows (native + web via same framework)
- Web: abandoned as a target. Demo at best.

## Architecture

### Data Flow (unchanged)
```
JSON config → Koota ECS → op-sqlite (persistence) → react-native-rapier (physics) → R3F scene
```

### WASM Elimination

| Layer | Before (WASM) | After (Native) |
|-------|---------------|----------------|
| Physics | `@dimforge/rapier3d-compat` + `@react-three/rapier` | `react-native-rapier` |
| SQLite | `expo-sqlite` + WASM fallback + COI service worker | `op-sqlite` (embedded native) |
| Drizzle | `drizzle-orm/expo-sqlite` | `drizzle-orm/op-sqlite` |
| Renderer | Three.js WebGL in browser | Three.js WebGPU via `react-native-wgpu` |
| Audio | Tone.js (Web Audio API) | `expo-audio` (native) |

Zero WASM in the final stack.

### Rendering: Total Immersion

**ZERO 2D overlays during gameplay.** Once the player enters the kitchen:
- All game feedback rendered as 3D blood-text on kitchen surfaces via SurrealText
- Mr. Sausage's dialogue → blood letters on back wall, melt/drip off
- Dialogue choices → tappable 3D text on wall
- Phase instructions → ceiling text
- Strike marks → counter scratches
- Scores → drip down walls
- Demands → freezer wall
- Verdict rank → huge on far wall
- No joystick graphics, no HUD bars, no overlay panels

**Pre-game screens only (before Canvas mounts):**
- TitleScreen → React Native Reusables
- DifficultySelector → React Native Reusables

### Mobile FPS Controls (invisible)

Ported from grovekeeper's battle-tested input system:
- `InputManager.ts` — unified polling, merges providers per-frame
- `KeyboardMouseProvider.ts` — desktop: WASD + pointer lock mouse look
- `TouchProvider.ts` — mobile: invisible dual-zone touch (left=move, right=look)
- `TouchLookZone.tsx` — right-side look zone with dead zones (needs porting)
- No visible joystick. No on-screen controls. Player sees only the kitchen and their hands.

## Dependency Changes

### DELETE
```
@dimforge/rapier3d-compat       # WASM Rapier
@react-three/rapier             # WASM R3F physics wrapper
@use-gesture/react              # Crashes on R3F web
expo-sqlite                     # Replace with op-sqlite
expo-gl                         # WebGL fallback, not needed with WGPU
@playwright/test                # Replace with Maestro
@playwright/experimental-ct-react
tone                            # Browser-only Tone.js audio
```

### ADD
```
react-native-rapier             # Native Rapier bindings (Callstack)
@op-engineering/op-sqlite       # Native SQLite
```

### UPDATE
```
drizzle-orm                     # Keep — change import to drizzle-orm/op-sqlite
drizzle-kit                     # Keep — change dialect config
```

### KEEP (already native-compatible)
```
@react-three/fiber              # R3F works on react-native-wgpu
@react-three/drei               # R3F helpers (subset works native)
react-native-wgpu               # THE renderer (Metal/Vulkan)
koota                           # Pure JS ECS
expo-audio                      # Native audio
expo-haptics                    # Native haptics
expo-asset                      # Asset loading
```

## File Deletions (The Chainsaw)

### Entire directories
```
e2e/                            # Playwright → replaced by .maestro/
```

### Files to delete
```
playwright.config.ts
public/coi-serviceworker.js
src/engine/AudioEngine.web.ts
src/engine/assetUrl.ts
src/components/ui/DialogueOverlay.tsx
src/components/ui/GameOverScreen.tsx
src/components/ui/LoadingScreen.tsx
src/components/ui/SettingsScreen.tsx
src/components/ui/ChallengeHeader.tsx
src/components/ui/StrikeCounter.tsx
src/components/ui/ProgressGauge.tsx
src/components/ui/RoundTransition.tsx
src/components/ui/GrindingHUD.tsx
src/components/ui/StuffingHUD.tsx
src/components/ui/CookingHUD.tsx
src/components/ui/BlowoutHUD.tsx
src/components/ui/IngredientChallenge.tsx
src/components/ui/TastingChallenge.tsx
src/components/controls/SwipeFPSControls.tsx
src/components/challenges/TieGesture.tsx
```

### Files to gut/rewrite
```
metro.config.js                 # Remove COEP/COOP middleware
App.tsx                         # Remove @react-three/rapier Physics, use react-native-rapier
db/client.ts                    # Rewrite for op-sqlite
db/drizzleQueries.ts            # Remove try/catch getDb() error handling
drizzle.config.ts               # Change driver to op-sqlite
app.json                        # Remove web config
src/engine/AudioEngine.ts       # Real expo-audio, not Web Audio API procedural synth
```

### What remains in src/components/ui/
```
TitleScreen.tsx                 # Rebuild with React Native Reusables (pre-game)
DifficultySelector.tsx          # Rebuild with React Native Reusables (pre-game)
```

## Files Using Rapier (migration targets)

All must migrate from `@react-three/rapier` to `react-native-rapier`:

1. `App.tsx` — `<Physics>` wrapper
2. `src/player/PlayerCapsule.tsx` — RigidBody, CapsuleCollider, useRapier()
3. `src/player/useJump.ts` — useRapier() for ground raycast
4. `src/player/usePhysicsMovement.ts` — RapierRigidBody type
5. `src/components/stations/Grinder.tsx` — RigidBody static colliders
6. `src/components/stations/Stuffer.tsx` — RigidBody
7. `src/components/stations/Stove.tsx` — RigidBody
8. `src/components/stations/ChoppingBlock.tsx` — RigidBody
9. `src/components/stations/BlowoutStation.tsx` — RigidBody
10. `src/components/stations/Sink.tsx` — RigidBody
11. `src/components/stations/PhysicsFreezerChest.tsx` — RigidBody + drag
12. `src/components/stations/TV.tsx` — RigidBody
13. `src/components/environment/BasementRoom.tsx` — RigidBody walls/floor
14. `src/components/environment/ScatterProps.tsx` — RigidBody
15. `src/components/sausage/Sausage.tsx` — manual Rapier body creation

## Maestro Test Strategy

### Directory structure
```
.maestro/
  config.yaml
  flows/
    01-title-screen.yaml
    02-difficulty.yaml
    03-intro-sequence.yaml
    04-walk-kitchen.yaml
    05-select-ingredients.yaml
    06-chopping.yaml
    07-grinding.yaml
    08-stuffing.yaml
    09-cooking.yaml
    10-blowout.yaml
    11-verdict.yaml
    12-full-round.yaml
```

### How 3D game state becomes testable
SurrealText renders game state as accessible text on 3D surfaces. Maestro's `assertVisible` detects this text via React Native accessibility labels. The diegetic feedback system IS the test hook — text on walls = assertable content.

### Key Maestro commands for this game
- `tapOn` — station interactions, menu buttons
- `swipe` — drag gestures (grinder plunger, stove dials)
- `assertVisible` — verify SurrealText content on surfaces
- `longPress` — hold-to-blow mechanic
- `screenshot` — visual regression at each phase

## Execution Phases

### Phase 1: Chainsaw (delete + swap deps)
1. Delete all listed files and directories
2. `pnpm remove` deleted packages
3. `pnpm add react-native-rapier @op-engineering/op-sqlite`
4. Rewrite `db/client.ts` for op-sqlite
5. Update `drizzle.config.ts`
6. Strip metro.config.js of browser workarounds
7. Strip app.json of web config
8. Verify: `pnpm typecheck` shows only Rapier import errors (expected)

### Phase 2: Physics migration (react-native-rapier)
1. Research react-native-rapier API surface
2. Create `src/physics/` wrapper module
3. Migrate all 15 files from @react-three/rapier → react-native-rapier
4. Migrate Sausage.tsx manual body creation
5. Migrate PlayerCapsule + useJump raycasting
6. Verify: `pnpm typecheck` clean, tests pass

### Phase 3: Native audio (expo-audio)
1. Rewrite AudioEngine.ts with real expo-audio implementation
2. Load OGG files from assets via expo-asset
3. Wire all 45 samples through expo-audio player
4. Keep procedural SFX via AudioContext where available
5. Verify: audio plays on simulator

### Phase 4: UI with React Native Reusables
1. Port TouchLookZone from grovekeeper (invisible mobile controls)
2. Rebuild TitleScreen with Reusables components
3. Rebuild DifficultySelector with Reusables
4. Extend SurrealText for dialogue (blood text + tappable choices)
5. Verify: title → difficulty → game flow works on device

### Phase 5: Maestro E2E
1. Create .maestro/ directory with config
2. Write all 12 YAML flow files
3. Add to EAS Workflows CI
4. Verify: `maestro test` passes on simulator

### Phase 6: Device playtest
1. `npx expo run:ios` on real device
2. Full round: walk kitchen → freezer → chop → grind → stuff → tie → cook → verdict
3. Fix whatever breaks
4. Record gameplay video

## Success Criteria

- [ ] Zero WASM dependencies
- [ ] Game runs on iOS simulator via `npx expo run:ios`
- [ ] Player walks around kitchen with invisible touch controls
- [ ] All 9 stations interactive with native physics
- [ ] Audio plays (OGG samples + procedural)
- [ ] SurrealText shows all feedback diegetically (no 2D overlays in kitchen)
- [ ] Dialogue appears as blood text on walls
- [ ] Maestro flows pass for full round
- [ ] op-sqlite persists session data between app launches
- [ ] 3D performance: 60fps on iPhone 14 / Pixel 7
