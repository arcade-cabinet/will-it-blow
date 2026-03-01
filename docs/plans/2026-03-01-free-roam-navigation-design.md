# Free-Roam Kitchen Navigation

## Problem

The current CameraWalker uses fixed waypoints with mouse-drag look. This creates two bugs:
1. Camera drag doesn't work (overlay captures pointer events before canvas)
2. Feels like isolated stations rather than one unified kitchen

The fridge also shows black because fridge.glb was added but never loaded.

## Design

### Starting State

Camera spawns at center of kitchen `[0, 1.6, 0]` facing the CRT TV `[0, 2.5, -5.5]`. Mr. Sausage greets you, then guides you to the fridge.

### Movement Controls

**Desktop (web) — FPS pointer lock:**
- Click canvas to enter pointer lock (browser `requestPointerLock`)
- Mouse movement controls yaw/pitch (no limits — full 360° horizontal, ~±80° vertical)
- WASD keys move forward/back/strafe relative to camera facing
- Shift for run (optional)
- ESC exits pointer lock
- Movement speed: ~3 units/sec walk, ~5 units/sec run
- Collision: clamp position to room bounds (simple AABB, no physics engine needed)
- Camera height fixed at 1.6 (eye level)

**Mobile (detected via Expo `Platform.OS`):**
- Left virtual joystick overlay: movement (forward/back/strafe)
- Right half of screen: touch drag for look (no pointer lock needed)
- Joystick component: simple `PanResponder`-based circle with thumb indicator
- Rendered as React Native overlay, same layer as challenge UI

**XR:**
- @react-three/xr already integrated — standard teleport or smooth locomotion
- Out of scope for this implementation (existing XR support remains)

### Station Proximity Triggers

Each station has a trigger radius (~1.5 units). When the player enters the zone for the next sequential challenge, it activates:

```
Station 0 (Fridge):   center [-5.16, _, -5.02], radius 2.0
Station 1 (Grinder):  center [-4.75, _, -0.64], radius 1.5
Station 2 (Stuffer):  center [2.28, _, 2.25],   radius 1.5
Station 3 (Stove):    center [-4.98, _, -2.23],  radius 1.5
Station 4 (CRT TV):   center [0, _, -5.5],       radius 2.0
```

Distance check runs in `useFrame` — 2D distance (xz plane) between camera and station center.

### Waypoint Guidance

- After each challenge completes, Mr. Sausage says where to go next
- A subtle glowing marker (point light or emissive mesh) pulses at the next station
- Marker disappears when challenge activates

### Fridge Fix

- Load `public/models/fridge.glb` via `useGLTF` in FridgeStation
- Position at `[-5.16, 0, -5.02]` (aligned with kitchen.glb fridge location)
- In KitchenModel, find and hide the fridge mesh from kitchen.glb (by name "Cube001_2" or similar)
- Procedural shelves + ingredients render inside the loaded fridge model
- FridgeDoor procedural animation removed (fridge.glb has its own door via KitchenModel animation)

## Files Changed

| File | Change |
|------|--------|
| `src/components/GameWorld.tsx` | Replace CameraWalker with FPSController. Add proximity trigger logic. Remove STATION_CAMERAS. |
| `src/components/controls/FPSController.tsx` | NEW — Pointer lock + WASD + mouse look (desktop) |
| `src/components/controls/MobileJoystick.tsx` | NEW — Virtual joystick overlay (mobile) |
| `src/components/kitchen/FridgeStation.tsx` | Load fridge.glb via useGLTF, remove procedural FridgeDoor |
| `src/components/kitchen/KitchenEnvironment.tsx` | Hide fridge mesh from kitchen.glb when FridgeStation is active |
| `src/components/kitchen/StationMarker.tsx` | NEW — Glowing waypoint indicator |
| `App.tsx` | Add MobileJoystick to overlay when Platform.OS !== 'web' |
| `src/store/gameStore.ts` | Add `playerPosition` state for proximity checks |

## What Gets Removed

- `CameraWalker` component
- `STATION_CAMERAS[]` array
- `MENU_CAMERA` constant
- Mouse-drag event listeners on `gl.domElement`
- `easeInOutQuad` transition logic
