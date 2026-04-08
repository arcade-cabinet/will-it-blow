import {PhysicsFreezerChest} from '../../src/components/stations/PhysicsFreezerChest';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// PhysicsFreezerChest root group is at world (-1.5, 0, -3.2).
defineMicroSpec({
  name: 'PhysicsFreezerChest',
  mountChildren: () => <PhysicsFreezerChest />,
  physics: true,
  // Pull the camera back so the full chest is in frame with room
  // to spare — the test was previously framing individual
  // ingredients inside the chest at point-blank range.
  cameraPosition: [0.5, 2.2, -1.0],
  cameraTarget: [-1.5, 0.4, -3.2],
  cameraFov: 70,
  minMeshes: 1,
  settleTimeoutMs: 10_000,
});
