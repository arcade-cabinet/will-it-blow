import {Canvas} from '@react-three/fiber';
import {Physics} from '@react-three/rapier';
import {Suspense} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import * as THREE from 'three';
import {CameraRail} from './src/components/camera/CameraRail';
import {FirstPersonControls} from './src/components/camera/FirstPersonControls';
import {IntroSequence} from './src/components/camera/IntroSequence';
import {PlayerHands} from './src/components/camera/PlayerHands';
import {MrSausage3D} from './src/components/characters/MrSausage3D';
import {BasementRoom} from './src/components/environment/BasementRoom';
import {Prop} from './src/components/environment/Prop';
import {ScatterProps} from './src/components/environment/ScatterProps';
import {SurrealText} from './src/components/environment/SurrealText';
import {KitchenSetPieces} from './src/components/kitchen/KitchenSetPieces';
import {LiquidPourer} from './src/components/kitchen/LiquidPourer';
import {ProceduralIngredientsList} from './src/components/kitchen/ProceduralIngredients';
import {TrapDoorAnimation} from './src/components/kitchen/TrapDoorAnimation';
import {Sausage} from './src/components/sausage/Sausage';
import {BlowoutStation} from './src/components/stations/BlowoutStation';
import {PhysicsFreezerChest} from './src/components/stations/PhysicsFreezerChest';
import {ChoppingBlock} from './src/components/stations/ChoppingBlock';

import {Grinder} from './src/components/stations/Grinder';
import {Sink} from './src/components/stations/Sink';
import {Stove} from './src/components/stations/Stove';
import {Stuffer} from './src/components/stations/Stuffer';
import {TV} from './src/components/stations/TV';
import {GameOrchestrator} from './src/engine/GameOrchestrator';
import {useGameStore} from './src/store/gameStore';

// --- Console Warning Overrides to keep dev env clean of upstream noise ---
const origWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('THREE.Clock')) return;
    if (args[0].includes('PCFSoftShadowMap')) return;
    if (args[0].includes('deprecated parameters for the initialization function')) return;
    if (args[0].includes('textShadow')) return;
    if (args[0].includes('pointerEvents')) return;
  }
  origWarn(...args);
};

const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('getSnapshot should be cached')) return;
    if (args[0].includes('Maximum update depth exceeded')) return;
  }
  origError(...args);
};
// -----------------------------------------------------------------------

function GameContent() {
  const introActive = useGameStore(state => state.introActive);

  return (
    <>
      <Physics gravity={[0, -20, 0]}>
        <BasementRoom />
        <SurrealText />
        <KitchenSetPieces />
        <PhysicsFreezerChest />
        <TV />
        <ChoppingBlock />

        {/* Stations */}
        <Grinder />
        <Stuffer />
        <Stove />
        <BlowoutStation />
        <Sink />
        <Sausage position={[2.8, 2.0, 0]} />
        <ProceduralIngredientsList />
        <LiquidPourer position={[-2.8, 2.2, -2.0]} />

        {/* Horror Props */}
        <ScatterProps />
        <Prop name="Saw" position={[2.9, 1.8, -1.0]} rotation={[0, -Math.PI / 2, 0]} />
        <Prop name="Cleaver" position={[1.5, 0.45, 0]} rotation={[Math.PI / 2, 0.2, 0]} />
        <Prop name="PS1" position={[-2.8, 0.4, 1.0]} rotation={[0, Math.PI / 4, 0]} />
        <Prop name="Polaroid" position={[2.6, 0.4, -2.5]} rotation={[0, 0, 0]} />

        {/* Mr. Sausage area */}
        <MrSausage3D position={[-2.4, 0, 0]} rotationY={Math.PI / 2} scale={0.4} trackCamera />

        {/* Ceiling Trapdoor */}
        <TrapDoorAnimation position={[0, 3, 0]} />

        {/* Dynamic Camera Rail */}
        <CameraRail />

        {/* State Machine */}
        <GameOrchestrator />
      </Physics>

      <PlayerHands />

      {introActive ? <IntroSequence /> : <FirstPersonControls />}
    </>
  );
}

function UILayer() {
  const introActive = useGameStore(state => state.introActive);

  return (
    <View style={[StyleSheet.absoluteFill, {pointerEvents: 'none'} as any]}>
      {/* We removed the non-diegetic HUD text here in favor of the in-world SurrealText */}
    </View>
  );
}

export default function App() {
  return (
    <View style={styles.container}>
      <Canvas
        camera={{position: [2.0, 0.5, 3.0], fov: 75}} // Increased FOV for better first-person perspective
        shadows={{type: THREE.PCFShadowMap}}
        gl={{toneMappingExposure: 1.0}}
      >
        <color attach="background" args={['#000000']} />
        <fogExp2 attach="fog" args={['#2a2a2a', 0.015]} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[0, 2.5, 0]} // Light from center ceiling
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.001}
        />
        <pointLight position={[0, 2.0, 0]} intensity={50} distance={10} color="#ffeedd" />

        <Suspense fallback={null}>
          <GameContent />
        </Suspense>
      </Canvas>
      <UILayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  uiLayer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  instructions: {
    color: '#ffcc00',
    fontSize: 20,
    fontWeight: 'bold',
    textShadow: '0px 2px 4px rgba(0,0,0,1)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcc00',
  } as any,
});
