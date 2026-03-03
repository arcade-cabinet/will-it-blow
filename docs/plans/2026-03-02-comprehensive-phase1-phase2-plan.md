<!--
title: Comprehensive Phase 1 Completion + Phase 2 Implementation Plan
domain: plan
status: current
engine: r3f
last-verified: 2026-03-02
depends-on: [game-design, state-management, 3d-rendering, ecs, audio]
agent-context: scene-architect, challenge-dev, store-warden, asset-pipeline, doc-keeper
summary: Complete remaining Phase 1 gaps, then implement full Phase 2 — difficulty, multi-round, Will-It-Blow mechanic, hidden objects, enemy encounters, scene dressing
-->

# Comprehensive Plan: Phase 1 Completion + Phase 2 Full Implementation

**Branch:** `feat/sausage-factory-kitchen` → merge to `main` after Phase 1 completion
**Date:** 2026-03-02
**Test baseline:** 874 tests, 62 suites

---

## PHASE 1 COMPLETION — "Leave Nothing on the Table"

### Wave 0A: Fridge Pull Gesture
**Status:** Partially implemented — `fridgeDoorProgress` exists in store, `setFridgeDoorProgress` snaps at 0.7 threshold, but NO drag/pull gesture wired.

**Tasks:**
1. Add touch drag handler to FridgeStation.tsx — vertical swipe from handle maps to `setFridgeDoorProgress(0→1)`
2. Desktop: click-and-drag on fridge handle mesh, mousemove delta → progress
3. Use `useFrame` to animate fridge door rotation based on `fridgeDoorProgress` (0→90° on Y axis)
4. Auto-open fallback: if player is in proximity for 3s without pulling, auto-open (accessibility)
5. Test: drag gesture updates store, snap threshold triggers open

### Wave 0B: Ingredient GLB Models on Fridge Shelves
**Status:** Fridge uses procedural colored boxes. Design calls for GLB ingredient models on shelves.

**Tasks:**
1. Use existing Quaternius food GLBs from `/Volumes/home/assets/kitchen/models/food/` as GAMEPLAY TOKENS only (2D overlay icons stay as-is)
2. Place GLBs on 3 fridge shelves (4 per shelf = 12 total) at shelf positions from layout config
3. Highlight mesh on hover (emissive pulse via `useFrame`)
4. Selected ingredients dim/gray out
5. Copy needed food GLBs to `public/models/ingredients/` (tiny: 2-19KB each)

### Wave 0C: Chopping Station (Challenge 1)
**Status:** ChoppingStation exists in layout/furniture but challenge logic is minimal. `completeChallenge` handles challenge index 1.

**Tasks:**
1. Create `ChoppingOrchestrator.tsx` — ECS orchestrator for chopping challenge
2. Chopping mechanic: player uses SwipeAction (already exists) on cutting board mesh
3. Ingredients from bowl decompose into chunks (chunkColor, chunkScale from BlendCalculator)
4. Score based on: speed, uniformity of cuts, waste minimization
5. Create `ChoppingHUD.tsx` — thin HUD showing cut count, timer, chunk quality
6. Wire into challenge progression (challenge index 1, between ingredients and grinding)

### Wave 0D: Grinder Hopper Tray Interaction
**Status:** TransferBowl moves fridge→grinder via animation, but hopper "pour" interaction is invisible.

**Tasks:**
1. Add hopper tray mesh to grinder machine archetype (funnel-shaped geometry above grinder input)
2. When bowl arrives at grinder, show "pour" prompt
3. Pour animation: bowl tilts, contents particle-stream into hopper
4. Hopper fills visually (fill level mesh), then grinding can begin
5. Bowl position transitions: 'carried' → pour → 'grinder' → grinding starts

### Wave 0E: Sausage Body Rapier Physics
**Status:** SausageBody.ts has SausageCurve + SausageLinksCurve + SkinnedMesh but NO physics. POC had rigid body per bone with ball colliders.

**Tasks:**
1. Add Rapier rigid body per sausage bone segment (4-8 segments)
2. Ball colliders per segment, connected by spring joints
3. First segment anchored to stuffer output nozzle
4. Gravity + collision with counter surface
5. Player can grab sausage end (GrabSystem already exists) to move/manipulate
6. Links break at twist points (if linked form)

### Wave 0F: Pan Flip Player Trigger
**Status:** CookingOrchestrator has flip animation code but it's untriggered by player.

