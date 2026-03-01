<!--
title: Gameplay Elevation Design — Physics Mini-Games & 3D Mr. Sausage
domain: plan
status: historical
engine: babylon
last-verified: 2026-03-01
depends-on: []
agent-context: scene-architect, challenge-dev
summary: Design for transforming 5 tap-button phases into physics-driven mini-games with a full 3D Mr. Sausage character using Babylon.js primitives.
-->

# Will It Blow? — Gameplay Elevation Design

**Date:** 2026-02-26
**Status:** Approved
**Approach:** Faithful Chaos — Physics sandbox per phase matching Ordinary Sausage show pacing

## Problem

The game is functionally a series of "tap button, number goes up" interactions layered over placeholder 3D scenes. There's no actual sausage-making feel, no physics interaction, and Mr. Sausage is a flat avatar in the corner. The 3D engine (Babylon.js) is underutilized.

## Goals

1. Each of the 5 gameplay phases becomes a **distinct physics-driven mini-game**
2. Mr. Sausage is a **full 3D character** present in every scene, reacting in real time
3. 3D ingredients are **recognizable physics objects** you interact with
4. Pacing matches the real show: alternating between active chaos and tense anticipation
5. Art style: **stylized/cartoony** — bold colors, exaggerated proportions, bouncy materials

## References

