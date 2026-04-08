import {Sink} from '../../src/components/stations/Sink';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// Sink root group is at world (-1.5, 0.4, -1.0).
defineMicroSpec({
  name: 'Sink',
  mountChildren: () => <Sink />,
  physics: true,
  cameraPosition: [0.2, 1.3, 0.4],
  cameraTarget: [-1.5, 0.8, -1.0],
  cameraFov: 65,
  minMeshes: 1,
  settleTimeoutMs: 10_000,
});
