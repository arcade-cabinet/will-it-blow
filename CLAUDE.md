# CLAUDE.md — Will It Blow?

Claude Code-specific instructions. For shared project knowledge, read the cross-agent docs below.

## Required Reading (in order)

1. **`AGENTS.md`** — Project overview, architecture, key files, commands, critical rules
2. **`memory-bank/activeContext.md`** — Current session state and recent changes
3. **`memory-bank/systemPatterns.md`** — Architecture patterns and conventions
4. **`memory-bank/techContext.md`** — Tech stack, dependencies, CI/CD, and **common pitfalls**
5. **`docs/AGENTS.md`** — Documentation index (frontmatter schema, agent routing)

Read these before doing any substantive work. All project knowledge lives there, not here.

## New R3F POC Port Plan (March 10, 2026)

We are fully pivoting from the previous WebGPU/Three.js-only architecture to a faithful port of our React-Three-Fiber (R3F) POCs. 
The goal is to cleanly compose the look, feel, and functionality of the POC into React Native / Expo.

### Analysis & Gap Analysis

**The Vision:**
- A first-person, fixed-camera diorama style where the camera smoothly pans between stations.
- High-quality materials: Metalness, roughness, clearcoat (for grease/meat), and procedural textures.
- A physical sausage that bends, cooks, shrinks, and sizzles based on Rapier physics and SkinnedMesh.

**The Gaps & Changes from Old Design:**
- **Fridge vs. Chest Freezer:** The old design assumed a standing fridge for ingredient selection. The new plan swaps this for a creepy, stained, chest freezer. It is a simple textured box with a lid, allowing for easier PBR modeling and a more fitting horror aesthetic.
- **Physics Engine:** The POC manually called `world.step()` and used manual spring forces to tie Rapier rigidbodies to sausage bones. In R3F, we will leverage `@react-three/rapier` to provide the physics world, but we'll likely still write a custom `useFrame` hook to apply the specific spring forces and bone syncing from the POC.
- **Cooking Simulation:** The FBO (Framebuffer Object) ping-pong simulation for grease ripples in the pan will be ported using Drei's `useFBO`.
- **Procedural Textures:** The POC generated meat textures and tile backsplashes using HTML Canvas APIs. We will encapsulate these into reusable hooks that return `THREE.CanvasTexture` instances.
- **Code Decomposition:** The monolithic POC will be broken into:
  - `src/components/stations/Grinder.tsx`
  - `src/components/stations/Stuffer.tsx`
  - `src/components/stations/Stove.tsx`
  - `src/components/stations/ChestFreezer.tsx`
  - `src/components/sausage/Sausage.tsx` (Physics + SkinnedMesh)
  - `src/components/environment/Kitchen.tsx` (Architecture, lighting, backsplash)

### Bugs / Challenges to Address:
- **React Native WebGL Support:** React Native uses `expo-gl` which has slightly different texture and framebuffer support than desktop browsers. Complex FBO ping-ponging might require fallback formats if `HalfFloatType` is unsupported.
- **Event Handling:** The POC used global `pointerdown`/`pointermove` with raycasters. We will convert this to R3F's built-in `onPointerDown`, `onPointerMove` event handlers on the meshes themselves.
- **Mobile Performance:** SkinnedMesh updates coupled with Rapier physics on 40-50 bones could be heavy. We need to ensure the logic in `useFrame` is garbage-collection friendly (reusing Vectors/Quaternions).

## Claude Code Tools

### Slash Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/playtest` | Launch dev server + open Playwright for playtesting |
| `/lint-and-test` | Run full Biome lint + Jest test suite |
| `/update-docs` | Regenerate TypeDoc and update status.md |

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
