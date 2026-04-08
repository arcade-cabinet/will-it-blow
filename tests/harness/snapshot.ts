/**
 * Deterministic screenshot capture helper for the Vitest browser
 * test suite.
 *
 *   await captureSnapshot({layer: 'micro', feature: 'Grinder'})
 *     → test-results/browser/micro/Grinder/desktop-1280.png
 *
 * How it resolves the viewport name: reads
 * `window.__vitest_browser_runner__.config.name`, which Vitest sets to
 * the browser project's `name` field. Works in both multi-instance
 * matrices (desktop-1280, mobile-390, tablet-768, uhd-3840) and
 * single-instance runs.
 *
 * Why `captureSnapshot` and not just `page.screenshot({path})`:
 *   1. Centralises the naming convention so every layer's screenshots
 *      land in a predictable directory tree.
 *   2. Waits 2 real RAFs before clicking the shutter so R3F's
 *      demand-loop has a chance to commit the latest frame.
 *   3. Makes the report generator's job trivial — it just globs
 *      `test-results/browser/**` and groups by path segments.
 *
 * The output directory is under `test-results/browser/` specifically
 * so the existing `.gitignore`'d `test-results/` path covers the
 * screenshots automatically — no extra gitignore rules needed.
 */
import {page} from '@vitest/browser/context';

export type TestLayer = 'unit' | 'micro' | 'meso' | 'macro';

export interface CaptureOptions {
  /** Hierarchy layer — becomes the top-level directory under `browser/`. */
  layer: TestLayer;
  /**
   * Feature or component name — becomes the second directory level.
   * Prefer kebab-case or a raw component name: `Grinder`, `phase-BLOWOUT`,
   * `goap-easy`, `title-flow`.
   */
  feature: string;
  /**
   * Optional suffix for multi-shot tests. For example a phase flow
   * spec that captures `entry` and `exit` would pass them here so
   * both land under the same `feature/` dir without clobbering
   * each other.
   */
  step?: string;
  /**
   * Skip the 2-RAF stabilisation wait. Use when the caller has
   * already run its own settling logic and just wants the shutter.
   */
  skipWait?: boolean;
  /** Whole-page vs the <canvas> element only. Default: full page. */
  scope?: 'page' | 'canvas';
}

function getViewportName(): string {
  // Vitest browser runner exposes its resolved config on the window
  // via `__vitest_browser_runner__`. The `config.name` field is the
  // project name from `instances[].name` in vitest.config.ts.
  const runner = (
    window as unknown as {
      __vitest_browser_runner__?: {config?: {name?: string}};
    }
  ).__vitest_browser_runner__;
  const name = runner?.config?.name;
  if (!name) return 'unknown-viewport';
  return name;
}

async function waitTwoRAFs(): Promise<void> {
  for (let i = 0; i < 2; i += 1) {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
  }
}

/**
 * Capture a screenshot at the canonical
 * `test-results/browser/{layer}/{feature}/{viewport}[_step].png` path.
 */
export async function captureSnapshot(options: CaptureOptions): Promise<string> {
  const {layer, feature, step, skipWait = false, scope = 'page'} = options;
  if (!skipWait) await waitTwoRAFs();

  const viewport = getViewportName();
  const suffix = step ? `${viewport}_${step}` : viewport;
  const safeFeature = feature.replace(/[^a-z0-9._-]/gi, '-');
  const path = `../../test-results/browser/${layer}/${safeFeature}/${suffix}.png`;

  if (scope === 'canvas') {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      throw new Error(
        'captureSnapshot: scope=canvas but no <canvas> in the DOM. Did R3F mount?',
      );
    }
    await page.screenshot({path, element: canvas});
  } else {
    await page.screenshot({path});
  }

  return path;
}

/**
 * Convenience: capture a strip of screenshots in sequence. Each step
 * becomes `test-results/browser/{layer}/{feature}/{viewport}_{step}.png`.
 * Returns the list of written paths.
 *
 *   await captureStrip('meso', 'grind-station', [
 *     {name: '00-enter', run: () => {}},
 *     {name: '01-filling', run: async () => { ... }},
 *     {name: '02-full', run: async () => { ... }},
 *   ]);
 */
export async function captureStrip(
  layer: TestLayer,
  feature: string,
  steps: Array<{name: string; run?: () => void | Promise<void>}>,
): Promise<string[]> {
  const paths: string[] = [];
  for (const step of steps) {
    if (step.run) await step.run();
    const path = await captureSnapshot({layer, feature, step: step.name});
    paths.push(path);
  }
  return paths;
}
