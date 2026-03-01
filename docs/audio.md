<!--
title: Audio System
domain: core
status: current
engine: r3f
last-verified: 2026-03-01
depends-on: [game-design, development-guide]
agent-context: scene-architect, challenge-dev
summary: Tone.js synthesis, sound design, integration points
-->

# Audio System

## Overview

Audio is fully synthesized using Tone.js on web. No audio samples are loaded — all sounds are generated procedurally from oscillators, noise generators, and filters. This keeps the bundle small and avoids asset loading delays.

Native (iOS/Android) audio is a complete no-op stub (`AudioEngine.ts`).

## Architecture

```text
AudioEngine.web.ts (Tone.js)     AudioEngine.ts (native)
├── initTone()                    ├── All methods are no-ops
├── SFX synths (7 instruments)    └── Placeholder for future implementation
├── Music (PolySynth melodies)
└── Cleanup (stopEngine)
```

The AudioEngine is a singleton class exported as `audioEngine`. It must be initialized with `initTone()` before any sounds play (requires user gesture for browser audio policy).

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
| Ingredient Selection | (none currently) |
| Grinding | `startGrinder()`, `stopGrinder()` |
| Stuffing | `playStuffingSquelch()`, `updatePressure()`, `stopPressure()`, `playBurst()` |
| Cooking | `playSizzle()`, `playCountdownBeep()` |
| Tasting | `playRatingSong(rating)` |
| Title Screen | `playTitleJingle()` |
| BUT FIRST | `playSlam()` (not yet triggered) |

## What's Missing

1. **Native audio implementation** — The `AudioEngine.ts` stub needs a real implementation using `expo-av` or `react-native-audio-api` for iOS/Android
2. **Background music** — No ambient horror soundtrack or looping background audio
3. **Ambient kitchen sounds** — No fridge hum, dripping water, flickering light buzz
4. **Sound effects from downloaded pack** — `Kitchen Sound Effects.zip` contains pre-recorded SFX but is not integrated. Could replace or supplement synth sounds.
5. **Audio settings** — No volume control or mute toggle
6. **Ingredient selection feedback** — No sound on correct/wrong ingredient pick
