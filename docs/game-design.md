# Game Design

## Premise

You're trapped in a filthy basement kitchen. Mr. Sausage — a sentient, menacing sausage wearing sunglasses and a chef hat — watches from a CRT television mounted on the wall. He demands you make him the perfect sausage. If you fail, things go badly for you.

**Tone:** SAW meets cooking show. Dark humor. The horror is played for laughs but the atmosphere is genuinely unsettling.

## Game Flow

```text
MENU (butcher shop sign aesthetic)
  ↓ "NEW GAME"
LOADING (kitchen.glb preload, sausage progress bar)
  ↓ assets ready
CHALLENGE 1: INGREDIENT SELECTION (fridge station)
  ↓ camera walks to grinder
CHALLENGE 2: GRINDING (grinder station)
  ↓ camera walks to stuffer
CHALLENGE 3: STUFFING (stuffer station)
  ↓ camera walks to stove
CHALLENGE 4: COOKING (stove station)
  ↓ camera walks to center
CHALLENGE 5: TASTING (CRT TV verdict)
  ↓
RESULTS SCREEN (rank badge: S / A / B / F)
  ↓ "PLAY AGAIN" or "MENU"
MENU
```

Each challenge is played at a different station in the kitchen. The camera smoothly walks between stations (~2.5 seconds, ease-in-out quadratic).

## Challenge Mechanics

### Challenge 1: Ingredient Selection

**Station:** Fridge (back-left corner)

Mr. Sausage makes a demand: "Only the finest ingredients..." with a tag-based criteria (e.g., "spicy", "fancy", "comfort", "meat"). The player sees 10 random ingredients displayed in the fridge and must pick 3 that match the criteria.

- Correct pick: ingredient slides forward, reduced opacity
- Wrong pick: strike (red X)
- Score: (correct picks / required picks) * 100, minus strike penalty

### Challenge 2: Grinding

**Station:** Grinder (left wall)

The player controls grind speed by dragging/flinging. Too slow = bad texture. Too fast = splatter (strike). Must keep speed in the "good zone" while a timer counts down.

- Speed zones: slow (yellow) / good (green) / fast (red)
- Crank animation follows challenge progress
- EMA (exponential moving average) smoothing on angular velocity
- Score based on time spent in good zone

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

### Challenge 5: Tasting (Verdict)

**Station:** Center table (facing CRT TV)

No player interaction. Mr. Sausage delivers his verdict with dramatic score reveals:
1. Each challenge score revealed one at a time with animation
2. Final rank badge displayed (S/A/B/F)
3. Rank-specific dialogue from Mr. Sausage

## Scoring System

### Per-Challenge Score: 0–100

Each challenge produces a score from 0 to 100 based on performance during that challenge.

### Final Verdict

Average of all 5 challenge scores determines rank:

| Rank | Avg Score | Title | Mr. Sausage Says |
|------|-----------|-------|-------------------|
| **S** | ≥ 90 | THE SAUSAGE KING | "Perfection. You have earned my respect." |
| **A** | ≥ 70 | Acceptable | "Not bad. You may live... for now." |
| **B** | ≥ 50 | Mediocre | "I've had worse. But not by much." |
| **F** | < 50 | Unacceptable | "You call this a sausage? DISGRACEFUL." |

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

## Unimplemented Features

These are referenced in design docs or have stub code but are not functional:

1. **BUT FIRST events** — Mid-challenge interruptions that grant bonus points. Referenced in scoring formula and design docs. Not implemented.
2. **Settings menu** — Button exists on title screen. No screen behind it.
3. **Continue game** — Button exists on title screen. No save/load system.
4. **Hint glow** — HintButton triggers a store action but the 3D scene doesn't respond with a visual glow on matching ingredients. The fridge station has `hintActive` prop but the button is only shown when NO challenge is active (likely a bug).
5. **Background music** — No ambient horror audio or background music. Only procedural SFX per challenge.
6. **Sound effects from asset pack** — `Kitchen Sound Effects.zip` is downloaded but not integrated.
