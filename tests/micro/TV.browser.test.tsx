import {TV} from '../../src/components/stations/TV';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// TV at world (-2.8, 1.8, 0).
defineMicroSpec({
  name: 'TV',
  mountChildren: () => <TV />,
  physics: true,
  cameraPosition: [-1.0, 1.8, 0],
  cameraTarget: [-2.8, 1.8, 0],
  cameraFov: 60,
  minMeshes: 5, // shell + bezel + screen
  settleTimeoutMs: 10_000, // GLB load
});
