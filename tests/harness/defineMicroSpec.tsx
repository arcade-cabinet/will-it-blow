/**
 * `defineMicroSpec` — declarative wrapper that turns a single
 * micro-component spec into a fully-configured Vitest browser test
 * with screenshot capture, mesh-count assertion, and lit-pixel
 * sanity check, all baked in.
 *
 * Usage in `tests/micro/Foo.browser.test.tsx`:
 *
 *   defineMicroSpec({
 *     name: 'Foo',
 *     mountChildren: () => <Foo />,
 *     physics: true,            // wrap in <Physics>
 *     minMeshes: 4,
 *     cameraPosition: [0, 1.6, 5],
 *   });
 *
 * The macro:
 *  - calls `installR3FTestHooks()` so the per-file afterEach is wired
 *  - mounts the component via `renderR3FAndSettle`
 *  - polls `countMeshes` until at least `minMeshes` are present
 *  - asserts the drawing buffer has lit pixels (lights provided
 *    by the harness's ambient light + the optional `extraLights`
 *    children)
 *  - captures a `micro/{name}/{viewport}.png` snapshot via the
 *    snapshot helper
 *
 * Tests that need extra setup or extra assertions just import the
 * lower-level harness primitives directly.
 */
import {Suspense} from 'react';
import {expect, test} from 'vitest';
import {
  countLitPixels,
  countMeshes,
  installR3FTestHooks,
  renderR3FAndSettle,
  waitForR3F,
} from './render/renderR3F';
import {captureSnapshot} from './snapshot';

export interface MicroSpec {
  /** Component or feature name; becomes the screenshot directory. */
  name: string;
  /** A function returning the JSX subtree to mount inside `<Canvas>`. */
  mountChildren: () => React.ReactNode;
  /** Wrap the children in `<Physics>`. Required for components that use `<RigidBody>`. */
  physics?: boolean;
  /** Camera position; default `[0, 1.6, 4]` (eye-level FPS framing). */
  cameraPosition?: [number, number, number];
  /** World point to look at; default `[0, 1, 0]` (centred on the room). */
  cameraTarget?: [number, number, number];
  /** Camera FOV; default 75. */
  cameraFov?: number;
  /** Canvas size; default 640×480. */
  width?: number;
  height?: number;
  /**
   * Optional setup callback that runs BEFORE the component mounts.
   * Use to seed `useGameStore` so phase-gated components like
   * `BlowoutStation` (only renders during the BLOWOUT phase)
   * actually emit geometry.
   */
  setup?: () => void | Promise<void>;
  /** Minimum mesh count to assert after settle. Default 1. */
  minMeshes?: number;
  /**
   * Minimum lit-pixel count after settle. Default 500. Pass 0 to
   * skip the pixel check entirely — useful for components whose
   * mesh count is a stronger signal than what the camera happens
   * to see (e.g. small drei `<Text>` glyphs at the wall edge).
   */
  minLitPixels?: number;
  /** How long to wait for assets to load. Default 5s. */
  settleTimeoutMs?: number;
  /**
   * Extra lights / helpers to mount alongside the component.
   * Useful for components that ship without their own lighting.
   * Default: a centered point light at `[0, 2, 0]` intensity 20.
   */
  extraLights?: () => React.ReactNode;
}

const defaultLights = () => (
  <>
    <pointLight position={[0, 2, 0]} intensity={20} distance={10} />
    <pointLight position={[2, 1, 2]} intensity={15} distance={8} />
  </>
);

export function defineMicroSpec(spec: MicroSpec): void {
  installR3FTestHooks();

  const {
    name,
    mountChildren,
    physics = false,
    cameraPosition = [0, 1.6, 4],
    cameraTarget = [0, 1, 0],
    cameraFov = 75,
    width = 640,
    height = 480,
    minMeshes = 1,
    minLitPixels = 500,
    settleTimeoutMs = 5_000,
    extraLights = defaultLights,
    setup,
  } = spec;

  test(`${name}: renders to a non-blank canvas + screenshots cleanly`, async () => {
    if (setup) await setup();

    const scene = await renderR3FAndSettle(
      <Suspense fallback={null}>
        {extraLights()}
        {mountChildren()}
      </Suspense>,
      {
        physics,
        cameraPosition,
        cameraTarget,
        cameraFov,
        width,
        height,
        preserveDrawingBuffer: true,
      },
    );

    // Wait for assets/textures/GLBs to actually mount into the
    // scene tree before asserting.
    await waitForR3F(scene, () => countMeshes(scene) >= minMeshes, {
      timeoutMs: settleTimeoutMs,
      description: `${minMeshes}+ meshes for ${name}`,
    });

    expect(countMeshes(scene)).toBeGreaterThanOrEqual(minMeshes);
    if (minLitPixels > 0) {
      expect(countLitPixels(scene)).toBeGreaterThan(minLitPixels);
    }

    const path = await captureSnapshot({
      layer: 'micro',
      feature: name,
      scope: 'canvas',
    });
    expect(path).toContain(`micro/${name}/`);
  });
}
