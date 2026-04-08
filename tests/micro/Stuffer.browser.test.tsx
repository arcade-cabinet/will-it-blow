import {Stuffer} from '../../src/components/stations/Stuffer';
import {defineMicroSpec} from '../harness/defineMicroSpec';

defineMicroSpec({
  name: 'Stuffer',
  mountChildren: () => <Stuffer />,
  physics: true,
  cameraPosition: [0, 1.4, -1.5],
  cameraFov: 70,
  minMeshes: 1,
  settleTimeoutMs: 8_000,
});
