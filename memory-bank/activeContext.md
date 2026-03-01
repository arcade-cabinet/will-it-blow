# Active Context — Will It Blow?

**Last updated:** 2026-03-01

## Current Branch

`feat/physics-gameplay`

## Current Focus

Building agent-optimized documentation infrastructure:
- Adding frontmatter to all docs/ files
- Creating AGENTS.md hierarchy for multi-agent coordination
- Creating memory bank (this directory) for persistent session context
- Setting up .claude/ agents and commands
- Improving JSDoc coverage across source files

## Recent Work

- **Documentation overhaul** — All docs/ files now have frontmatter (title, domain, status, engine, last-verified, depends-on, agent-context, summary)
- **Babylon.js to R3F migration** — Completed 2026-02-27. All 3D components rewritten as declarative R3F JSX. Platform split eliminated. 93 new R3F component tests added.
- **Physics/Rapier integration** — Station proximity triggers via physics sensors (status.md is stale and doesn't fully reflect this work)
- **CRT shader** — Migrated from GLSL ShaderMaterial to TSL NodeMaterial for WebGPU compatibility
- **Code splitting** — React.lazy() + Suspense at phase boundaries, 17 production chunks

## Known Issues

- `docs/status.md` is stale — doesn't reflect physics/Rapier work or latest test counts
- TypeScript stack overflow requires `node --stack-size=8192` (handled by `pnpm typecheck`)
- Loading screen needs visual polish
- Title screen button interactions (Settings, Continue) are stubs with no backing implementation
- Mobile touch controls untested on real devices
- Native audio is a complete no-op stub
- Large assets (kitchen.glb, textures) may not be in git — game won't render without them

## Decisions Made

- Zustand over React Context for all game state
- TSL NodeMaterial over GLSL ShaderMaterial (WebGPU compatibility)
- Target-based placement over hardcoded coordinates
- Single GameWorld.tsx over platform-specific splits
- Biome over ESLint/Prettier
- pnpm over npm/yarn

## Session Notes

_Update this section at the start and end of each work session._
