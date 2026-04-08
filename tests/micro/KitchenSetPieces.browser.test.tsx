import {KitchenSetPieces} from '../../src/components/kitchen/KitchenSetPieces';
import {defineMicroSpec} from '../harness/defineMicroSpec';

// KitchenSetPieces mounts 3 GLBs (island counter + 2 wall cabinets)
// at positions `(1.5, 0, -1.0)`, `(-1.0, 0, -3.5)`, `(0.5, 0, -3.5)`.
// Camera is pulled back behind the player spawn so all three are in
// frame without needing the full room context.
defineMicroSpec({
  name: 'KitchenSetPieces',
  mountChildren: () => <KitchenSetPieces />,
  physics: true,
  // Camera south + above the centroid. The island counter at
  // (1.5, 0, -1.0) and the two wall cabinets at z=-3.5 are spread
  // across a ~3m area, so we pull the camera 3-4m south to get
  // them all in frame from the front.
  cameraPosition: [0.3, 2.5, 3.0],
  cameraTarget: [0.3, 0.5, -2.5],
  cameraFov: 75,
  minMeshes: 3, // at least one mesh per GLB
  settleTimeoutMs: 12_000, // multiple GLB fetches
});
