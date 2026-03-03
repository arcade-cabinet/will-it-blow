import {useEntities} from 'miniplex-react';
import {lights} from '../world';

export function LightRenderer() {
  const bucket = useEntities(lights);
  return (
    <>
      {bucket.entities.map((entity, i) => (
        <pointLight
          key={entity.name ?? i}
          ref={obj => {
            if (obj) entity.three = obj;
          }}
          position={entity.transform!.position}
          intensity={entity.lightDef!.intensity}
          distance={entity.lightDef!.distance}
          color={entity.lightDef!.color}
          decay={entity.lightDef!.decay ?? 2}
        />
      ))}
    </>
  );
}
