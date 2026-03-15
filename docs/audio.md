<!--
title: Audio System
domain: core
status: current
engine: r3f
last-verified: 2026-03-13
depends-on: [game-design, development-guide]
agent-context: scene-architect, challenge-dev
summary: Dual audio engine (Web Audio API + Tone.js), 40+ OGG assets, phase-specific music, spatial sounds
-->

# Audio System

## Overview

The audio system uses a dual-engine approach:

- **AudioEngine.web.ts** — Full Tone.js synthesis engine for procedural SFX and music on web
- **AudioEngine.ts** — Procedural Web Audio API synthesis engine (with native no-op fallback)

40+ OGG audio assets are cataloged in `src/config/audio.json`, providing phase-specific music mapping and spatial sound definitions. An additional `src/config/audio/manifest.json` indexes ambient and SFX files.

## Architecture

```text
src/config/audio.json             Data-driven audio config
├── challengeTracks               Per-challenge music (7 phases → OGG files)
├── victoryTrack / defeatTrack    Endgame music
├── enemyTrack                    Combat music
├── crossfadeDuration             Music transition timing
└── spatialSounds                 Positional audio (fridge hum, grinder idle, stove sizzle, drain drip)

AudioEngine.web.ts (Tone.js)     AudioEngine.ts (Web Audio API)
├── initTone()                    ├── Procedural synthesis
├── SFX synths (7 instruments)    ├── Phase-specific music playback
├── Music (PolySynth melodies)    └── Spatial audio support
└── Cleanup (stopEngine)

src/config/audio/manifest.json   Audio file manifest
├── ambient                       Horror drone, verdict unsettling
└── sfx                           Chop, sizzle, boiling, mix, pour, pan clang
```

The AudioEngine is a singleton class exported as `audioEngine`. It must be initialized with `initTone()` before any sounds play (requires user gesture for browser audio policy).

## Audio Assets (OGG)

28 OGG audio files are available, referenced by `audio.json`:

### Challenge Music Tracks
- `music/track_exploration.ogg` — Ingredients phase
- `music/track_violence.ogg` — Chopping and grinding phases
- `music/track_death_metal.ogg` — Stuffing phase
- `music/track_revenge.ogg` — Cooking and blowout phases
- `music/track_dark.ogg` — Tasting phase
- `music/track_unsettling_victory.ogg` — Victory
- `music/track_boss_horror.ogg` — Defeat
- `music/track_kick_harder.ogg` — Enemy encounters

### Spatial Sound Loops
- `fridge_hum_loop.ogg` — Fridge ambient hum (position: [-2.5, 1.0, -2.0])
- `grinder_idle_loop.ogg` — Grinder idle loop (position: [1.5, 0.9, -1.5])
- `sizzle_loop_1.ogg` — Stove sizzle (position: [2.0, 0.9, 1.5])
- `drain_drip_loop.ogg` — Drain drip (position: [0.0, 0.0, 0.0])

### SFX (from manifest.json)
- `audio/sfx/chop-1.ogg`, `audio/sfx/chop-2.ogg` — Chopping hits
- `audio/sfx/sizzle-loop.ogg` — Cooking sizzle
- `audio/sfx/boiling.ogg` — Boiling water
- `audio/sfx/mix-wet.ogg` — Mixing sound
- `audio/sfx/pour.ogg` — Pouring
- `audio/sfx/pan-clang.ogg` — Pan impact

### Ambient
- `audio/ambient-horror.ogg` — Horror ambient drone
- `audio/verdict-unsettling.ogg` — Verdict reveal ambience

## Sound Effects

### Grinder (Brown Noise + LFO Tremolo)

```text
NoiseSynth (brown) → LFO (15 Hz, -20 to -10 dB) → Destination
```

Continuous grinding rumble. LFO creates rapid amplitude tremolo for a mechanical feel. Start/stop with `startGrinder()` / `stopGrinder()`.

### Stuffing Squelch (Membrane Synth)

```text
MembraneSynth (sine, exponential attack, high octave range) → Destination
```

Short wet squelch sound. Triggered per press with `playStuffingSquelch()` at C2.

### Pressure Tone (Rising Oscillator)

```text
Oscillator (sine, 50 Hz base) → Destination
```

Continuous tone that rises in pitch (50–800 Hz) and volume (-20 to -5 dB) as pressure increases. Updated per frame with `updatePressure(intensity)`. Stopped with `stopPressure()`.

### Countdown Beep (Synth)

```text
Synth (sine, quick attack/decay) → Destination
```

Short beep. Normal: C4. Final beep: C5 (higher pitch). Triggered with `playCountdownBeep(final?)`.

### Blow Whoosh (Filtered White Noise)

```text
NoiseSynth (white, slow attack) → Filter (lowpass, 200→2000 Hz ramp) → Destination
```

Rising whoosh effect. Filter frequency ramps from 200 Hz to 2000 Hz over 2 seconds. Start/stop with `startBlowWhoosh()` / `stopBlowWhoosh()`.

### Slam Impact (Membrane Synth)

```text
MembraneSynth (fast attack, low octave, loud) → Destination
```

Heavy impact sound at C1. For BUT FIRST events (not yet integrated). Triggered with `playSlam()`.

### Sizzle (Pink Noise)

```text
NoiseSynth (pink, medium envelope) → Destination
```

Cooking sizzle effect. Triggered with `playSizzle()`.

### Burst (One-Shot White Noise)

```text
NoiseSynth (white, fast attack, quick decay, loud) → Destination
```

Explosive burst for stuffing pressure overflow. Creates a new synth instance per trigger (fire-and-forget). Triggered with `playBurst()`.

## Music

### Title Jingle

```text
PolySynth → Destination
melody: E4 G4 A4 G4 E4 C4 E4 G4 (8th notes)
```

Short major-key jingle. Plays on title screen.

### Rating Song

Three melodies based on score:
- **High (≥4):** C4 E4 G4 C5 (ascending major)
- **Medium (>1):** C4 D4 E4 C4 (neutral, goes nowhere)
- **Low (≤1):** C4 G3 E3 C3 (descending, sad)

## Integration Points

| Challenge | Sounds Used |
|-----------|------------|
| Ingredient Selection | Phase music (`track_exploration.ogg`), spatial fridge hum |
| Chopping | Phase music (`track_violence.ogg`), chop SFX |
| Grinding | `startGrinder()`, `stopGrinder()`, phase music (`track_violence.ogg`), spatial grinder idle |
| Stuffing | `playStuffingSquelch()`, `updatePressure()`, `stopPressure()`, `playBurst()`, phase music (`track_death_metal.ogg`) |
| Cooking | `playSizzle()`, `playCountdownBeep()`, phase music (`track_revenge.ogg`), spatial stove sizzle |
| Blowout | Phase music (`track_revenge.ogg`) |
| Tasting | `playRatingSong(rating)`, phase music (`track_dark.ogg`) |
| Victory | `track_unsettling_victory.ogg` |
| Defeat | `track_boss_horror.ogg` |
| Enemy Encounter | `track_kick_harder.ogg` |
| Title Screen | `playTitleJingle()` |
| Ambient | Horror drone, drain drip (spatial) |

## What's Remaining

1. **Native audio implementation** — The native path in `AudioEngine.ts` is a no-op stub; needs a real implementation using `expo-av` or `react-native-audio-api` for iOS/Android
2. **Ingredient selection feedback** — No sound on correct/wrong ingredient pick
