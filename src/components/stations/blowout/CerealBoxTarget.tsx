/**
 * @module CerealBoxTarget
 * The cereal box that receives the stuffing-tube splatter during the
 * "Will It Blow?" climax (design pillar #3).
 *
 * A simple box mesh with the front face mapped to a dynamic
 * CanvasTexture. When the player blows, `CanvasTextureSplatter.paintBurst`
 * stamps the composite-colour splatter onto the box face. Mr. Sausage
 * watches the result and scores based on the composite tier.
 *
 * The box is positioned slightly behind the slam zone so the player
 * aims toward it. A subtle surreal drawing is pre-painted on the
 * texture (just abstract shapes for now — the art team can replace
 * this with Dall-E cereal art later).
 */
import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {createSplatterCanvas} from './CanvasTextureSplatter';

interface CerealBoxTargetProps {
  /** World position of the box. */
  position?: [number, number, number];
  /** Called when mount is ready — parent stashes the splatter API. */
  onReady?: (api: ReturnType<typeof createSplatterCanvas>) => void;
}

export function CerealBoxTarget({position = [0, 0.6, -0.5], onReady}: CerealBoxTargetProps) {
  const splatter = useMemo(() => createSplatterCanvas(), []);

  // Pre-paint a faint surreal "cereal drawing" — abstract circles and
  // lines that read as "there was art here before the gore covered it".
  useEffect(() => {
    const tex = splatter.getTexture();
    const canvas = tex.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#4a3020';
      ctx.lineWidth = 2;
      // Abstract smiley
      ctx.beginPath();
      ctx.arc(256, 200, 80, 0, Math.PI * 2);
      ctx.stroke();
      // Eyes
      ctx.beginPath();
      ctx.arc(230, 180, 10, 0, Math.PI * 2);
      ctx.arc(282, 180, 10, 0, Math.PI * 2);
      ctx.stroke();
      // Wonky smile
      ctx.beginPath();
      ctx.arc(256, 210, 40, 0.1, Math.PI - 0.1);
      ctx.stroke();
      // "SAUSAGE-O's" text
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#5a4030';
      ctx.textAlign = 'center';
      ctx.fillText('SAUSAGE-Os', 256, 350);
      tex.needsUpdate = true;
    }
    onReady?.(splatter);
  }, [splatter, onReady]);

  const texture = splatter.getTexture();

  // Six-face material array: only the front face (+Z) gets the canvas texture.
  const materials = useMemo(() => {
    const boxSide = new THREE.MeshStandardMaterial({
      color: '#3a2415',
      roughness: 0.9,
    });
    const boxFront = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
    });
    // Order: +X, -X, +Y, -Y, +Z, -Z
    return [boxSide, boxSide, boxSide, boxSide, boxFront, boxSide];
  }, [texture]);

  return (
    <mesh position={position} castShadow receiveShadow material={materials}>
      <boxGeometry args={[0.4, 0.5, 0.08]} />
    </mesh>
  );
}
