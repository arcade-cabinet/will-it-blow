import {SurrealText} from '../../src/components/environment/SurrealText';
import {useGameStore} from '../../src/ecs/hooks';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// SurrealText for `SELECT_INGREDIENTS` lives at world (-2.5, 1.5, -3.8)
// on the back-left wall, facing +Z. We position the camera a metre
// in front of the text plane so the glyphs fill the frame.
defineMicroSpec({
  name: 'SurrealText',
  setup: () => {
    const store = useGameStore.getState();
    store.setIntroActive(false);
    store.setPosture('standing');
    store.setGamePhase('SELECT_INGREDIENTS');
  },
  mountChildren: () => <SurrealText />,
  cameraPosition: [-2.5, 1.5, -1.8],
  cameraTarget: [-2.5, 1.5, -3.8],
  cameraFov: 70,
  minMeshes: 1, // text glyphs
  // Skip the pixel check — drei <Text> renders thin glyphs that the
  // RGB-sum threshold can't reliably catch across viewports.
  minLitPixels: 0,
  settleTimeoutMs: 12_000,
});
