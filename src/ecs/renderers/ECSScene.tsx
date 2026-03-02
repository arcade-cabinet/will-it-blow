import {SystemsProvider} from '../systems';
import {LatheRenderer} from './LatheRenderer';
import {LightRenderer} from './LightRenderer';
import {MeshRenderer} from './MeshRenderer';

export {buildInputHandlers, MachineEntitiesRenderer, MachineEntityMesh} from './InputRenderer';

export function ECSScene() {
  return (
    <>
      <SystemsProvider />
      <MeshRenderer />
      <LightRenderer />
      <LatheRenderer />
    </>
  );
}
