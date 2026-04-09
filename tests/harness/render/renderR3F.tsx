/**
 * renderR3F — mount an R3F scene inside @vitest/browser with guaranteed
 * cleanup, deterministic frame waits, and optional physics.
 *
 * Every component-level browser test (`tests/micro/**`) should use this
 * helper instead of calling `render()` from `vitest-browser-react`
 * directly.
 *
 * Key mechanics:
 *
 * 1. `installR3FTestHooks()` installs an `afterEach` that unmounts any
 *    Canvas trees via vitest-browser-react's `cleanup()` and resets
 *    the shared `playerPosition` singleton. Without cleanup, Chromium's
 *    16-WebGL-context limit trips after a handful of sequential mounts
 *    in one file.
 *
 * 2. The harness passes a **mutable state holder** into a probe
 *    component that lives inside the Canvas tree. The probe writes the
 *    live R3F RootState into the holder on every render. The handle's
 *    `getState()` reads from the holder — no promise racing, no
 *    timing games — and `advance()` pumps real RAFs so state is
 *    populated even if the first render hasn't fully committed yet.
 *
 * 3. `advance(ms)` steps real `requestAnimationFrame` cycles so Rapier
 *    physics and `useFrame` callbacks fire. Tests that need a capsule
 *    to settle call `await scene.advance(1500)`.
 */
import type {RootState} from '@react-three/fiber';
import {Canvas, useThree} from '@react-three/fiber';
import {Physics} from '@react-three/rapier';
import {Suspense} from 'react';
import {afterEach} from 'vitest';
import {cleanup, render} from 'vitest-browser-react';
import {playerPosition} from '../../../src/player/playerPosition';

/**
 * The real game uses a dark background + fog to match its horror
 * basement aesthetic. Micro/meso tests that mount components in
 * isolation should render against the same ambient conditions so
 * the screenshots look like the game, not like a blueprint.
 */
const DEFAULT_BACKGROUND_COLOR = '#1a1a1a';
const DEFAULT_FOG_COLOR = '#2a2a2a';
const DEFAULT_FOG_DENSITY = 0.015;

export function installR3FTestHooks(): void {
  // Called at the top of every `defineMicroSpec` / browser test file.
  // Vitest's afterEach is additive — multiple registrations from one
  // file stack up and all run — but per-file duplication is cheap
  // (cleanup is idempotent).
  afterEach(() => {
    cleanup();
    playerPosition.set(0, 0, 0);
  });
}

export interface RenderR3FOptions {
  physics?: boolean;
  gravity?: [number, number, number];
  /**
   * Canvas container width (px). Default: the **current browser
   * viewport width** read from `window.innerWidth`. Micro specs
   * that want a fixed size regardless of the viewport matrix can
   * override this.
   */
  width?: number;
  /** Canvas container height (px). Default: `window.innerHeight`. */
  height?: number;
  cameraPosition?: [number, number, number];
  /** World-space point the camera should look at after mount. */
  cameraTarget?: [number, number, number];
  cameraFov?: number;
  ambientIntensity?: number;
  /**
   * Scene background colour (hex). Default `#1a1a1a` matching the
   * real game. Pass `null` to leave `scene.background` unset (and
   * get the renderer's default clear colour — usually white).
   */
  backgroundColor?: string | null;
  /**
   * Exponential fog density. Default `0.015` matching the real
   * game. Pass `0` to disable fog entirely.
   */
  fogDensity?: number;
  /** Fog colour (hex). Default `#2a2a2a`. */
  fogColor?: string;
  /**
   * Default **false**. Only enable in tests that need
   * `gl.readPixels()` — `preserveDrawingBuffer: true` extends the
   * effective lifetime of every context and can exhaust Chromium's
   * 16-context limit in dense test files.
   */
  preserveDrawingBuffer?: boolean;
  /**
   * When true, the StateProbe increments `__RENDER_R3F_PROBE_COUNT__`
   * on every render. Default **false** to avoid cross-test contamination
   * of render counts. Tests that depend on render counts should opt in
   * explicitly.
   */
  probeRenderCount?: boolean;
  testId?: string;
}

