# Capacitor + R3F Pivot — Design Spec

## Goal

Kill Expo/React Native/Filament/Metro. Restore the proven R3F rendering stack, wrap it in Capacitor for native distribution, use Vite as the bundler, Tone.js for audio, and capacitor-community/sqlite for persistence.

## Why

Every claim about Filament, Expo, and React Native fell apart:
- Filament rendering quality is terrible compared to R3F
- Hermes has no WebAssembly (broke Rapier physics)
- pnpm + RN hoisting issues everywhere
- HAS_WORKLETS xcconfig patches needed after every pod install
- expo-av deprecated, expo-audio API different
- Native builds take 8+ minutes and crash constantly
- Metro port conflicts between projects
- The 3D scene looked like garbage compared to the R3F POC

R3F was the ONLY renderer that ever produced a working, good-looking game.

## Architecture

**Stack:**
| Layer | Technology | Replaces |
|-------|-----------|----------|
| Bundler | Vite | Metro |
| UI Framework | React 19 | React Native |
| 3D Renderer | R3F + Three.js | react-native-filament |
| Physics | @react-three/rapier | Bullet3 via Filament |
| State | Koota ECS (from feature branch) | — (stays) |
| Persistence | capacitor-community/sqlite + Drizzle ORM | op-sqlite |
| Audio | Tone.js | expo-audio |
| Native Shell | Capacitor 6 | Expo |
| Unit Tests | Vitest | Jest |
| E2E Tests | Playwright | Maestro |
| Lint/Format | Biome | — (stays) |

## Project Structure

```
will-it-blow/
├── public/                    # Assets (Vite serves, Capacitor copies)
│   ├── audio/
│   ├── models/
│   ├── textures/
│   ├── fonts/
│   └── ui/
├── src/
│   ├── components/            # RESTORED — all R3F components
│   │   ├── camera/            # CameraRail, FirstPersonControls, IntroSequence, PlayerHands
│   │   ├── challenges/        # TieGesture
│   │   ├── characters/        # MrSausage3D, reactions
│   │   ├── controls/          # SwipeFPSControls
│   │   ├── effects/           # CrtShader
│   │   ├── environment/       # BasementRoom, Kitchen, Prop, ScatterProps, SurrealText
│   │   ├── kitchen/           # KitchenSetPieces, LiquidPourer, ProceduralIngredients, TrapDoor*
│   │   ├── sausage/           # Sausage, SausageGeometry
│   │   ├── stations/          # All 9 stations
│   │   └── ui/                # TitleScreen, DifficultySelector + RESTORED HUDs (14 files)
│   ├── player/                # RESTORED — FPSCamera, PlayerCapsule, headBob, useMouseLook, usePhysicsMovement
│   ├── engine/                # KEPT — GameOrchestrator, ChallengeRegistry, RoundManager, etc.
│   ├── ecs/                   # KEPT — Koota world, traits, actions, hooks
│   ├── config/                # KEPT — 25+ JSON configs
│   ├── data/dialogue/         # KEPT — 8 dialogue files
│   ├── db/                    # REWRITTEN — capacitor-community/sqlite + Drizzle
│   ├── input/                 # KEPT — InputManager
│   └── main.tsx               # Vite entry point
├── e2e/                       # RESTORED — Playwright specs
├── android/                   # Capacitor-generated
├── ios/                       # Capacitor-generated
├── index.html                 # Vite HTML entry
├── vite.config.ts             # NEW
├── capacitor.config.ts        # NEW
├── playwright.config.ts       # RESTORED
├── vitest.config.ts           # NEW
├── biome.json                 # KEPT
├── tsconfig.json              # UPDATED for Vite
└── package.json               # REWRITTEN
```

## What Gets Deleted

