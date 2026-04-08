import {Stuffer} from '../../src/components/stations/Stuffer';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// Stuffer root group is at world (-2.8, 0.4, 2). Camera looks at
// the centre of the rig from the side.
defineMicroSpec({
  name: 'Stuffer',
  mountChildren: () => <Stuffer />,
  physics: true,
  cameraPosition: [-0.8, 1.4, 2.5],
  cameraTarget: [-2.8, 0.8, 2],
  cameraFov: 65,
  minMeshes: 1,
  settleTimeoutMs: 10_000,
});
