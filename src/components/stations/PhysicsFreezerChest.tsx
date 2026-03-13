import {useGLTF, useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

// An array of available GLB models to act as ingredients in the freezer.
// We mix normal food with strange objects for the "Will It Blow?" aspect.
const INGREDIENT_MODELS = [
  // Normal Food (Playwright cache)
  {path: '/models/ingredients/banana.glb', scale: 1.5, type: 'food'},
  {path: '/models/ingredients/burger.glb', scale: 1.2, type: 'food'},
  {path: '/models/ingredients/cake.glb', scale: 1.0, type: 'food'},
  {path: '/models/ingredients/fish.glb', scale: 1.8, type: 'food'},
  {path: '/models/ingredients/pepper_red.glb', scale: 1.5, type: 'food'},
  {path: '/models/ingredients/pizza_slice.glb', scale: 1.5, type: 'food'},
  {path: '/models/ingredients/steak.glb', scale: 1.2, type: 'food'},

  // Normal Food (3DLowPoly extracts)
  {path: '/models/ingredients/bacon.glb', scale: 2.0, type: 'food'},
  {path: '/models/ingredients/bottle-ketchup.glb', scale: 1.5, type: 'food'},
  {path: '/models/ingredients/bread.glb', scale: 1.5, type: 'food'},
  {path: '/models/ingredients/apple.glb', scale: 1.5, type: 'food'},

  // The "Weird" Stuff
  {path: '/models/ingredients/worm.glb', scale: 2.0, type: 'weird'},
  {path: '/models/ingredients/arcade-machine.glb', scale: 0.2, type: 'weird'}, // Miniaturized!
  {path: '/models/ingredients/cash-register.glb', scale: 0.4, type: 'weird'},
  {path: '/models/ingredients/vending-machine.glb', scale: 0.2, type: 'weird'},
  {path: '/models/ingredients/bottle-large.glb', scale: 1.0, type: 'weird'},

  // Trash & Horror (misc.glb nodes)
  {path: '/models/misc.glb', node: 'Radio', scale: 1.0, type: 'trash'},
  {path: '/models/misc.glb', node: 'Meds', scale: 1.5, type: 'trash'},
  {path: '/models/misc.glb', node: 'Tape', scale: 1.5, type: 'trash'},
  {path: '/models/misc.glb', node: 'PS1', scale: 0.5, type: 'trash'},
];

export function PhysicsFreezerChest() {
  const {scene: fridgeScene} = useGLTF('/models/fridge.glb') as any;
  const misc = useGLTF('/models/misc.glb') as any;

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

  // Pre-generate a list of ingredients to spawn inside the freezer bounds
  const spawnedIngredients = useMemo(() => {
    const list = [];
    // Spawn 25 random items for a totally packed toy chest
    for (let i = 0; i < 25; i++) {
      const def = INGREDIENT_MODELS[Math.floor(Math.random() * INGREDIENT_MODELS.length)];
      list.push({
        id: i,
        ...def,
        // Random position inside the bounds of the freezer tub
        pos: [
          (Math.random() - 0.5) * 1.5, // X width
          Math.random() * 0.5 + 0.2, // Y height
          (Math.random() - 0.5) * 1.0, // Z depth
        ],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
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
        <FreezerIngredient key={item.id} def={item} miscNodes={misc.nodes} frostMat={frostMat} />
      ))}

      {/* Frost/Cold Air overlay plane just above the contents */}
      <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 1.2]} />
        <meshBasicMaterial color="#aaccff" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Individual draggable ingredient component
function FreezerIngredient({def, miscNodes, frostMat}: any) {
  const gltf = useGLTF(def.path) as any;
  const ref = useRef<any>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const setSelectedIngredientId = useGameStore(state => state.setSelectedIngredientId);

  // Allow player to reach in and grab an item
  const bind = useDrag(({active, movement: [x, y]}) => {
    setIsGrabbed(active);
    if (active && ref.current) {
      // Lift the object out of the freezer
      ref.current.setTranslation({x: -1.5, y: 2.0, z: -2.5}, true);
      setSelectedIngredientId(def.id);
    }

    // When released, if we were in the selection phase, progress to chopping
    if (!active && gamePhase === 'SELECT_INGREDIENTS') {
      setGamePhase('CHOPPING');
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
INGREDIENT_MODELS.forEach(m => useGLTF.preload(m.path));
