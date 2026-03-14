# Native-First Pivot — Design Spec

**Date:** 2026-03-13
**Status:** Approved (rev 2 — post-review fixes)
**Branch:** feat/greenfield-complete

## Problem Statement

The web platform is a minefield for this game. Rapier WASM race conditions crash the Canvas before physics initialize. `@use-gesture/react` crashes on R3F web elements via `Object.entries(null)`. SharedArrayBuffer requires COI service workers and COEP/COOP headers. Pointer lock fails in headless Chrome. Every browser workaround introduces new breakage.

Meanwhile, the game's identity — first-person horror with physical station interactions — maps naturally to native mobile. The entire rendering stack (`react-native-wgpu` → Metal/Vulkan → Three.js WebGPU) already exists and bypasses every web issue.

## Decision

**Drop web. Go native-first. Eliminate WASM where possible.**

- Primary targets: iOS and Android via Expo
- Renderer: R3F + Three.js WebGPU via `react-native-wgpu` (Metal/Vulkan)
- Physics: **Keep `@react-three/rapier`** — test on native first (the WASM race was browser-specific). If it fails on native, fall back to manual collision detection.
- Database: `op-sqlite` + `drizzle-orm/op-sqlite` (native SQLite, no WASM)
- Audio: `expo-audio` (native, full rewrite of AudioEngine.ts — `AudioContext` does not exist in RN runtime)
- UI: React Native Reusables (worklet-based components for pre-game screens only)
- Testing: Maestro YAML flows (native + web via same framework)
- Web: abandoned as a target. Demo at best.

## Architecture

### Data Flow
```
JSON config → Koota ECS → op-sqlite (persistence) → @react-three/rapier (physics) → R3F scene
```

### WASM Status

| Layer | Before | After | WASM? |
|-------|--------|-------|-------|
| Physics | `@react-three/rapier` (browser WASM race) | `@react-three/rapier` (test on native — WASM loads cleanly without browser suspend-react race) | Yes but stable on native |
| SQLite | `expo-sqlite` + WASM fallback + COI service worker | `op-sqlite` (embedded native C++ SQLite) | No |
| Drizzle | `drizzle-orm/expo-sqlite` | `drizzle-orm/op-sqlite` | No |
| Renderer | Three.js WebGL in browser | Three.js WebGPU via `react-native-wgpu` (Metal/Vulkan) | No |
| Audio | `AudioEngine.ts` (Web Audio API `AudioContext` — broken on native) + `AudioEngine.web.ts` (Tone.js) | `expo-audio` native (full rewrite) | No |

### Rendering: Total Immersion

**ZERO 2D overlays during gameplay.** Once the player enters the kitchen:
- All game feedback rendered as 3D blood-text on kitchen surfaces via SurrealText
- Mr. Sausage's dialogue → blood letters on back wall, melt/drip off
- Dialogue choices → tappable 3D text on wall near player
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
- `TouchLookZone.tsx` — right-side look zone with dead zones (needs porting from grovekeeper)
- No visible joystick. No on-screen controls. Player sees only the kitchen and their hands.

### Station Interaction Model (post `@use-gesture/react` removal)

5 stations use `useDrag` from `@use-gesture/react` for manipulation: Grinder (plunger drag), Stuffer (crank drag, casing drag), Stove (pan drag, dial drags), ChoppingBlock (swipe), PhysicsFreezerChest (ingredient drag).

**Replacement:** R3F native pointer events (`onPointerDown`/`onPointerMove`/`onPointerUp`) with `useRef`-based drag tracking. This pattern was already prototyped in this branch (commits `b429d84`, `581b248`) and works on both web and native R3F. Each station gets:
- `onPointerDown` → set dragging ref, capture start position
- `onPointerMove` → compute delta from start, apply to game state
- `onPointerUp` / `onPointerLeave` → release drag

On mobile, these map to touch events via R3F's event system. The InputManager's dual-zone touch handles locomotion/look; station interactions are localized pointer events on the station mesh itself — no conflict.

## Dependency Changes

### DELETE
```
@dimforge/rapier3d-compat       # Direct WASM import (Sausage.tsx bypasses R3F context)
@use-gesture/react              # Crashes on R3F web, replaced by R3F pointer events
expo-sqlite                     # Replace with op-sqlite
expo-gl                         # WebGL fallback, not needed with WGPU
@playwright/test                # Replace with Maestro
@playwright/experimental-ct-react
tone                            # Browser-only Tone.js audio
zustand                         # Already replaced by Koota ECS (still in package.json)
miniplex                        # Old ECS, replaced by Koota
miniplex-react                  # Old ECS React bindings
```

