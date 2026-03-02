import {useEntities} from 'miniplex-react';
import {renderable} from '../world';
import {MaterialElement} from './MeshRenderer';

export function LatheRenderer() {
  const bucket = useEntities(renderable);
  return (
    <>
      {bucket.entities
        .filter(e => e.geometry!.type === 'lathe')
        .map((entity, i) => {
          if (!entity.geometry!.lathePoints) return null;
          const points = entity.geometry!.lathePoints;
          const segments = entity.geometry!.args[0] ?? 24;
          return (
            <mesh
              key={entity.name ?? `lathe-${i}`}
              ref={obj => {
                if (obj) entity.three = obj;
              }}
              position={entity.transform!.position}
              rotation={entity.transform!.rotation}
              scale={entity.transform!.scale}
            >
              <latheGeometry args={[points, segments]} />
              <MaterialElement def={entity.material!} />
            </mesh>
          );
        })}
    </>
  );
}
