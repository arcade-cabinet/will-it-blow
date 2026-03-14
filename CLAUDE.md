# CLAUDE.md — Will It Blow?

Claude Code-specific instructions. All shared project knowledge lives in AGENTS.md and docs/.

## Required Reading (MANDATORY — every session)

1. **`AGENTS.md`** — Project overview, architecture, commands, rules
2. **`docs/memory-bank/AGENTS.md`** — Memory bank protocol, session context

Read these before doing any substantive work.

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

- **Use `pnpm`** for all package operations (not npm/yarn)
- **Use `pnpm format`** before committing to satisfy Biome checks
- **Biome 2.4** for all linting/formatting (not ESLint/Prettier)
- **Uses Tailwind CSS + DaisyUI** for UI components
- **Feature branches** — never push directly to main; use feat/* branches + PRs
- **Squash merge** — preferred merge strategy
- **No git worktrees** — they base off wrong commits every time
- **No 2D overlays** during gameplay — diegetic only via SurrealText
- **Koota ECS** for all state — no Zustand anywhere
- **Mock `useGLTF`** in any new test file that touches R3F components loading GLBs

## Agent Definitions (`.claude/agents/`)

| Agent | Role |
|-------|------|
| `scene-architect` | 3D scene, R3F components, lighting, materials |
| `challenge-dev` | 3D station interactions, scoring functions, gameplay mechanics |
| `store-warden` | Koota ECS integrity, trait schemas, action correctness |
| `asset-pipeline` | GLB models, textures, model optimization |
| `doc-keeper` | Documentation maintenance, JSDoc, frontmatter, AGENTS.md |
