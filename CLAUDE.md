# CLAUDE.md — Will It Blow?

Claude Code-specific instructions. All shared project knowledge lives in AGENTS.md and docs/.

## Required Reading (MANDATORY — every session)

1. **`AGENTS.md`** — Project identity (Zoombinis-in-Hell + Ordinary Sausage tribute), design pillars, build principles, architecture, commands, critical rules
2. **`docs/memory-bank/AGENTS.md`** — Memory bank protocol, session context

Read these before doing any substantive work. The **Project Identity** and **Build Principles** sections of AGENTS.md are the quality bar — treat them like a test suite.

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/lint-and-test` | Run full Biome lint + Vitest test suite |
| `/update-docs` | Regenerate TypeDoc and update status.md |

## Quick Commands

```bash
pnpm dev          # Vite dev server
pnpm build        # Production build
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright E2E
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check
pnpm format       # biome check --write
pnpm cap:ios      # Capacitor iOS sync + open
pnpm cap:android  # Capacitor Android sync + open
```

## Claude Code-Specific Behavior

### Tooling
- **Use `pnpm`** for all package operations (not npm/yarn)
- **Use `pnpm format`** before committing to satisfy Biome checks
- **Biome 2.4** for all linting/formatting (not ESLint/Prettier)
- **Tailwind CSS + DaisyUI** for pre-game UI only; gameplay must be diegetic

### Workflow
- **Feature branches** — never push directly to main; use `feat/*` branches + PRs
- **Squash merge** — preferred merge strategy
- **No git worktrees** — they base off wrong commits every time
- **Commit in coherent slices** — data layer → consumers → visuals → tests; each commit leaves typecheck + tests green

### Architecture
- **No 2D overlays** during gameplay — diegetic only via SurrealText
- **Koota ECS** for all game state — no Zustand anywhere
- **JSON as single source of truth** — no hardcoded data duplicates; every tunable lives in `src/config/*.json`
- **Seeded RNG per save** — no `Math.random()` in gameplay code
- **Mock `useGLTF`** in any new jsdom unit test that touches R3F components loading GLBs; prefer browser tests (`tests/micro/*.browser.test.tsx`) for anything visual

### Quality bar (from AGENTS.md Build Principles)
When writing code, consciously apply these — violations should be caught in review:
- **Test-driven**: ship a contract test file before the consumers
- **Doc-driven**: module JSDoc explains WHY, code shows WHAT
- **LOC discipline**: split files past ~400 LOC along clear seams
- **Explicit types at boundaries**: `any` is a code smell
- **No dead code**: delete, don't comment out
- **Named exports, not default**

## Agent Definitions (`.claude/agents/`)

| Agent | Role |
|-------|------|
| `scene-architect` | 3D scene, R3F components, lighting, materials |
| `challenge-dev` | 3D station interactions, scoring functions, gameplay mechanics |
| `store-warden` | Koota ECS integrity, trait schemas, action correctness |
| `asset-pipeline` | GLB models, textures, model optimization |
| `doc-keeper` | Documentation maintenance, JSDoc, frontmatter, AGENTS.md |
