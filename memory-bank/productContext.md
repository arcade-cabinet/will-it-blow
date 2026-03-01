# Product Context — Will It Blow?

## Why This Exists

An arcade cabinet game exploring the horror-comedy crossover in the cooking genre. Part of the `arcade-cabinet` project collection. The game is meant to be tense, funny, and replayable with a short play session (~5 minutes per run).

## Target Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **Web** | Primary dev target | Deployed to GitHub Pages, WebGPU rendering |
| **iOS** | Supported via Expo | react-native-wgpu (Dawn), untested on devices |
| **Android** | Supported via Expo | react-native-wgpu (Dawn), untested on devices |

**Live deployment:** https://arcade-cabinet.github.io/will-it-blow/

## User Experience Goals

- **Tension** — "Will my sausage explode?" drives engagement through each challenge
- **Dark humor** — Horror premise played for laughs (Mr. Sausage is both threatening and absurd)
- **Satisfying mechanics** — Each challenge has distinct feel: picking, dragging, holding, controlling
- **Replayability** — Variant system (seeded challenge parameters) means different criteria/difficulty each run
- **Quick sessions** — Full game loop takes ~5 minutes, encouraging "one more try"

## Input Methods

| Method | Platform | Implementation |
|--------|----------|----------------|
| WASD/Arrow keys + pointer-lock mouse-look | Desktop web | FPSController.tsx |
| Touch joystick | Mobile | MobileJoystick.tsx |
| WebXR | Future (web) | @react-three/xr integrated but not fully utilized |

## Mr. Sausage Character

The central character experience. He appears on an in-game CRT television and:

- Introduces each challenge with dialogue (typewriter text + branching choices)
- Reacts to player performance in real-time (9 procedural animations)
- Delivers the final verdict with dramatic score reveals
- Has a distinct personality: sadistic, demanding, darkly humorous

The CRT shader (chromatic aberration, scanlines, flicker) reinforces the horror atmosphere.

## Aesthetic

- Grimy basement kitchen with PBR textures (tile walls, concrete ceiling, grime decals)
- Fluorescent tube lights with procedural flicker
- CRT television glow
- Butcher shop sign aesthetic for menus
- Red X marks for strikes
- First-person perspective (standing eye height 1.6 units)

## What Players See

```
MENU (butcher shop sign) → LOADING (sausage progress bar) → 5 CHALLENGES → RESULTS (rank badge) → MENU
```

Camera smoothly walks between stations (~2.5 seconds, ease-in-out) between challenges.
