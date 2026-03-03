# CLAUDE.md — Will It Blow?

Claude Code-specific instructions. For shared project knowledge, read the cross-agent docs below.

## Required Reading (in order)

1. **`AGENTS.md`** — Project overview, architecture, key files, commands, critical rules
2. **`memory-bank/activeContext.md`** — Current session state and recent changes
3. **`memory-bank/systemPatterns.md`** — Architecture patterns and conventions
4. **`memory-bank/techContext.md`** — Tech stack, dependencies, CI/CD, and **common pitfalls**
5. **`docs/AGENTS.md`** — Documentation index (frontmatter schema, agent routing)

Read these before doing any substantive work. All project knowledge lives there, not here.

## Claude Code Tools

### Slash Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/playtest` | Launch dev server + open Playwright for playtesting |
| `/lint-and-test` | Run full Biome lint + Jest test suite |
| `/update-docs` | Regenerate TypeDoc and update status.md |

### Specialized Agents (`.claude/agents/`)

| Agent | Role |
|-------|------|
| `scene-architect` | 3D scene, R3F components, furniture layout, lighting, materials |
| `challenge-dev` | Challenge overlays, 3D stations, scoring, gameplay mechanics |
| `store-warden` | Zustand store integrity, state machine transitions, action correctness |
| `asset-pipeline` | GLB models, textures, Blender MCP, model optimization, asset URLs |
| `doc-keeper` | Documentation maintenance, JSDoc, frontmatter, AGENTS.md, TypeDoc |

### Quick Commands

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