- `expo`, `react-native`, `react-native-filament`, `react-native-worklets-core`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg`, `react-native-web`, `react-native-worklets`, `react-native-permissions`
- All `expo-*` packages
- `@op-engineering/op-sqlite`, `@react-native/assets-registry`, `@react-native-async-storage/async-storage`, `@react-native-community/cli`, `@react-native/babel-preset`, `@react-native/metro-config`, `@react-native/typescript-config`
- `@bufbuild/protobuf`, `lucide-react-native`, `three-mesh-bvh`, `tsl-textures`, `maath`, `react-reconciler`
- `babel.config.js`, `metro.config.js`, `.npmrc`, `app.json`
- `src/scene/` (all Filament components)
- `src/audio/AudioEngine.ts` (expo-audio version)
- `__mocks__/react-native-filament.js` and other RN-specific mocks
- `ios/` and `android/` (Expo-generated — Capacitor creates its own)
- `.maestro/` (replaced by Playwright)
- `assets/` directory (moved back to `public/`)

## What Gets Restored

All 85 files deleted in commit `6acdb4a` ("chainsaw: delete 55 R3F source files"):

**R3F 3D Components (from `docs/port-reference/` + git history):**
- 9 station components (BlowoutStation, ChestFreezer, ChoppingBlock, Grinder, PhysicsFreezerChest, Sink, Stove, Stuffer, TV)
- Environment (BasementRoom, Kitchen, Prop, ScatterProps, SurrealText)
- Camera (CameraRail, FirstPersonControls, IntroSequence, PlayerHands)
- Characters (MrSausage3D, reactions)
- Sausage (Sausage, SausageGeometry)
- Kitchen (KitchenSetPieces, LiquidPourer, ProceduralIngredients, TrapDoorAnimation, TrapDoorMount)
- Effects (CrtShader)
- Controls (SwipeFPSControls)
- Challenges (TieGesture)

**UI HUDs (14 files):**
- BlowoutHUD, ChallengeHeader, CookingHUD, DialogueOverlay, GameOverScreen, GrindingHUD, IngredientChallenge, LoadingScreen, ProgressGauge, RoundTransition, SettingsScreen, StrikeCounter, StuffingHUD, TastingChallenge

**Player System (6 files):**
- FPSCamera, PlayerCapsule, headBob, useMouseLook, usePhysicsMovement + tests

**Tests (19 files):**
- All UI component tests, CrtShader test, Kitchen test, SurrealText test, TieGesture test, player tests

**E2E + Config:**
- Playwright config + 8 E2E spec files
- Config accessor tests

**Audio:**
- AudioEngine.ts (Howler version from port-reference, to be rewritten for Tone.js)
- assetUrl.ts

## What Stays As-Is

- `src/engine/` — GameOrchestrator, ChallengeRegistry, RoundManager, IngredientMatcher, Ingredients, DemandScoring, DialogueEngine, DifficultyConfig, SausagePhysics + all tests
- `src/ecs/` — kootaWorld, traits, actions, hooks, queries + all tests
- `src/config/` — all 25+ JSON config files + TypeScript accessors
- `src/data/dialogue/` — all 8 dialogue files
- `src/db/schema.ts`, `src/db/queries.ts`, `src/db/drizzleQueries.ts` — schema and queries unchanged
- `src/components/ui/TitleScreen.tsx`, `DifficultySelector.tsx` — title screen UI
- `src/input/InputManager.ts` + test
- `public/` — all models, audio, textures, fonts
- `docs/` — all documentation
- `biome.json` — lint config

## Integration Points

### 1. Zustand → Koota ECS hooks

All restored R3F components import `useGameStore` from Zustand. These imports change from:
```typescript
import {useGameStore} from '../../store/gameStore';
```
to:
```typescript
import {useGameStore} from '../../ecs/hooks';
```
The `hooks.ts` on this branch exposes a Zustand-compatible API — `useGameStore(s => s.gamePhase)` works identically. Find-and-replace across ~30 files.

### 2. AudioEngine → Tone.js

The restored AudioEngine gets rewritten to use Tone.js:
- `Tone.Player` for sample playback (chop, grind, sizzle, etc.)
- `Tone.Synth` / `Tone.NoiseSynth` for procedural horror ambience
- `Tone.Transport` for scheduling phase-based audio cues
- `Tone.Filter` / `Tone.Reverb` / `Tone.Distortion` for real-time effects
- Same public API surface (`play`, `loop`, `stop`)

### 3. db/client.ts → capacitor-community/sqlite

Only file that needs a real rewrite. Same Drizzle ORM schema and queries. Different driver connection:
```typescript
// Before (op-sqlite)
import {open} from '@op-engineering/op-sqlite';
const db = open({name: 'willitblow.db'});

// After (capacitor-community/sqlite)
import {CapacitorSQLite, SQLiteConnection} from '@capacitor-community/sqlite';
const sqlite = new SQLiteConnection(CapacitorSQLite);
const db = await sqlite.createConnection('willitblow', false, 'no-encryption', 1, false);
```

Web dev fallback uses `sql.js` (WASM SQLite) so `pnpm dev` works in a browser without the Capacitor native shell.

## Dependencies

### Added
```
@react-three/fiber, @react-three/drei, @react-three/rapier, @react-three/postprocessing
three, postprocessing
vite, @vitejs/plugin-react
@capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android
@capacitor-community/sqlite
vitest, @testing-library/react, playwright
@use-gesture/react
tone
sql-js (web fallback for SQLite)
```

### Removed
```
expo, expo-*, react-native, react-native-*, @react-native/*, @expo/*
react-native-filament, react-native-worklets-core, react-native-worklets
@op-engineering/op-sqlite, @react-native-async-storage/async-storage
babel-preset-expo, @react-native/babel-preset, @react-native/metro-config
@bufbuild/protobuf, lucide-react-native, three-mesh-bvh, tsl-textures
maath, react-reconciler, convert-source-map, babel-plugin-inline-import
howler, @types/howler
jest, jest-environment-jsdom, @react-three/test-renderer, react-test-renderer
babel-jest, @babel/core, @babel/generator, @babel/preset-env, @babel/runtime
@babel/template, @babel/traverse, @babel/types
```

### Kept
```
koota, drizzle-orm, react, react-dom
biome, typescript, zod
```

## Dev Workflow

```bash
pnpm dev              # Vite dev server — R3F renders in browser, hot reload
pnpm build            # Vite production build
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright E2E
pnpm cap:ios          # npx cap sync && npx cap open ios
pnpm cap:android      # npx cap sync && npx cap open android
pnpm typecheck        # tsc --noEmit
pnpm lint             # biome check
pnpm format           # biome check --write
```

## Success Criteria

1. `pnpm dev` opens a browser with the full R3F kitchen scene — FPS camera, all stations, horror props, PBR textures, working physics
2. All restored unit tests pass via Vitest
3. Playwright E2E specs pass
4. `pnpm cap:ios` produces a working iOS app via Capacitor
5. `pnpm cap:android` produces a working Android app via Capacitor
6. SQLite persistence works on both web (sql.js) and native (capacitor-community/sqlite)
7. Tone.js audio plays samples and procedural sounds
8. Zero Expo, zero React Native, zero Filament in the dependency tree
