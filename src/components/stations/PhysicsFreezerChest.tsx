/**
 * @module PhysicsFreezerChest
 * The basement freezer / fridge — a physics "toy chest" full of
 * draggable ingredients. The player reaches in and pulls items out
 * during SELECT_INGREDIENTS to commit them to the round selection.
 *
 * Determinism note (T0.A): the random fridge contents (which
 * ingredients spawn where, with what rotation) are now deterministic
 * per-run. The same save-seed always lays out the same 25 items, so
 * the player can build a memory of "the steak is in the back-left"
 * across save-scummed reloads.
 *
 * Variable pick count: the number of ingredients required to advance
 * to CHOPPING is driven by the current clue's `ingredientCountHint`.
 * Literal clues hint the exact count (1-4); shock-me clues (hint=0)
 * let the player pick any number and tap the fridge door to confirm.
 */
import {useGLTF} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import type {Clue} from '../../engine/ClueGenerator';
import {useGameStore} from '../../ecs/hooks';
import {INGREDIENT_MODELS as INGREDIENT_DEFS} from '../../engine/Ingredients';
import {createRunRngOrFallback} from '../../engine/RunSeed';
import {asset} from '../../utils/assetPath';

/**
 * Parse the current clue from the ECS store to read ingredientCountHint.
 * Returns 3 as a fallback if no clue is set (pre-deduction rounds).
 */
function getIngredientCountHint(): number {
  const json = useGameStore.getState().getCurrentClueJson();
  if (!json || json === 'null') return 3;
  try {
    const clue = JSON.parse(json) as Clue;
    return clue.ingredientCountHint;
  } catch {
    return 3;
  }
}

export function PhysicsFreezerChest() {
  const {scene: fridgeScene} = useGLTF(asset('/models/fridge.glb')) as any;
  const misc = useGLTF(asset('/models/misc.glb')) as any;

  // Create an ice/frost overlay material
  const frostMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#eef5ff',
        transmission: 0.8,
        opacity: 0.6,
        transparent: true,
        roughness: 0.4,
        clearcoat: 0.8,
        thickness: 0.5,
      }),
    [],
  );

  // Pre-generate a list of ingredients to spawn inside the freezer bounds.
  // Uses the data-driven INGREDIENT_DEFS so each item has a proper string ID
  // that maps to the scoring system in DemandScoring.ts. Positions and
  // rotations route through the per-run seeded RNG so reloads see the
  // same fridge layout (the player learns the spatial map of the fridge).
  const spawnedIngredients = useMemo(() => {
    const rng = createRunRngOrFallback('freezer.layout');
    const list = [];
    // Spawn 25 random items for a totally packed toy chest
    for (let i = 0; i < 25; i++) {
      const def = INGREDIENT_DEFS[Math.floor(rng() * INGREDIENT_DEFS.length)];
      list.push({
        spawnIndex: i,
        ingredientId: def.id, // string ID like 'banana', 'burger', etc.
        path: def.path,
        node: def.node,
        scale: def.scale,
        // Position inside the bounds of the freezer tub.
        // Spawn higher (0.6-1.4) so items settle into the tub via gravity.
        pos: [
          (rng() - 0.5) * 1.2, // X width (narrower to stay inside)
          rng() * 0.8 + 0.6, // Y height (above tub floor)
          (rng() - 0.5) * 0.8, // Z depth (narrower to stay inside)
        ],
        rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
      });
    }
    return list;
  }, []);

  return (
    <group position={[-1.5, 0.0, -3.2]} rotation={[0, 0, 0]}>
      {/* Fridge Shell (Kinematic so items don't fall through) */}
      {fridgeScene && (
        <RigidBody type="fixed" colliders="trimesh">
          <primitive object={fridgeScene.clone()} castShadow receiveShadow />
        </RigidBody>
      )}

      {/* Physics "Toy Chest" Ingredients */}
      {spawnedIngredients.map(item => (
        <FreezerIngredient
          key={item.spawnIndex}
          def={item}
          miscNodes={misc.nodes}
          frostMat={frostMat}
        />
      ))}

      {/* Invisible collision floor inside the freezer tub to prevent items falling through trimesh */}
      <RigidBody type="fixed">
        <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <planeGeometry args={[1.8, 1.2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Frost/Cold Air overlay plane just above the contents */}
      <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 1.2]} />
        <meshBasicMaterial color="#aaccff" transparent opacity={0.1} depthWrite={false} />
      </mesh>

      {/* Fridge door — tappable surface for shock-me clues (hint=0).
          When ingredientCountHint is 0, the player can pick any number
          of ingredients and tap the door to confirm and advance. */}
      <FridgeDoorConfirm />
    </group>
  );
}

