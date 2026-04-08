/**
 * Viewport fill verification — ensures the 3D scene actually fills the browser
 * viewport with rendered content (no pure-black dead bands) after the intro.
 *
 * Uses `gl.readPixels` inside `page.evaluate` to sample the rendered drawing
 * buffer directly. This works because the Canvas is created with
 * `preserveDrawingBuffer: true` in dev builds (see `src/App.tsx`).
 *
 * Intro completion and game-state readiness are waited on via `waitForFunction`
 * against `window.__WIB_DEBUG__` instead of fixed-duration sleeps — fixed
 * sleeps are flaky and are explicitly discouraged by Playwright's best
 * practices guide.
 */
import {expect, test} from '@playwright/test';

/**
 * Canonical list of the 13 game phases. Kept in sync with `PHASES` in
 * `src/debug/PlaytestGovernor.ts`. Inlined here (rather than imported) so the
 * Playwright test runner doesn't need to resolve the runtime dependencies
 * (three.js, R3F, player.json) that `PlaytestGovernor.ts` transitively pulls
 * in — those modules require JSON import attributes that the e2e runner
 * doesn't inject.
 */
const ALL_GAME_PHASES = [
  'SELECT_INGREDIENTS',
  'CHOPPING',
  'FILL_GRINDER',
  'GRINDING',
  'MOVE_BOWL',
  'ATTACH_CASING',
  'STUFFING',
  'TIE_CASING',
  'BLOWOUT',
  'MOVE_SAUSAGE',
  'MOVE_PAN',
  'COOKING',
  'DONE',
] as const;

/** How long to wait for the 7s intro sequence to finish. */
const INTRO_TIMEOUT_MS = 20_000;
/** Pitch tolerance in radians. The camera starts at ≈ -0.05 rad (≈3° down). */
const LEVEL_PITCH_TOLERANCE = 0.2;