- [Ordinary Sausage - Wikitubia](https://youtube.fandom.com/wiki/Ordinary_Sausage)
- [Ordinary Sausage - Youtooz figure](https://youtooz.com/products/ordinary-sausage) (canonical character design)
- [Ordinary Sausage - Know Your Meme](https://knowyourmeme.com/memes/people/ordinary-sausage)

---

## Mr. Sausage — 3D Character Model

Built entirely from Babylon.js primitives. No external models.

### Anatomy (Implemented — Youtooz Style Head Only)

**Head** — the iconic oversized head, no body:
- Large bun-colored sphere (diameter 3.6), warm peach/tan
- Mustard zigzag stripe running up the forehead (small emissive spheres in sine wave)
- **Sunglasses**: Two dark squished-oval spheres + bridge + thick brow bar + temple arms
- **Mustache**: Big lush handlebar — center bar + two curved torus segments with upswept tips
- **Chef hat (toque)**: Cylinder brim band + tapered body with 8 cloth pleat ridges + puffy dome top + secondary puff bulge
- All materials use `disableLighting: true` with emissive colors (self-lit, always visible against dark backgrounds)

### Component Structure

```
MrSausage3D (single reusable component)
├── Head (scaled sphere — diameter 3.6, bun-colored)
│   └── MustardZigzag (10 small emissive spheres in sine wave)
├── Sunglasses
│   ├── LensL/LensR (squished dark spheres)
│   ├── Bridge (box)
│   ├── TopBar (thick brow bar)
│   └── TempleL/TempleR (arms)
├── Mustache
│   ├── StacheCenter (box)
│   ├── CurlL/CurlR (torus segments)
│   └── TipL/TipR (spheres)
└── ChefHat
    ├── HatBrim (cylinder)
    ├── HatBody (tapered cylinder + 8 pleat ridges)
    └── HatPuff/HatPuff2 (squished spheres)
```

### Animation System

Procedural via `useBeforeRender` — no skeleton needed.

| Reaction | Transform |
|----------|-----------|
| **idle** | Gentle body bob + mustache wiggle |
| **flinch** | Lean back, arms up, quick return |
| **laugh** | Body shakes rapidly, slight hop |
| **disgust** | Lean away, head tilt, arms down |
| **excitement** | Hop + arms raised + body pulse |
| **nervous** | Slight sway, lean forward/back alternating |
| **nod** | Head bobs forward twice |
| **talk** | Body pulse synced to text display timing |

Driven by a `reaction` prop. Each scene sets the reaction based on game events.

---

## Mini-Games — Phase by Phase

### Phase 1: GRIND — "Feed the Beast"

**Duration:** ~15-20 seconds
**Energy:** HIGH chaos
**Show equivalent:** Mr. Sausage grinding ingredients with his grinder

**Scene layout:**
- Hulking meat grinder center-frame (hopper funnel, blade, output bowl)
- 3 selected ingredients as 3D physics objects on shelf/conveyor to the left
- Mr. Sausage standing behind the grinder

**Mechanic:** Drag and fling ingredients into the grinder hopper.
- Each ingredient is a physics rigid body with weight, bounce, and shape
- Lobster: heavy, awkward-shaped, bounces off rim
- Water balloon: slippery, jiggles on contact
- Bread: light, easy toss
- Each ingredient resists differently based on its properties

**Physics events:**
- Ingredient enters hopper → grinder CHEWS (particles spray, vibration, sound)
- Ingredient visibly deforms/breaks apart
- Ground meat accumulates in bowl below
- Misses bounce around the kitchen (funny, not punishing)

**Mr. Sausage reactions:**
- Flinches when things splatter
- Leans in excitedly when ingredient enters
- Laugh on wild bounces

**Scoring:** Grind quality (how cleanly ingredients entered) affects downstream taste. But even chaos produces usable meat.

---

### Phase 2: STUFF — "Squeeze It In"

**Duration:** ~10-15 seconds
**Energy:** MEDIUM — methodical but tense
**Show equivalent:** Mr. Sausage using the stuffer, casing filling up

**Scene layout:**
- Sausage stuffer (tube + crank/plunger) center
- Empty casing hanging off the end
- Bowl of ground meat from grind phase

**Mechanic:** Press and drag downward on the stuffer plunger.
- Casing fills in real time — soft-body mesh that bulges, stretches, jiggles
- Press too hard/fast → casing threatens to tear (wobbles red)
- Press too slow → meat backs up, Mr. Sausage gets impatient
- Casing dynamically deforms — lumpy where big chunks are

**Visual feedback:**
- Semi-transparent casing shows ingredient colors swirled inside
- When full, auto-ties the ends with a satisfying snap
- Two knot spheres appear at ends

**Mr. Sausage reactions:**
- Watches intently
- Winces when casing stretches thin
- Celebrates tie-off

**Scoring:** Fill evenness affects texture score. Overstuffing increases burst risk during cook.

---

### Phase 3: BLOW — "Will It Blow?"

**Duration:** ~8-10 seconds
**Energy:** HIGH — tension build → explosive release
**Show equivalent:** Blowing leftover meat out of the tube, rated in Mark Ruffalos

**Scene layout:**
- Stuffer tube pointing toward camera
- Wall behind (splatter target)
- Mr. Sausage off to the side, bracing

**Mechanic:** Hold to build pressure, release to erupt.
- Pressure gauge fills — tube shakes and vibrates increasingly
- Short hold = weak dribble (0-1 Ruffalos)
- Medium hold = satisfying splatter (2-3 Ruffalos)
- Max hold = EXPLOSIVE spray covering the wall (4-5 Ruffalos)

**Physics:**
- On release: meat chunks launch as small rigid bodies
- Chunks hit wall, stick, drip down with gravity
- Splatter pattern is unique every time due to physics simulation
- Persistent splatter (doesn't disappear)

**Mr. Sausage reactions:**
- Leans away during pressure build (nervous)
- Big splatter → laugh + excitement hop
- Weak dribble → shrug/disappointment

**The reveal:** Camera zooms on wall. Ruffalo rating appears over the splatter.

---

### Phase 4: COOK — "Here We Go!"

**Duration:** ~12-15 seconds
**Energy:** LOW — tense anticipation
**Show equivalent:** Sausage in the pan, sizzling, waiting for potential burst

**Scene layout:**
- Pan on stove burner, center
- Finished sausage sitting in it
- Mr. Sausage at the stove, nervous

**Mechanic:** Mostly passive with light interaction.
- Sausage cooks automatically — sizzle sounds, color darkens, fat renders
- Player can tap to flip sausage, drag to roll it (satisfying but low-stakes)
- The tension: **will it burst?**

**Burst sequence (if triggered):**
- Sausage starts pulsing, bulging at weak points
- Shaking intensifies
- EXPLOSION — physics chunks fly, grease splatters
- Mr. Sausage jumps back: "Oh we got a burst!"

**No-burst sequence:**
- Sausage gets beautiful char marks
- Golden-brown color progression
- Mr. Sausage nods approvingly

**Mr. Sausage reactions:**
- Nervous anticipation (lean in, pull back, sway)
- Burst → huge flinch + excited reaction
- No burst → satisfied nod

**Scoring:** Burst deducts from taste rating and final score. Flip count has no scoring impact (pure feel).

---

### Phase 5: TASTE — "The Verdict"

**Duration:** ~8-10 seconds
**Energy:** NONE — pure payoff reveal
**Show equivalent:** Cutting open the sausage, tasting, giving the rating

**Scene layout:**
- Sausage on plate/bun, center
- Mr. Sausage behind it with knife

**Mechanic:** Tap to cut.
- Sausage splits open — two halves slide apart
- Cross-section reveals ingredient colors swirled inside (generated from selection)
- Mr. Sausage picks it up, bites (jaw animation)

**Mr. Sausage reaction by rating:**
- 0-1 stars: Disgust — leans away, shakes head
- 2-3 stars: Meh — shrug, tilted head
- 4-5 stars: Joy — hops, arms up, celebration

**Reveal sequence:**
1. Cut animation (500ms)
2. Cross-section reveal
3. Bite + reaction
4. Quote appears ("May God have mercy on my soul!" etc.)
5. Star rating animates in
6. Transition to results screen

---

## Ingredient 3D Representations

Each of the 28 ingredients gets a recognizable 3D shape from ~3-7 primitives:

| Ingredient | 3D Shape |
|-----------|----------|
| Lobster | Red elongated box + claw spheres |
| Bread | Tan rounded box |
| Water | Blue translucent sphere (jiggly) |
| Cheese | Yellow wedge (triangle) |
| Pizza | Flat triangle + red/yellow top |
| Ice Cream | Sphere on cone |
| Etc. | Each ingredient: base shape + color + 1-2 detail primitives |

All ingredients are physics rigid bodies with mass/bounce/friction derived from their gameplay properties.

---

## Technical Architecture (As Implemented)

### Character Files

| File | Purpose |
|------|---------|
| `src/components/characters/MrSausage3D.tsx` | Youtooz-style head-only 3D character (self-lit primitives) |
| `src/components/characters/reactions.ts` | 8 reaction definitions with duration + loop config |

### Scene Files (All Rewritten)

| File | Mechanic |
|------|----------|
| `src/components/scenes/TitleScene.tsx` | Hero shot with 3-point lighting |
| `src/components/scenes/GrinderScene.tsx` | Drag-fling ingredients into hopper, collision detection |
| `src/components/scenes/StufferScene.tsx` | Drag plunger rightward, casing scales + color blends |
| `src/components/scenes/BlowScene.tsx` | Hold-to-shake, release → meat chunk physics + splatter |
| `src/components/scenes/CookScene.tsx` | Click-to-flip, drag sausage, burst explosion sequence |
| `src/components/scenes/TasteScene.tsx` | Sausage splits, cross-section with ingredient color swirls |

### Camera System

Per-phase camera compositions defined in `CAMERA_COMPOSITIONS` (GameWorld.web.tsx). Smooth transitions use ease-out cubic interpolation over ~0.4s. Camera orbit locked during gameplay phases, free during title/select/results.

### Physics Engine

cannon-es via Babylon.js CannonJSPlugin. Used for gravity in scene setup. Meat chunks in BlowScene and CookScene use manual velocity + gravity integration in render loop (simpler than full rigid body imposters for small projectiles).

### Interaction Model

Touch/pointer events via Babylon.js `scene.onPointerDown/Move/Up`:
- **Drag** (Grind, Stuff): Track pointer delta, apply to mesh position
- **Hold** (Blow): Duration tracked via TouchableOpacity onPressIn/onPressOut, mapped to shake intensity
- **Click** (Cook): `scene.pick()` on sausage mesh triggers flip animation
- **Auto** (Taste): Cut triggered when `sausageRating` transitions from 0 → positive

### CI/CD

- `.github/workflows/ci.yml` — Tests + Android debug APK (push/PR to main and feat branches)
- `.github/workflows/cd.yml` — Static web export → GitHub Pages (push to main)