**Tasks:**
1. Add "flip" action to InputManager bindings.json (keyboard: F key, gamepad: Y button, touch: swipe-up gesture)
2. CookingOrchestrator listens for flip action during cooking phase
3. Flip animation plays on pan mesh (rotation arc)
4. Sausage gets tossed and re-lands (quick ballistic arc)
5. Successful flip = flair bonus (+5 points via `recordFlairPoint`)
6. Failed timing = sausage falls off pan = strike

### Wave 0G: Continue Button (Save/Resume)
**Status:** TitleScreen Continue button is a stub. Store persists to AsyncStorage but resume logic is incomplete.

**Tasks:**
1. On startNewGame: persist full game state snapshot
2. CONTINUE button: check if valid save exists (currentChallenge > 0 && gameStatus === 'playing')
3. Load persisted state, set appPhase to 'playing', resume at saved challenge
4. Gray out CONTINUE if no valid save
5. Add "last saved" timestamp display

### Wave 0H: CI/CD Hardening
**Status:** CI only runs tests. No typecheck, no lint, no Android build.

**Tasks:**
1. Add `pnpm typecheck` to CI workflow
2. Add `pnpm lint` to CI workflow
3. Run both in parallel with tests
4. Add build step (Expo web export) to verify production build works
5. Cache node_modules and pnpm store

---

## PHASE 2 — "Will It Blow?" — The Full Game

### Wave 1: Difficulty System — "Choose Your Doneness"

#### 1A: DifficultyConfig Engine
**Files:** `src/engine/DifficultyConfig.ts`, `src/config/difficulty.json`

```typescript
interface DifficultyConfig {
  id: string;
  name: string;            // "Rare", "Medium Rare", etc.
  color: string;           // Sausage button tint
  hintsEnabled: boolean;
  hintCount: number;       // 5, 3, 2, 1, 0
  timePressure: number;    // 0.5x, 0.75x, 1.0x, 1.5x, 2.5x
  permadeath: boolean;
  hiddenObjectLevel: 'none' | 'basic' | 'full' | 'extreme';
  cleanupRequired: boolean;
  assemblyRequired: boolean;
  maxStrikes: number;      // 5, 3, 3, 2, 1
  enemyEncounters: boolean;       // NEW: random enemy spawns
  enemyFrequency: number;         // NEW: 0-1 chance per station transition
}
```

5 tiers from JSON config, deterministic difficulty scaling.

#### 1B: Difficulty Selector UI
**File:** `src/components/ui/DifficultySelector.tsx`

- 3x2 grid modal (3 top row + 2 bottom row)
- Each button = SausageButton with doneness color tint
- "PERMADEATH LINE" visual separator between Medium and Med Well
- Store: `difficulty` field added to gameStore, persisted
- Flow: MENU → NEW GAME → DIFFICULTY SELECT → LOADING → PLAYING

#### 1C: Store Integration
**File:** `src/store/gameStore.ts` additions

```typescript
// New fields
difficulty: DifficultyConfig;
currentRound: number;
totalRounds: number;           // Calculated from ingredient combos
usedIngredientCombos: string[][];
kitchenState: KitchenState;    // Hidden object tracking
blowoutScore: number;
casingTied: boolean;
```

Modify `startNewGame()` to accept difficulty selection. Modify `MAX_STRIKES` to read from `difficulty.maxStrikes`. Modify timers to multiply by `difficulty.timePressure`.

---

### Wave 2: "Will It Blow" Mechanic — The Namesake

#### 2A: Tie Gesture
**File:** `src/components/challenges/TieGesture.tsx`

- After stuffing completes, player must tie both ends of casing
- Two-finger pinch gesture (touch) / click-drag (desktop) on each end
- Visual: casing mesh constricts at tie points, small knot mesh spawns
- Must tie BOTH ends before tube detach
- Flair bonus for fast ties

#### 2B: Tube Detach + Blow
**File:** `src/ecs/orchestrators/BlowoutOrchestrator.tsx`

- Player grabs plastic tube from stuffer nozzle (GrabSystem)
- Tube mesh: CylinderGeometry with translucent MeshPhysicalMaterial (transmission: 0.7)
- Interior visible contents colored by `blendColor`
- "WILL IT BLOW?" — Mr. Sausage demands on CRT
- Blow interaction: tap/hold → particle emission from tube end
- Air pressure simulation: tube "deflates" as contents eject
- Particle system: ground meat + ingredient-colored chunks

