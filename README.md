# Will It Blow?

A sausage-making mini-game inspired by the [Ordinary Sausage](https://www.youtube.com/@OrdinarySausage) YouTube channel. Grind absurd ingredients, stuff casings, test "Will It Blow?!", and earn your sausage title — from Sausage Disaster to THE SAUSAGE KING.

Built with React Native + Babylon.js (reactylon) + Expo. Runs on web, Android, and iOS.

## Gameplay

Six interactive phases, each a distinct physics-driven mini-game:

| Phase | Mechanic | Energy |
|-------|----------|--------|
| **Select** | Pick 1-3 ingredients from 25+ pool | Setup |
| **Grind** | Drag-fling ingredients into grinder hopper | HIGH chaos |
| **Stuff** | Drag plunger to fill casing, watch for stress | MEDIUM tension |
| **Blow** | Hold to build pressure, release for splatter (0-5 Mark Ruffalos) | HIGH explosive |
| **Cook** | Click sausage to flip, watch for burst | LOW suspense |
| **Taste** | Cut open, reveal cross-section, get rated (0-5 stars) | Payoff |

**Bonus:** "BUT FIRST!" mini-game interrupts randomly (60% chance) for bonus points.

### Scoring

```
taste (60%) + blow (20%) + no-burst bonus (20%) + BUT FIRST bonus → 0-100
```

Titles: Sausage Disaster (0-19) → Apprentice → Maker → Chef → Master → **THE SAUSAGE KING** (100)

## Tech Stack

- **3D Engine:** Babylon.js via [reactylon](https://github.com/nicolo-ribaudo/reactylon) — procedural meshes, no external models
- **UI:** React Native overlays (cross-platform via react-native-web)
- **Audio:** Tone.js synthesized sound effects (grinder noise, sizzle, jingles)
- **Physics:** cannon-es for rigid body dynamics
- **Platform:** Expo SDK 51 + Metro bundler (web, iOS, Android)

## Quick Start

```bash
# Install dependencies
npm install

# Web (recommended for development)
npx expo start --web

# Android
npx expo start --android

# iOS
npx expo start --ios
```

## Project Structure

```
will-it-blow/
├── App.tsx                     # Root layout (SafeAreaView + GameProvider + overlays)
├── index.js                    # Expo entry point
├── app.json                    # Expo config (web/ios/android)
├── src/
│   ├── engine/
│   │   ├── GameEngine.tsx      # State machine + React context
│   │   ├── SausagePhysics.ts   # Scoring math (5 pure functions)
│   │   ├── Ingredients.ts      # 25 ingredients with stats
│   │   ├── Constants.ts        # Phases, tiers, quotes, Mr. Sausage lines
│   │   ├── AudioEngine.web.ts  # Tone.js audio (web)
│   │   └── AudioEngine.ts      # No-op stub (native)
│   └── components/
│       ├── GameWorld.web.tsx    # 3D scene orchestrator + camera compositions
│       ├── GameWorld.native.tsx # Native scene orchestrator (NativeEngine)
│       ├── scenes/             # 6 Babylon.js 3D scenes (one per phase)
│       ├── characters/         # MrSausage3D procedural character
│       └── ui/                 # 16 React Native overlay components
├── __tests__/                  # Jest test suite (61 tests)
├── android/                    # Native Android project (Gradle)
├── ios/                        # Native iOS project (Xcode)
└── web/                        # Custom Expo web template
```

## Testing

```bash
npm test
```

61 tests across 4 suites:
- **SausagePhysics** (32): Blow, burst, taste, scoring, tier functions
- **Ingredients** (10): Data integrity, pool randomization
- **Constants** (11): Phase ordering, content coverage
- **Pipeline** (8): End-to-end scoring + balance sanity checks

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| **CI** (`ci.yml`) | Push to `main`/`feat/**`, PRs | Runs tests, builds Android debug APK (uploaded as artifact) |
| **CD** (`cd.yml`) | Push to `main`, manual | Exports web build, deploys to GitHub Pages |

## Architecture

Three-layer rendering:

1. **Babylon.js 3D scene** — procedural meshes, physics, particles, per-phase camera compositions
2. **React Native overlay** — UI controls, progress bars, ratings, phase tracker
3. **Mr. Sausage 3D character** — self-lit procedural mesh (head + sunglasses + mustache + chef hat), reaction-driven animations in every scene

Platform splitting via Metro file extensions:
- `GameWorld.web.tsx` / `GameWorld.native.tsx` — Engine wrapper
- `AudioEngine.web.ts` / `AudioEngine.ts` — Tone.js vs no-op

State machine flow:
```
title → select → grind → stuff → [BUT FIRST?] → blow → [BUT FIRST?] → cook → taste → results
```

## Design Documents

- [`docs/plans/2026-02-26-will-it-blow-game-design.md`](docs/plans/2026-02-26-will-it-blow-game-design.md) — Full game design document
- [`docs/plans/2026-02-26-gameplay-elevation-design.md`](docs/plans/2026-02-26-gameplay-elevation-design.md) — Physics mini-game design + Mr. Sausage 3D character spec
