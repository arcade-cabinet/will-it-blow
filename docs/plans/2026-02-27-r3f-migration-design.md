# R3F Migration Design — Will It Blow?

## Goal

Replace reactylon + Babylon.js rendering layer with React Three Fiber (R3F) + Three.js to gain: declarative JSX scene graph, Jest-testable 3D components, unified single-file platform support, and access to the massive R3F/drei ecosystem.

## Architecture

### Stack

```
React Native 0.83 + Expo 55 (New Architecture)
  +-- expo-gl (native GL context)
  +-- @react-three/fiber 9.5.0 (/native import, single Canvas for all platforms)
  +-- @react-three/drei 10.7.7 (useGLTF, Environment, useTexture)
  +-- @react-three/cannon (pure JS physics, works on native unlike rapier WASM)
  +-- @react-three/test-renderer (Jest testing for 3D components)
  +-- three (r168+)
  +-- Web XR: @react-three/xr (Quest 3, Vision Pro VR) — Phase 2
  +-- Native AR: ViroReact 2.52 (ARKit/ARCore) — Phase 2
```

### What Survives (Engine-Agnostic)

| Layer | Files | Notes |
|-------|-------|-------|
| Input abstraction | `src/input/InputActions.ts`, `HapticService.ts` + tests | Already built, zero Babylon deps |
| State management | `src/store/gameStore.ts` + tests | Zustand, includes input settings |
| Game logic | `SausagePhysics.ts`, `Ingredients.ts`, `Constants.ts`, `ChallengeRegistry.ts` | Pure functions |
| UI overlays | 16 components in `src/components/ui/` | React Native, no 3D deps |
| Challenge overlays | 5 components in `src/components/challenges/` | React Native, no 3D deps |
| App shell | `App.tsx` | Phase-based rendering unchanged |

### What Gets Rewritten (Babylon → R3F)

| Babylon File | R3F Replacement | Key Change |
|---|---|---|
| `GameWorld.web.tsx` + `GameWorld.native.tsx` | `GameWorld.tsx` (single) | R3F `<Canvas>` replaces Engine/NativeEngine split |
| `KitchenEnvironment.tsx` | Same name | drei `useGLTF` + `<Environment>` replace SceneLoader + CubeTexture |
| `MrSausage3D.tsx` (630 lines) | Same name (~300 lines) | Declarative `<mesh>` JSX, `useFrame` for animation |
| `CrtTelevision.tsx` | Same name | Three.js `ShaderMaterial` wraps same GLSL |
| `CrtShader.ts` | Same name | Same GLSL, Three.js uniform API |
| `FridgeStation.tsx` | Same name | R3F `onClick` replaces ActionManager |
| `GrinderStation.tsx` | Same name | Direct mesh translation |
| `StufferStation.tsx` | Same name | Direct mesh translation |
| `StoveStation.tsx` | Same name | Direct mesh translation |

### What Gets Deleted

- `reactylon` dependency
- `@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/havok`
- `GameWorld.native.tsx` (single file replaces both)

## Pattern Translation

### Imperative → Declarative

```tsx
// BEFORE (Babylon.js): create, configure, dispose manually
const mesh = MeshBuilder.CreateSphere('head', { diameter: 3.6 }, scene);
const mat = new StandardMaterial('skin', scene);
mat.disableLighting = true;
mat.emissiveColor = new Color3(0.92, 0.62, 0.35);
mesh.material = mat;
return () => { mesh.dispose(); mat.dispose(); };

// AFTER (R3F): React manages lifecycle
<mesh>
  <sphereGeometry args={[1.8, 24, 24]} />
  <meshBasicMaterial color="#eb9e59" />
</mesh>
```

### Animation Loop

```tsx
// BEFORE: scene.onBeforeRenderObservable.add(() => { ... })
// AFTER:
useFrame((state, delta) => {
  meshRef.current.rotation.y += delta;
});
```

### Camera Walk

```tsx
// Single component replaces 40-line observer pattern
function CameraWalker({ target }: { target: StationCamera }) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const startPos = useRef(camera.position.clone());
  const startLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    startPos.current.copy(camera.position);
    progressRef.current = 0;
  }, [target]);

  useFrame((_, delta) => {
    if (progressRef.current >= 1) return;
    progressRef.current = Math.min(progressRef.current + delta * 0.4, 1);
    const t = easeInOutQuad(progressRef.current);
    camera.position.lerpVectors(startPos.current, target.position, t);
  });

  return null;
}
```

### CRT Shader

Same GLSL vertex/fragment code. Three.js wrapper:

```ts
new THREE.ShaderMaterial({
  vertexShader: CRT_VERTEX,  // Minor tweak: modelViewMatrix + projectionMatrix
  fragmentShader: CRT_FRAGMENT,  // Identical GLSL
  uniforms: {
    time: { value: 0 },
    flickerIntensity: { value: 1.0 },
    staticIntensity: { value: 0.05 },
    reactionIntensity: { value: 0.0 },
  },
});
```

### GLB Loading

```tsx
// BEFORE: SceneLoader.ImportMeshAsync('', root, 'kitchen.glb', scene)
// AFTER:
function Kitchen() {
  const { scene } = useGLTF('/models/kitchen.glb');
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material.isMeshStandardMaterial) {
        child.material.envMapIntensity = 0.05;
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}
```

### Picking / Click

```tsx
// BEFORE: ActionManager + ExecuteCodeAction(OnPickTrigger, callback)
// AFTER:
<mesh onClick={() => onSelect(index)}>
  <sphereGeometry args={[0.15, 10, 10]} />
  <meshBasicMaterial color={ingredient.color} />
</mesh>
```

## Platform Strategy

**No more platform splitting.** Single `GameWorld.tsx`:

```tsx
import { Canvas } from '@react-three/fiber/native';

export const GameWorld = () => (
  <Canvas camera={{ fov: 70, near: 0.1, position: [0, 1.6, 2] }}>
    <KitchenEnvironment />
    <CrtTelevision reaction={reaction} />
    {showFridge && <FridgeStation ... />}
    {showGrinder && <GrinderStation ... />}
    {showStuffer && <StufferStation ... />}
    {showStove && <StoveStation ... />}
  </Canvas>
);
```

`@react-three/fiber/native` uses expo-gl on iOS/Android and standard WebGL on web. One import, one file.

## Testing Strategy

Major improvement: `@react-three/test-renderer` enables Jest testing of 3D components.

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';

test('MrSausage3D creates head mesh at correct position', async () => {
  const renderer = await ReactThreeTestRenderer.create(
    <MrSausage3D reaction="idle" position={[0, 2, 0]} />
  );
  const head = renderer.scene.children[0];
  expect(head).toBeDefined();
});
```

## Metro Configuration

```js
// metro.config.js — add GLB/GLTF to asset extensions
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb', 'gltf');
module.exports = config;
```

## XR/AR (Phase 2)

After core migration is complete:

- **Web XR:** Wrap Canvas with `@react-three/xr` `<XR>` for Quest 3, Vision Pro VR, Samsung Galaxy XR
- **Native AR:** ViroReact 2.52 provides ARKit/ARCore (separate rendering, shared Zustand state)
- Both consume the same InputActions + gameStore — only the rendering layer differs

## New Dependencies

```
three
@types/three
@react-three/fiber
@react-three/drei
@react-three/cannon
@react-three/test-renderer
expo-gl
```

## Dependencies to Remove

```
reactylon
@babylonjs/core
@babylonjs/loaders
@babylonjs/havok
```
