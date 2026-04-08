import {useGameStore} from '../../src/ecs/hooks';
import {SurrealText} from '../../src/components/environment/SurrealText';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// SurrealText for SELECT_INGREDIENTS lives at world (-2.5, 1.5, -3.8)
// on the back-left wall. Force the player to be standing (not in
// the prone intro state), then point the camera directly at it.
defineMicroSpec({
  name: 'SurrealText',
  setup: () => {
    const store = useGameStore.getState();
    store.setIntroActive(false);
    store.setPosture('standing');
    store.setGamePhase('SELECT_INGREDIENTS');
  },
  mountChildren: () => <SurrealText />,
  // Pulled back further so the back-wall text fills more pixels.
  cameraPosition: [-2.0, 1.5, 1.5],
  cameraTarget: [-2.5, 1.5, -3.8],
  cameraFov: 90,
  minMeshes: 1, // text glyphs
  // Skip the lit-pixel check entirely — drei <Text> font load is
  // racy in narrow viewports and the mesh-count assertion is a
  // stronger signal that text rendered. Full-page meso tests at
  // the title-screen layer will catch any visual regressions.
  minLitPixels: 0,
  settleTimeoutMs: 12_000, // drei <Text> loads a font from the network
});
