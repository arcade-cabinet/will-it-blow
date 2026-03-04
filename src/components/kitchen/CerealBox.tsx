/**
 * @module CerealBox
 * Procedural cereal box using BoxGeometry with CanvasTexture faces.
 *
 * Front face shows "Mr. Sausage's Own" branding drawn via Canvas2D.
 * A dynamic stain layer accumulates splatter marks as the blowout particles
 * land on the box. The stain CanvasTexture is updated imperatively via the
 * `onSplatReady` callback — no React state cycle per splat (performance).
 *
 * @param props.position - Local position relative to parent group
 * @param props.onSplatReady - Called with the addSplat(u, v) function once mounted
 */

import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';

// ---------------------------------------------------------------------------
// Constants (from config)
// ---------------------------------------------------------------------------

const {
  width: BOX_W,
  height: BOX_H,
  depth: BOX_D,
  splatResolution: STAIN_RES,
} = config.gameplay.blowout.cerealBox;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Draws the "Mr. Sausage's Own" front-face branding onto a canvas and
 * returns it as a THREE.CanvasTexture.
 */
function makeFrontTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background — deep red like a vintage cereal box
  ctx.fillStyle = '#8B0000';
  ctx.fillRect(0, 0, 256, 512);

  // Yellow stripe at top
  ctx.fillStyle = '#FFC832';
  ctx.fillRect(0, 0, 256, 60);

  // Title text
  ctx.fillStyle = '#1A0000';
  ctx.font = 'bold 26px serif';
  ctx.textAlign = 'center';
  ctx.fillText("MR. SAUSAGE'S", 128, 38);

  // Main brand name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px serif';
  ctx.fillText('OWN', 128, 100);

  // Sub-name
  ctx.fillStyle = '#FFC832';
  ctx.font = 'italic 22px serif';
  ctx.fillText('Casing Crunch', 128, 135);

  // Decorative divider
  ctx.strokeStyle = '#FFC832';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 150);
  ctx.lineTo(236, 150);
  ctx.stroke();

  // Serving suggestion area (gray square)
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(40, 165, 176, 180);

  ctx.fillStyle = '#DDD';
  ctx.font = '13px serif';
  ctx.fillText('Serving Suggestion', 128, 200);

  // Star rating
  ctx.fillStyle = '#FFC832';
  ctx.font = '20px serif';
  ctx.fillText('★ ★ ★ ★ ★ ★ ★', 128, 250);

  // Bottom text
  ctx.fillStyle = '#FFC832';
  ctx.font = 'bold 16px serif';
  ctx.fillText('SEVEN STARS', 128, 380);

  ctx.fillStyle = '#AAA';
  ctx.font = '12px serif';
  ctx.fillText('Net Wt. 340g  ·  No artificial anything', 128, 405);

  // Barcode-like stripes at bottom
  for (let x = 50; x < 206; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? '#222' : '#111';
    ctx.fillRect(x, 430, 2, 40);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Creates a blank RGBA canvas for splat accumulation and returns
 * the canvas + texture pair.
 */
function makeSplatTexture(): {canvas: HTMLCanvasElement; texture: THREE.CanvasTexture} {
  const canvas = document.createElement('canvas');
  canvas.width = STAIN_RES;
  canvas.height = STAIN_RES;
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return {canvas, texture};
}

// ---------------------------------------------------------------------------
// CerealBox Component
// ---------------------------------------------------------------------------

interface CerealBoxProps {
  position: [number, number, number];
  onSplatReady: (addSplat: (u: number, v: number) => void) => void;
}

export function CerealBox({position, onSplatReady}: CerealBoxProps) {
  const splatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const splatTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const splatMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  // ---- Build front face branding texture once ----
  const frontTexture = useMemo(() => makeFrontTexture(), []);

  // ---- Build splat texture once ----
  const {canvas: splatCanvas, texture: splatTexture} = useMemo(() => makeSplatTexture(), []);

  useEffect(() => {
    splatCanvasRef.current = splatCanvas;
    splatTextureRef.current = splatTexture;

    // Expose the addSplat function to the BlowoutOrchestrator via ref callback
    const addSplat = (u: number, v: number) => {
      const sc = splatCanvasRef.current;
      const st = splatTextureRef.current;
      if (!sc || !st) return;

      const ctx = sc.getContext('2d');
      if (!ctx) return;

      const px = Math.round(Math.max(0, Math.min(1, u)) * (STAIN_RES - 1));
      const py = Math.round(Math.max(0, Math.min(1, 1 - v)) * (STAIN_RES - 1));

      // Draw a rough splat blob
      const radius = 4 + Math.random() * 5;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grad.addColorStop(0, 'rgba(160, 90, 60, 0.85)');
      grad.addColorStop(0.6, 'rgba(120, 60, 40, 0.5)');
      grad.addColorStop(1, 'rgba(80, 40, 20, 0)');

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      st.needsUpdate = true;
      if (splatMatRef.current) splatMatRef.current.needsUpdate = true;
    };

    onSplatReady(addSplat);

    return () => {
      splatTextureRef.current = null;
      splatCanvasRef.current = null;
    };
  }, [splatCanvas, splatTexture, onSplatReady]);

  // ---- Cleanup textures on unmount ----
  useEffect(() => {
    return () => {
      frontTexture.dispose();
      splatTexture.dispose();
    };
  }, [frontTexture, splatTexture]);

  return (
    <group position={position}>
      {/* Main box — faces: right, left, top, bottom, front, back */}
      {/* Front face (branded) */}
      <mesh position={[0, 0, BOX_D / 2]}>
        <planeGeometry args={[BOX_W, BOX_H]} />
        <meshBasicMaterial map={frontTexture} />
      </mesh>

      {/* Back face (plain) */}
      <mesh position={[0, 0, -BOX_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[BOX_W, BOX_H]} />
        <meshBasicMaterial color="#6B0000" />
      </mesh>

      {/* Left face */}
      <mesh position={[-BOX_W / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[BOX_D, BOX_H]} />
        <meshBasicMaterial color="#7A0000" />
      </mesh>

      {/* Right face */}
      <mesh position={[BOX_W / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BOX_D, BOX_H]} />
        <meshBasicMaterial color="#7A0000" />
      </mesh>

      {/* Top */}
      <mesh position={[0, BOX_H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOX_W, BOX_D]} />
        <meshBasicMaterial color="#FFC832" />
      </mesh>

      {/* Bottom */}
      <mesh position={[0, -BOX_H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOX_W, BOX_D]} />
        <meshBasicMaterial color="#8B0000" />
      </mesh>

      {/* Splat stain layer — overlaid on front face, slightly in front */}
      <mesh position={[0, 0, BOX_D / 2 + 0.001]}>
        <planeGeometry args={[BOX_W, BOX_H]} />
        <meshBasicMaterial
          ref={el => {
            splatMatRef.current = el;
          }}
          map={splatTexture}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
