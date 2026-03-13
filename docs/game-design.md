---
title: Game Design
domain: core
status: current
last-verified: 2026-03-13
depends-on: [state-management, 3d-rendering, audio]
agent-context: challenge-dev, scene-architect
summary: Gameplay mechanics, scoring, challenges, Mr. Sausage
---

# Game Design

## Premise

You're trapped in a filthy basement kitchen. Mr. Sausage — a sentient, menacing sausage wearing sunglasses and a chef hat — watches from a CRT television mounted on the wall. He demands you make him the perfect sausage. If you fail, things go badly for you.

**Tone:** SAW meets cooking show. Dark humor. The horror is played for laughs but the atmosphere is genuinely unsettling.

## Game Flow

```text
MENU (butcher shop sign aesthetic)
  ↓ "NEW GAME"
DIFFICULTY SELECT ("Choose Your Doneness" — 5 tiers: Rare → Well Done)
  ↓ tier selected
LOADING (kitchen.glb preload, sausage progress bar)
  ↓ assets ready
CHALLENGE 0: INGREDIENT SELECTION (fridge station) — bridge pattern
  ↓ camera walks to chopping block
CHALLENGE 1: CHOPPING (chopping station)
  ↓ camera walks to grinder
CHALLENGE 2: GRINDING (grinder station) — ECS orchestrator
  ↓ camera walks to stuffer
CHALLENGE 3: STUFFING (stuffer station) — ECS orchestrator
  ↓ camera walks to stove
CHALLENGE 4: COOKING (stove station) — ECS orchestrator
  ↓ camera walks to table
CHALLENGE 5: BLOWOUT (table station) — ECS orchestrator
  ↓ camera walks to center
CHALLENGE 6: TASTING (CRT TV verdict) — bridge pattern
  ↓
RESULTS SCREEN (rank badge: S / A / B / F)
  ↓ "PLAY AGAIN" or "MENU"
MENU
```

Each challenge is played at a different station in the kitchen. The camera smoothly walks between stations (~2.5 seconds, ease-in-out quadratic). Multi-round gameplay loops back through challenges with fresh ingredient combinations (C(12,3) combo tracking).

## Challenge Mechanics

### Challenge 0: Ingredient Selection

**Station:** Fridge (back-left corner)

Mr. Sausage makes a demand: "Only the finest ingredients..." with a tag-based criteria (e.g., "spicy", "fancy", "comfort", "meat"). The player sees 10 random ingredients displayed in the fridge and must pick 3 that match the criteria.

- Correct pick: ingredient slides forward, reduced opacity
- Wrong pick: strike (red X)
- Score: (correct picks / required picks) * 100, minus strike penalty

### Challenge 1: Chopping

**Station:** Chopping block (center counter)

The player chops selected ingredients with knife-work gestures. Timing and precision determine chunk quality. Ingredient decomposition produces chunkColor, chunkScale, and fatRatio per ingredient that flow through the rest of the pipeline.

- Gesture-based cutting mechanic
- Score based on precision and consistency
- Results feed into BlendCalculator for downstream challenges

### Challenge 2: Grinding

**Station:** Grinder (left wall)

The player controls grind speed by dragging/flinging. Too slow = bad texture. Too fast = splatter (strike). Must keep speed in the "good zone" while a timer counts down.

- Speed zones: slow (yellow) / good (green) / fast (red)
- Crank animation follows challenge progress
- EMA (exponential moving average) smoothing on angular velocity
- Score based on time spent in good zone

**Note:** Grinding, Stuffing, and Cooking use the ECS orchestrator pattern -- the orchestrator owns game logic, and a thin HUD (GrindingHUD, StuffingHUD, CookingHUD) reads bridge fields from the store with zero input handling.

### Challenge 3: Stuffing

**Station:** Stuffer (right counter)

Hold to fill the casing. Pressure builds while holding. Release to let pressure drop. Filling too fast causes burst (strike). Must reach 100% fill before the timer runs out.

- Pressure visualization: green → yellow → red color interpolation
- Casing grows visually as fill increases
- Burst triggers a particle spray and flash
- Score based on fill level and burst count

### Challenge 4: Cooking

**Station:** Stove (right burners)

Control heat level to keep temperature in a target range. Heat overshoots cause overheat (strike). Must hold temperature in the zone for a required duration.

- Temperature visualization via burner glow intensity
- Pan and sausage mesh on stove
- Score based on time in target zone

### Challenge 5: Blowout

**Station:** Table (center)

The titular "Will It Blow?" moment. The player must tie off the sausage casing with a TieGesture before internal pressure causes a blowout. Managed by BlowoutOrchestrator (ECS pattern).