#### 2C: Cereal Box + Landing
**File:** `src/components/kitchen/CerealBox.tsx`

- Procedural BoxGeometry with CanvasTexture per face
- Front face: "Mr. Sausage's Own" cereal brand (procedural design)
- Stain layer: accumulated splatter from previous rounds (CanvasTexture)
- Dynamic chunks: particles land and stick (restitution = 0)
- Scoring: coverage area, distance, precision, speed
- Placed on dining table (existing layout target)

#### 2D: Place Setting
**File:** `src/components/kitchen/PlaceSetting.tsx`

- Table gets dressed: plate, fork, knife, glass, napkin
- Use PSX props or simple procedural geometry
- Cereal box sits behind plate
- Visual only (non-interactive except during blowout)

---

### Wave 3: Multi-Round Gameplay Loop

#### 3A: Round Manager
**File:** `src/engine/RoundManager.ts`

- Track `usedIngredientCombos` across rounds
- Each round: re-roll Mr. Sausage demands, rotate available ingredients
- Can't reuse same 3-ingredient combo
- C(12,3) = 220 unique combos → marathon-length completion
- Round transition: verdict → "Mr. Sausage is never satisfied..." → next round
- Kitchen reset between rounds at higher difficulties

#### 3B: Win Condition — Trap Door Escape
**File:** `src/components/kitchen/TrapDoorAnimation.tsx`

- When ALL unique combos completed (or round target met):
- Mr. Sausage: "You've... you've done it."
- Trap door in ceiling swings open (hinge animation on existing mesh)
- Light floods in from above (volumetric via SpotLight + fog)
- Camera tilts up, rises toward opening
- Fade to white → WIN SCREEN: "THE SAUSAGE KING ESCAPES"

#### 3C: Round Transition UI
**File:** `src/components/ui/RoundTransition.tsx`

- Score summary card between rounds
- "Round X of Y" counter
- Mr. Sausage's reaction to your performance
- Brief loading moment as kitchen resets (higher difficulties)
- "NEXT ROUND" button or auto-advance

---

### Wave 4: Hidden Object Mechanics (Medium+ Difficulty)

#### 4A: Cabinet/Drawer Interactive System
**File:** `src/components/kitchen/CabinetDrawer.tsx`

- Cabinet doors: click to open/close, spring animation
- Drawers: click-and-pull to slide out
- Contents revealed on open (equipment, red herrings)
- Interactive meshes added to existing kitchen furniture GLBs
- State tracked in `kitchenState.cabinets[]` and `kitchenState.drawers[]`

#### 4B: Equipment Finding + Assembly
**File:** `src/engine/KitchenAssembly.ts`

Searchable locations (randomized per round at extreme difficulty):
- Cabinets: frying pan, grinder motor housing, stuffer crank handle, spice rack (red herring)
- Drawers: grinder faceplate, stuffer nozzle, kitchen towel, knife (red herring)
- Wall hooks: frying pan (alt), oven mitt, apron (cosmetic)
- Under counter: grinder base, stuffer body

Assembly flow:
1. Find part (click in cabinet → goes to inventory/grab)
2. Carry to station (GrabSystem)
3. Place (drop on station → snap to correct position)
4. Assemble (click to bolt: sound + visual snap)

#### 4C: Equipment Tracking HUD
**File:** `src/components/challenges/HiddenObjectOverlay.tsx`

- Silhouette icons for missing equipment
- Found items highlight green
- Assembled items get checkmark
- Only visible at Medium+ difficulty

---

### Wave 5: Enemy Encounters — "Something More... Lively"

**NEW FEATURE — brainstormed this session. Mr. Sausage demands something more lively than what's in the fridge.**

#### 5A: Enemy Spawn System
**File:** `src/ecs/systems/EnemySpawnSystem.tsx`

- Random chance of enemy spawning from cabinet during station transitions
- Probability scales with difficulty: 0% (Rare/Med Rare), 10% (Medium), 25% (Med Well), 50% (Well Done)
- Cabinet door BURSTS open, enemy lunges out
- Types: rats, large insects, weird meat-creatures, living sausage abominations
- Use PSX creature models + decimated PBR creatures for variety
- Enemy has simple AI: moves toward player, attacks if in range

#### 5B: Combat Mechanics — Repurpose Grab/Swing
**File:** `src/ecs/systems/CombatSystem.tsx`

