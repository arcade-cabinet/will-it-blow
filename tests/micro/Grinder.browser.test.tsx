import {Grinder} from '../../src/components/stations/Grinder';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// Grinder lives at world (-2.5, 1.0, -1.0) per `STATION_BOUNDS`.
defineMicroSpec({
  name: 'Grinder',
  mountChildren: () => <Grinder />,
  physics: true,
  cameraPosition: [-0.5, 1.5, 0],
  cameraTarget: [-2.5, 1.0, -1.0],
  cameraFov: 75,
  minMeshes: 1,
  settleTimeoutMs: 8_000,
});
