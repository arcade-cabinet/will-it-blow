# Active Context — Will It Blow?

**Last updated:** 2026-03-01

## Current Branch

`feat/physics-gameplay`

## Current Focus

Documentation overhaul is complete. Ready for gameplay feature work and polish.

## Recent Work

### Documentation Infrastructure Overhaul (2026-03-01) -- COMPLETE

- **Frontmatter** added to all 26 docs (9 core + 15 plans + 2 AGENTS.md) with structured metadata: title, domain, status, engine, last-verified, depends-on, agent-context, summary
- **AGENTS.md hierarchy** created at 4 levels: root, docs/, docs/plans/, memory-bank/ -- provides multi-agent coordination and scoped instructions
- **Memory bank** created (7 files): projectbrief, productContext, systemPatterns, techContext, activeContext, progress, AGENTS.md -- persistent session context
- **`.claude/agents/`** created (5 agents): scene-architect, challenge-dev, store-warden, asset-pipeline, doc-keeper -- specialized agent roles
- **`.claude/commands/`** created (3 commands): playtest, lint-and-test, update-docs -- reusable workflows
- **JSDoc coverage** expanded from ~21% to ~90%+ across ~47 production source files
- **TypeDoc** configured (`docs/typedoc.json`) for API docs generation
- **CLAUDE.md refactored** to thin wrapper pointing to docs/ directory for details
- **`.github/copilot-instructions.md`** created for GitHub Copilot context
- **`docs/status.md`** updated to reflect all physics/Rapier, grab system, bowl blending, settings, and persistence work

### Physics & Gameplay (2026-03-01) -- COMPLETE

- **Rapier physics sensors** for station proximity triggers (replaced distance-based checks)
- **GrabbableSausage** component: physics-enabled sausage link (RigidBody + CapsuleCollider) with dual rendering (Rapier on web, plain mesh on native)
- **GrabSystem** component: raycasting grab/carry/drop mechanic with receiver pattern, bob animation, emissive pulse highlights
- **Bowl-based blending**: BlendCalculator computes visual properties (color, roughness, chunkiness, shininess) from ingredient stats; BlendMaterial renders PBR ground meat
- **Grinder dual rendering**: Rapier rigid bodies for meat chunks/splatter on web, manual useFrame on native
- **Settings screen**: Volume sliders + mute toggles for music and SFX
- **State persistence**: AsyncStorage via zustand/middleware persist (progress + settings survive sessions)

### Earlier Milestones

- **Babylon.js to R3F migration** -- Completed 2026-02-27. All 3D components rewritten as declarative R3F JSX. Platform split eliminated. 93 new R3F component tests added.
- **CRT shader** -- Migrated from GLSL ShaderMaterial to TSL NodeMaterial for WebGPU compatibility
- **Code splitting** -- React.lazy() + Suspense at phase boundaries, 17 production chunks

## Known Issues

- TypeScript stack overflow requires `node --stack-size=8192` (handled by `pnpm typecheck`)
- Loading screen needs visual polish
- Title screen Continue button is a stub (no save-game resume yet)
- Mobile touch controls untested on real devices
- Native audio is a complete no-op stub
- Large assets (kitchen.glb, textures) may not be in git -- game won't render without them

## Decisions Made

- Zustand over React Context for all game state
- TSL NodeMaterial over GLSL ShaderMaterial (WebGPU compatibility)
- Target-based placement over hardcoded coordinates
- Single GameWorld.tsx over platform-specific splits
- Biome over ESLint/Prettier
- pnpm over npm/yarn
- Rapier physics sensors over distance-based proximity checks
- GrabSystem receiver pattern for object placement (grab -> carry -> drop on receiver)
- BlendCalculator derives visual material from ingredient stats (color averaging, texture variance)
- AsyncStorage persistence for progress + settings

## Session Notes

_Update this section at the start and end of each work session._