**Key insight: we already have the infrastructure!**
- GrabSystem: player can pick up objects → already works with pans, knives
- SwipeAction: velocity-based interaction → already tracks swing speed
- Frying pan, butcher knives, rolling pin already exist as kitchen props

New mechanics:
- Grabbed weapon objects gain `weapon` ECS component (damage, range, knockback)
- SwipeAction velocity above threshold = attack
- Enemy health: 1-3 hits depending on weapon and enemy type
- Frying pan: 2 damage, medium range, satisfying CLANG sound
- Butcher knife: 3 damage, short range, quick attack
- Rolling pin: 1 damage, long range, knockback

#### 5C: Enemy Types
**File:** `src/config/enemies.json`

| Enemy | Model Source | HP | Speed | Spawn Location | Humor Factor |
|-------|-------------|----|----|----------------|-------------|
| Giant Rat | PSX creature or Meshy | 1 | Fast | Lower cabinets | Classic horror |
| Meat Spider | spider.glb (decimated) | 2 | Medium | Upper cabinets | Body horror |
| Living Sausage | Procedural (SausageBody) | 1 | Slow, wiggly | Stuffer output | Dark comedy gold |
| Tentacle Horror | tentakel.glb (decimated) | 3 | Slow reach | Drain/sink | Lovecraftian |
| Angry Ingredient | Quaternius food + rage face | 1 | Fast, erratic | Fridge | Pure comedy |

**Mr. Sausage commentary during encounters:**
- "Ah, you found my other pet!"
- "Don't waste that — it goes in the next batch!"
- "Now THAT'S what I call fresh ingredients!"
- "If you can't handle the kitchen, stay out of the... well, you can't leave."

#### 5D: Enemy Death + Reward
- Defeated enemies drop as "bonus ingredients" (dark comedy)
- Optional: stuff defeated enemy INTO the sausage for bonus flair points
- Mr. Sausage LOVES this: "NOW you're getting creative!"
- Enemy corpse can be picked up with GrabSystem, added to bowl
- Score bonus: +10 flair per enemy ingredient used

#### 5E: Cabinet Burst Animation
**File:** `src/components/kitchen/CabinetBurst.tsx`

- Cabinet door flies open (spring physics or animation)
- Dust particle effect
- Enemy lunges out with screech SFX
- Camera shake (subtle, 0.1s)
- Player has ~1s reaction window before enemy attacks
- If player is holding a weapon: auto-guard stance

---

### Wave 6: Scene Dressing — PSX Horror Props

#### 6A: Import Priority PSX Assets
Copy from `/Volumes/home/assets/PSX Mega Pack II.../` to `public/models/horror/`:

**Tier 1 — Centerpieces (immediate):**
- `mask_mx_1-5.glb` (9 masks, 492KB) — wall display near CRT
- `saw_blade_1.glb` (111KB) — wall mount, SAW reference
- `cage_mx_1.glb` (1.1MB) — corner imprisonment prop
- `fishing_hook_mx_1/2.glb` (206KB) — ceiling meat hooks
- `machete_mx_1.glb` (73KB) — butcher table
- `metal_barrel_hr_1-4.glb` (~1.6MB) — mystery barrel cluster
- `lamp_mx_1-4_on/off.glb` (~6.3MB) — industrial lighting

**Tier 2 — Atmospheric scatter:**
- Debris (bricks, gravel, scrap metal) — floor scatter
- Decals (graffiti, posters) — wall dressing
- Pipes and wires — ceiling/wall clutter
- Wooden planks — boarded windows
- Cardboard boxes, cement bags — corner clutter

#### 6B: Horror Prop Loader Component
**File:** `src/components/kitchen/HorrorPropsLoader.tsx`

- Data-driven from `src/config/scene/horror-props.json`
- Each prop: { model, position, rotation, scale, category }
- Lazy-loaded in batches (Tier 1 immediate, Tier 2 after first challenge starts)
- Instancing for repeated props (bricks, debris)
- Total budget: ~13MB initial, ~8MB lazy-loaded

#### 6C: FlickerSystem Integration
- PSX lamp on/off variants enable cheap flicker: swap between meshes
- Wire PSX lamps into existing FlickerSystem ECS
- Random flicker patterns: steady→flicker→off→on cycle
- Triggered by enemy spawns (all lights flicker before cabinet burst)

---

### Wave 7: Procedural Sink + Cleanup Mechanics

#### 7A: Procedural Sink
**File:** `src/components/kitchen/ProceduralSink.tsx`

