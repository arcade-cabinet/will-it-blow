---
title: Tech Context
domain: memory-bank
status: current
last-verified: "2026-03-13"
depends-on:
  - deployment
summary: "Tech stack, build tools, dependencies, known pitfalls"
---

# Tech Context — Will It Blow?

## Core Stack

| Technology | Version | Role |
|-----------|---------|------|
| React Native | 0.83.2 | UI framework, cross-platform runtime |
| Three.js | 0.183.1 | 3D engine |
| React Three Fiber | 9.5.0 | React reconciler for Three.js (declarative JSX scene graph) |
| @react-three/drei | 10.7.7 | R3F helpers: useGLTF, useTexture, Environment, etc. |
| @react-three/rapier | — | Rapier physics engine (bone-chain sausage, spring forces, colliders) |
| Expo | 55.0.0 | Build toolchain, dev server, deployment |
| Zustand | 5.0.11 | State management (single store, no React Context) |
| Tone.js | 15.1.22 | Web audio (being supplemented by OGG samples) |
| react-reconciler | ^0.33.0 | React reconciler |

### Removed in POC Pivot

| Technology | Status | Notes |
|-----------|--------|-------|
| miniplex (ECS) | Removed | Old Phase 2 ECS architecture deleted |
| @react-three/xr | Removed | WebXR deferred |
| @react-three/cannon | Removed | Replaced by @react-three/rapier |

## Build & Dev Tools

| Tool | Version/Config | Purpose |
|------|---------------|---------|
| **pnpm** | — | Package manager (NOT npm or yarn). Lockfile: `pnpm-lock.yaml` |
| **Biome** | 2.4 | Linter + formatter (NOT ESLint/Prettier) |
| **Metro** | — | Bundler |
| **Jest** | — | Test runner with react-native preset |
| **TypeScript** | — | Type checking via `pnpm typecheck` (node --stack-size=8192) |
| **Git LFS** | — | Tracks binary assets: `.ogg`, `.png`, `.glb` |
| **GitHub Actions** | — | CI (tests on push) + CD (GitHub Pages deploy) |

## Commands

```bash
# Development
npx expo start --web          # Web dev server (primary dev target)

# Testing
pnpm test                     # Run all Jest tests
pnpm test:ci                  # CI mode (--ci --forceExit)

# Linting & formatting
pnpm lint                     # Check lint + format errors (Biome)
pnpm format                   # Auto-fix lint + format errors (Biome)

# Type checking
pnpm typecheck                # node --stack-size=8192 (required for Three.js types)
```

## Platform Split

No platform-specific files on the greenfield branch. A single `AudioEngine.ts` handles Tone.js synthesis (the `.web.ts` / `.ts` split from main is not present).

Everything (including the entire 3D layer) is unified cross-platform.

## Audio Assets

OGG sample files supplement the previous pure Tone.js synthesis approach:
- Located in `public/audio/` (or similar asset directory)
- Tracked via Git LFS (binary assets)
- Per-station sound effects, ambient drone, verdict music

## Assets

| Asset | Location | Notes |
|-------|----------|-------|
| kitchen.glb | public/models/ | PBR-textured kitchen (Blender bake, Draco compressed) |
| PBR textures | public/textures/ | AmbientCG 1K-JPG sets (tile, concrete, grime) |
| OGG audio | public/audio/ | Sample-based SFX and music, Git LFS tracked |
| environment.env | public/textures/ | Prefiltered IBL cubemap |

## Known Technical Pitfalls

1. **TypeScript stack overflow:** `npx tsc --noEmit` crashes — Three.js recursive types exceed Node default stack. Use `pnpm typecheck` (sets --stack-size=8192). `skipLibCheck: true` alone is insufficient.
2. **import.meta in Metro:** Zustand ESM uses `import.meta.env.MODE`. Must have `unstable_transformImportMeta: true` in babel.config.js.
3. **useGLTF in tests:** Must mock `@react-three/drei`'s `useGLTF` — file loading doesn't work in Node.js.
4. **Stale closures in useFrame:** Use `useRef` for values read inside `useFrame` callbacks.
5. **`let` + closure = `never` type:** TypeScript can't track mutations inside callbacks. Assign to `const` after null guard.
6. **sphereGeometry takes radius, not diameter:** Babylon.js used `diameter: 3.6` -> R3F uses `args={[1.8, 24, 24]}` (radius, widthSegments, heightSegments).
7. **Camera inside mesh:** Check STATION_CAMERAS values. Camera needs >= 0.5 units clearance from solid meshes.
8. **Three.js transform allowlist:** `jest.config.js` must include `three` and `@react-three` in `transformIgnorePatterns` or tests fail with ESM syntax errors.
9. **Git LFS required:** Binary assets (.ogg, .png, .glb) are tracked via Git LFS. Clone with `git lfs install && git lfs pull` to get actual file contents.
