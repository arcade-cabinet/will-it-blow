/**
 * Self-test for the screenshot capture helper. Mounts a tiny scene,
 * captures a snapshot at each layer, and verifies the resolved
 * viewport name comes from the active Vitest browser instance.
 */
import {expect, test} from 'vitest';
import {installR3FTestHooks, renderR3FAndSettle} from '../harness/render/renderR3F';
import {captureSnapshot, captureStrip} from '../harness/snapshot';

installR3FTestHooks();

test('captureSnapshot writes to test-results/browser/{layer}/{feature}/{viewport}.png', async () => {
  await renderR3FAndSettle(
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffaa00" />
    </mesh>,
  );

  const path = await captureSnapshot({layer: 'unit', feature: 'snapshot-helper'});
  expect(path).toMatch(/test-results\/browser\/unit\/snapshot-helper\/.+\.png$/);
});

test('captureStrip walks a sequence and writes one PNG per step', async () => {
  await renderR3FAndSettle(
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#22ddee" />
    </mesh>,
  );

  const paths = await captureStrip('unit', 'strip-demo', [
    {name: '00-init'},
    {name: '01-mid'},
    {name: '02-final'},
  ]);

  expect(paths).toHaveLength(3);
  expect(paths[0]).toMatch(/00-init\.png$/);
  expect(paths[1]).toMatch(/01-mid\.png$/);
  expect(paths[2]).toMatch(/02-final\.png$/);
});

test('captureSnapshot resolves the active viewport name', async () => {
  await renderR3FAndSettle(
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" />
    </mesh>,
  );

  // The path embeds the project name; for the four configured
  // viewports we should see one of these segments. The unknown
  // fallback would mean __vitest_browser_runner__ wasn't found,
  // which itself is a regression we want to catch.
  const path = await captureSnapshot({layer: 'unit', feature: 'viewport-probe'});
  expect(path).toMatch(/(desktop-1280|mobile-390|tablet-768|uhd-3840)/);
  expect(path).not.toContain('unknown-viewport');
});