- TieGesture: swipe-to-tie mechanic under time pressure
- CerealBox: CanvasTexture splat effect on blowout failure
- PlaceSetting: visual staging for the sausage presentation
- BlowoutHUD: pressure gauge, tie progress, scoring display
- Score based on tie quality and blowout avoidance
- Config driven by `blowout.json`

### Challenge 6: Tasting (Verdict)

**Station:** Center table (facing CRT TV)

No player interaction. Mr. Sausage delivers his verdict with dramatic score reveals:
1. Each challenge score revealed one at a time with animation
2. Final rank badge displayed (S/A/B/F)
3. Rank-specific dialogue from Mr. Sausage

## Scoring System

### Per-Challenge Score: 0–100

Each challenge produces a score from 0 to 100 based on performance during that challenge.

### Final Verdict

Average of all 7 challenge scores, adjusted by demandBonus, determines rank:

| Rank | Avg Score | Title | Mr. Sausage Says |
|------|-----------|-------|-------------------|
| **S** | ≥ 92 | THE SAUSAGE KING | "Perfection. You have earned my respect." (Only true victory) |
| **A** | ≥ 75 | Almost Worthy | "Not bad. You may live... for now." (Defeat — close but not enough) |
| **B** | ≥ 50 | Mediocre | "I've had worse. But not by much." (Defeat) |
| **F** | < 50 | Unacceptable | "You call this a sausage? DISGRACEFUL." (Defeat — "You are the sausage now") |

**Demand scoring:** DemandScoring.ts compares player decisions vs Mr. Sausage's hidden demands. demandBonus adjusts the raw score average (form +/-15/10, cook +/-10/5, ingredients +/-8/12 each, flair bonus). TastingChallenge has reveal phases: form -> ingredients -> cook -> scores with demand breakdown.

### Legacy Scoring Formula (SausagePhysics.ts)

The original scoring model (from the pre-horror design) is still in the codebase:

```text
finalScore = (tasteRating/5 × 60) + (ruffalos/5 × 20) + (noBurstBonus: 20) + bonusPoints
```

- **Taste** (60% weight): Average of ingredient tasteMod × 0.6 + textureMod × 0.4
- **Blow** (20% weight): Based on holdDuration × average blowPower
- **No-burst bonus** (20%): Full 20 points if no burst occurred
- **BUT FIRST bonus**: Additional points from special events (not yet implemented)

Note: The per-challenge scoring in the current horror redesign supersedes parts of this formula. The challenge-specific overlays each compute their own 0–100 score.

## Strike System

- Maximum 3 strikes per challenge
- 3rd strike = defeat (game over, `addStrike` triggers defeat at `>= MAX_STRIKES`)
- Strikes reset between challenges
- Visual: red X marks in StrikeCounter overlay

## Variant System

Each playthrough generates a `variantSeed` (Date.now()) that deterministically selects challenge variants:

- **6 ingredient variants**: Different tag criteria (spicy, fancy, comfort, meat, etc.)
- **3 grinding variants**: Different speed tolerances and timer lengths
- **3 stuffing variants**: Different fill/pressure rates
- **3 cooking variants**: Different target temperatures and tolerances

Selection uses a seeded hash: `(seed * 2654435761) >>> 0 % arrayLength`

## Ingredient Database

25 ingredients in `Ingredients.ts`, each with:

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| name | string | — | Display name (e.g., "Big Mac", "Lobster", "A Shoe") |
| tasteMod | number | -1 to 5 | Flavor contribution (negative = bad taste) |
| textureMod | number | 0 to 5 | Texture quality |
| burstRisk | number | 0 to 0.9 | Probability of burst during stuffing |
| blowPower | number | 0 to 5 | How well it puffs during blow phase |
| color | string | hex | Visual color in fridge display |
| shape | object | — | Base shape + detail (sphere, box, cylinder, etc.) |
| categories | string[] | — | Tags for matching (fast-food, fancy, spicy, etc.) |

**Design tension:** High-taste ingredients have low blowPower (and vice versa). This forces trade-offs in ingredient selection. THE SAUSAGE KING rank (S tier) effectively requires the BUT FIRST bonus — by design.

## Dialogue System

Each challenge has a dialogue tree (in `src/data/dialogue/`):
- Linear sequences with typewriter text reveal
- Branching choices at decision points (e.g., ask for a hint)
- Effects system: `hint`, `taunt`, `stall`, `anger` tracked by DialogueEngine
- Touch/click to advance dialogue
- Dialogues play at the start of each challenge, before gameplay begins

## Mr. Sausage Character

Procedural 3D character (no external model files):
- Head: sphere (diameter 3.6)
- Mustache: wavy torus
- Sunglasses: paired tori
- Chef hat: cone stack
- Self-lit materials (`disableLighting: true`, `emissiveColor`)