### ADD
```
@op-engineering/op-sqlite       # Native SQLite (no WASM)
babel-plugin-inline-import      # Bundle .sql migration files for op-sqlite
```

### KEEP (critical — test on native before considering removal)
```
@react-three/rapier             # WASM physics — test if race condition is browser-only
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

### UPDATE
```
drizzle-orm                     # Keep — change import to drizzle-orm/op-sqlite
drizzle-kit                     # Keep — change dialect config
```

## File Changes

### Entire directories to delete
```
e2e/                            # Playwright → replaced by .maestro/
```

### Files to delete in Phase 1
```
playwright.config.ts
public/coi-serviceworker.js
src/engine/AudioEngine.web.ts
src/engine/assetUrl.ts
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
```

### Files to delete in Phase 4 (AFTER SurrealText dialogue replacement is built)
```
src/components/ui/DialogueOverlay.tsx
src/components/challenges/TieGesture.tsx
```

**NOTE:** DialogueOverlay.tsx is actively imported in App.tsx for intro dialogue and verdict. It MUST NOT be deleted until SurrealText has been extended to handle Mr. Sausage's dialogue lines, branching choices (as tappable 3D text), and the tie casing interaction has been rebuilt as a 3D interaction.

### Files to gut/rewrite
```
metro.config.js                 # Remove COEP/COOP middleware, add 'sql' to sourceExts for op-sqlite
babel.config.js                 # Add babel-plugin-inline-import for .sql files
App.tsx                         # Remove useDrag stations' gesture code, remove DialogueOverlay (Phase 4)
db/client.ts                    # Rewrite for op-sqlite with useMigrations from drizzle-orm/op-sqlite/migrator
db/drizzleQueries.ts            # Remove try/catch getDb() browser error handling (native just works)
drizzle.config.ts               # Change driver to op-sqlite, run drizzle-kit generate for migrations
app.json                        # Remove web config (output, baseUrl)
src/engine/AudioEngine.ts       # FULL REWRITE with expo-audio (AudioContext does not exist in RN runtime)
src/components/sausage/Sausage.tsx  # Remove require('@dimforge/rapier3d-compat') — use useRapier() context instead
```

### What remains in src/components/ui/
```
TitleScreen.tsx                 # Rebuild with React Native Reusables (pre-game)
DifficultySelector.tsx          # Rebuild with React Native Reusables (pre-game)
DialogueOverlay.tsx             # Kept until Phase 4 replacement is built
```

## All Files Using Rapier (19 total)

Keep `@react-three/rapier` — but fix `Sausage.tsx` which bypasses the R3F context:

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
15. `src/components/environment/Prop.tsx` — RigidBody
16. `src/components/kitchen/KitchenSetPieces.tsx` — RigidBody
17. `src/components/kitchen/TrapDoorMount.tsx` — RigidBody
18. `src/components/kitchen/ProceduralIngredients.tsx` — RigidBody
19. **`src/components/sausage/Sausage.tsx`** — **SPECIAL CASE:** uses `require('@dimforge/rapier3d-compat')` directly, bypassing the R3F Physics context. Must rewrite to use `useRapier()` hook from `@react-three/rapier` instead.

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
SurrealText renders game state as 3D text on surfaces. For Maestro to detect this content, the SurrealText component must set `accessibilityLabel` on a wrapper `<View>` that overlays the Canvas region. **This is an assumption that needs early validation** — R3F Canvas content (troika-three-text) does not participate in the React Native accessibility tree. Fallback: Maestro `screenshot` + visual comparison, or expose game state via a hidden testID element.

### Key Maestro commands for this game
- `tapOn` — station interactions, menu buttons
- `swipe` — drag gestures (grinder plunger, stove dials)
- `assertVisible` — verify SurrealText content (via accessibility bridge or hidden test element)
- `longPress` — hold-to-blow mechanic
- `screenshot` — visual regression at each phase

## Execution Phases

### Phase 0: Validate physics on native
1. `npx expo run:ios` with current `@react-three/rapier` code
2. Verify Rapier WASM initializes without the browser race condition
3. If it works → keep `@react-three/rapier`, only fix `Sausage.tsx` direct require
4. **If it fails → FULL PIVOT to react-native-filament (Margelo)**
   - `react-native-filament` is Google's Filament engine with React Native bindings
   - It includes its own physics (Bullet), PBR rendering, and GLB loading
   - This means rewriting ALL R3F station components to Filament's `<Model>`, `<Light>`, `<Camera>` API
   - It is a major rewrite but is the ONLY viable native 3D option if R3F+Rapier fails
   - See: https://github.com/margelo/react-native-filament
   - If this path is taken, a NEW design spec must be written for the Filament migration
5. **This gates all subsequent phases.** Do not proceed until physics is confirmed.

### Phase 1: Chainsaw (delete + swap deps)
1. Delete all Phase 1 files listed above (NOT DialogueOverlay or TieGesture)
2. `pnpm remove @dimforge/rapier3d-compat @use-gesture/react expo-sqlite expo-gl @playwright/test @playwright/experimental-ct-react tone zustand miniplex miniplex-react`
3. `pnpm add @op-engineering/op-sqlite babel-plugin-inline-import`
4. Rewrite `db/client.ts` for op-sqlite using `open` from `@op-engineering/op-sqlite`
5. Update `babel.config.js` with inline-import plugin for `.sql` files
6. Update `metro.config.js`: remove COEP/COOP middleware, add `sql` to sourceExts
7. Run `drizzle-kit generate` to produce migration SQL files
8. Update `drizzle.config.ts` for op-sqlite dialect
9. Strip `app.json` of web config
10. Fix `Sausage.tsx`: replace `require('@dimforge/rapier3d-compat')` with `useRapier()` context
11. Replace all `useDrag` in 5 station components with R3F pointer event handlers
12. Verify: `pnpm typecheck` — expect errors from deleted UI component imports in App.tsx (clean those up)

### Phase 2: Native audio (expo-audio)
1. FULL REWRITE of `src/engine/AudioEngine.ts` using `expo-audio` API
   - `AudioContext` does not exist in React Native — the current 300-line Web Audio synth is entirely broken on native
   - Load OGG files from assets via `expo-asset` + `expo-audio` `Sound.createAsync()`
   - Map 14 sound IDs to expo-audio playback
   - Wire all 45 OGG samples
2. Delete `src/engine/AudioEngine.web.ts` (already done in Phase 1)
3. Verify: audio plays on iOS simulator

### Phase 3: UI with React Native Reusables
1. Port `TouchLookZone.tsx` from grovekeeper (invisible mobile controls)
2. Rebuild `TitleScreen.tsx` with Reusables components
3. Rebuild `DifficultySelector.tsx` with Reusables
4. Verify: title → difficulty → game flow works on device

### Phase 4: Diegetic dialogue (replace DialogueOverlay)
1. Extend SurrealText to render Mr. Sausage's dialogue lines as blood text on walls
2. Implement tappable 3D text for dialogue choices
3. Implement 3D tie-casing interaction (replace TieGesture 2D overlay)
4. Delete `DialogueOverlay.tsx` and `TieGesture.tsx`
5. Update App.tsx to remove DialogueOverlay imports
6. Verify: full intro dialogue plays diegetically, choices work via 3D tap

### Phase 5: Maestro E2E
1. Create `.maestro/` directory with config
2. Write all 12 YAML flow files
3. Validate Maestro can detect SurrealText content (accessibility bridge test)
4. If Canvas text isn't accessible, add hidden `testID` state mirror
5. Add to EAS Workflows CI
6. Verify: `maestro test` passes on simulator

### Phase 6: Device playtest
1. `npx expo run:ios` on real device
2. Full round: walk kitchen → freezer → chop → grind → stuff → tie → cook → verdict
3. Fix whatever breaks
4. Record gameplay video

## Success Criteria

- [ ] Game runs on iOS simulator via `npx expo run:ios`
- [ ] @react-three/rapier physics works on native (no WASM race)
- [ ] op-sqlite persists session data between app launches
- [ ] Player walks around kitchen with invisible touch controls
- [ ] All 9 stations interactive via R3F pointer events
- [ ] Audio plays via expo-audio (OGG samples)
- [ ] SurrealText shows all feedback diegetically (no 2D overlays in kitchen)
- [ ] Mr. Sausage dialogue appears as blood text on walls with tappable choices
- [ ] Maestro flows pass for full round
- [ ] 60fps on iPhone 14 / Pixel 7