- Replace static sink GLB with procedural chrome sink
- Basin (LatheGeometry), faucet (curved CylinderGeometry), hot/cold taps
- Click tap → toggle on/off (rotation animation)
- Water stream: vertical particle column + splash at basin
- Only interactive at Medium Rare+ difficulty

#### 7B: Cleanup Mechanic
**File:** `src/engine/CleanupManager.ts`

- Equipment gets "dirty" after use (grime CanvasTexture overlay)
- Place dirty item in sink → washing progress bar
- Medium: wash pan only
- Medium Well+: wash ALL equipment
- Well Done: wash, dry (kitchen towel), PUT BACK in correct storage location
- Track cleanliness per station in store

---

### Wave 8: Audio Expansion

#### 8A: Per-Challenge Music Tracks
Using the horror music library at `/Volumes/home/assets/Music/`:

| Phase | Track | Action |
|-------|-------|--------|
| Menu | "Dark" | Convert to OGG, loop |
| Exploration | "Space Horror (Exploration)" | Convert, loop |
| Grinding | "Violence" | Convert, loop during challenge |
| Stuffing | "16 Bit GEN Death Metal" | Convert, loop |
| Cooking | "Revenge" | Convert, loop |
| Verdict S-rank | "Unsettling Victory" | Already converted |
| Verdict F-rank | "Space Horror Boss Music" | Convert |
| Enemy encounter | "Kick Me Harder" (trimmed) | Convert, one-shot |

#### 8B: Enemy SFX
- Cabinet burst: wood crack + metal clang
- Enemy screech: per-type (rat squeal, spider hiss, sausage squelch, tentacle slap)
- Weapon hit: pan CLANG, knife THWACK, rolling pin BONK
- Enemy death: splat + comedy honk

#### 8C: AudioEngine Enhancement
- Track switching system (crossfade between challenge tracks)
- Spatial audio for enemy positions (Tone.Panner3D)
- Layered ambient: base drone + random one-shots (drips, creaks, distant screams)

---

## IMPLEMENTATION ORDER & AGENT ASSIGNMENTS

### Sprint 1: Phase 1 Completion (Waves 0A-0H)
| Agent | Tasks |
|-------|-------|
| **scene-architect** | 0B (fridge GLBs), 0D (hopper tray), 0E (sausage physics) |
| **challenge-dev** | 0A (fridge gesture), 0C (chopping station), 0F (pan flip) |
| **store-warden** | 0G (continue/save), 0C store fields |
| **backend-dev** | 0H (CI/CD hardening) |

### Sprint 2: Core Phase 2 (Waves 1-3)
| Agent | Tasks |
|-------|-------|
| **challenge-dev** | 1A-1C (difficulty), 2A-2B (tie+blow), 3A (round manager) |
| **scene-architect** | 2C-2D (cereal box, place setting), 3B (trap door) |
| **store-warden** | 1C (store expansion), 3A (round state) |
| **frontend-dev** | 1B (difficulty UI), 3C (round transition UI) |

### Sprint 3: Advanced Phase 2 (Waves 4-5)
| Agent | Tasks |
|-------|-------|
| **scene-architect** | 4A (cabinets), 5E (cabinet burst) |
| **challenge-dev** | 4B (assembly), 5A-5B (enemy spawn + combat) |
| **store-warden** | 4C (tracking), 5C-5D (enemy config + rewards) |
| **asset-pipeline** | 6A (PSX import), creature decimation |

### Sprint 4: Polish (Waves 6-8)
| Agent | Tasks |
|-------|-------|
| **scene-architect** | 6B-6C (horror props, flicker), 7A (sink) |
| **challenge-dev** | 7B (cleanup) |
| **asset-pipeline** | 8A (music conversion) |
| **store-warden** | 8C (audio engine) |

---

## CRITICAL CONSTRAINTS

1. **Test count must never decrease** — every new feature gets tests
2. **Biome clean** on every commit
3. **TypeScript clean** via `pnpm typecheck`
4. **Web budget** — 13MB initial, 8MB lazy-loaded maximum
5. **ECS pattern** — new game mechanics use ECS orchestrators, not standalone components
6. **Thin HUDs** — all HUDs are read-only Zustand subscribers, ZERO input handling
7. **Data-driven** — all tuning constants in JSON config files, never hardcoded
8. **PSX-first** for all new 3D scene dressing — no cute low-poly
