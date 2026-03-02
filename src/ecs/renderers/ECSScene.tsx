import {SystemsProvider} from '../systems';
import {LatheRenderer} from './LatheRenderer';
import {LightRenderer} from './LightRenderer';
import {MeshRenderer} from './MeshRenderer';

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
