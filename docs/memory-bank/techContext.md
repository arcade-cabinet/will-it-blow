# Tech Context — Will It Blow?

## Core Stack

| Technology | Version | Role |
|-----------|---------|------|
| React | 19 | UI framework |
| Three.js | 0.183+ | 3D engine (WebGL renderer) |
| React Three Fiber | 9.x | React reconciler for Three.js (declarative JSX scene graph) |
| @react-three/drei | 10.x | R3F helpers: useGLTF, useTexture, Environment, etc. |
| @react-three/rapier | — | Rapier physics engine (sensors, rigid bodies, colliders) |
| Capacitor | 6.x | Native iOS/Android deployment (web app in native shell) |
| Vite | 6.x | Dev server + production bundler |
| Koota | — | ECS for all game state (replaces Zustand) |
| Tone.js | 15.x | Web audio synthesis (procedural SFX) |
| sql.js | — | SQLite via WASM (web/dev persistence) |
| @nicepkg/capacitor-sqlite | — | Native SQLite (iOS/Android persistence) |
| drizzle-orm | — | Type-safe SQL query builder |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| DaisyUI | 5.x | Tailwind component library (pre-game UI) |

## Build & Dev Tools

| Tool | Version/Config | Purpose |
|------|---------------|---------|
| **pnpm** | — | Package manager (NOT npm or yarn). Lockfile: `pnpm-lock.yaml` |
| **Biome** | 2.4 | Linter + formatter (NOT ESLint/Prettier) |
| **Vite** | 6.x | Bundler + dev server (replaced Metro) |
| **Vitest** | — | Unit test runner |
| **Playwright** | — | E2E test runner |
| **TypeScript** | — | Type checking via `pnpm typecheck` (tsc --noEmit) |
| **GitHub Actions** | — | CI (tests on push) + CD |

## Commands

```bash
# Development
pnpm dev                      # Vite dev server

# Build
pnpm build                    # Production build

# Testing
pnpm test                     # Vitest unit tests
pnpm test:e2e                 # Playwright E2E tests

# Linting & formatting
pnpm lint                     # Check lint + format errors (Biome)
pnpm format                   # Auto-fix lint + format errors (Biome)

# Type checking
pnpm typecheck                # tsc --noEmit

# Native deployment
pnpm cap:ios                  # Capacitor iOS sync + open Xcode
pnpm cap:android              # Capacitor Android sync + open Android Studio
```

## Rendering Pipeline

- **Web:** Three.js WebGL renderer via React Three Fiber
- **Native:** Same web app wrapped by Capacitor (WebView with native bridge)
- **Shaders:** Standard Three.js materials (MeshStandardMaterial, MeshPhysicalMaterial, etc.)

## Platform Architecture

Capacitor wraps the Vite-built web app in a native WebView, providing:
- Native SQLite access via `@nicepkg/capacitor-sqlite`
- Haptics via `@capacitor/haptics`
- Status bar control via `@capacitor/status-bar`
- Full offline capability

Web is the primary development target. Capacitor provides the native deployment path.

## Testing Stack

- **Unit tests:** Vitest
- **E2E tests:** Playwright
- **Pure logic tests:** SausagePhysics, Ingredients, ChallengeRegistry, IngredientMatcher, DialogueEngine
- **Component tests:** R3F components via test renderer
- **Mocking:** `useGLTF` must be mocked (file loading unavailable in Node.js)

## CI/CD

- `.github/workflows/ci.yml` — Tests on push to `main` and `feat/**` branches
- **Parallel jobs:** lint, typecheck, test, build run concurrently for fast feedback

## Assets

| Asset | Size | Location | Notes |
|-------|------|----------|-------|
| kitchen.glb | 15.5 MB | public/models/ | PBR-textured kitchen (Blender bake, Draco compressed) |
| kitchen-original.glb | 970 KB | public/models/ | Original untextured GLB |
| sausage.glb | 1 MB | public/models/ | Legacy model (unused) |
| PBR textures | ~10 MB total | public/textures/ | AmbientCG 1K-JPG sets (tile, concrete, grime) |
| environment.env | — | public/textures/ | Prefiltered IBL cubemap |

## Known Technical Pitfalls

1. **useGLTF in tests:** Must mock `@react-three/drei`'s `useGLTF` — file loading doesn't work in Node.js.
2. **Stale closures in useFrame:** Use `useRef` for values read inside `useFrame` callbacks.
3. **`let` + closure = `never` type:** TypeScript can't track mutations inside callbacks. Assign to `const` after null guard.
4. **Rapier KINEMATIC_FIXED sensors:** Bodies with type `KINEMATIC_FIXED` need `activeCollisionTypes={15 | 8704}` bitmask for sensor intersection detection. Without it, `onIntersectionEnter`/`onIntersectionExit` callbacks silently never fire.
5. **Camera inside mesh:** Check STATION_CAMERAS values. Camera needs >=0.5 units clearance from solid meshes.
