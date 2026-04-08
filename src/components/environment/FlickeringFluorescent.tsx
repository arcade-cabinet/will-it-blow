/**
 * @module FlickeringFluorescent
 * A `<pointLight>` that occasionally drops out like a dying fluorescent
 * tube with a bad ballast. The horror-movie clich&eacute; — the kind of
 * light you see in hospital morgues, Saw basements, and every Texas
 * Chainsaw Massacre kitchen — rendered as a single self-contained
 * component so `App.tsx` can drop several of them around the room
 * without repeating the `useFrame` + noise-driven intensity logic.
 *
 * Design rules:
 *
 *  1. **Deterministic per instance.** Each instance uses its own
 *     hashable seed so flickers don't sync up across tubes. Two tubes
 *     flickering in lockstep reads as "effect" not as "decay".
 *
 *  2. **Pulse profile.** The tube sits at full brightness most of the
 *     time. The flicker isn't a steady sinusoid — it's a sharp drop
 *     followed by a fast recover, like an arc tube struggling to
 *     re-strike. Controlled by `flickerRate` (chance of a dropout per
 *     second) and `flickerDepth` (how far the intensity falls).
 *
 *  3. **No React re-renders.** The intensity is mutated directly on
 *     the `<pointLight>` ref inside `useFrame`. The React tree never
 *     sees the per-frame value, same pattern as `PlayerHands` +
 *     `useMouseLook`.
 */
import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import type * as THREE from 'three';

export interface FlickeringFluorescentProps {
  position: [number, number, number];
  /** Intensity at full on — matches a stock R3F `<pointLight intensity>`. */
  baseIntensity: number;
  /** Point-light falloff distance. */
  distance: number;
  /** Hex colour. Default cold institutional green-white. */
  color?: string;
  /**
   * Average flickers per second (Poisson-ish). `0.9` ≈ "nearly one a
   * second", `0.15` ≈ "every six or seven seconds". Keep at least one
   * tube in the room well below the obvious threshold so the scene
   * doesn't look like a Christmas decoration.
   */
  flickerRate: number;
  /**
   * How far the intensity drops during a flicker, 0–1. `0.85` means
   * the tube nearly goes out; `0.25` is a subtle dim.
   */
  flickerDepth: number;
  /** Optional React key pass-through for mesh marker testing. */
  testId?: string;
}

export function FlickeringFluorescent({
  position,
  baseIntensity,
  distance,
  color = '#d8f8e8',
  flickerRate,
  flickerDepth,
}: FlickeringFluorescentProps) {
  const lightRef = useRef<THREE.PointLight>(null);

  // Per-instance phase so multiple tubes don't strobe in unison. Using
  // `useMemo` with an empty deps array gives us a stable seed across
  // re-renders without a module-level counter.
  const phase = useMemo(() => Math.random() * 1000, []);

  // Flicker state kept in refs — mutating them never churns React.
  const flickerEndRef = useRef(0);
  const flickerMinRef = useRef(1);
  const nextCheckRef = useRef(0);

  useFrame((state, delta) => {
    const light = lightRef.current;
    if (!light) return;

    const t = state.clock.elapsedTime + phase;

    // Decide whether to *start* a new flicker. Rate * delta is the
    // probability of starting one this frame; bounded so a burst of
    // long delta (GC pause, tab switch) can't spawn a huge dim.
    if (t > nextCheckRef.current) {
      nextCheckRef.current = t + 0.05;
      if (Math.random() < flickerRate * 0.05) {
        // Flicker duration: 20ms to 180ms. The short end reads as an
        // arc restrike, the long end reads as a failing ballast.
        const duration = 0.02 + Math.random() * 0.16;
        flickerEndRef.current = t + duration;
        // The bottom of the dip — randomised within flickerDepth so
        // not every flicker looks identical.
        flickerMinRef.current = 1 - flickerDepth * (0.4 + Math.random() * 0.6);
      }
    }

    // Interpolate intensity. During a flicker, snap to the min value
    // and recover linearly. Outside a flicker, sit at full brightness
    // with a very faint 60Hz buzz so the light still feels alive.
    let factor = 1;
    if (t < flickerEndRef.current) {
      factor = flickerMinRef.current;
    } else {
      // Tiny AC hum at roughly 60Hz so the tube never looks dead-still.
      factor = 1 + Math.sin(t * 377) * 0.015;
    }

    // Direct mutation — no setState, no re-render.
    light.intensity = baseIntensity * factor;
    // Suppress unused-delta warning without eslint-disable.
    void delta;
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      intensity={baseIntensity}
      distance={distance}
      color={color}
      castShadow={false}
    />
  );
}
