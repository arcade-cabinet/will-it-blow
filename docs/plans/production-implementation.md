---
title: Production Implementation Plan
domain: core
status: active
last-verified: 2026-03-13
summary: "Complete plan to take the POC to production. No Zustand. No 2D HUD. Grovekeeper input system. Diegetic everything."
---

# Production Implementation Plan

## Architecture

```
JSON config (static) → Koota ECS (runtime) → expo-sqlite (persistence)
```

No Zustand. Components read/write Koota directly via useTrait/useQuery/actions.

## Subpackages

### `src/input/` — Player Input (PORT FROM GROVEKEEPER)
Source: `../grovekeeper/game/input/`

| File | Lines | Purpose |
|------|-------|---------|
| `InputManager.ts` | 145 | Unified polling, merges providers into InputFrame per tick |
| `KeyboardMouseProvider.ts` | 113 | WASD + pointer lock mouse look + Space/E/Shift |
| `TouchProvider.ts` | 178 | Mobile touch input |
| `GamepadProvider.ts` | 148 | Gamepad support |

Adapt: Remove tool swap/select (not applicable). Add station-interact action.

### `src/player/` — Player Body & Camera (PORT FROM GROVEKEEPER)
Source: `../grovekeeper/components/player/`, `../grovekeeper/game/hooks/`

| File | Lines | Purpose |
|------|-------|---------|
| `PlayerCapsule.tsx` | 87 | Rapier dynamic RigidBody, capsule collider, ECS position sync |
| `FPSCamera.tsx` | 77 | Eye height camera, head bob, reads ECS player position |
| `useMouseLook.ts` | 105 | Pointer lock, yaw/pitch, pitch clamp, YXZ rotation |
| `usePhysicsMovement.ts` | 85 | Camera-relative WASD velocity on Rapier body |
| `useJump.ts` | 80 | Jump with ground detection |
| `PlayerHands.tsx` | 106 | EXISTING — first-person hands following camera |

Adapt: PlayerCapsule spawn position for kitchen. Remove ECS world dependency (use Koota).

### `src/feedback/` — Diegetic Feedback (EXTEND EXISTING)
Source: `src/components/environment/SurrealText.tsx` (201 lines)

The SurrealText system is the HUD. Extend to:
- Render on ANY positioned surface (walls, counters, floor, ceiling)
- Show strikes as scratches/marks on the nearest counter
- Show scores dripping down walls
- Show phase names burned into surfaces
- Show demands (WANTS/HATES) on the wall near the freezer
- Show round info on the ceiling

NO React Native View overlays for game state. Zero.

### `src/stations/` — Kitchen Stations (EXISTING, REFACTOR)
9 station components. Currently read/write Zustand. Refactor to read/write Koota traits.

Each station is self-contained: geometry + interaction + audio + feedback.

### `src/kitchen/` — Environment (EXISTING)
BasementRoom, KitchenSetPieces, ScatterProps, Props, TrapDoorAnimation.
These stay as-is. They're scene dressing.

### `src/sausage/` — Sausage Physics (EXISTING)
Sausage.tsx + SausageGeometry.ts. Rapier bone-chain.
Refactor RAPIER require to use Koota/Physics context.

### `src/characters/` — Mr. Sausage (EXISTING)
MrSausage3D.tsx (540 lines) + reactions.ts.
Refactor to read reaction from Koota trait instead of Zustand.

### `src/dialogue/` — Dialogue System (EXISTING)
DialogueEngine.ts + dialogue data files + DialogueOverlay.tsx.
DialogueOverlay is the ONE acceptable 2D element — it's Mr. Sausage's voice.
Refactor to read/write Koota traits for effect tracking.

### `src/audio/` — Audio System (REPLACE WITH GROVEKEEPER)
Source: `../grovekeeper/game/systems/`

| File | Lines | Purpose |
|------|-------|---------|
| `AudioManager.ts` | 389 | Web Audio API procedural SFX (no files needed) |
| `audioEngine.ts` | 123 | Tone.js foundation, Panner3D pool for spatial audio |
| `ambientAudio.ts` | 183 | 6-layer ambient synthesis |

Plus 45 OGG files in `public/audio/` for sampled SFX and music tracks.

### `src/engine/` — Game Logic (EXISTING)
Pure functions. No state. No React.
- ChallengeRegistry, SausagePhysics, DemandScoring
- IngredientMatcher, Ingredients, RoundManager
- DifficultyConfig, GameOrchestrator (phase machine)

### `src/ecs/` — Koota ECS (EXISTING, EXPAND)
traits.ts (13 traits), kootaWorld.ts, queries.ts, actions.ts.
This becomes the ONLY runtime state. Expand to cover everything currently in gameStore.ts.

### `src/config/` — Static Configuration (EXISTING)
16 JSON files + 8 TypeScript accessors.

### `src/db/` — Persistence (EXISTING)
schema.ts (Drizzle), client.ts (expo-sqlite), drizzleQueries.ts.
Hydrates Koota world on load. Persists on save.

## Execution Order

### Phase 1: Port Grovekeeper Input System
1. Copy InputManager, KeyboardMouseProvider, TouchProvider to src/input/
2. Adapt for will-it-blow (remove tool swap, add station interact)
3. Replace FirstPersonControls.tsx with grovekeeper's FPSCamera + PlayerCapsule + useMouseLook + usePhysicsMovement
4. Delete CameraRail.tsx (not the game — player walks freely)
5. Keep IntroSequence.tsx (blink/wake-up) but transition to FPSCamera not FirstPersonControls
6. Test: player can walk around kitchen, look with mouse, see hands

### Phase 2: Delete Zustand, Wire Koota
1. Expand Koota traits to cover ALL gameStore fields (appPhase, gamePhase, scores, demands, ingredients, posture, etc.)
2. Rewrite App.tsx to read appPhase from Koota
3. Rewrite each station to read/write Koota instead of useGameStore
4. Rewrite SurrealText to read from Koota
5. Rewrite GameOrchestrator to use Koota
6. Rewrite MrSausage3D to read reaction from Koota
7. Delete src/store/gameStore.ts
8. Test: full game loop works with Koota only

### Phase 3: Extend Diegetic Feedback
1. Extend SurrealText to accept surface positions (not just ceiling/wall)
2. Add strike marks on counter surfaces
3. Add score reveals dripping on walls
4. Add demand hints near freezer
5. Test: player gets all feedback from the environment

### Phase 4: Wire Audio Properly
1. Port grovekeeper AudioManager to src/audio/
2. Map SFX to station interactions (chop→chop_N.ogg, grind→synth, sizzle→sizzle_N.ogg)
3. Wire phase-specific music tracks
4. Wire ambient horror drone
5. Test: all interactions have audio, music changes per phase

### Phase 5: Persistence
1. Wire expo-sqlite hydration on app load → Koota world
2. Wire save on round complete → expo-sqlite
3. Wire settings persistence
4. Test: close and reopen → game state preserved

### Phase 6: Polish & E2E
1. Real playtest: walk around kitchen, open freezer, pick ingredients, chop, grind, stuff, tie, cook, get verdict
2. Fix whatever breaks
3. E2E Playwright test that does the above programmatically
