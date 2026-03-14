---
title: Filament vs R3F Gap Analysis
date: 2026-03-14
status: current
---

# Gap Analysis: Filament Port vs R3F Original

**R3F total:** 3,871 lines of interaction/rendering logic (19 files)
**Filament total:** 905 lines (14 files, mostly scaffolding)
**Gap:** 2,966 lines of game logic NOT YET PORTED

## Severity Legend
- **P0 CRITICAL** — Game cannot be played without this
- **P1 IMPORTANT** — Significant gameplay feature missing
- **P2 POLISH** — Visual/audio polish, not blocking gameplay
- **P3 NICE-TO-HAVE** — Enhancement, can ship without

---

## Station Interaction Gaps

### Grinder (R3F: 331 lines → Filament: 32 lines = 299 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| Chunk loading state machine | P0 | ❌ | 5 meat chunks, click to move bowl→tray→chute (states 0→1→2→3) |
| Bowl position toggle | P0 | ❌ | Click bowl to slide from SIDE to UNDER grinder |
| Grinder on/off toggle | P0 | ❌ | Click switch, triggers FILL_GRINDER→GRINDING phase |
| Plunger drag | P0 | ❌ | Drag plunger down, accumulates groundMeatVol 0→1 |
| Phase transition GRINDING→MOVE_BOWL | P0 | ✅ | In TouchControls.tsx tap handler |
| Meat particles (300 instanced) | P2 | ❌ | Spawn from faceplate, gravity, bowl collision |
| Faceplate rotation animation | P2 | ❌ | Spins when grinder is on |
| Motor vibration | P2 | ❌ | Shakes when running |
| Audio: grinder speed | P1 | ❌ | audioEngine.setGrinderSpeed() proportional to plunge |

### Stuffer (R3F: 242 lines → Filament: 32 lines = 210 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| Casing drag to attach | P0 | ❌ | Drag casing onto stuffer nozzle |
| Crank drag to fill | P0 | ❌ | Drag crank, accumulates stuffLevel 0→1 |
| Phase transitions | P0 | ✅ | In TouchControls.tsx tap handler |
| Crank rotation animation | P2 | ❌ | Visual rotation matching drag |
| Rod position animation | P2 | ❌ | Plunger moves down as stuff fills |
| Squiggly casing geometry | P2 | ❌ | Procedural tube curve |
| Audio: squelch | P1 | ✅ | In TouchControls.tsx |

### Stove (R3F: 329 lines → Filament: 31 lines = 298 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| Pan drag to burner | P0 | ❌ | Drag pan, snap to burner position |
| Burner dial control (2 dials) | P0 | ❌ | Drag dials to set heat level |
| cookLevel accumulation | P0 | ✅ | In TouchControls.tsx tap handler |
| Phase transitions | P0 | ✅ | In TouchControls.tsx |
| FBO grease wave simulation | P3 | ❌ | 256px framebuffer grease visual |
| Sizzle audio proportional to heat | P1 | ❌ | audioEngine.setSizzleLevel() |
| Pan snap detection | P1 | ❌ | Proximity check for burner attachment |

### ChoppingBlock (R3F: 86 lines → Filament: 40 lines = 46 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| Tap/swipe to chop | P0 | ✅ | In TouchControls.tsx (tap advances chop count) |
| 5 chops → FILL_GRINDER | P0 | ✅ | In TouchControls.tsx |
| Audio: playChop | P0 | ✅ | In TouchControls.tsx |
| Chop visual indicator (red box) | P2 | ❌ | Shows meat chunks after chopping |
| Swipe gesture (alternative to tap) | P2 | ❌ | Mobile-friendly swipe interaction |

### BlowoutStation (R3F: 228 lines → Filament: 31 lines = 197 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| Hold-to-inflate mechanic | P0 | ❌ | Long press to build pressure |
| Pressure gauge visual | P1 | ❌ | Shows current pressure level |
| Sausage inflation scale | P1 | ❌ | Sausage grows as pressure builds |
| Burst detection | P0 | ❌ | Probabilistic burst based on ingredients |
| Tie casing (both ends) | P0 | ❌ | Two-tap tie mechanic (was TieGesture.tsx) |
| Phase transition | P0 | ✅ | In TouchControls.tsx tap handler |
| Audio: pressure, burst | P1 | ❌ | Pressure build + burst sound |

