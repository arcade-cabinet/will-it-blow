import {Box, Cylinder, useTexture} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {useRef, useState} from 'react';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

export function ChoppingBlock() {
  const [colorMap, normalMap, roughnessMap] = useTexture([
    require('../../../assets/textures/grime_base_color.jpg'),
    require('../../../assets/textures/grime_base_normal.jpg'),
    require('../../../assets/textures/grime_base_roughness.jpg'),
  ]);

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const [chopCount, setChopCount] = useState(0);

  const doChop = () => {
    if (gamePhase === 'CHOPPING') {
      audioEngine.playChop();
      setChopCount(c => {
        const next = c + 1;
        if (next >= 5) {
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

  // Allow swiping to chop for mobile/advanced interaction (R3F pointer events, useDrag crashes on web)
  const swipeDragging = useRef(false);
  const swipeStart = useRef({x: 0, y: 0});
  const SWIPE_THRESHOLD = 0.05; // minimum distance in 3D units to count as a swipe

  const handleSwipeDown = (e: any) => {
    swipeDragging.current = true;
    swipeStart.current = {x: e.point?.x ?? 0, y: e.point?.y ?? 0};
  };
  const handleSwipeMove = (_e: any) => {
    // Movement tracked, swipe detected on pointer up
  };
  const handleSwipeUp = (e: any) => {
    if (!swipeDragging.current) return;
    swipeDragging.current = false;
    const dx = (e.point?.x ?? 0) - swipeStart.current.x;
    const dy = (e.point?.y ?? 0) - swipeStart.current.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
      doChop();
    }
  };
  const handleSwipeLeave = () => {
    swipeDragging.current = false;
  };

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
        <Cylinder
          onClick={handleClick}
          onPointerDown={handleSwipeDown}
          onPointerMove={handleSwipeMove}
          onPointerUp={handleSwipeUp}
          onPointerLeave={handleSwipeLeave}
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
