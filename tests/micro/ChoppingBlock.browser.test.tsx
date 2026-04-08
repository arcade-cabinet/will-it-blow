import {ChoppingBlock} from '../../src/components/stations/ChoppingBlock';
import {defineMicroSpec} from '../harness/defineMicroSpec';

defineMicroSpec({
  name: 'ChoppingBlock',
  mountChildren: () => <ChoppingBlock />,
  physics: true,
  cameraPosition: [1.5, 1.4, 0],
  cameraFov: 70,
  minMeshes: 1,
  settleTimeoutMs: 8_000,
});
