import {TV} from '../../src/components/stations/TV';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// TV root group at world (-2.8, 1.8, 0). Camera a little to the right
// and at eye level so the sign + front bezel are square in frame.
defineMicroSpec({
  name: 'TV',
  mountChildren: () => <TV />,
  physics: true,
  cameraPosition: [-1.2, 1.8, 0.1],
  cameraTarget: [-2.8, 1.8, 0],
  cameraFov: 55,
  minMeshes: 5, // outer shell + bezel + screen
  settleTimeoutMs: 12_000, // GLB load
});
