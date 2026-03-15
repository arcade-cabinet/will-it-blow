# GEMINI.md — Will It Blow?

Gemini CLI-specific instructions. For shared project knowledge, read the cross-agent docs below.

## Required Reading (in order)

1. **`AGENTS.md`** — Project overview, architecture, key files, commands, critical rules
2. **`docs/memory-bank/activeContext.md`** — Current session state and recent changes
3. **`docs/memory-bank/systemPatterns.md`** — Architecture patterns and conventions
4. **`docs/memory-bank/techContext.md`** — Tech stack, dependencies, CI/CD, and **common pitfalls**
5. **`docs/AGENTS.md`** — Documentation index (frontmatter schema, agent routing)

Read these before doing any substantive work. All project knowledge lives there, not here.

## Gemini CLI Tools & Workflows

### Quick Commands

```bash
pnpm test                     # Jest tests
pnpm lint                     # Biome lint + format check
pnpm format                   # Biome auto-fix
pnpm typecheck                # TypeScript (needs --stack-size=8192)
npx expo start --web          # Dev server
```

## Gemini-Specific Behavior

- **Do not run** `npx tsc --noEmit` directly — always use `pnpm typecheck` (increased stack size for Three.js types)
- **Mock `useGLTF`** in any new test file that touches R3F components loading GLBs
- **Use `pnpm`** for all package operations (not npm/yarn)
- **Use `pnpm format`** before committing to satisfy Biome checks
- **Be efficient:** Utilize specific tools (`grep_search`, `read_file` with line numbers) and avoid unnecessary global searches or full file reads when simple patterns suffice.
- **Explain Before Acting:** Briefly state intent before executing modifying commands or tool calls.

## Gemini Added Memories
- The user prioritizes "doing it right" (proper architecture, strict types, no band-aids) over speed. They specifically dislike `any` casts and prefer data-driven config over hardcoding.
- User prefers continuous implementation of roadmap items (even while waiting for review) rather than pausing. They emphasize 'engaging' by proactively working on the next logical piece.
- The project uses Biome for linting. Generated directories like `.expo` MUST be in `.gitignore` and removed from git tracking to avoid CI lint failures.
- Established Project Scale Standard:
  - 1 Unit = 1 Meter
  - Character Assets: Use 0.5 Scale (Corrects ~4m raw height to ~2m heroic scale).
- The audio engine was upgraded to Tone.js, which is superior for procedural synthesis and scheduling.
- The project uses a hybrid architecture where state drives logic and syncs to R3F/WebGPU for 3D rendering.
