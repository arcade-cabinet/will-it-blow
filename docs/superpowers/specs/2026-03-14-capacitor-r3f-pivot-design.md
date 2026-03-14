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
- AudioEngine.ts (rewritten for Tone.js — sample playback, procedural synth, effects chains)

**Note:** `assetUrl.ts` was deleted and not preserved. Not needed — Vite serves `public/` at root, so asset paths are just `/models/foo.glb`. Remove any `assetUrl()` imports from restored files.

## What Needs Rewrite (RN → Web)

**TitleScreen.tsx + DifficultySelector.tsx:** These use React Native primitives (`Animated`, `StyleSheet`, `Text`, `TouchableOpacity`, `View`, `Pressable`). Must be rewritten to standard HTML/CSS:
- `View` → `div`
- `Text` → `span`/`p`
- `TouchableOpacity`/`Pressable` → `button`
- `StyleSheet.create` → CSS modules or inline styles
- `Animated` → CSS transitions or framer-motion
- `accessibilityRole`/`accessibilityLabel` → standard `role`/`aria-label`

**GameOrchestrator.tsx:** Has a `typeof window.addEventListener !== 'function'` guard added for RN. Remove the guard — `window.addEventListener` always exists in a browser.

**assetUrl.ts:** Was deleted and not preserved in port-reference. Not needed — Vite serves `public/` at root, so asset paths are just `/models/foo.glb`, `/audio/bar.ogg`. All GLB loading calls (`useGLTF`, `useTexture`) already use these paths in the R3F components. Delete any references to `assetUrl` in restored files and use direct `/public` paths.

## What Stays As-Is

- `src/engine/` — GameOrchestrator, ChallengeRegistry, RoundManager, IngredientMatcher, Ingredients, DemandScoring, DialogueEngine, DifficultyConfig, SausagePhysics + all tests
- `src/ecs/` — kootaWorld, traits, actions, hooks, queries + all tests
- `src/config/` — all 25+ JSON config files + TypeScript accessors
- `src/data/dialogue/` — all 8 dialogue files
- `src/db/schema.ts`, `src/db/queries.ts`, `src/db/drizzleQueries.ts` — schema and queries unchanged
- `src/input/InputManager.ts` + test
- `public/` — all models, audio, textures, fonts
- `docs/` — all documentation (AGENTS.md, CLAUDE.md updated as part of implementation)
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

The port-reference `AudioEngine.ts` uses raw Web Audio API (`AudioContext`) — NOT Howler.js despite Howler being in deps. This already works in a browser. Rewrite AudioEngine to use Tone.js (replaces the raw Web Audio API version):
- `Tone.Player` for sample playback (chop, grind, sizzle, etc.)
- `Tone.Synth` / `Tone.NoiseSynth` for procedural horror ambience
- `Tone.Transport` for scheduling phase-based audio cues
- `Tone.Filter` / `Tone.Reverb` / `Tone.Distortion` for real-time effects (muffled audio during intro, basement reverb)
- Same public API surface (`play`, `loop`, `stop`)

### 3. db/client.ts → dual driver (sql.js web + capacitor-community/sqlite native)

Drizzle ORM has a first-party `sql.js` driver but NOT one for `@capacitor-community/sqlite`. We need both:

**Web (dev + browser):** `sql.js` via `drizzle-orm/sql-js` — WASM SQLite in the browser.

**Native (Capacitor iOS/Android):** Write a thin Drizzle adapter for `@capacitor-community/sqlite`. The adapter implements Drizzle's `SQLJsDatabase`-compatible interface, forwarding `exec`/`run`/`prepare` calls to the Capacitor plugin. This is ~50 lines.

```typescript
import {Capacitor} from '@capacitor/core';

export async function createDb() {
  if (Capacitor.isNativePlatform()) {
    // capacitor-community/sqlite with custom Drizzle adapter
    return createCapacitorDrizzle();
  }
  // sql.js WASM fallback for web
  return createSqlJsDrizzle();
}
```

