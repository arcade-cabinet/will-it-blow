/**
 * SlaughterhouseDressing — orchestrator component that composes all
 * set dressing sub-components into the kitchen scene (T2.B).
 *
 * WHY a single wrapper: mounting all dressing as one subtree lets us
 * toggle the entire layer (e.g., for performance profiling or a
 * "clean room" debug mode) with a single boolean without touching
 * the main scene graph.
 *
 * Places ~55 previously unused GLBs from public/models/ as static
 * decorations across walls, ceiling, and floor.
 */

import {BearTrapByMattress} from './BearTrapByMattress';
import {CeilingHazards} from './CeilingHazards';
import {FarCornerCage} from './FarCornerCage';
import {FloorDebris} from './FloorDebris';
import {WallShelf} from './WallShelf';
import {WallTrophies} from './WallTrophies';

export function SlaughterhouseDressing() {
  return (
    <group name="slaughterhouse-dressing">
      <WallTrophies />
      <CeilingHazards />
      <FloorDebris />
      <FarCornerCage />
      <BearTrapByMattress />
      <WallShelf />
    </group>
  );
}
