import {useGameStore} from '../../src/ecs/hooks';
import {BlowoutStation} from '../../src/components/stations/BlowoutStation';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// BlowoutStation root group lives at world (-1.5, 0, 1.5) and only
// renders when `gamePhase === 'BLOWOUT'`. Seed the store before mount.
defineMicroSpec({
  name: 'BlowoutStation',
  setup: () => {
    useGameStore.getState().setGamePhase('BLOWOUT');
  },
  mountChildren: () => <BlowoutStation />,
  cameraPosition: [-0.2, 1.0, 2.5],
  cameraTarget: [-1.5, 0.4, 1.5],
  cameraFov: 75,
  minMeshes: 1,
  settleTimeoutMs: 8_000,
});
