import {Grinder} from '../../src/components/stations/Grinder';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// Grinder root group is at world (-1.5, 0.4, -1.0).
defineMicroSpec({
  name: 'Grinder',
  mountChildren: () => <Grinder />,
  physics: true,
  cameraPosition: [0.0, 1.4, 0.5],
  cameraTarget: [-1.5, 0.9, -1.0],
  cameraFov: 65,
  minMeshes: 1,
  settleTimeoutMs: 10_000,
});
