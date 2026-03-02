# Active Context — Will It Blow?

**Last updated:** 2026-03-02

## Current Branch

`feat/sausage-factory-kitchen` — PR #25 open, ready for merge to main

## Current Focus

Phase 1 (sausage factory kitchen) is complete. ECS orchestrators promoted to full game drivers, thin HUDs replace old 2D overlays. Ready to merge and begin Phase 2.

## Recent Work

### Phase 1 Completion: Orchestrator Promotion (2026-03-02) — COMPLETE

**Commits on `feat/sausage-factory-kitchen`:**
```
06fbfaf fix(hud): apply Biome formatting to HUD timer text elements
ec15f95 chore: delete old 2D challenge overlays
54adbc8 feat(hud): add thin HUD components, rewire App.tsx
78b46e6 feat(ecs): promote StufferOrchestrator to full game driver
93ca03d feat(ecs): promote GrinderOrchestrator to full game driver
690fc49 feat(store): add HUD fields for orchestrator-driven challenges
```

**What changed:**
- GrinderOrchestrator, StufferOrchestrator, CookingOrchestrator promoted from visual-only to full game drivers
- All game logic (phase machines, scoring, strikes, timers, audio, Mr. Sausage reactions) now lives in orchestrators
- 3 new thin HUD components (GrindingHUD, StuffingHUD, CookingHUD) — read-only Zustand subscribers
- 3 old 2D challenge overlays deleted (GrindingChallenge, StuffingChallenge, CookingChallenge)
- Store bridge: challengeTimeRemaining, challengeSpeedZone, challengePhase + setters
- Data flow: 3D input → ECS system → orchestrator → Zustand → HUD display

**Verification:** 769 tests, 55 suites, Biome clean, TypeScript clean

### ECS Architecture (2026-03-01 – 2026-03-02) — COMPLETE

- 6 input primitive systems with InputContract binding
- 3 machine archetypes (grinder, stuffer, stove) with slot-based composition
- MeshRenderer, LightRenderer, LatheRenderer + ECSScene
- MachineEntitiesRenderer with automatic input event wiring

## Known Issues

- TypeScript stack overflow requires `node --stack-size=8192` (handled by `pnpm typecheck`)
- Memory bank docs referenced `CameraWalker.tsx` which does NOT exist — navigation is pure FPS controller
- Phase 1 gaps deferred to Phase 2 Wave 0 (fridge pull gesture, ingredient GLBs, cutting board, hopper tray, sausage physics, flip trigger)

## Decisions Made

- Orchestrators own ALL game logic — HUDs are pure read-only display
- ECS input primitives drive game state (not 2D gestures)
- `challengePhase` store field bridges orchestrator→HUD dialogue transitions
- Old 2D challenge overlays fully deleted (not deprecated)

## What's Next

1. Merge PR #25 to main
2. Begin Phase 2 Wave 0: port remaining POC features (fridge gesture, ingredient GLBs, cutting board, hopper, sausage physics, flip trigger)
3. Phase 2 Waves 1-4: difficulty system, multi-round, blowout mechanic, hidden objects
