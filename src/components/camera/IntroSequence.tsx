import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
import {audioEngine} from '../../engine/AudioEngine';
import {setPitch} from '../../player/useMouseLook';

export function IntroSequence() {
  const {camera, gl, scene} = useThree();
  const timeRef = useRef(0);

  const setIntroPhase = useGameStore(state => state.setIntroPhase);
  const setIntroActive = useGameStore(state => state.setIntroActive);
  const setPosture = useGameStore(state => state.setPosture);

  const phaseRef = useRef(0);

  const topLid = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(20, 10),
        new THREE.MeshBasicMaterial({color: 0x000000, depthTest: false, depthWrite: false}),
      ),
    [],
  );

  const bottomLid = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(20, 10),
        new THREE.MeshBasicMaterial({color: 0x000000, depthTest: false, depthWrite: false}),
      ),
    [],
  );

  useEffect(() => {
    topLid.renderOrder = 9999;
    bottomLid.renderOrder = 9999;

    camera.add(topLid);
    camera.add(bottomLid);
    scene.add(camera);

    // Start muffled — eyes are closed
    audioEngine.setMuffled(true);

    // Force camera to look UP at the ceiling (prone on mattress)
    // setPitch writes to useMouseLook's pitchRef so it won't be overwritten
    setPitch(Math.PI / 2 - 0.1);

    return () => {
      camera.remove(topLid);
      camera.remove(bottomLid);
      audioEngine.setMuffled(false);
      if (gl.domElement?.style) {
        gl.domElement.style.filter = 'none';
      }
    };
  }, [camera, scene, topLid, bottomLid, gl]);

  useFrame((_state, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    let newPhase = phaseRef.current;
    let eyelidOpenness = 0;
    let blurAmount = 0;

    // During the entire intro, force camera to look UP at the ceiling.
    // We set BOTH the pending pitch (for useMouseLook's ref) AND the camera
    // rotation directly (to win regardless of useFrame execution order).
    if (t < 7.0) {
      const upPitch = Math.PI / 2 - 0.1;
      setPitch(upPitch);
      camera.rotation.order = 'YXZ';
      camera.rotation.x = upPitch;
    }

    if (t < 2.0) {
      newPhase = 0;
      eyelidOpenness = 0;
      blurAmount = 20;
      // Eyes fully closed — muffle audio
      audioEngine.setMuffled(true);
    } else if (t < 7.0) {
      newPhase = 1;

      const b = t - 2.0;

      if (b < 1.0) {
        eyelidOpenness = Math.sin(b * Math.PI) * 0.3;
        blurAmount = 15;
        // First blink peek — still muffled
        audioEngine.setMuffled(true);
      } else if (b < 1.5) {
        eyelidOpenness = 0;
        blurAmount = 15;
        // Eyes shut again — muffle
        audioEngine.setMuffled(true);
      } else if (b < 3.0) {
        const p = (b - 1.5) / 1.5;
        eyelidOpenness = Math.sin(p * Math.PI) * 0.6;
        blurAmount = 15 - p * 8;
        // Second blink — partially muffled
        audioEngine.setMuffled(eyelidOpenness < 0.3);
      } else if (b < 3.5) {
        eyelidOpenness = 0;
        blurAmount = 7;
        // Eyes shut again
        audioEngine.setMuffled(true);
      } else {
        const p = (b - 3.5) / 1.5;
        eyelidOpenness = Math.min(1.0, p * 1.5);
        blurAmount = 7 * (1.0 - p);
        // Eyes opening — clear muffle as they open
        audioEngine.setMuffled(eyelidOpenness < 0.5);
      }
    } else {
      eyelidOpenness = 1.0;
      blurAmount = 0;
      if (phaseRef.current !== 2) {
        phaseRef.current = 2;
        setIntroPhase(2);
        setIntroActive(false);
        setPosture('standing');
        // Eyes fully open — clear muffle, reset pitch to level
        audioEngine.setMuffled(false);
        setPitch(-0.05);
      }
    }

    const lidOffset = 5.0;
    const openDistance = 2.0;
    topLid.position.set(0, lidOffset + eyelidOpenness * openDistance, -2);
    bottomLid.position.set(0, -lidOffset - eyelidOpenness * openDistance, -2);

    if (gl.domElement?.style) {
      gl.domElement.style.filter = blurAmount > 0 ? `blur(${blurAmount}px)` : 'none';
    }

    if (newPhase !== phaseRef.current) {
      phaseRef.current = newPhase;
      setIntroPhase(newPhase);
    }
  });

  return null;
}
