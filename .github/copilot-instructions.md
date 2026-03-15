# Copilot Instructions — Will It Blow?

GitHub Copilot-specific instructions. For shared project knowledge, read the cross-agent docs below.

## Required Reading (in order)

1. **`AGENTS.md`** (project root) — Project overview, architecture, key files, commands, critical rules
2. **`docs/memory-bank/activeContext.md`** — Current session state and recent changes
3. **`docs/memory-bank/systemPatterns.md`** — Architecture patterns and conventions
4. **`docs/memory-bank/techContext.md`** — Tech stack, dependencies, CI/CD, and **common pitfalls**
5. **`docs/AGENTS.md`** — Documentation index (frontmatter schema, agent routing)

Read these before doing any substantive work. All project knowledge lives there, not here.

## Copilot-Specific Behavior

- **Package manager:** `pnpm` (not npm/yarn) — completions should use `pnpm add`, `pnpm run`, etc.
- **Linter/formatter:** Biome (not ESLint/Prettier) — do not suggest ESLint configs or Prettier rules
- **3D framework:** React Three Fiber + Three.js WebGPU — do not suggest Babylon.js or raw WebGL
- **State management:** Zustand single store at `src/store/gameStore.ts` — do not suggest React Context or Redux
- **Shaders:** TSL `NodeMaterial` (not GLSL `ShaderMaterial`) — WebGPU renderer requires TSL
- **Type checking:** `pnpm typecheck` (not `npx tsc --noEmit`) — Three.js types overflow default stack
- **useFrame callbacks:** Always use `useRef` for mutable state — React state causes stale closures
