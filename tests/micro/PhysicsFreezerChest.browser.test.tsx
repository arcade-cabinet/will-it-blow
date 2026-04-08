import {PhysicsFreezerChest} from '../../src/components/stations/PhysicsFreezerChest';
import {defineMicroSpec} from '../harness/defineMicroSpec';

defineMicroSpec({
  name: 'PhysicsFreezerChest',
  mountChildren: () => <PhysicsFreezerChest />,
  physics: true,
  cameraPosition: [-1.5, 1.4, -1.5],
  cameraFov: 70,
  minMeshes: 1,
  settleTimeoutMs: 8_000,
});
