import {Sink} from '../../src/components/stations/Sink';
import {defineMicroSpec} from '../harness/defineMicroSpec';

defineMicroSpec({
  name: 'Sink',
  mountChildren: () => <Sink />,
  physics: true,
  cameraPosition: [-1.5, 1.4, 1.5],
  cameraFov: 70,
  minMeshes: 1,
  settleTimeoutMs: 8_000,
});
