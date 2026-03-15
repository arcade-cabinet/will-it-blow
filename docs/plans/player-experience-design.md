---
title: Player Experience Design
domain: design
status: draft
last-verified: 2026-03-13
summary: "UI/UX design decisions, brand language, and player emotional arc for all missing screens"
---

# Player Experience Design — Will It Blow?

## Brand DNA

### The Core Metaphor
**"Fine dining meets meat grinder."** The entire game operates on the tension between craft and horror — the player is a captive forced to produce *art* (the perfect sausage) under threat of becoming the *medium* (being ground into sausage). Mr. Sausage is both Gordon Ramsay and Jigsaw — a connoisseur-torturer.

### Visual Language
- **Color palette**: Dark brown/black backgrounds (`#0a0a0a`, `#1a0a00`) with two accent channels:
  - **Gold** (`#D2A24C`, `#FFC832`) — the "fine dining" register: awards, scores, success, elegance
  - **Blood red** (`#FF1744`, `#dc2626`) — the "horror" register: danger, failure, time pressure, meat
- **Typography**: Heavy weight (900), wide letter-spacing, uppercase. The butcher shop sign aesthetic — hand-painted, confident, crude.
- **Animation**: Slow, deliberate movements. The swinging sign (3s period), the typewriter text. Nothing feels rushed — even danger builds *slowly*. The horror is in the inevitability.

### Audio Personality
- **Ambient**: Horror drone (continuous), sizzle loops, grinder motor
- **Procedural**: FM synthesis that *reacts* to gameplay speed (grinder pitch tracks plunger depth)
- **Score-reactive**: Mr. Sausage's reactions should have audio stingers — disgust chord on F-rank, triumphant brass on S-rank

### Mr. Sausage's Voice
Four emotional registers, each mapped to a dialogue effect:
1. **Measured patience** (default): "Fill the casing. Gently." — teacher mode
2. **Dark humor** (taunt): "I prefer 'passionate'" — gallows humor, keeps tension from becoming oppressive
3. **Ominous threat** (anger): "The grinder is hungry" — escalation, stakes reveal
4. **Grudging respect** (hint): "Listen carefully" — the only kindness, always transactional

## Emotional Arc by Game Phase

```
Title → Intro Dialogue → Challenges (7) → Verdict → Results
 ↑                                                      ↓
 └──── Menu (if retry) ←──── "PLAY AGAIN" / "MENU" ────┘
```

### Phase 1: TITLE SCREEN ✅ (exists)
**Emotion**: Anticipation, unease
**Design**: Butcher shop sign on chains, swaying. "Est. 1974" suggests decades of dark history.
The gold border says "quality establishment." The blood-red title says "you're in trouble."

### Phase 2: LOADING SCREEN 🔲 (missing)
**Emotion**: Dread building
**Design principle**: The loading screen shouldn't feel like waiting — it should feel like being *led* somewhere.

**Concept: "Descending into the Kitchen"**
- Black screen with a single overhead light bulb swinging (pendulum, 4s period)
- As assets load, the light gets brighter, revealing more of the room
- Progress shown as a horizontal "meat thermometer" bar:
  - Thin line from left to right, filling with blood red
  - Temperature markings at 25%, 50%, 75%, 100%
  - Text above: "PREPARING THE KITCHEN..." → "SHARPENING KNIVES..." → "HEATING THE GRINDER..." → "READY."
- When complete, the light stabilizes and the screen fades to gameplay

**Key insight**: Each progress message should reference upcoming stations, priming the player for what's coming. This creates *narrative* loading, not just technical loading.

### Phase 3: CHALLENGE HUDs 🔲 (missing)
**Emotion**: Focus, increasing tension

**Design principles for all HUDs:**
1. **Minimal footprint** — screen is 80% 3D scene, HUD is peripheral
2. **Read-only** — HUDs display state, never accept input
3. **Consistent positioning** — score/strikes always top-right, challenge name always top-left, gauge always bottom-center
4. **Horror aesthetic** — dark semi-transparent backgrounds, gold labels, red for danger

**Per-station HUD concepts:**

