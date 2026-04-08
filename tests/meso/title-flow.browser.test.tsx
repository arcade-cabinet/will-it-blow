/**
 * Meso layer — title screen → difficulty selector → gameplay flow.
 *
 * Mounts the real `<App />` directly via `vitest-browser-react`
 * (no separate dev server needed) and walks the user journey end
 * to end. Screenshots captured at every milestone.
 *
 * Why mount-not-navigate: Vitest browser tests run inside an
 * iframe served by Vitest itself. We want to avoid the dependency
 * on `pnpm dev` being live, and `render(<App />)` exercises the
 * exact same code path the dev server would, just with a fresh
 * React root per test.
 */
import {afterEach, beforeAll, expect, test} from 'vitest';
import {cleanup, render} from 'vitest-browser-react';
import {App} from '../../src/App';
import {initDebugInterface} from '../../src/debug/PlaytestGovernor';
import {captureSnapshot} from '../harness/snapshot';

beforeAll(() => {
  initDebugInterface();
});

afterEach(() => {
  cleanup();
});

function findButton(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes(text));
}

async function settle(ms = 1500): Promise<void> {
  // Default wait is long enough for the title screen's
  // `animate-[fadeInUp_1s_ease-out]` animation to complete fully
  // before the screenshot is captured.
  await new Promise(r => setTimeout(r, ms));
}

test('title screen — butcher-shop sign + START COOKING button', async () => {
  render(<App />);
  await settle();

  const heading = document.querySelector('h1');
  expect(heading?.textContent ?? '').toMatch(/WILL IT\s*BLOW/);
  expect(findButton('START COOKING')).toBeDefined();

  await captureSnapshot({layer: 'meso', feature: 'title-flow', step: '00-title'});
});

test('clicking START COOKING reveals the difficulty selector', async () => {
  render(<App />);
  await settle();

  findButton('START COOKING')!.click();
  // The intro flow is animated; allow a longer settle for the
  // difficulty region to mount.
  await settle(1000);

  const region = document.querySelector('[aria-label="Difficulty selection"]');
  expect(region).not.toBeNull();

  await captureSnapshot({
    layer: 'meso',
    feature: 'title-flow',
    step: '01-difficulty',
  });
});

test('difficulty selector exposes all 5 tiers + PERMADEATH divider', async () => {
  render(<App />);
  await settle();
  findButton('START COOKING')!.click();
  await settle();

  const difficultyButtons = Array.from(document.querySelectorAll('button')).filter(b =>
    (b.getAttribute('aria-label') ?? '').toLowerCase().includes('difficulty'),
  );
  expect(difficultyButtons.length).toBeGreaterThanOrEqual(5);
  expect(document.body.textContent).toContain('PERMADEATH');

  await captureSnapshot({
    layer: 'meso',
    feature: 'title-flow',
    step: '02-permadeath-divider',
  });
});

test('BACK button returns from difficulty to title', async () => {
  render(<App />);
  await settle();
  findButton('START COOKING')!.click();
  await settle();

  // Locate the back button by its aria-label.
  const back = Array.from(document.querySelectorAll('button')).find(b =>
    (b.getAttribute('aria-label') ?? '').toLowerCase().includes('back to main menu'),
  );
  expect(back).toBeDefined();
  back!.click();
  await settle();

  // We're back on the title screen.
  expect(document.querySelector('h1')?.textContent ?? '').toMatch(/WILL IT\s*BLOW/);

  await captureSnapshot({
    layer: 'meso',
    feature: 'title-flow',
    step: '03-back-to-title',
  });
});