**9 reaction animations:** idle, flinch, laugh, disgust, excitement, nervous, nod, talk

Displayed on the CRT television in the kitchen via CrtTelevision component with chromatic aberration shader.

## Difficulty System

5 tiers configured in `src/config/difficulty.json`:

| Tier | Name | Hints | Strikes | Time Pressure | Enemy Chance |
|------|------|-------|---------|---------------|--------------|
| 1 | Rare | generous | forgiving | low | 0% |
| 2 | Medium Rare | moderate | standard | moderate | 10% |
| 3 | Medium | standard | standard | standard | 20% |
| 4 | Medium Well | limited | strict | high | 35% |
| 5 | Well Done | none | strict | extreme | 50% |

DifficultySelector UI ("Choose Your Doneness") with permadeath line separator between Medium and Medium Well.

## Enemy Encounter System

Config in `src/config/enemies.json`:
- **5 enemy types** with AI state machine: spawning -> approaching -> attacking -> stunned -> dying -> dead
- **5 weapons** for player defense
- **4 spawn cabinets** with CabinetBurst animation
- ECS-driven: EnemySpawnSystem + CombatSystem + CombatHUD
- Spawn probability scales with `difficulty.enemyChance`

## Multi-Round Gameplay

- RoundManager tracks ingredient combinations using C(12,3) combo tracking
- TrapDoorAnimation for escape sequences between rounds
- RoundTransition UI between rounds
- Store fields: currentRound, totalRounds, usedIngredientCombos

## Hidden Objects & Cleanup

- **CabinetDrawer**: Spring animations for interactive cabinet drawers
- **KitchenAssembly**: Equipment parts and station discovery
- **HiddenObjectOverlay**: UI for hidden object collection
- **ProceduralSink**: Procedural lathe/cylinder sink geometry
- **CleanupManager + CleanupHUD**: Station cleanliness tracking between rounds

## Remaining Unimplemented Features

These are referenced in design docs or have stub code but are not functional:

1. **Hint glow** — HintButton triggers a store action but the 3D scene doesn't respond with a visual glow on matching ingredients.
2. **Background music** — No ambient horror audio or background music. Only procedural SFX per challenge.
3. **Sound effects from asset pack** — `Kitchen Sound Effects.zip` is downloaded but not integrated.

## Planned Work

### Diegetic UI System (DS-Text)
- Replace traditional 2D HUD instructions with "Surreal Text" physically painted on room surfaces (blood, grease, grime)
- Contextual surface awareness: text anchors to ceiling (prone), dominant wall (standing), or countertops (workstations)
- View/perspective centering with `maxWidth` wrapping to fit player FOV
- Obstacle avoidance: exclusionary zones around CRT TV, trap door, cabinets — text flows around them
- "Sliding Dismissal" mechanic: old messages slide along surface, wrap around corners, fade into shadows
- `SurrealOrchestrator` calculates raycasts for dominant surface detection
- See `docs/plans/2026-03-10-diegetic-ui-system.md` for full design

### Phase 2 Expanded Mechanics
- **"Will It Blow" namesake mechanic**: after stuffing, player ties off casing (two-finger pinch gesture), detaches tube from stuffer, blows remaining contents onto a procedural cereal box on the dining table
- Flair scoring on blowout: distance bonus, coverage bonus, style bonus, speed bonus
- Cereal box with "Mr. Sausage's Own" procedural CanvasTexture, accumulates stain splatter across rounds
- Tube physics: CylinderGeometry with translucent MeshPhysicalMaterial (transmission: 0.7), air pressure simulation
- See `docs/plans/2026-03-01-phase2-will-it-blow-design.md` Sections 1-2

### True Win Condition
- Track all unique ingredient combos across rounds: C(12,3) = 220 unique combos
- When all combos completed: trap door in ceiling swings open, light floods in, camera rises — "THE SAUSAGE KING ESCAPES"
- Marathon-length completion (~8-11 hours at 2-3 min/round) — the horror IS the grind
- Kitchen resets between rounds at higher difficulties (cleanup mechanics gate progression)
- See `docs/plans/2026-03-01-phase2-will-it-blow-design.md` Section 3

### Audio Expansion
- Per-challenge music tracks from horror music library (Dark, Violence, Revenge, etc.)
- Enemy encounter SFX: cabinet burst (wood crack + metal clang), per-type screeches, weapon hits
- Layered ambient: base drone + random one-shots (drips, creaks, distant screams)
- Track switching system with crossfade between challenge tracks
- See `docs/plans/2026-03-02-comprehensive-phase1-phase2-plan.md` Wave 8
