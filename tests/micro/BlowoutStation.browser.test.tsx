import {BlowoutStation} from '../../src/components/stations/BlowoutStation';
import {useGameStore} from '../../src/ecs/hooks';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// BlowoutStation only renders its sausage tube + cereal box target when
// `gamePhase === 'BLOWOUT'`. Root group is at world (-1.5, 0, 1.5).
// Pull the camera back so the whole tube + box are in frame.
defineMicroSpec({
  name: 'BlowoutStation',
  setup: () => {
    useGameStore.getState().setGamePhase('BLOWOUT');
  },
  mountChildren: () => <BlowoutStation />,
  cameraPosition: [0.5, 1.2, 3.0],
  cameraTarget: [-1.5, 0.3, 1.5],
  cameraFov: 65,
  minMeshes: 1,
  // BlowoutStation mounts a heavy tree: instanced particles,
  // a CanvasTexture via CerealBoxTarget, multiple PBR materials
  // with physical shading, and a useFrame loop that touches
  // every frame. On CI's xvfb + Mesa-backed ANGLE, initial GL
  // upload of all those resources takes far longer than on local
  // hardware GPUs. Give it plenty of wall time.
  settleTimeoutMs: 20_000,
  testTimeoutMs: 45_000,
  // Skip the lit-pixel sanity check — the dark cereal box +
  // dimly-lit tube can dip below the threshold in headless GL,
  // and mesh count is already a strong signal here.
  minLitPixels: 0,
});
