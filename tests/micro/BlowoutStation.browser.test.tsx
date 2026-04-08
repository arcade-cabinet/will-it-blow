import {BlowoutStation} from '../../src/components/stations/BlowoutStation';
import {useGameStore} from '../../src/ecs/hooks';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// BlowoutStation only renders its sausage tube when `gamePhase === 'BLOWOUT'`.
// Root group is at world (-1.5, 0, 1.5). Pull the camera back so the
// whole tube is in frame instead of filling it.
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
  settleTimeoutMs: 10_000,
});