/**
 * Invisible tappable plane on the fridge door. Only active during
 * SELECT_INGREDIENTS when the clue's ingredientCountHint is 0 (shock-me)
 * and the player has selected at least 1 ingredient.
 */
function FridgeDoorConfirm() {
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const selectedIngredientIds = useGameStore(state => state.selectedIngredientIds);

  const handleClick = () => {
    if (gamePhase !== 'SELECT_INGREDIENTS') return;
    const hint = getIngredientCountHint();
    // Only the door-confirm works for shock-me (hint=0) with at least 1 pick.
    if (hint === 0 && selectedIngredientIds.length >= 1) {
      setGamePhase('CHOPPING');
    }
  };

  // Only render the tappable surface when relevant.
  if (gamePhase !== 'SELECT_INGREDIENTS') return null;
  const hint = getIngredientCountHint();
  if (hint !== 0) return null;

  return (
    <mesh position={[0, 0.8, 0.6]} onClick={handleClick}>
      <planeGeometry args={[1.4, 1.0]} />
      <meshBasicMaterial
        color={selectedIngredientIds.length >= 1 ? '#44ff44' : '#888888'}
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </mesh>
  );
}

// Individual draggable ingredient component
function FreezerIngredient({def, miscNodes, frostMat: _frostMat}: any) {
  const gltf = useGLTF(def.path) as any;
  const ref = useRef<any>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const addSelectedIngredientId = useGameStore(state => state.addSelectedIngredientId);
  const selectedIngredientIds = useGameStore(state => state.selectedIngredientIds);

  // Allow player to reach in and grab an item
  const bind = useDrag(({active, movement: [_x, _y]}) => {
    setIsGrabbed(active);
    if (active && ref.current && gamePhase === 'SELECT_INGREDIENTS') {
      // Lift the object out of the freezer
      // Stagger positions slightly so they don't overlap exactly
      const count = selectedIngredientIds.length;
      ref.current.setTranslation({x: -1.5 + count * 0.2, y: 2.0, z: -2.5}, true);
      addSelectedIngredientId(def.ingredientId); // Use string ID for scoring
    }

    // When released, check if we've reached the required count.
    // ingredientCountHint > 0: auto-advance at that count.
    // ingredientCountHint === 0: player must tap fridge door (handled by FridgeDoorConfirm).
    if (!active && gamePhase === 'SELECT_INGREDIENTS') {
      const hint = getIngredientCountHint();
      if (hint > 0 && selectedIngredientIds.length >= hint - 1) {
        // selectedIngredientIds.length was (hint-1) before this pick, so
        // this is the Nth ingredient (the addSelectedIngredientId call above
        // already mutated the store, but the React state lags by one render).
        // We compare against hint-1 because the selector reads the pre-add
        // snapshot. The actual count after add is hint.
        setGamePhase('CHOPPING');
      }
    }
  });

  let content = null;
  if (def.node) {
    if (miscNodes[def.node]) {
      content = (
        <mesh
          geometry={miscNodes[def.node].geometry}
          material={miscNodes[def.node].material}
          scale={def.scale}
        />
      );
    }
  } else if (gltf.scene) {
    content = <primitive object={gltf.scene.clone()} scale={def.scale} />;
  }

  if (!content) return null;

  return (
    <RigidBody
      ref={ref}
      position={def.pos}
      rotation={def.rot}
      colliders="hull"
      mass={1}
      type={isGrabbed ? 'kinematicPosition' : 'dynamic'}
    >
      {/* @ts-ignore */}
      <group {...bind()}>
        {content}
        {/* Frost overlay logic could be applied here by wrapping or duplicating mesh with frostMat */}
      </group>
    </RigidBody>
  );
}

// Preload all possible ingredients
for (const m of INGREDIENT_DEFS) {
  useGLTF.preload(m.path);
}
