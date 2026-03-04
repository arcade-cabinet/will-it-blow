# System Patterns — Will It Blow?

## Two-Layer Rendering

The app has two rendering layers that never directly communicate:

```
Layer 2: React Native UI Overlays    <- Buttons, progress bars, dialogue, challenges
Layer 1: React Three Fiber Canvas    <- Kitchen GLB, stations, lighting, Mr. Sausage
Root:    SafeAreaView (React Native)  <- Container, background (#0a0a0a)
```

- Layer 1 is the R3F `<Canvas>` with `WebGPURenderer` — renders 3D kitchen, station meshes, CRT TV
- Layer 2 is React Native views with `pointerEvents="box-none"` floating above the 3D scene
- Both layers subscribe independently to the Zustand store — no direct communication between them

## Challenge Component Pattern (Post-Phase 1)

Challenges follow two patterns depending on the station:

### ECS Orchestrator Pattern (Grinding, Stuffing, Cooking)

```
challenge = ECS orchestrator (ecs/orchestrators/) + thin HUD (challenges/) + dialogue (data/dialogue/)
```

- **Orchestrator** (R3F, in 3D Canvas) OWNS all game logic: phase machine, scoring, strikes, timers, audio, reactions
- **Orchestrator** reads ECS input state (crank velocity, dial power, toggle state) and writes to Zustand store
- **Thin HUD** (React Native) is pure read-only — subscribes to Zustand and displays values (timer, progress, zones)
- **Dialogue** phase: orchestrator sets `challengePhase='dialogue'`, HUD renders DialogueOverlay, HUD calls `setChallengePhase('active')` on dialogue completion
- Data flow: 3D input → ECS system → orchestrator → Zustand → HUD display
- **ZERO input handling in HUD components**

Files: `src/ecs/orchestrators/*Orchestrator.tsx` + `src/components/challenges/*HUD.tsx` + `src/data/dialogue/*.ts`

### Bridge Pattern (Ingredients, Tasting)

```
challenge = overlay (challenges/) + 3D station (kitchen/) + dialogue (data/dialogue/)
```

- **Overlay** (React Native) owns scoring logic and writes to store
- **3D Station** (R3F) handles visual interaction (fridge clicks, sausage display)
- Coordinate through Zustand store (no direct communication)

Files: `src/components/challenges/*.tsx` + `src/components/kitchen/*Station.tsx` + `src/data/dialogue/*.ts`

## Fridge Bridge Pattern

Special case for the ingredient challenge where 3D mesh clicks must reach the 2D overlay:

1. Player clicks ingredient mesh in 3D FridgeStation
2. FridgeStation calls `triggerFridgeClick(index)` on the store
3. IngredientChallenge overlay watches `pendingFridgeClick` via `useEffect`
4. Overlay processes scoring logic, then calls `clearFridgeClick()`

This avoids direct 3D-to-2D communication while keeping click handling responsive.

Store fields: `pendingFridgeClick`, `triggerFridgeClick(index)`, `clearFridgeClick()`

## State Machine

Two separate state fields manage lifecycle:

- `appPhase`: `'menu'` | `'loading'` | `'playing'` — controls which top-level component renders
- `gameStatus`: `'menu'` | `'playing'` | `'victory'` | `'defeat'` — in-game state

```
menu → loading → playing (challenge 0→1→2→3→4→5→6) → victory/defeat → menu
```

`currentChallenge` (0-6) tracks progression through the 7 challenges. See `src/store/gameStore.ts`.

## Target-Based Placement

All furniture, stations, triggers, and waypoints reference named targets — never hardcoded coordinates.

- `resolveLayout()` (from `src/engine/layout/`) computes positions from room dimensions and JSON config
- `FURNITURE_RULES` maps furniture pieces to target names
- If room dimensions change, everything follows automatically

Source: `src/engine/FurnitureLayout.ts`

## FPS Controller

- `FPSController.tsx` — WASD/arrow keys + pointer-lock mouse look for desktop
- `MobileJoystick.tsx` — Touch controls for mobile
- `SwipeFPSControls.tsx` — Dual-zone touch controls: left half = movement stick, right half = look/interact swipe
- Station triggers: Rapier physics sensors on web (`PlayerBody` + `StationSensor` colliders), manual proximity check on native (`ManualProximityTrigger`)
- Camera: initial yaw=Math.PI (facing -Z = CRT TV), y=1.6 (eye height), walk speed 3.0, mouse sensitivity 0.002
- Position clamped to room AABB with 0.5 unit margin
- **NOTE:** No `CameraWalker.tsx` exists — navigation is purely FPS free-walk, not waypoint-based

Source: `src/components/controls/`

## Rapier Sensor Pattern

Rapier `StationSensor` colliders using `KINEMATIC_FIXED` body type require a special bitmask for collision detection:

```jsx
<CuboidCollider
  sensor
  activeCollisionTypes={15 | 8704}  // KINEMATIC_FIXED bitmask
  onIntersectionEnter={...}
  onIntersectionExit={...}
/>
```

Without `activeCollisionTypes={15 | 8704}`, sensors attached to `KINEMATIC_FIXED` bodies silently fail to detect intersections. This affects all station proximity triggers.

## Code Splitting

`App.tsx` uses `React.lazy()` + `Suspense` at phase boundaries:

| Category | Loading | Size |
|----------|---------|------|
| **Static** (initial bundle) | TitleScreen, LoadingScreen | ~1.2 MB |
| **Lazy** (on demand) | GameWorld, 5 challenges, GameOverScreen | ~4.6 MB (GameWorld chunk) |
| **Prefetched** | GameWorld + first challenge during loading phase | Cached before transition |

Metro splits production build into 17 separate JS files.

## R3F Component Conventions

- Declarative JSX: `<mesh><boxGeometry /><meshStandardMaterial /></mesh>`
- Per-frame animation: `useFrame((state, delta) => { ... })` — NOT imperative render loops
- Camera/scene access: `useThree()` hook
- Mutable state in render loops: `useRef<THREE.Mesh>(null)` (avoids stale closures)
- Self-lit materials: `<meshBasicMaterial color="..." />` (unlit, always visible)
- PBR materials: `<meshStandardMaterial map={...} normalMap={...} roughnessMap={...} />`
- GLB loading: `useGLTF('/models/<segment>.glb')` from `@react-three/drei`
- Mesh picking: `onClick` prop directly on `<mesh>` elements

## Asset URL Resolution

Dynamic asset URLs (GLB, textures) use `getWebBasePath()` from `src/engine/assetUrl.ts`. This derives the base path from `<script src>` tags at runtime, handling the GitHub Pages `/will-it-blow/` prefix correctly. Expo's `experiments.baseUrl` prefixes JS/CSS but does NOT inject a `<base>` tag.

## Variant System

Each playthrough generates a `variantSeed` (Date.now()) that deterministically selects challenge parameters:

- 6 ingredient variants (different tag criteria)
- 3 grinding variants (speed tolerances, timer lengths)
- 3 stuffing variants (fill/pressure rates)
- 3 cooking variants (target temperatures, tolerances)

Selection: `(seed * 2654435761) >>> 0 % arrayLength`

Source: `src/engine/ChallengeRegistry.ts`, `src/data/challenges/variants.ts`

## Input Abstraction

Engine-agnostic input through:
- `InputManager` — Universal input with JSON bindings, keyboard/mouse/gamepad/touch normalization
- `InputActions.ts` — Unified input action system
- `HapticService.ts` — Haptic feedback abstraction

These decouple game logic from specific input implementations.
