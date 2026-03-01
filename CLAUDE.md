# CLAUDE.md — Will It Blow?

Project-specific instructions for Claude Code when working in this repository.

## What This Is

A first-person horror sausage-making mini-game (SAW meets cooking show). React Native 0.83 + React Three Fiber 9.5 + Expo SDK 55. Cross-platform: web, iOS, Android.

For full codebase knowledge, see `AGENTS.md`. For persistent context, see `memory-bank/`.

## Commands

```bash
# Development
npx expo start --web          # Web dev server (primary dev target)

# Testing
pnpm test                     # Run all Jest tests
pnpm test:ci                  # CI mode (--ci --forceExit)

# Linting & formatting (Biome)
pnpm lint                     # Check lint + format errors
pnpm format                   # Auto-fix lint + format errors

# Type checking (needs increased stack for Three.js recursive types)
pnpm typecheck
```

## CI/CD

- `.github/workflows/ci.yml` — Tests on push (main + feat/**)
- `.github/workflows/cd.yml` — Web export → GitHub Pages deploy (push to main)
- **Live:** https://arcade-cabinet.github.io/will-it-blow/

## Common Pitfalls

- **import.meta in Metro**: Zustand ESM uses `import.meta.env.MODE`. Must have `unstable_transformImportMeta: true` in babel.config.js or you get a white screen.
- **useGLTF mocking in tests**: `@react-three/drei`'s `useGLTF` must be mocked in Jest — it depends on file loading that doesn't work in Node.js.
- **Stale closure in useFrame**: Use `useRef` for values read inside `useFrame` callbacks. React state captured at mount time would be stale.
- **sphereGeometry takes radius, not diameter**: Babylon.js used `diameter: 3.6` → R3F uses `args={[1.8, 24, 24]}` (radius, widthSegments, heightSegments).
- **Camera inside mesh**: Check STATION_CAMERAS values. Camera needs ≥0.5 units clearance from solid meshes.
- **MrSausage3D overlap**: The character is ~3.5 units tall at scale 1.0. Verify position in each scene doesn't clip animated geometry.
- **Three.js transform allowlist**: `jest.config.js` must include `three` and `@react-three` in `transformIgnorePatterns` or tests fail with ESM syntax errors.
- **TSL vs GLSL**: WebGPU renderer does not support raw GLSL `ShaderMaterial`. Use TSL (Three Shading Language) `NodeMaterial` instead — it compiles to WGSL for WebGPU or GLSL for WebGL2 fallback. Import node functions from `'three/tsl'`.
- **Metro WebGPU resolver**: On native, bare `'three'` imports are remapped to `'three/webgpu'` by `metro.config.js`. On web, the browser build already uses WebGPU. Direct `'three/webgpu'` imports work on all platforms.
- **TypeScript stack overflow**: `npx tsc --noEmit` crashes with Three.js recursive types. Use `pnpm typecheck` which runs with `node --stack-size=8192`. `skipLibCheck: true` is set in tsconfig but doesn't prevent the overflow alone (the recursion happens in our source code referencing Three.js types, not in `.d.ts` files).
- **`let` + closure = `never` type**: TypeScript can't track mutations inside callbacks (e.g., `scene.traverse()`). If a `let` variable is assigned inside a callback then narrowed after, TS may infer `never`. Fix by assigning to a `const` after the null guard.
