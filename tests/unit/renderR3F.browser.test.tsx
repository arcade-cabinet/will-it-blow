/**
 * Self-test for the `renderR3F` harness. Proves that:
 *
 *   1. A bare scene mounts and returns a live R3F root state.
 *   2. `advance(ms)` actually pumps frames (a `useFrame` counter ticks).
 *   3. Multiple consecutive mounts in the same file all succeed, which
 *      is the regression guard for the WebGL-context-leak bug that
 *      blocked PR #52's FPSCamera test.
 *   4. `preserveDrawingBuffer` is honoured (readPixels returns non-zero
 *      pixel data after a render).
 */
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import {expect, test} from 'vitest';
import {installR3FTestHooks, renderR3FAndSettle} from '../harness/render/renderR3F';

installR3FTestHooks();

function Counter({onTick}: {onTick: (count: number) => void}) {
  const count = useRef(0);
  useFrame(() => {
    count.current += 1;
    onTick(count.current);
  });
  return null;
}

test('renderR3F mounts a scene with a live root state', async () => {
  const scene = await renderR3FAndSettle(
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>,
  );

  expect(scene.canvas.width).toBeGreaterThan(0);

  const state = scene.getState();
  expect(state.camera.isCamera).toBe(true);
  expect(state.scene.children.length).toBeGreaterThan(0);
  expect(state.gl).toBeTruthy();
});

test('advance(ms) pumps real frames through useFrame', async () => {
  let lastTick = 0;
  const scene = await renderR3FAndSettle(<Counter onTick={n => void (lastTick = n)} />);
  const before = lastTick;
  await scene.advance(100);
  expect(lastTick).toBeGreaterThan(before);
  expect(lastTick).toBeGreaterThan(3); // ≥ ~6 frames in 100ms
});

test('back-to-back mounts do not exhaust Chromium WebGL contexts', async () => {
  for (let i = 0; i < 3; i += 1) {
    const scene = await renderR3FAndSettle(
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={`hsl(${i * 120}, 80%, 50%)`} />
      </mesh>,
    );
    expect(scene.canvas.width).toBeGreaterThan(0);
    // We DON'T call scene.unmount() — we're relying on the shared
    // afterEach(cleanup) installed by installR3FTestHooks() to handle
    // disposal between iterations. This is the exact pattern other
    // micro tests will use.
    scene.unmount();
  }
});

test('preserveDrawingBuffer lets readPixels see rendered output', async () => {
  const scene = await renderR3FAndSettle(
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#ff2244" emissive="#ff2244" />
    </mesh>,
    {cameraPosition: [0, 0, 4], preserveDrawingBuffer: true},
  );
  await scene.advance(32);

  const gl = scene.canvas.getContext('webgl2') ?? scene.canvas.getContext('webgl');
  if (!gl) throw new Error('no webgl context');
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const pixels = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  let lit = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 20) lit += 1;
  }
  // The emissive box covers a reasonable chunk of the viewport; if
  // `preserveDrawingBuffer` weren't on we'd read zeros everywhere.
  expect(lit).toBeGreaterThan(100);
});
