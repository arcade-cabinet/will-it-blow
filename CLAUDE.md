# CLAUDE.md — Will It Blow?

Claude Code-specific instructions. All shared project knowledge lives in AGENTS.md and docs/.

## Required Reading (MANDATORY — every session)

1. **`AGENTS.md`** — Project overview, native-first architecture, commands, rules
2. **`docs/superpowers/specs/2026-03-13-native-first-pivot-design.md`** — Active design spec
3. **`docs/memory-bank/AGENTS.md`** — Memory bank protocol, session context

Read these before doing any substantive work.

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/lint-and-test` | Run full Biome lint + Jest test suite |
| `/update-docs` | Regenerate TypeDoc and update status.md |

## Quick Commands

```bash
npx expo run:ios              # PRIMARY dev target (native-first)
npx expo run:android          # Android dev build
pnpm test                     # Jest tests
pnpm lint                     # Biome lint + format check
pnpm format                   # Biome auto-fix
pnpm typecheck                # TypeScript (needs --stack-size=8192)
maestro test .maestro/flows/  # E2E tests (Maestro, not Playwright)
```

## Claude Code-Specific Behavior

- **Native-first** — target iOS/Android. Do NOT fix web issues.
- **Do not run** `npx tsc --noEmit` directly — always use `pnpm typecheck` (stack size)
- **Mock `useGLTF`** in any new test file that touches R3F components loading GLBs
- **Use `pnpm`** for all package operations (not npm/yarn)
- **Use `pnpm format`** before committing to satisfy Biome checks
- **Biome 2.4** for all linting/formatting (not ESLint/Prettier)
- **Feature branches** — never push directly to main; use feat/* branches + PRs
- **Squash merge** — preferred merge strategy
- **No git worktrees** — they base off wrong commits every time
- **No 2D overlays** during gameplay — diegetic only via SurrealText
- **Koota ECS** for all state — no Zustand anywhere

## Agent Definitions (`.claude/agents/`)

| Agent | Role |
|-------|------|
| `scene-architect` | 3D scene, R3F components, lighting, materials |
| `challenge-dev` | 3D station interactions, scoring functions, gameplay mechanics |
| `store-warden` | Koota ECS integrity, trait schemas, action correctness |
| `asset-pipeline` | GLB models, textures, model optimization |
| `doc-keeper` | Documentation maintenance, JSDoc, frontmatter, AGENTS.md |