test.describe('Viewport Fill', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await page.getByRole('button', {name: 'Rare difficulty, 5 strikes'}).click();
    await page.waitForSelector('canvas', {timeout: 30_000});
    // Wait for the debug bridge to mount and the intro sequence to complete.
    await page.waitForFunction(() => window.__WIB_DEBUG__?.getState().introActive === false, null, {
      timeout: INTRO_TIMEOUT_MS,
    });
  });

  test.afterEach(async ({page}) => {
    // Match the defensive teardown pattern used by the other specs in this
    // suite — the page may already be closing, so swallow the expected errors.
    try {
      await page.goto('about:blank', {timeout: 5_000});
    } catch {
      // Ignored: context already closed.
    }
  });

  test('canvas fills entire viewport', async ({page}) => {
    const canvasRect = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        vw: window.innerWidth,
        vh: window.innerHeight,
      };
    });

    expect(canvasRect).not.toBeNull();
    expect(canvasRect!.x).toBe(0);
    expect(canvasRect!.y).toBe(0);
    expect(canvasRect!.w).toBe(canvasRect!.vw);
    expect(canvasRect!.h).toBe(canvasRect!.vh);
  });

  test('upper viewport is not a black void', async ({page}) => {
    // Sample the top band of the rendered WebGL drawing buffer directly.
    // Works because the R3F Canvas enables preserveDrawingBuffer in dev mode.
    //
    // On cold Vite dev servers the first few frames after intro completion can
    // still be black while bundles finish resolving, so we poll readPixels for
    // up to ~3s before giving up — `waitForFunction` with an internal loop is
    // the Playwright-recommended pattern for this.
    const sample = await page.waitForFunction(
      () => {
        const gameCanvas = document.querySelector('canvas');
        if (!gameCanvas) return false;
        const gl = (gameCanvas.getContext('webgl2') ??
          gameCanvas.getContext('webgl')) as WebGLRenderingContext | null;
        if (!gl) return false;

        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        if (w === 0 || h === 0) return false;

        // Sample the full-width top band of the frame (the region that used
        // to be a visible black void before the ceiling fix). WebGL's origin
        // is bottom-left, so the top of the screen is y ≈ h - band.
        const bandW = w;
        const bandH = Math.min(80, Math.floor(h * 0.25));
        const bandX = 0;
        const bandY = Math.max(0, h - bandH - 10);

        const pixels = new Uint8Array(bandW * bandH * 4);
        gl.readPixels(bandX, bandY, bandW, bandH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // A pixel counts as "lit" if its RGB sum clears a near-black threshold.
        // The scene is dim but the ceiling + bounce light guarantee the top
        // band is well above pure #000.
        const BLACK_SUM_THRESHOLD = 30; // max possible sum is 765 (255*3)
        let litCount = 0;
        let maxSum = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const sum = pixels[i] + pixels[i + 1] + pixels[i + 2];
          if (sum > BLACK_SUM_THRESHOLD) litCount++;
          if (sum > maxSum) maxSum = sum;
        }
        const total = bandW * bandH;
        const litRatio = litCount / total;

        // Require at least 50% of the band to be lit and at least one pixel
        // clearly above pure black. Returning a truthy object also doubles as
        // the successful waitForFunction return value.
        if (litRatio < 0.5 || maxSum < 60) return false;
        return {bandSize: `${bandW}x${bandH}`, drawingBuffer: `${w}x${h}`, litRatio, maxSum};
      },
      null,
      {timeout: 15_000, polling: 250},
    );

    const result = await sample.jsonValue();
    expect(result.litRatio).toBeGreaterThan(0.5);
    expect(result.maxSum).toBeGreaterThan(60);
  });

  test('camera pitch is level after intro completes', async ({page}) => {
    const state = await page.evaluate(() => {
      const d = window.__WIB_DEBUG__;
      if (!d) return null;
      return {
        introActive: d.getState().introActive,
        posture: d.getState().posture,
        phase: d.getGamePhase(),
        pitch: d.getCameraPitch(),
        yaw: d.getCameraYaw(),
      };
    });

    expect(state).not.toBeNull();
    expect(state!.introActive).toBe(false);
    expect(state!.posture).toBe('standing');
    expect(state!.phase).toBe('SELECT_INGREDIENTS');
    // Pitch should be close to horizontal (no looking-up-at-ceiling leftover).
    expect(Math.abs(state!.pitch)).toBeLessThan(LEVEL_PITCH_TOLERANCE);
    // Yaw is free to be anywhere, but a sensible number, not NaN.
    expect(Number.isFinite(state!.yaw)).toBe(true);
  });

  test('all 13 phases advance without errors', async ({page}) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('AudioContext') &&
          !text.includes('favicon') &&
          !text.includes('deprecated')
        ) {
          errors.push(text);
        }
      }
    });

    const expectedPhases = [...ALL_GAME_PHASES];
    const result = await page.evaluate(async () => {
      const d = window.__WIB_DEBUG__;
      if (!d) return {error: 'no debug'} as const;

      d.actions.selectIngredient('banana');
      d.actions.selectIngredient('steak');
      d.actions.selectIngredient('bread');

      const observed: string[] = [d.getGamePhase()];
      // Advance through all 13 phases. The debug action is a no-op once we
      // reach DONE, but we still record the final state each iteration so
      // the assertion can see it.
      for (let i = 0; i < 12; i++) {
        d.actions.advancePhase();
        await new Promise(r => setTimeout(r, 50));
        observed.push(d.getGamePhase());
      }
      return {phases: observed} as const;
    });

    expect(result).not.toHaveProperty('error');
    if ('error' in result) throw new Error(result.error);
    // Every expected phase must appear in the observed sequence.
    for (const phase of expectedPhases) {
      expect(result.phases).toContain(phase);
    }
    expect(new Set(result.phases).size).toBe(expectedPhases.length);
    expect(errors).toHaveLength(0);
  });
});
