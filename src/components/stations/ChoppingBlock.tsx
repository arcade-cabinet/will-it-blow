/**
 * @module ChoppingBlock
 * The chopping station — player chops ingredients on a blood-stained
 * stump via tap/swipe. Completing all chops in quick succession earns
 * a "Rapid Chop" flair point (design pillar #5: style points throughout).
 */
import {Box, Cylinder, useTexture} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useRef, useState} from 'react';
import {useGameStore} from '../../ecs/hooks';
import {audioEngine} from '../../engine/AudioEngine';
import {asset} from '../../utils/assetPath';
import {requestHandGesture} from '../camera/handGestureStore';
import {alternatingSwing} from '../camera/handGestures';

/** Required chops to complete the chopping phase. */
const REQUIRED_CHOPS = 5;
/** If all chops land within this window (seconds), award Rapid Chop bonus. */
const RAPID_CHOP_WINDOW_MS = 3000;

export function ChoppingBlock() {
  const [colorMap, normalMap, roughnessMap] = useTexture([
    asset('/textures/grime_base_color.jpg'),
    asset('/textures/grime_base_normal.jpg'),
    asset('/textures/grime_base_roughness.jpg'),
  ]);

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const recordFlairPoint = useGameStore(state => state.recordFlairPoint);
  const [chopCount, setChopCount] = useState(0);
  const firstChopTime = useRef<number | null>(null);

  const doChop = () => {
    if (gamePhase === 'CHOPPING') {
      audioEngine.playChop();
      setChopCount(c => {
        // Alternate the swinging hand so the chop feels less robotic.
        requestHandGesture(alternatingSwing(c));

        // Track timing for rapid-chop bonus.
        if (c === 0) {
          firstChopTime.current = Date.now();
        }

        const next = c + 1;
        if (next >= REQUIRED_CHOPS) {
          // Award flair: check if chops were rapid.
          const elapsed = Date.now() - (firstChopTime.current ?? Date.now());
          if (elapsed < RAPID_CHOP_WINDOW_MS) {
            recordFlairPoint('Rapid Chop', 5);
          } else {
            recordFlairPoint('Chopping Complete', 2);
          }
          setGamePhase('FILL_GRINDER');
        }
        return next;
      });
    }
  };

  // Allow clicking to chop for easy desktop testing
  const handleClick = () => {
    doChop();
  };

  // Allow swiping to chop for mobile/advanced interaction
  const bindDrag = useDrag(({swipe: [swipeX, swipeY]}) => {
    if (swipeX !== 0 || swipeY !== 0) {
      doChop();
    }
  });

  return (
    <group position={[1.5, 0.4, 0]}>
      {/* Stump/Base */}
      <RigidBody type="fixed" colliders="hull">
        <Cylinder args={[0.5, 0.6, 0.8, 32]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#5C4033" // Dark wood
            roughness={0.9}
          />
        </Cylinder>
      </RigidBody>

      {/* Cutting Surface (Grimey/Bloody) */}
      <RigidBody type="fixed" colliders="hull">
        {/* @ts-ignore */}
        <Cylinder
          {...bindDrag()}
          onClick={handleClick}
          args={[0.5, 0.5, 0.05, 32]}
          position={[0, 0.4, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={colorMap}
            normalMap={normalMap}
            roughnessMap={roughnessMap}
            color="#662222" // Blood stained
          />
        </Cylinder>
      </RigidBody>

      {/* Visual Indicator of Chopping */}
      {chopCount > 0 && (
        <group position={[0, 0.45, 0]}>
          <Box args={[0.2, 0.05, 0.2]}>
            <meshStandardMaterial color="#aa2222" roughness={0.6} />
          </Box>
        </group>
      )}
    </group>
  );
}
