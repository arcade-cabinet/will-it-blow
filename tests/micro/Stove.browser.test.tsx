import {Stove} from '../../src/components/stations/Stove';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// Stove root group is at world (2.8, 0, 0), rotated -π/2 on Y so its
// front faces -X. Camera sits a couple of metres in front of the face
// and slightly above.
defineMicroSpec({
  name: 'Stove',
  mountChildren: () => <Stove />,
  physics: true,
  cameraPosition: [0.8, 1.3, 0.5],
  cameraTarget: [2.8, 0.6, 0],
  cameraFov: 65,
  minMeshes: 1,
  settleTimeoutMs: 10_000,
});
