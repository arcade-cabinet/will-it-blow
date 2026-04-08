import {KitchenSetPieces} from '../../src/components/kitchen/KitchenSetPieces';
import {defineMicroSpec} from '../harness/defineMicroSpec';

defineMicroSpec({
  name: 'KitchenSetPieces',
  mountChildren: () => <KitchenSetPieces />,
  physics: true,
  cameraPosition: [0, 1.6, 4],
  cameraTarget: [0, 1, 0],
  cameraFov: 75,
  width: 800,
  height: 600,
  minMeshes: 5,
  settleTimeoutMs: 12_000, // multiple GLBs to fetch
});
