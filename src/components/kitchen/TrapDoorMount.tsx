/**
 * @module TrapDoorMount
 * Ceiling-mounted trap door — the only entrance/exit to the sealed basement.
 *
 * Uses ECS bare machine for the brushed steel panel, mounted in a
 * DisplayHousing ceiling bracket. Position from resolveLayout() targets map ('trap-door' key).
 */

import {useEffect, useState} from 'react';
import {config} from '../../config';
import {buildMachineArchetype} from '../../ecs/archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../../ecs/archetypes/spawnMachine';
import {MachineEntitiesRenderer} from '../../ecs/renderers/ECSScene';
import type {Entity} from '../../ecs/types';
import {DisplayHousing} from './DisplayHousing';

const trapDoorArchetype = buildMachineArchetype(config.machines['trap-door']);
const housingConfig = config.fixtures.ceilingTrapdoorHousing;

interface TrapDoorMountProps {
  position: [number, number, number];
}

export function TrapDoorMount({position}: TrapDoorMountProps) {
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    const spawned = spawnMachine(trapDoorArchetype);
    setEntities(spawned);
    return () => {
      despawnMachine(spawned);
    };
  }, []);

  return (
    <DisplayHousing config={housingConfig} position={position}>
      <MachineEntitiesRenderer entities={entities} />
    </DisplayHousing>
  );
}
