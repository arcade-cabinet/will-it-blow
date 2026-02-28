# Mobile-First + XR/AR Design

## Goal

Transform Will It Blow from a web-first 2D-overlay game into a multi-platform immersive experience: mobile touch + gyroscope, XR/AR headsets, and web — all from one codebase with zero throwaway code.

## Architecture: Input Abstraction Layer

All input sources normalize to common game actions via adapters. Adapters write to Zustand store. Game logic is input-agnostic.

```text
TouchAdapter ──┐
GyroAdapter  ──┤
XRAdapter    ──┼──▶ InputActions ──▶ Zustand Store ──▶ Game Logic
PointerAdapter─┤
HapticService ◀┘ (subscribes to store, fires haptics)
```

### InputActions (common language)

- `grab(meshId)` / `release(meshId)` — ingredient selection, fridge interaction
- `look(yaw, pitch)` — gyroscope offset, XR head tracking, mouse drag
- `press(force)` — stuffing pressure
- `swipe(direction, velocity)` — grinding circular gesture
- `tap(meshId)` — simple selection

### Adapters

| Adapter | Platform | Input Source |
|---------|----------|-------------|
| TouchAdapter | Mobile/Web | react-native-gesture-handler |
| GyroAdapter | Mobile | expo-sensors Gyroscope |
| XRAdapter | XR headsets | reactylon useXrExperience() + hand tracking |
| PointerAdapter | All | Babylon.js ActionManager mesh picking |

### HapticService

Subscribes to Zustand store, fires expo-haptics:

| Event | Pattern |
|-------|---------|
| Ingredient tap | Light tap |
| Grinding speed | Rumble scaling with angular velocity |
| Stuffing pressure | Escalating pulse (heavier as burst risk rises) |
| Strike | Sharp impact |
| Burst/defeat | Failure thud pattern |
| Victory | Celebration rhythm |
| Mr. Sausage reactions | Per-reaction: flinch=sharp, laugh=rhythmic, disgust=low rumble |
| Temperature change | Subtle warmth tick |
| Cooking complete | Satisfying ding vibration |

## Physics: Cannon.js → Havok

Replace `cannon-es` with `@babylonjs/havok`:

- WASM-compiled, 10-50x faster
- Official Babylon.js physics engine
- Native XR hand collision support
- Nearly identical API (gravity, physics bodies)

## Fridge: GLB Mesh + 3D Grab

Kill procedural FridgeStation box. Use kitchen.glb fridge mesh:

1. Find fridge mesh by name after GLB loads
2. Animate door open (Y rotation) when player arrives
3. Place ingredient meshes on GLB shelf positions
4. Ingredients: ActionManager.OnPickTrigger (touch/click) + PhysicsBody (XR grab)
5. Selected items float toward camera with shrink animation

## Loading Screen: 3D Sausage Reveal

Mount Babylon engine during loading phase:

1. Minimal scene: dark background, single spotlight
2. Load sausage.glb (~1MB, near-instant)
3. Stream kitchen.glb with progress tracking
4. Sausage opacity 0→1 matching load progress
5. Mr. Sausage quotes rotate every 2s
6. On complete → appPhase = 'playing'

## Gyroscope Camera

On mobile (non-XR):

- expo-sensors Gyroscope provides rotation rates
- Applied as offset to fixed waypoint camera (±30° yaw/pitch)
- Low-pass filter for jitter reduction
- Settings toggle: "Motion Controls: ON/OFF"
- On XR: head tracking replaces this natively

## XR/AR Integration

reactylon provides: useXrExperience(), WebXRCamera, Microgestures

**AR mode** (phone/headset passthrough):
- Kitchen anchored to floor plane
- Physical walking between stations (or thumbstick)
- Mr. Sausage CRT at eye level

**VR mode** (immersive headset):
- Full kitchen wraps player
- Hand tracking: grab ingredients, crank grinder, press stuffer
- Wall-mounted CRT TV

**Fallback**: No XR → standard 2D overlay + 3D canvas (current behavior)

## New Dependencies

- `@babylonjs/havok` — Physics engine (replaces cannon-es)
- `expo-haptics` — Vibration/haptic feedback
- `expo-sensors` — Gyroscope/accelerometer
- `react-native-gesture-handler` — Advanced gesture recognition

## Files

### New

```text
src/input/InputActions.ts
src/input/InputAdapter.ts
src/input/TouchAdapter.ts
src/input/GyroAdapter.ts
src/input/XRAdapter.ts
src/input/PointerAdapter.ts
src/input/HapticService.ts
src/input/useInputAdapter.ts
src/components/ui/LoadingScreen3D.tsx
src/input/__tests__/InputActions.test.ts
src/input/__tests__/HapticService.test.ts
```

### Modified

```text
package.json — swap cannon-es → havok, add expo-haptics/sensors/gesture-handler
src/components/GameWorld.web.tsx — HavokPlugin, XR scene options, PointerAdapter
src/components/GameWorld.native.tsx — HavokPlugin, GyroAdapter, haptics
src/components/kitchen/FridgeStation.tsx — GLB mesh interaction, remove procedural geometry
src/components/kitchen/KitchenEnvironment.tsx — expose fridge mesh ref after GLB load
src/components/ui/LoadingScreen.tsx — mount Babylon engine, sausage.glb reveal
src/store/gameStore.ts — add gyroEnabled, motionControlsEnabled settings
```
