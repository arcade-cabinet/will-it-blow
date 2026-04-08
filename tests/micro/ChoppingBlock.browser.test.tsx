import {ChoppingBlock} from '../../src/components/stations/ChoppingBlock';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// ChoppingBlock root group at world (1.5, 0.4, 0).
defineMicroSpec({
  name: 'ChoppingBlock',
  mountChildren: () => <ChoppingBlock />,
  physics: true,
  cameraPosition: [0.2, 1.2, 1.5],
  cameraTarget: [1.5, 0.7, 0],
  cameraFov: 65,
  minMeshes: 1,
  settleTimeoutMs: 10_000,
});