### ChestFreezer (R3F: 127+172 lines → Filament: 32 lines = 267 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| Ingredient display (GLB models) | P0 | ❌ | Show 6+ ingredient models inside freezer |
| Tap to select (3 required) | P0 | ❌ | addSelectedIngredientId() per pick |
| Selection highlight (emissive pulse) | P1 | ❌ | Glow effect on selected items |
| Physics lid animation | P2 | ❌ | Open/close chest lid |
| Ingredient drag (PhysicsFreezerChest) | P2 | ❌ | Drag ingredients out of chest |
| Audio: click on select | P1 | ❌ | audioEngine.playSound('click') |

### Sink (R3F: 194 lines → Filament: 30 lines = 164 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| Water toggle | P1 | ❌ | Tap to turn water on/off |
| Pour animation | P2 | ❌ | Water visual effect |
| Cleanup mechanic | P1 | ❌ | Between-round cleanup |
| Audio: pour sounds | P1 | ❌ | audioEngine.playSound('pour') |

### TV (R3F: 49 lines → Filament: 32 lines = 17 lines missing)

| Feature | Priority | Status | What's Missing |
|---------|----------|--------|----------------|
| CRT visual effect | P2 | ❌ | Scanlines, flicker, chromatic aberration |
| Mr. Sausage display | P1 | ❌ | Shows character reactions on screen |

---

## Completely Missing Components

### IntroSequence (119 lines) — P0 CRITICAL

| Feature | Status | Description |
|---------|--------|-------------|
| Eyelid blink | ❌ | Two black planes covering viewport, animate open over 7s |
| Phase 0 (0-2s) | ❌ | Eyes closed, blur 20px |
| Phase 1 (2-7s) | ❌ | Blink sequence: peek→close→peek→close→open |
| Phase 2 (7s+) | ❌ | Eyes fully open, blur removed, setIntroActive(false) |
| CSS blur filter | ❌ | Simulates waking up with blurred vision |
| Camera looking at ceiling | ❌ | Initial look-up position |

**Filament approach:** Use two full-screen `<View>` overlays (black) with Animated opacity. No Filament involvement — this is pure RN animation over the scene.

### MrSausage3D (540 lines) — P1 IMPORTANT

| Feature | Status | Description |
|---------|--------|-------------|
| Procedural body (spheres + cylinders) | ❌ | Head, body, arms, legs from primitives |
| 9 reaction animations | ❌ | idle, flinch, laugh, disgust, excitement, nervous, nod, talk, eating, judging |
| Camera tracking | ❌ | Rotates to face player |
| Reaction interpolation (lerp) | ❌ | Smooth transitions between reactions |
| Per-reaction transform offsets | ❌ | Body Y, rotations, arm angles, shake |

**Filament approach:** Load a MrSausage GLB model (needs to be created in Blender). Animate via Filament's `transformManager.setEntityRotation()` in render callback. Reactions drive rotation/scale shared values.

### PlayerHands (106 lines) — P1 IMPORTANT

| Feature | Status | Description |
|---------|--------|-------------|
| First-person hands model (hands.glb) | ❌ | Visible hands for spatial grounding |
| Camera-follow with lerp | ❌ | Hands follow camera with slight lag |
| Velocity-based sway | ❌ | Hands sway when moving |

**Filament approach:** Load `hands.glb` model, position relative to camera each frame via render callback.

### FirstPersonControls (246 lines) — PARTIALLY PORTED

| Feature | Status | Description |
|---------|--------|-------------|
| WASD keyboard movement | ❌ | Not applicable on native (no keyboard) |
| Mouse look with pointer lock | ❌ | Not applicable on native |
| Touch look (right side) | ✅ | In TouchControls.tsx |
| Touch move (left side) | ✅ | In TouchControls.tsx |
| Posture system (prone→sitting→standing) | ❌ | Player wakes up over time |
| Height interpolation per posture | ❌ | Camera height changes: 0.5→1.0→1.9 |
| Idle time tracking | ❌ | Tracks how long player is idle |

