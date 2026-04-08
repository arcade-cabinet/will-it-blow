import {BasementRoom} from '../../src/components/environment/BasementRoom';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// Camera at eye level in the centre of the room, looking at the back
// wall so the tile floor, walls, and ceiling are all in frame.
defineMicroSpec({
  name: 'BasementRoom',
  mountChildren: () => <BasementRoom />,
  physics: true, // walls are wrapped in <RigidBody>
  cameraPosition: [0, 1.6, 3.5],
  cameraTarget: [0, 1.0, -2.0],
  cameraFov: 75,
  minMeshes: 6, // 4 walls + floor + ceiling
});
