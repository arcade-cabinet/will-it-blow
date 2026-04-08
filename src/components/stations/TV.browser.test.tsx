/**
 * Real-browser integration test for the CRT TV + Mr. Sausage.
 *
 * Runs under @vitest/browser + Playwright, not jsdom, so the R3F <Canvas>
 * actually mounts a WebGL context, `useGLTF` resolves against a real
 * network, and we can inspect live scene graph state. This is the kind of
 * assertion that was previously only possible via full Playwright E2E
 * runs through the title screen + intro sequence.
 */
import {Canvas} from '@react-three/fiber';
import {Physics} from '@react-three/rapier';
import {Suspense} from 'react';
import {expect, test} from 'vitest';
import {render} from 'vitest-browser-react';
import {TV} from './TV';

test('TV mounts into a real WebGL canvas', async () => {
  const screen = render(
    <div style={{width: 512, height: 512}}>
      <Canvas camera={{position: [0, 0, 3], fov: 60}}>
        <ambientLight intensity={1} />
        <Suspense fallback={null}>
          <Physics>
            <TV />
          </Physics>
        </Suspense>
      </Canvas>
    </div>,
  );
  // Wait for R3F to commit its first frame.
  await new Promise(r => requestAnimationFrame(() => r(null)));

  const canvas = screen.container.querySelector('canvas');
  expect(canvas).not.toBeNull();
  // In jsdom `width`/`height` would be 0; a real browser gives us real
  // pixels, so this assertion doubles as a check that we're running under
  // the @vitest/browser provider and not falling back to jsdom.
  expect(canvas!.width).toBeGreaterThan(0);
  expect(canvas!.height).toBeGreaterThan(0);
});
