import {useGLTF} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {useMemo} from 'react';

export function ScatterProps() {
  const {nodes, materials} = useGLTF('/models/misc.glb') as any;

  // We want to scatter specific creepy/grunge objects around the scene.
  // Using rigid bodies so they physically fall to the floor/shelves.
  const scatterList = useMemo(
    () => [
      {node: nodes.PizzaBox, mat: materials.PizzaBox, pos: [-1.5, 3, -1.0], rot: [0, 0.4, 0]},
      {
        node: nodes.Pizza_Slice,
        mat: materials.Pizza_Slice_Material,
        pos: [-1.2, 3, -0.8],
        rot: [0, 0, 0],
      },
      {node: nodes.Radio, mat: materials.Radio_Material, pos: [1.5, 3, -2.0], rot: [0, 0.2, 0]},
      {
        node: nodes.Poster_Missing,
        mat: materials.Poster_Missing_Material,
        pos: [0, 3, 2.0],
        rot: [0, 0, 0],
      },
      {node: nodes.Meds, mat: materials.Meds, pos: [-1.8, 3, 2.0], rot: [0.1, 0.5, 0.2]},
      {node: nodes.Nail, mat: materials.Nail, pos: [2.5, 3, 1.0], rot: [0, 0, 0]},
      {node: nodes.Tape, mat: materials.Tape, pos: [2.2, 3, 1.2], rot: [0, 0, 0]},
      {
        node: nodes.Cigarette_Pack,
        mat: materials.Cigarette_Pack_Material,
        pos: [-0.5, 3, 1.5],
        rot: [0, 0, 0],
      },
      {node: nodes.Battery, mat: materials.Battery_Material, pos: [1.2, 3, -0.5], rot: [0, 0, 0]},
      {
        node: nodes.Bottle_1,
        mat: materials.Bottle_1_Material,
        pos: [-2.2, 3, 1.5],
        rot: [Math.PI / 2, 0, 0],
      },
    ],
    [nodes, materials],
  );

  return (
    <group>
      {scatterList.map(
        (item, i) =>
          item.node && (
            <RigidBody
              key={i}
              position={item.pos as any}
              rotation={item.rot as any}
              colliders="hull"
              mass={0.1}
            >
              <mesh
                geometry={item.node.geometry}
                material={item.mat}
                castShadow
                receiveShadow
                scale={1.5}
              />
            </RigidBody>
          ),
      )}
    </group>
  );
}

useGLTF.preload('/models/misc.glb');
