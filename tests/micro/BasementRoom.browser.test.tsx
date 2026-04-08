import {BasementRoom} from '../../src/components/environment/BasementRoom';
import {defineMicroSpec} from '../harness/defineMicroSpec';

defineMicroSpec({
  name: 'BasementRoom',
  mountChildren: () => <BasementRoom />,
  physics: true, // walls are wrapped in <RigidBody>
  cameraPosition: [0, 1.6, 4],
  minMeshes: 6, // 4 walls + floor + ceiling
});
