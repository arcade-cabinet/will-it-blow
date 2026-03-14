import {Canvas} from '@react-three/fiber';

export function App() {
  return (
    <div style={{width: '100vw', height: '100vh', background: '#000'}}>
      <Canvas>
        <ambientLight intensity={0.4} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </Canvas>
    </div>
  );
}