Both paths use the same Drizzle schema and queries — only the connection differs.

### 4. Gesture handling

`@use-gesture/react` replaces `react-native-gesture-handler`. The R3F components on main already used `@use-gesture/react` for desktop — `useDrag`, `useGesture` hooks. `SwipeFPSControls.tsx` needs a check that it uses `@use-gesture/react` (not RN gesture handler). The restored R3F components from commit `6acdb4a~1` should already have the correct imports since they were written for web.

### 5. Docs update

These files must be updated atomically with implementation:
- `AGENTS.md` — remove all "native-first" / "no web" / Filament / Maestro references
- `CLAUDE.md` — update commands, architecture description
- `docs/memory-bank/techContext.md` — update tech stack
- `docs/memory-bank/activeContext.md` — update current state

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

## Migration Order

This is NOT a big bang. Each phase produces a verifiable checkpoint.

**Phase 1 — Scaffold (checkpoint: blank R3F canvas renders in browser)**
1. Nuke `package.json` deps, write new one with Vite + R3F + Capacitor deps
2. Create `vite.config.ts`, `index.html`, `src/main.tsx`
3. Create `vitest.config.ts`
4. Delete: `babel.config.js`, `metro.config.js`, `.npmrc`, `app.json`, `jest.config.js`, `jest.setup.js`
5. Delete: `src/scene/`, `src/audio/AudioEngine.ts` (expo-audio version), `__mocks__/react-native-filament.js`, other RN mocks
6. Delete: Expo-generated `ios/`, `android/`
7. Verify: `pnpm dev` shows a blank R3F `<Canvas>` in browser

**Phase 2 — Restore R3F components (checkpoint: kitchen renders with furniture)**
1. `git restore` all 85 deleted files from commit `6acdb4a~1`
2. Find-and-replace `useGameStore` imports: `../../store/gameStore` → `../../ecs/hooks`
3. Remove any `assetUrl()` calls — replace with direct `/models/foo.glb` paths
4. Wire restored components into `main.tsx` App
5. Verify: kitchen scene renders in browser with furniture + horror props

**Phase 3 — Rewrite RN UI + persistence (checkpoint: full game loop works in browser)**
1. Rewrite `TitleScreen.tsx` + `DifficultySelector.tsx` from RN primitives to HTML/CSS
2. Rewrite `db/client.ts` for sql.js + Drizzle
3. Rewrite AudioEngine with Tone.js (sample playback + procedural + effects)
4. Restore Playwright config + E2E specs
5. Verify: can play a full round in browser — title → difficulty → kitchen → cook → score

**Phase 4 — Capacitor native shell (checkpoint: iOS + Android apps launch)**
1. `npx cap init`, create `capacitor.config.ts`
2. `npx cap add ios && npx cap add android`
3. `pnpm build && npx cap sync`
4. Verify: Capacitor iOS/Android apps launch and show the game

**Phase 5 — Tests + polish (checkpoint: all tests green)**
1. Migrate Jest tests to Vitest (`jest.fn()` → `vi.fn()`, etc.)
2. Run Vitest, fix failures
3. Run Playwright E2E, fix failures
4. Update AGENTS.md, CLAUDE.md, memory bank docs
5. Verify Tone.js AudioEngine works in Capacitor WebView

## Capacitor Plugins

Beyond the core `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`:

| Plugin | Purpose | Replaces |
|--------|---------|----------|
| `@capacitor-community/sqlite` | Native SQLite persistence | op-sqlite |
| `@capacitor/haptics` | Vibration feedback on interactions | expo-haptics |
| `@capacitor/screen-orientation` | Lock to landscape during gameplay | expo-screen-orientation |
| `@capacitor-community/keep-awake` | Prevent screen sleep during gameplay | expo-keep-awake |

All required. All get wired in during Phase 4.

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
