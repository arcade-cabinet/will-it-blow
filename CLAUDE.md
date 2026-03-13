# CLAUDE.md — Will It Blow?

Claude Code-specific instructions. All shared project knowledge lives in AGENTS.md and docs/.

## Required Reading (MANDATORY — every session)

1. **`AGENTS.md`** — Project overview, architecture, commands, rules
2. **`docs/AGENTS.md`** — Full documentation index, frontmatter schema, agent routing
3. **`docs/memory-bank/AGENTS.md`** — Memory bank protocol, session context

Read these before doing any substantive work.

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/playtest` | Launch dev server + open Playwright for playtesting |
| `/lint-and-test` | Run full Biome lint + Jest test suite |
| `/update-docs` | Regenerate TypeDoc and update status.md |

## Quick Commands

```bash
pnpm test                     # Jest tests
pnpm lint                     # Biome lint + format check
pnpm format                   # Biome auto-fix
pnpm typecheck                # TypeScript (needs --stack-size=8192)
npx expo start --web          # Dev server
```

## Claude Code-Specific Behavior

- **Do not run** `npx tsc --noEmit` directly — always use `pnpm typecheck` (increased stack size for Three.js types)
- **Mock `useGLTF`** in any new test file that touches R3F components loading GLBs
- **Use `pnpm`** for all package operations (not npm/yarn)
- **Use `pnpm format`** before committing to satisfy Biome checks
- **Biome 2.4** for all linting/formatting (not ESLint/Prettier)
- **Feature branches** — never push directly to main; use feat/* branches + PRs
- **Squash merge** — preferred merge strategy

## Agent Definitions (`.claude/agents/`)

| Agent | Role |
|-------|------|
| `scene-architect` | 3D scene, R3F components, furniture layout, lighting, materials |
| `challenge-dev` | Challenge overlays, 3D stations, scoring functions, gameplay mechanics |
| `store-warden` | Zustand store integrity, state machine transitions, action correctness |
| `asset-pipeline` | GLB models, textures, asset URLs, model optimization |
| `doc-keeper` | Documentation maintenance, JSDoc, frontmatter, AGENTS.md, TypeDoc |