#### Grinding HUD
- **Speed zone indicator**: Vertical gauge with 3 colored zones (too slow / just right / too fast)
- **Particle: meat ground percentage** (0-100%) as a horizontal bar
- **Mr. Sausage emotion icon**: Small face in corner, reacting to grind quality

#### Stuffing HUD
- **Pressure gauge**: Circular gauge (SVG, inspired by the 21st.dev Gauge component)
  - Green zone (safe), amber zone (borderline), red zone (burst imminent)
  - When in red zone, gauge *pulses* with a heartbeat rhythm
- **Fill progress**: Horizontal bar showing casing fill level
- **Burst counter**: If we add burst mechanics, show X/3 bursts remaining

#### Cooking HUD
- **Temperature gauge**: Circular, like a stove dial
  - Demand's preferred zone highlighted in gold
  - Current temp shown with a needle
- **Cook timer**: "Time in zone" counter — how long in the ideal temperature range
- **Heat control indicator**: Arrows showing whether heat is rising/falling

#### Blowout HUD
- **Pressure building**: Circular gauge that fills as blowout approaches
- **Tie progress**: 2-part indicator showing left/right tie status (✓/○)

### Phase 4: CHALLENGE HEADER & SHARED COMPONENTS 🔲 (missing)

**ChallengeHeader**: "CHALLENGE 3/7 — STUFFING"
- Top-left, gold text on dark transparent banner
- Phase name in all-caps, challenge number as counter
- Subtle glow animation on transition between challenges

**StrikeCounter**: Three meat hooks, X marks in blood red when strikes consumed
- Rather than abstract X marks, use **meat hooks** — 3 hooks on top-right
- When a strike is earned, the hook "swings" and a red X slashes across it
- All hooks gone = game over state

**ProgressGauge**: Horizontal sausage fill bar
- Instead of a generic bar, make it look like a **sausage casing filling**
- Left end is tied, right end is open
- As progress increases, the "meat" fills from left to right
- At 100%, the right end ties shut with a knot animation

### Phase 5: INGREDIENT CHALLENGE 🔲 (missing)
**Emotion**: Choice anxiety

**Concept: "The Freezer Selection"**
- Chest freezer lid opens, cold fog billows out
- 6 ingredients visible (from the 20 in ingredients.json), each with glow
- Player picks 3 — each pick slides the ingredient forward with a satisfying *chunk* sound
- Wrong pick (based on hidden demands): red flash, strike sound, meat hook marks
- Correct pick: gold highlight, ingredient slides into "selected" tray
- When 3 selected, freezer lid slams shut

### Phase 6: TASTING CHALLENGE 🔲 (missing)
**Emotion**: Tension climax → catharsis (or dread)

**Concept: "The Verdict"**
This is the game's emotional climax. Design for maximum dramatic tension:

1. **Reveal Phase** (4 beats, each with a pause):
   - "FORM..." → score appears (grind + stuff quality)
   - "INGREDIENTS..." → score appears (tag matching vs demands)
   - "COOK..." → score appears (temperature accuracy)
   - "TOTAL..." → demand bonus calculated and added

2. **Rank Reveal** (the money shot):
   - Screen goes momentarily black
   - Rank letter slams onto screen with camera shake
   - Rank-specific color: S=Gold, A=Silver, B=Bronze, F=Blood Red
   - Mr. Sausage's verdict dialogue plays over the rank badge

3. **Rank badges should feel like *stamps*:**
   - S: Gold embossed seal, laurel wreath, "THE SAUSAGE KING"
   - A: Silver seal, "ALMOST WORTHY" in smaller text
   - B: Bronze seal with cracks, "MEDIOCRE"
   - F: Cracked/bloody stamp, "UNACCEPTABLE" with dripping text

### Phase 7: GAME OVER / RESULTS SCREEN 🔲 (missing)
**Emotion**: Relief (S-rank), determination (A-rank), dread (B/F-rank)

**Layout:**
```
┌─────────────────────────────┐
│      [RANK BADGE - large]    │
│        THE SAUSAGE KING      │
│                              │
│  ┌─────────┬──────────────┐ │
│  │ Form    │ ████████ 85  │ │
│  │ Taste   │ ██████── 62  │ │
│  │ Cook    │ █████████ 93 │ │
│  │ Demand  │ +15 bonus    │ │
│  ├─────────┼──────────────┤ │
│  │ TOTAL   │       92     │ │
│  └─────────┴──────────────┘ │
│                              │
│  [PLAY AGAIN]  [MENU]       │
└─────────────────────────────┘
```

