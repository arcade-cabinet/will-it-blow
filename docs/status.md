---
title: Project Status & Remaining Work
domain: core
status: current
last-verified: 2026-03-13
depends-on: [architecture, game-design, testing]
agent-context: doc-keeper
summary: "Greenfield rebuild status — feat/poc-exploration branch, gap analysis complete"
---

# Project Status & Remaining Work

**Last updated:** 2026-03-13

## Current State: Greenfield Rebuild

The `feat/poc-exploration` branch is a **deliberate architectural reboot** — not an evolution of main. The old Phase 2 ECS architecture (miniplex, orchestrators, 75 files, 1529 tests) was deleted in favor of self-contained procedural R3F station components.

### Completion Status

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 55% | 13-phase state machine, 9 station components; missing HUDs, results, scoring UI |
| 3D visuals | 65% | Procedural stations + GLB kitchen + camera rail + SurrealText |
| Physics/Rapier | 60% | Sausage bone-chain ported; PhysicsFreezerChest partial |
| Audio | 40% | Single Tone.js AudioEngine; OGG samples exist; minimal station wiring |
| Camera system | 85% | CameraRail + IntroSequence + FirstPersonControls working |
| Demand scoring | 75% | DemandScoring + IngredientMatcher work; no display UI |
| Multi-round | 70% | RoundManager works; TrapDoorAnimation exists; no RoundTransition UI |
| State management | 60% | 236-line Zustand store; dead fields; no full reset; `finalScore: any` |
| Mobile controls | 40% | PlayerHands + SwipeFPSControls; no joystick; untested on devices |
| Testing | 15% | 7 suites, 62 tests (52 pass, 10 fail) |
| Documentation | 50% | Being updated this session; was describing main, not greenfield |
| CI/CD | 80% | Parallel jobs work; references deleted files |

## What Works

### Playable Mechanics
- Phase progression via dev shortcuts (n/p keys)
- Grinder crank with drag interaction
- Stuffer fill with hold-to-fill pressure management
- Stove heat control with FBO grease wave simulation
- Chopping block knife gestures
- Blowout station with TieGesture
- Camera smoothly rails between stations (~2.5s ease-in-out)
- Mr. Sausage procedural character with 9 reactions
- Diegetic SurrealText for in-world instructions

### Engine Systems
- DemandScoring calculates demand bonus (ingredient tags, cook preference)
- IngredientMatcher resolves tag-based criteria
- RoundManager tracks C(12,3) ingredient combinations
- DifficultyConfig reads 5 tiers from difficulty.json
- DialogueEngine walks dialogue trees with typewriter text
- GameOrchestrator initializes demands and calculates final score on DONE

### Infrastructure
- Git LFS for binary assets (62 files: .ogg, .png, .glb)
- Biome 2.4 linting and formatting
- CI runs lint, typecheck, test, build in parallel

## What's Missing (Gap Inventory)

### Critical Path (needed for playable game)

| Component | Priority | Description |
|-----------|----------|-------------|
| GameOverScreen | P0 | Results screen with rank badge — `appPhase: 'results'` renders nothing |
| LoadingScreen | P0 | Asset preload UI — Suspense fallback is `null` |
| returnToMenu() | P0 | Full game reset — no way to restart after completion |
| GameOrchestrator phases | P1 | TIE_CASING and BLOWOUT missing from PHASES array |
| ChestFreezer interactivity | P1 | Ingredient selection station is a stub |
| Per-station HUDs | P1 | GrindingHUD, StuffingHUD, CookingHUD, BlowoutHUD |
| IngredientChallenge | P1 | Ingredient picking overlay (bridge pattern) |
| TastingChallenge | P1 | Verdict with demand breakdown and rank reveal |

### Important (needed for polish)

| Component | Priority | Description |
|-----------|----------|-------------|
| ChallengeHeader | P2 | "CHALLENGE N/7" display |
| StrikeCounter | P2 | 3 lives display |
| ProgressGauge | P2 | Animated progress bar |
| ChallengeRegistry | P2 | Variant selection, challenge configs |
| SausagePhysics | P2 | Pure scoring functions |
| assetUrl.ts | P2 | Dynamic asset URL for GitHub Pages |
| CRT shader | P2 | TV uses basic materials, no CRT effect |
| RoundTransition | P2 | Between-round UI |

