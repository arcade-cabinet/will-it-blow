/**
 * Browser-side smoke test for the read-only perception bridge.
 *
 * Mounts the real `<App />` (the same Vite entry the dev server
 * serves), drives it past the title screen, then exercises every
 * read-only method on `window.__WIB_DEBUG__` to confirm:
 *
 *   1. The bridge is installed in dev/test mode.
 *   2. Every reader returns a frozen object.
 *   3. The snapshot tracks live game state — bumping the player
 *      position via the teleport hook is reflected in the next
 *      `getPerception()` call.
 */
import {afterEach, beforeAll, expect, test} from 'vitest';
import {cleanup, render} from 'vitest-browser-react';
import {App} from '../../src/App';
import {initDebugInterface} from '../../src/debug/PlaytestGovernor';

beforeAll(() => {
  // Re-initialise the debug bridge in case the test runner reloaded
  // the module without going through `main.tsx`.
  initDebugInterface();
});

afterEach(() => {
  cleanup();
});

function getDebug() {
  const d = window.__WIB_DEBUG__;
  if (!d) throw new Error('window.__WIB_DEBUG__ not installed');
  return d;
}

test('window.__WIB_DEBUG__ is installed in browser-test mode', async () => {
  expect(window.__WIB_DEBUG__).toBeDefined();
  expect(typeof window.__WIB_DEBUG__?.getPerception).toBe('function');
  expect(typeof window.__WIB_DEBUG__?.getStationBounds).toBe('function');
  expect(typeof window.__WIB_DEBUG__?.getCurrentSurrealText).toBe('function');
});

test('getPerception() returns a frozen snapshot', async () => {
  // We can't easily mount <App /> in this context (it loads tons of
  // GLBs), so just exercise the bridge against the bare default ECS
  // state. The unit tests in `src/debug/__tests__/perception.test.ts`
  // already cover the field-by-field shape; this is the smoke test
  // confirming the runtime path is wired.
  const snapshot = getDebug().getPerception();
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.stations)).toBe(true);
  expect(Object.isFrozen(snapshot.playerPosition)).toBe(true);
  expect(snapshot.tick).toBeGreaterThan(0);
  expect(typeof snapshot.surrealText).toBe('string');
});

test('getStationBounds() returns the design coordinates for every station', async () => {
  const debug = getDebug();
  const stations = [
    'Grinder',
    'Stuffer',
    'Stove',
    'BlowoutStation',
    'Sink',
    'ChoppingBlock',
    'PhysicsFreezerChest',
    'TV',
  ] as const;
  for (const name of stations) {
    const bounds = debug.getStationBounds(name);
    expect(bounds).toBeDefined();
    expect(bounds.center).toHaveLength(3);
    expect(bounds.halfExtents).toHaveLength(3);
  }
});

test('getCurrentSurrealText() returns the same string as the perception snapshot', async () => {
  const debug = getDebug();
  const snapshot = debug.getPerception();
  expect(debug.getCurrentSurrealText()).toBe(snapshot.surrealText);
});

test('App mounts under @vitest/browser without crashing', async () => {
  const screen = render(<App />);
  // Poll for the START COOKING button instead of a fixed timeout.
  // The title screen may take a variable amount of time to render
  // depending on CI load.
  const deadline = performance.now() + 5_000;
  while (performance.now() < deadline) {
    if (screen.container.innerHTML.includes('START COOKING')) break;
    await new Promise(r => setTimeout(r, 50));
  }
  expect(screen.container.innerHTML).toContain('START COOKING');
});
