# CLAUDE.md — Will It Blow?

Project-specific instructions for Claude Code when working in this repository.

## What This Is

A sausage-making mini-game built with React Native + Babylon.js (via reactylon) + Expo SDK 51. Cross-platform: web, Android, iOS.

## Commands

```bash
# Development
npx expo start --web          # Web dev server (primary dev target)
npx expo start --android      # Android dev
npx expo start --ios          # iOS dev

# Testing
npm test                      # Run all 61 Jest tests
npm test -- --watch           # Watch mode
npm test -- --ci --forceExit  # CI mode

# Build
npx expo export --platform web --output-dir dist   # Static web export
cd android && ./gradlew assembleDebug               # Android debug APK

# Type checking (test files will show Jest type warnings — ignore those)
npx tsc --noEmit
```

## Architecture

### Three-Layer Rendering
1. **Babylon.js 3D scene** (reactylon `useScene()`) — procedural meshes, no external models
2. **React Native overlay** — all UI components (buttons, progress bars, ratings)
3. **MrSausage3D character** — self-lit procedural mesh present in every scene

### Platform Splitting (Metro file extensions)
- `GameWorld.web.tsx` / `GameWorld.native.tsx` — Engine wrapper
- `AudioEngine.web.ts` (Tone.js) / `AudioEngine.ts` (native no-op stub)
- All other code is cross-platform

### State Machine
```
title → select → grind → stuff → [BUT FIRST?] → blow → [BUT FIRST?] → cook → taste → results
```
Managed by `src/engine/GameEngine.tsx` via React context (`useGame()` hook).

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root layout — SafeAreaView + GameProvider + all overlays |
| `src/engine/GameEngine.tsx` | Phase state machine + React context |
| `src/engine/SausagePhysics.ts` | 5 pure scoring functions |
| `src/engine/Ingredients.ts` | 25 ingredients with stats (taste, texture, burst, blow) |
| `src/engine/Constants.ts` | Phase config, tiers, quotes, Mr. Sausage dialogue |
| `src/components/GameWorld.web.tsx` | Camera compositions + scene switching |
| `src/components/scenes/*.tsx` | 6 Babylon.js 3D scenes (one per game phase) |
| `src/components/characters/MrSausage3D.tsx` | Procedural 3D character with reaction animations |
| `src/components/ui/*.tsx` | 16 React Native overlay components |

## Patterns and Conventions

### 3D Scenes
- Each scene creates all meshes/materials in a `useEffect` that depends on `[scene]`
- Cleanup function disposes every mesh and material (prevents memory leaks)
- MrSausage3D is placed as a JSX return from each scene component
- **Camera compositions** defined in `CAMERA_COMPOSITIONS` object in `GameWorld.web.tsx`
- All MrSausage3D positions must avoid overlapping scene geometry (check casing extensions, table/counter surfaces)

### MrSausage3D
- Uses `disableLighting: true` with emissive colors (self-lit, always visible)
- Head sphere diameter 3.6 at scale 1.0 — extends ~3.5 units tall
- Position prop is [x, y, z], scale prop multiplies entire character
- `reaction` prop drives procedural animation (idle, flinch, laugh, disgust, excitement, nervous, nod, talk)

### UI Overlays
- All use React Native components (cross-platform via react-native-web)
- Font: "Bangers" for all game text
- Sub-phase pattern: overlays use `SubPhase` types for multi-step UX within a single game phase
- Touch events: keep TouchableOpacity mounted across sub-phase changes to prevent onPressIn/onPressOut loss

### Scoring Balance
- Taste (60%) + Blow (20%) + No-burst bonus (20%) + BUT FIRST bonus
- High-taste ingredients have low blowPower (intentional trade-off)
- THE SAUSAGE KING (100) requires BUT FIRST bonus — by design
- Ingredient stats: tasteMod (−1 to 5), textureMod (0-5), burstRisk (0-0.9), blowPower (0-5)

### Testing
- Jest with react-native preset + babel-preset-expo
- Tests cover pure logic only (SausagePhysics, Ingredients, Constants, scoring pipeline)
- No React component render tests (Babylon.js ESM imports incompatible with Jest)
- Balance sanity tests verify ingredient stat distributions

## CI/CD

- `.github/workflows/ci.yml` — Tests + Android debug APK build (push/PR)
- `.github/workflows/cd.yml` — Web export → GitHub Pages deploy (push to main)

## Common Pitfalls

- **Babylon.js ESM in Jest**: Can't import Babylon or reactylon in tests. Test pure logic modules only.
- **Stale closure in render loops**: Use `useRef` for values read inside `onBeforeRenderObservable` callbacks.
- **Camera inside mesh**: If you position camera too close to a mesh or change radius too small, you get a black screen. Check `CAMERA_COMPOSITIONS` values.
- **MrSausage3D overlap**: The character is ~3.5 units tall at scale 1.0. When positioning in scenes, verify the character doesn't clip into animated geometry (casing in StufferScene extends to x=10.5 at 100%).
- **useEffect deps in scenes**: Scene setup effects should depend on `[scene]` only. Use refs for values that change frequently (cookProgress, hasBurst) to avoid rebuilding the entire scene.
