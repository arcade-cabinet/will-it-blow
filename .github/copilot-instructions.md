# Will It Blow? — Copilot Instructions

This is "Will It Blow?", a first-person horror sausage-making mini-game built with React Native + React Three Fiber + Expo.

For full codebase context, see `AGENTS.md` at the project root.

## Quick Reference

- Package manager: pnpm
- Linter: Biome (`pnpm lint`)
- Tests: Jest (`pnpm test`)
- Type check: `pnpm typecheck`
- Dev server: `npx expo start --web`
- State: Zustand (single store at `src/store/gameStore.ts`)
- 3D: React Three Fiber + Three.js WebGPU
