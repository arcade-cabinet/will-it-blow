# Will It Blow? — Game Design Document

## Overview

A procedurally generated cooking game based on the "Ordinary Sausage" YouTube channel. Players grind absurd ingredients into sausages, stuff casings, test "Will It Blow?", cook with burst risk, and earn ratings from the Sausage King himself.

## Stack

- React Native 0.74 + BabylonJS (via reactylon) for 3D scenes
- Tone.js for synthesized audio
- React Native overlay for all UI
- Vite for web builds, Metro for native

## Architecture

Three-layer rendering:

1. **BabylonJS 3D scene** — game world visuals (sausage, grinder, pan, kitchen)
2. **React Native overlay** — UI (phase tracker, buttons, progress bars, ratings)
3. **React Native modals** — Mr. Sausage avatar, BUT FIRST events, title, results

State machine flow:
```
title -> select -> grind -> stuff -> [BUT FIRST?] -> blow -> [BUT FIRST?] -> cook -> taste -> results -> (loop)
```

## File Structure

```
src/
  engine/
    GameEngine.tsx      - State machine + context
    AudioEngine.ts      - Tone.js synthesized audio
    SausagePhysics.ts   - Pressure, burst risk, scoring math
    Ingredients.ts      - Ingredient database (25+ items)
  components/
    scenes/
      TitleScene.tsx      - Bobbing mascot with sunglasses/mustache
      GrinderScene.tsx    - Hopper + spinning blade + particles
      StufferScene.tsx    - Tube + growing casing
      BlowScene.tsx       - Tube end-on + splatter particles
      CookScene.tsx       - Frying pan + sausage + sizzle
      TasteScene.tsx      - Sausage plate + cross-section split
    ui/
      PhaseTracker.tsx    - Step indicator
      MrSausageAvatar.tsx - Bobbing avatar + speech bubbles
      IngredientSelect.tsx- Grid card picker
      ProgressBar.tsx     - Animated fill bar
      SausageRating.tsx   - Hot dog emoji rating
      RuffaloRating.tsx   - Mark Ruffalo circle rating
      SfxText.tsx         - Floating action word overlays
      ButFirstEvent.tsx   - Mini-game interrupt
      ResultsScreen.tsx   - Sausage report card
      TitleOverlay.tsx    - Title screen
      CountdownOverlay.tsx- 3-2-1 LET'S SAUSAGE
    GameWorld.web.tsx     - Scene orchestrator (web)
    GameWorld.native.tsx  - Scene orchestrator (native)
```

## Game Phases

### 1. TITLE
- 3D: Bobbing sausage mascot (cylinder + mustache + sunglasses + chef hat)
- UI: "ORDINARY SAUSAGE" with glow pulse, "THE GAME" subtitle, "LET'S SAUSAGE!" button
- Audio: Idle synth pad

### 2. SELECT INGREDIENTS
- 3D: Kitchen counter with spinning ingredient boxes
- UI: Grid of 12 random ingredients from 25+ pool. Pick 1-3.
- Categories: fast food, canned, fancy, absurd, sweet, spicy, comfort, international

### 3. GRIND
- 3D: Hopper (inverted cone) + spinning blade + meat particle system
- UI: Circular tap button, progress bar, SFX text ("BZZZZZ!", "CRUNCH!")
- Mechanic: Tap to grind. Random "turn on with [object]" gag first
- Audio: Brown noise + LFO tremolo per tap

### 4. STUFF THE CASING
- 3D: Horizontal stuffer tube, casing growing out the end
- UI: "3...2...1...LET'S SAUSAGE!" countdown, song display, stuff button, fullness bar
- Mechanic: Tap to stuff, casing grows with squelch sounds
- Audio: Membrane synth squelches

### 5. WILL IT BLOW?!
- 3D: Tube end-on, splatter particles toward wall
- UI: "HOLD TO BLOW!" button, power meter, splat wall, Mark Ruffalo rating
- Mechanic: Hold to build power, release. Power + blowPower stats = Mark Ruffalos (0-5)
- Audio: Whoosh sweep, release pop

### 6. COOK
- 3D: Frying pan with sausage, color shift, spark particles, swell on burst
- UI: "HERE WE GO!" slam, cook progress, burst alert
- Mechanic: Auto-cook timer. At ~40%, burst check vs burstRisk. Cosmetic + score penalty
- Audio: Rising oscillator, white noise burst

### 7. TASTE TEST
- 3D: Sausage on plate, splits to show cross-section
- UI: "CUT IT OPEN!" button, rating reveal, quote, sausage rating (0-5)
- Mechanic: Rating from tasteMod + textureMod + burst penalty + variance

### 8. RESULTS
- 3D: Trophy/pedestal
- UI: Full report card with name, ingredients, taste, Ruffalos, burst, bonus, score %, title
- Audio: Triumphant/sad/neutral melody

### BONUS: BUT FIRST!
- Random interrupt between stuff->blow or blow->cook (60% chance, once per game)
- Smash sausage mini-game (5 taps), reveals "fan art", grants 3-10% bonus

### BONUS: Mr. Sausage Avatar
- Fixed bottom-left, bobbing, mood-based emoji, cycling phase commentary
- Speech bubble with show-authentic lines

## Ingredient Data Model

25+ ingredients with properties:
- `name`, `emoji`, `category`, `color`
- `tasteMod` (0-5): taste quality
- `textureMod` (0-5): texture quality
- `burstRisk` (0-0.9): burst probability
- `blowPower` (0-5): blow drama

## Scoring

```
tasteScore = (avgTaste * 0.6 + avgTexture * 0.4) / 5 * 60
blowScore = ruffalos / 5 * 20
burstBonus = hasBurst ? 0 : 20
total = min(tasteScore + blowScore + burstBonus + butFirstBonus, 100)
```

Titles: Disaster (0-19) -> Apprentice (20-39) -> Maker (40-59) -> Chef (60-79) -> Master (80-99) -> SAUSAGE KING (100)

## Audio Engine

- Grinder: Brown noise + LFO tremolo (per tap)
- Stuffing: Membrane synth squelch
- Pressure/Cook: Rising oscillator
- Burst: White noise burst
- Blow whoosh: Filtered noise sweep
- Countdown: Sine tone beeps
- BUT FIRST: Impact percussion
- Rating songs: PolySynth melodies (triumphant/neutral/sad)
- Title jingle: Original synthesized theme

## Show References

- "Well hey 'dere folks!" intro
- "3... 2... 1... LET'S SAUSAGE!" countdown
- Turning on grinder with random objects
- Parody songs during stuffing
- "Will It Blow?!" with Mark Ruffalo rating
- "Oh, we got a burst!" during cooking
- Mrs. Sausage's kitchen wall getting splattered
- "BUT FIRST!" mid-game tangents
- "May God have mercy on my soul!" taste test
- Sausage Report Card with title progression
