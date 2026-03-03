import {useEntities} from 'miniplex-react';
import {PRESETS} from '../materialPresets';
import type {Entity} from '../types';
import {nonMachineRenderable} from '../world';

export function GeometryElement({def}: {def: NonNullable<Entity['geometry']>}) {
  switch (def.type) {
    case 'box':
      return <boxGeometry args={def.args as [number, number, number]} />;
    case 'cylinder':
      return <cylinderGeometry args={def.args as [number, number, number, number]} />;
    case 'sphere':
      return <sphereGeometry args={def.args as [number, number, number]} />;
    case 'torus':
      return <torusGeometry args={def.args as [number, number, number, number]} />;
    case 'circle':
      return <circleGeometry args={def.args as [number, number]} />;
    case 'plane':
      return <planeGeometry args={def.args as [number, number]} />;
    case 'cone':
      return <coneGeometry args={def.args as [number, number, number]} />;
    case 'dodecahedron':
      return <dodecahedronGeometry args={def.args as [number, number]} />;
    default:
      return <boxGeometry />;
  }
}

export function MaterialElement({def}: {def: NonNullable<Entity['material']>}) {
  const preset = def.preset ? PRESETS[def.preset] : {};
  const merged = {...preset, ...def};
  // Strip non-Three.js props before spreading onto the material element
  const {type: _type, preset: _preset, ...matProps} = merged;

  switch (def.type) {
    case 'basic':
      return <meshBasicMaterial {...matProps} />;
    case 'physical':
      return <meshPhysicalMaterial {...matProps} />;
    default:
      return <meshStandardMaterial {...matProps} />;
  }
}

export function MeshRenderer() {
  const bucket = useEntities(nonMachineRenderable);
  return (
    <>
      {bucket.entities.map((entity, i) => {
        if (entity.geometry!.type === 'lathe') return null;
        return (
          <mesh
            key={entity.name ?? i}
            ref={obj => {
              if (obj) entity.three = obj;
            }}
            position={entity.transform!.position}
            rotation={entity.transform!.rotation}
            scale={entity.transform!.scale}
          >
            <GeometryElement def={entity.geometry!} />
            <MaterialElement def={entity.material!} />
          </mesh>
        );
      })}
    </>
  );
}