### Sausage + SausageGeometry (410 lines) — P1 IMPORTANT

| Feature | Status | Description |
|---------|--------|-------------|
| Bone-chain physics body | ❌ | N rigid bodies connected by springs |
| SkinnedMesh rendering | ❌ | Deformable tube mesh |
| Extrusion animation | ❌ | Sausage appears segment by segment |
| Spring forces (bone→visual sync) | ❌ | Physics drives visual each frame |
| Cook/grease level visual changes | ❌ | Color/roughness change with cooking |

**Filament approach:** Load sausage GLB, use Bullet constraints between segments. Filament doesn't have SkinnedMesh from procedural geometry — need authored GLB with armature.

### BasementRoom (134 lines) — P1 IMPORTANT

| Feature | Status | Description |
|---------|--------|-------------|
| Floor plane with tile texture | ❌ | 6x8m tiled floor |
| Ceiling with concrete texture | ❌ | 3m height |
| 4 walls with tile texture | ❌ | Sealed room |
| PBR textures (color+normal+roughness) | ❌ | 10 texture files |
| Texture repeating/tiling | ❌ | Repeat 3x4 for floor scale |
| Mattress (player spawn) | ❌ | Box at [2.0, 0.25, 3.0] |
| Physics colliders (walls/floor) | ✅ | Bullet static planes in Kitchen.tsx |

**Filament approach:** Create room.glb in Blender with baked textures. OR load individual wall/floor GLBs. Physics colliders already set up in Kitchen.tsx.

---

## System-Level Gaps

### Audio Engine (R3F: 302 lines → Filament: 81 lines)

| Feature | Priority | Status |
|---------|----------|--------|
| expo-audio Sound.createAsync | P0 | ❌ — currently logs to console |
| 14 sound ID mapping to OGG files | P0 | ❌ — no actual audio loading |
| Looping sounds (sizzle, grind, ambient) | P1 | ❌ |
| Volume control | P1 | ❌ — has API but no implementation |
| Spatial audio | P3 | ❌ |

### Persistence (op-sqlite)

| Feature | Priority | Status |
|---------|----------|--------|
| Database creation (migrations) | P1 | ✅ — client.ts has CREATE TABLE |
| Session hydration | P1 | ✅ — drizzleQueries.ts |
| Session persistence | P1 | ✅ — drizzleQueries.ts |
| Settings save/load | P2 | ✅ — drizzleQueries.ts |
| Wire into app lifecycle | P1 | ❌ — usePersistence not recreated |

### Testing

| Feature | Priority | Status |
|---------|----------|--------|
| Jest unit tests | P0 | ✅ — 18 suites, 221 tests pass |
| Maestro E2E flows | P1 | ❌ — no .maestro/ directory yet |
| Filament component tests | P2 | ❌ — no scene tests |

---

## Summary Scorecard

| Category | P0 (Critical) | P1 (Important) | P2 (Polish) | P3 (Nice) |
|----------|---------------|-----------------|-------------|-----------|
| Total items | 18 | 22 | 15 | 3 |
| Done ✅ | 7 | 3 | 0 | 0 |
| Missing ❌ | **11** | **19** | **15** | **3** |

### P0 Critical Missing (11 items — MUST FIX for playable game):
1. Grinder: chunk loading, bowl toggle, on/off switch, plunger drag
2. Stuffer: casing drag, crank drag
3. Stove: pan drag, burner dial control
4. BlowoutStation: hold-to-inflate, burst detection, tie casing
5. ChestFreezer: ingredient display + tap-to-select
6. IntroSequence: eyelid blink/wake-up
7. AudioEngine: actual OGG loading via expo-audio

### What WORKS right now:
- Title screen + difficulty selector ✅
- Filament renders 45+ GLB models via Metal ✅
- Bullet physics world with wall/floor colliders ✅
- Player capsule physics body ✅
- Camera at first-person eye height ✅
- Touch controls: tap advances game phases ✅
- SurrealText: blood-red phase instructions ✅
- Koota ECS: all state management ✅
- op-sqlite: persistence schema + queries ✅
- 18 test suites, 221 tests ✅
- 0 TypeScript errors ✅
