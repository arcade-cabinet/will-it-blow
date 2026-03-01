import {useThree} from '@react-three/fiber';
import {useEffect} from 'react';
import * as THREE from 'three/webgpu';

/**
 * SceneIntrospector — exposes Three.js scene data for E2E tests via window.__gov.
 * Only active when the GameGovernor test harness is installed.
 */
export function SceneIntrospector() {
  const {scene, camera} = useThree();

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).__gov) return;
    const gov = (window as any).__gov;

    /** Query camera position and direction */
    gov.getCamera = () => ({
      position: [camera.position.x, camera.position.y, camera.position.z],
      fov: (camera as any).fov ?? 0,
    });

    /** List all top-level group names and their positions in the scene */
    gov.getSceneChildren = () => {
      const result: {name: string; type: string; position: number[]; childCount: number}[] = [];
      scene.children.forEach(child => {
        result.push({
          name: child.name || child.type,
          type: child.type,
          position: [child.position.x, child.position.y, child.position.z],
          childCount: child.children.length,
        });
      });
      return result;
    };

    /** Find a mesh/group by name (searches recursively) and return its world position */
    gov.findObject = (name: string) => {
      let found: THREE.Object3D | null = null;
      scene.traverse(obj => {
        if (obj.name === name && !found) found = obj;
      });
      if (!found) return null;
      const target: THREE.Object3D = found;
      const wp = new THREE.Vector3();
      target.getWorldPosition(wp);
      return {
        name: target.name,
        type: target.type,
        worldPosition: [wp.x, wp.y, wp.z],
        visible: target.visible,
        childCount: target.children.length,
      };
    };

    /** Count all Mesh objects in the scene (useful for verifying always-render) */
    gov.getMeshCount = () => {
      let count = 0;
      scene.traverse(obj => {
        if (obj.type === 'Mesh') count++;
      });
      return count;
    };

    /** Get positions of all groups whose names match a pattern */
    gov.findGroups = (pattern: string) => {
      const re = new RegExp(pattern, 'i');
      const results: {
        name: string;
        worldPosition: number[];
        visible: boolean;
        childCount: number;
      }[] = [];
      scene.traverse(obj => {
        if (obj.type === 'Group' && re.test(obj.name)) {
          const wp = new THREE.Vector3();
          obj.getWorldPosition(wp);
          results.push({
            name: obj.name,
            worldPosition: [wp.x, wp.y, wp.z],
            visible: obj.visible,
            childCount: obj.children.length,
          });
        }
      });
      return results;
    };

    return () => {
      if (typeof window !== 'undefined' && (window as any).__gov) {
        const g = (window as any).__gov;
        delete g.getCamera;
        delete g.getSceneChildren;
        delete g.findObject;
        delete g.getMeshCount;
        delete g.findGroups;
      }
    };
  }, [scene, camera]);

  return null;
}