export interface R3FHandle {
  canvas: HTMLCanvasElement;
  /**
   * Live R3F root state. `null` until the scene's first commit; guarded
   * behind `getState()` which throws if called before state exists.
   */
  getState(): RootState;
  /** Pump N milliseconds of real `requestAnimationFrame` ticks. */
  advance(ms?: number): Promise<void>;
  /** Unmount this scene (normally handled by `installR3FTestHooks`). */
  unmount(): void;
}

// ─── Internal: mutable state holder + probe ���─────────────────────────

interface StateHolder {
  state: RootState | null;
  targetApplied?: boolean;
}

function StateProbe({
  holder,
  cameraTarget,
  trackRenderCount,
}: {
  holder: StateHolder;
  cameraTarget?: [number, number, number];
  trackRenderCount: boolean;
}) {
  // `useThree` returns the live root state — the one R3F recomputes
  // on every internal state change. Writing it into the holder on
  // every render keeps the handle's getState() pointed at fresh data.
  const state = useThree();
  holder.state = state;

  // Aim the camera at the configured target on first mount. R3F's
  // <Canvas camera={...}> only sets position; lookAt has to happen
  // after the camera object exists.
  if (cameraTarget && !holder.targetApplied) {
    state.camera.lookAt(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
    state.camera.updateMatrixWorld();
    holder.targetApplied = true;
  }

  // Diagnostic signal so harness self-tests can verify the probe
  // actually mounted inside the Canvas tree. Gated behind
  // probeRenderCount to avoid cross-test contamination.
  if (trackRenderCount) {
    (window as unknown as {__RENDER_R3F_PROBE_COUNT__?: number}).__RENDER_R3F_PROBE_COUNT__ =
      ((window as unknown as {__RENDER_R3F_PROBE_COUNT__?: number}).__RENDER_R3F_PROBE_COUNT__ ??
        0) + 1;
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Mount R3F children under a real `<Canvas>`. Synchronous: returns
 * the handle immediately. Call `await handle.advance()` before
 * reading `handle.getState()` on the first tick.
 */
export function renderR3F(children: React.ReactNode, options: RenderR3FOptions = {}): R3FHandle {
  const viewportW = typeof window !== 'undefined' ? window.innerWidth || 512 : 512;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight || 384 : 384;

  const {
    physics = false,
    gravity = [0, -9.81, 0],
    width = viewportW,
    height = viewportH,
    cameraPosition = [0, 0, 5],
    cameraTarget,
    cameraFov = 60,
    ambientIntensity = 0.6,
    preserveDrawingBuffer = false,
    backgroundColor = DEFAULT_BACKGROUND_COLOR,
    fogDensity = DEFAULT_FOG_DENSITY,
    fogColor = DEFAULT_FOG_COLOR,
    probeRenderCount = false,
    testId,
  } = options;

  const holder: StateHolder = {state: null};

  // `frameloop="demand"` stops R3F's auto-RAF loop so the test
  // controls when frames render. This is critical in headless
  // Chromium, which heavily throttles `requestAnimationFrame` for
  // non-visible pages — the default `frameloop="always"` results in
  // the scene never rendering at all. Our `advance()` helper drives
  // the loop explicitly via `state.advance()`.
  const result = render(
    <div style={{width, height}} data-testid={testId}>
      <Canvas
        frameloop="demand"
        camera={{position: cameraPosition, fov: cameraFov}}
        gl={{preserveDrawingBuffer}}
      >
        {backgroundColor !== null && <color attach="background" args={[backgroundColor]} />}
        {fogDensity > 0 && <fogExp2 attach="fog" args={[fogColor, fogDensity]} />}
        <ambientLight intensity={ambientIntensity} />
        <Suspense fallback={null}>
          {physics ? <Physics gravity={gravity}>{children}</Physics> : children}
        </Suspense>
        <StateProbe
          holder={holder}
          cameraTarget={cameraTarget}
          trackRenderCount={probeRenderCount}
        />
      </Canvas>
    </div>,
  );

  const canvas = result.container.querySelector('canvas');
  if (!canvas) {
    throw new Error('renderR3F: <Canvas> did not produce a <canvas> element');
  }

  const advance = async (ms = 16): Promise<void> => {
    const frames = Math.max(1, Math.ceil(ms / 16));
    for (let i = 0; i < frames; i += 1) {
      // RAF gives React + R3F a chance to flush effects and commit
      // the first frame. After that, we manually tick the demand
      // frameloop so `useFrame` subscribers run without relying on
      // Chromium's throttled internal RAF.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const state = holder.state;
      if (state) {
        state.advance(performance.now() / 1000, true);
      }
    }
  };

  const getState = (): RootState => {
    if (!holder.state) {
      throw new Error(
        'renderR3F.getState(): state not yet captured. Call ' +
          '`await handle.advance()` at least once before reading state.',
      );
    }
    return holder.state;
  };

  return {
    canvas,
    getState,
    advance,
    unmount: () => result.unmount(),
  };
}

/**
 * Mount → wait for state capture → advance one frame → return the
 * handle. Guarantees `getState()` is populated before returning.
 */
export async function renderR3FAndSettle(
  children: React.ReactNode,
  options: RenderR3FOptions = {},
): Promise<R3FHandle> {
  const handle = renderR3F(children, options);
  // Pump RAFs until the StateProbe has published state (or we hit
  // the timeout). This handles the variable delay between React
  // scheduling the Canvas render and R3F's reconciler actually
  // running the child function components.
  const deadline = performance.now() + 2_000;
  while (performance.now() < deadline) {
    await handle.advance(16);
    try {
      handle.getState();
      return handle;
    } catch {
      // state still null — keep pumping frames
    }
  }
  // Last-ditch attempt; if still null, getState() will throw on
  // the caller side with a clear message.
  return handle;
}

/**
 * Pump frames until `predicate` returns truthy or `timeoutMs` elapses.
 * Used by tests that mount components which load assets asynchronously
 * (`useGLTF`, `useTexture`, etc.) and need to wait for the scene tree
 * to stabilise before asserting.
 *
 * Returns the value the predicate produced on success, or throws if
 * the timeout elapses without satisfaction.
 */
export async function waitForR3F<T>(
  handle: R3FHandle,
  predicate: () => T | undefined | null | false,
  options: {timeoutMs?: number; stepMs?: number; description?: string} = {},
): Promise<T> {
  const {timeoutMs = 5_000, stepMs = 100, description = 'condition'} = options;
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const value = predicate();
    if (value) return value as T;
    await handle.advance(stepMs);
  }
  throw new Error(`waitForR3F: timed out after ${timeoutMs}ms waiting for: ${description}`);
}

/** Count meshes in a scene tree — used by micro tests as a sanity check. */
export function countMeshes(handle: R3FHandle): number {
  let count = 0;
  handle.getState().scene.traverse(obj => {
    if ((obj as {isMesh?: boolean}).isMesh) count += 1;
  });
  return count;
}

/**
 * Sample the WebGL drawing buffer and return the count of pixels
 * whose RGB sum exceeds `threshold`. Useful for "is the canvas
 * actually rendering anything above the background?" assertions.
 *
 * The default threshold (100) is tuned for the harness's default
 * `#1a1a1a` background — which has an RGB sum of 78 — so pixels
 * that exceed it are **actual rendered geometry**, not just the
 * scene background poking through.
 *
 * Reads a centered 256x256 sub-region instead of the full buffer
 * so the work is O(65k) pixels regardless of the viewport size.
 * At 4K with ANGLE/Mesa on CI, reading the full buffer + iterating
 * 8.3M pixels in JS was causing test timeouts; the sampled approach
 * is O(1) with respect to viewport size.
 *
 * The handle MUST have been created with
 * `preserveDrawingBuffer: true`, otherwise the buffer is cleared
 * before `readPixels` runs and you'll always get zero.
 */
export function countLitPixels(handle: R3FHandle, threshold = 100): number {
  const gl = handle.canvas.getContext('webgl2') ?? handle.canvas.getContext('webgl');
  if (!gl) throw new Error('countLitPixels: no WebGL context on the canvas');
  const bw = gl.drawingBufferWidth;
  const bh = gl.drawingBufferHeight;
  // Read a centered 256x256 sub-region (or the full buffer if smaller).
  const sampleW = Math.min(256, bw);
  const sampleH = Math.min(256, bh);
  const x = Math.max(0, Math.floor((bw - sampleW) / 2));
  const y = Math.max(0, Math.floor((bh - sampleH) / 2));
  const pixels = new Uint8Array(sampleW * sampleH * 4);
  gl.readPixels(x, y, sampleW, sampleH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] + pixels[i + 1] + pixels[i + 2] > threshold) count += 1;
  }
  return count;
}
