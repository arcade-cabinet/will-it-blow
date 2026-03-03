/**
 * @module CeilingLightOrchestrator
 * Spawns ECS-driven fluorescent panel machines in ceiling housings.
 *
 * Each panel is a bare machine with a diffuser plane and a point light
 * with flicker behavior. The FlickerSystem handles animation automatically.
 * Panel positions come from the lighting scene config.
 */

import {useEffect, useState} from 'react';
import {config} from '../../config';
import {buildMachineArchetype} from '../../ecs/archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../../ecs/archetypes/spawnMachine';
import {MachineEntitiesRenderer} from '../../ecs/renderers/ECSScene';
import type {Entity} from '../../ecs/types';
import {DisplayHousing} from './DisplayHousing';

const panelArchetype = buildMachineArchetype(config.machines['fluorescent-panel']);
const panelPositions = config.scene.lighting.panels;
const housingConfig = config.fixtures.ceilingHousing;

export function CeilingLightOrchestrator() {
  const [panels, setPanels] = useState<Entity[][]>([]);

  useEffect(() => {
    const allEntities: Entity[][] = [];
    for (let i = 0; i < panelPositions.length; i++) {
      allEntities.push(spawnMachine(panelArchetype));
    }
    setPanels(allEntities);

    return () => {
      for (const entities of allEntities) {
        despawnMachine(entities);
      }
    };
  }, []);

  return (
    <>
      {panelPositions.map((panel, i) => (
        <DisplayHousing
          key={`ceiling-panel-${i}`}
          config={housingConfig}
          position={panel.position}
          rotationY={panel.rotationY}
        >
          {panels[i] && <MachineEntitiesRenderer entities={panels[i]} />}
        </DisplayHousing>
      ))}
    </>
  );
}
