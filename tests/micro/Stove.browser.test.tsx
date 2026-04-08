import {Stove} from '../../src/components/stations/Stove';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// Stove lives at world (2.5, 0.9, -2.5) per `STATION_BOUNDS`.
defineMicroSpec({
  name: 'Stove',
  mountChildren: () => <Stove />,
  physics: true,
  cameraPosition: [0.5, 1.6, -1.0],
  cameraTarget: [2.5, 0.9, -2.5],
  cameraFov: 75,
  minMeshes: 1,
  settleTimeoutMs: 8_000,
});