### Store Cleanup

| Issue | Description |
|-------|-------------|
| Dead fields | `dialogueActive` and `currentDialogueLine` never read |
| Untyped score | `finalScore: any` needs proper interface |
| Console suppression | App.tsx hides `Maximum update depth exceeded` — masks real React bugs |
| Test failures | 10 of 62 tests fail; gameStore.test.ts references nonexistent actions |

## Architecture Comparison (main vs feat/poc-exploration)

| Metric | main branch | feat/poc-exploration | Change |
|--------|-------------|---------------------|--------|
| Source components | ~118 | 34 | -71% |
| ECS files | 75 (miniplex) | 0 | Deleted |
| Config files | 36 (JSON) | 1 (difficulty.json) | -97% |
| Store size | 1038 lines | 236 lines | -77% |
| Test suites | ~96 | 7 | -93% |
| Tests | ~1529 | 62 | -96% |
| Binary assets | 0 (untracked) | 62 (Git LFS) | New |
| Challenge patterns | ECS orchestrator + bridge | Self-contained stations | Simplified |
| Camera | FPS free-walk (WASD) | Camera rail (automatic) | Changed |
| Audio | 2 files (.web.ts + .ts) | 1 file (AudioEngine.ts) | Merged |

## Systems Deleted in POC Pivot

These existed on main and are NOT on feat/poc-exploration:
- ECS (miniplex 2.0): types, world, 7 systems, 3 renderers, 4 orchestrators
- Layout system: resolveLayout, FurnitureLayout, gen-anchors
- InputManager: JSON bindings, keyboard/mouse/gamepad/touch
- FPS free-walk: FPSController, MobileJoystick
- Enemy encounters: EnemySpawnSystem, CombatSystem, CabinetBurst, CombatHUD
- Hidden objects: CabinetDrawer, KitchenAssembly, HiddenObjectOverlay
- Cleanup mechanics: CleanupManager, CleanupHUD, ProceduralSink (lathe)
- Horror props loader: tiered HorrorPropsLoader
- Code splitting: React.lazy() at phase boundaries
- WebXR: @react-three/xr integration
- AsyncStorage persistence
- CRT shader: TSL NodeMaterial
- Settings screen with volume/mute controls

## Recent Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-13 | Gap analysis complete: macro/meso/micro review of PR vs main |
| 2026-03-13 | POC materials purged; knowledge folded into domain docs |
| 2026-03-12 | Multi-round replayability and missing interactions restored |
| 2026-03-12 | Full production parity: dialogue system, mobile controls |
| 2026-03-11 | Demand scoring and ingredient matching restored |
| 2026-03-11 | Sausage bone-chain physics ported from POC |
| 2026-03-10 | Greenfield procedural rewrite initiated |
| 2026-03-10 | Git LFS configured for binary assets |

## Remaining Work (Prioritized)

### Priority 1: Playable Game Loop
1. Implement GameOverScreen (results with rank badge)
2. Add returnToMenu() full reset action to store
3. Wire TIE_CASING and BLOWOUT into GameOrchestrator PHASES
4. Build ChestFreezer ingredient selection with interactivity
5. Add LoadingScreen with asset preload progress

### Priority 2: Challenge Polish
6. Build per-station HUDs (thin, read-only Zustand subscribers)
7. Implement IngredientChallenge and TastingChallenge overlays
8. Add ChallengeHeader, StrikeCounter, ProgressGauge UI components
9. Port CRT shader (TSL NodeMaterial) back to TV.tsx

### Priority 3: Engine Completeness
10. Restore ChallengeRegistry (variant selection)
11. Restore SausagePhysics (pure scoring functions)
12. Add assetUrl.ts for GitHub Pages deployment
13. Fix 10 failing tests; expand test coverage

### Priority 4: Cross-Platform
14. Native audio engine (expo-av)
15. Mobile device testing
16. Joystick overlay for mobile navigation