- Score bars should fill in with animation (left to right, 0.5s each, staggered)
- Total score should count up rapidly (slot machine effect)
- Background: the kitchen scene blurred behind, with the CRT TV visible showing Mr. Sausage's reaction

### Phase 8: ROUND TRANSITION 🔲 (missing)
**Emotion**: Brief respite, building for next round

**Concept: "The Cleanse"**
- Current round score summary (card-style, gold border)
- Running total displayed prominently
- "ROUND 2/5" in large text
- "NEXT ROUND" button styled like a meat stamp (USDA approved aesthetic)
- Brief Mr. Sausage quip based on performance: praise for 90+, snark for 50-89, threat for <50
- Kitchen trap door sequence: old sausage drops through, new ingredients appear

## Design System Tokens

### Colors (React Native StyleSheet values)
```
background:     '#0a0a0a'    // Deep black
surface:        '#1a0a00'    // Warm dark brown
surfaceElevated: '#2a1a0a'   // Lighter brown for cards
gold:           '#D2A24C'    // Primary accent — success, labels
goldLight:      '#FFC832'    // Bright gold — highlights
bloodRed:       '#FF1744'    // Danger, failure
bloodDark:      '#8B0000'    // Deep red for gradients
warmGray:       '#3a3a3a'    // De-emphasized text
border:         '#8B4513'    // Saddle brown — borders, frames
success:        '#4CAF50'    // Completion, tied knots
warning:        '#FFA000'    // Amber zone in gauges
```

### Typography Scale
```
heroTitle:    { fontSize: 48, fontWeight: '900', letterSpacing: 2 }
sectionTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 4 }
bodyLarge:    { fontSize: 18, fontWeight: '700', letterSpacing: 1 }
body:         { fontSize: 16, fontWeight: '600', letterSpacing: 1 }
caption:      { fontSize: 14, fontWeight: '600', letterSpacing: 3 }
micro:        { fontSize: 12, fontWeight: '600', letterSpacing: 3 }
```

### Spacing
```
xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
```

### Component Patterns
- **Cards**: `backgroundColor: surface`, `borderWidth: 2-4`, `borderColor: border`, `borderRadius: 8-12`
- **Buttons**: Gold bg, dark text, heavy border, active state dims to 80% opacity
- **Gauges**: SVG circles, `strokeLinecap: 'round'`, animated dasharray transitions (1000ms ease)
- **Overlays**: `backgroundColor: 'rgba(10, 10, 10, 0.92)'`, never fully opaque (player always sees kitchen behind)

## Implementation Priority for Visual Polish

1. **GameOverScreen** — highest emotional impact, players see it every run
2. **TastingChallenge verdict** — the climax reveal, builds to GameOver
3. **Per-station HUDs** — players look at these the most during gameplay
4. **LoadingScreen** — first impression after title, sets tone
5. **ChallengeHeader + StrikeCounter** — constant on-screen presence
6. **RoundTransition** — brief but important for multi-round rhythm
7. **IngredientChallenge** — complex interactivity, last to polish

## Metaphors to Lean Into

1. **The Kitchen as Cage** — all UI should feel *embedded* in the kitchen. No floating web-app modals. Think: chalk on a blackboard, stamps on butcher paper, thermometers on the counter.

2. **Meat as Currency** — scores should feel like *weight*. "Your sausage weighs in at 85/100." Not abstract points.

3. **The Clock is Always Ticking** — even without explicit timers, ambient heartbeat audio and pulsing red gauges should make players *feel* time pressure. The horror is in the rhythm.

4. **Mr. Sausage Sees Everything** — the CRT TV should always be visible in the corner during gameplay. His reactions (via the reaction system) provide constant emotional feedback. When the player messes up, he flinches. When they succeed, he nods. The TV is the audience.

5. **Escape is Earned** — only S-rank (92+) means freedom. Everything else is a *degree of failure*. This inverts the typical game reward structure: most outcomes are bad, making the good outcome feel genuinely triumphant.
