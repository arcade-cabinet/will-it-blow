/**
 * @module PlaceSetting
 * Procedural dining table dressing for the blowout challenge scene.
 *
 * Renders a single place setting composed of:
 * - Plate (LatheGeometry disk with rim)
 * - Fork  (thin BoxGeometry, left of plate)
 * - Knife (thin BoxGeometry, right of plate)
 * - Glass (CylinderGeometry, transparent)
 * - Napkin (thin folded BoxGeometry, under fork)
 *
 * The cereal box sits behind the plate; this component owns only the
 * tableware. All geometry is procedural — no GLB assets needed.
 *
 * @param props.position - World position of the table surface centre
 * @param props.visible  - Mount/unmount guard; set true during blowout challenge
 */

import * as THREE from 'three/webgpu';

// ---------------------------------------------------------------------------
// Geometry constants
// ---------------------------------------------------------------------------

/** Plate radius and lathe profile */
const PLATE_R = 0.14;
const PLATE_H = 0.015;
const PLATE_RIM_H = 0.022;
const PLATE_RIM_R = PLATE_R + 0.012;

/** Utensil dims */
const UTENSIL_W = 0.018;
const UTENSIL_D = 0.008;
const FORK_H = 0.16;
const KNIFE_H = 0.16;
const FORK_X = -(PLATE_RIM_R + 0.025 + UTENSIL_W / 2);
const KNIFE_X = PLATE_RIM_R + 0.025 + UTENSIL_W / 2;

/** Glass dims */
const GLASS_R_TOP = 0.028;
const GLASS_R_BOT = 0.022;
const GLASS_H = 0.085;
const GLASS_X = PLATE_RIM_R + 0.09;
const GLASS_Z = -0.06;

/** Napkin dims (folded rectangle under fork) */
const NAPKIN_W = 0.06;
const NAPKIN_H = 0.003;
const NAPKIN_D = 0.09;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Plate built from two cylinders: a flat base disk and a shallow rim ring.
 * Both share the same white ceramic colour.
 */
function Plate() {
  return (
    <group name="plate">
      {/* Base disk */}
      <mesh position={[0, PLATE_H / 2, 0]}>
        <cylinderGeometry args={[PLATE_R, PLATE_R, PLATE_H, 32]} />
        <meshStandardMaterial color="#f5f0eb" roughness={0.35} metalness={0.0} />
      </mesh>
      {/* Rim ring — slightly larger radius, taller */}
      <mesh position={[0, PLATE_RIM_H / 2, 0]}>
        <cylinderGeometry args={[PLATE_RIM_R, PLATE_RIM_R, PLATE_RIM_H, 32, 1, true]} />
        <meshStandardMaterial
          color="#f5f0eb"
          roughness={0.35}
          metalness={0.0}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/** Fork — thin box with tine notches faked by two narrower boxes. */
function Fork() {
  return (
    <group name="fork" position={[FORK_X, 0, 0]}>
      {/* Handle */}
      <mesh position={[0, FORK_H * 0.3, 0]}>
        <boxGeometry args={[UTENSIL_W, FORK_H * 0.6, UTENSIL_D]} />
        <meshStandardMaterial color="#c8c8c8" roughness={0.25} metalness={0.75} />
      </mesh>
      {/* Left tine */}
      <mesh position={[-UTENSIL_W * 0.22, -FORK_H * 0.25, 0]}>
        <boxGeometry args={[UTENSIL_W * 0.3, FORK_H * 0.45, UTENSIL_D]} />
        <meshStandardMaterial color="#c8c8c8" roughness={0.25} metalness={0.75} />
      </mesh>
      {/* Right tine */}
      <mesh position={[UTENSIL_W * 0.22, -FORK_H * 0.25, 0]}>
        <boxGeometry args={[UTENSIL_W * 0.3, FORK_H * 0.45, UTENSIL_D]} />
        <meshStandardMaterial color="#c8c8c8" roughness={0.25} metalness={0.75} />
      </mesh>
    </group>
  );
}

/** Knife — thin box with a slightly wider blade end. */
function Knife() {
  return (
    <group name="knife" position={[KNIFE_X, 0, 0]}>
      {/* Handle */}
      <mesh position={[0, KNIFE_H * 0.3, 0]}>
        <boxGeometry args={[UTENSIL_W, KNIFE_H * 0.5, UTENSIL_D]} />
        <meshStandardMaterial color="#c8c8c8" roughness={0.25} metalness={0.75} />
      </mesh>
      {/* Blade — slightly wider, positioned below handle */}
      <mesh position={[0, -KNIFE_H * 0.22, 0]}>
        <boxGeometry args={[UTENSIL_W * 1.35, KNIFE_H * 0.5, UTENSIL_D * 0.6]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.15} metalness={0.9} />
      </mesh>
    </group>
  );
}

/** Glass — transparent cylinder. */
function Glass() {
  return (
    <group name="glass" position={[GLASS_X, 0, GLASS_Z]}>
      {/* Outer shell — open-top cylinder, double-sided so interior renders */}
      <mesh position={[0, GLASS_H / 2, 0]}>
        <cylinderGeometry args={[GLASS_R_TOP, GLASS_R_BOT, GLASS_H, 20, 1, true]} />
        <meshStandardMaterial
          color="#a8d8f0"
          transparent
          opacity={0.28}
          roughness={0.04}
          metalness={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Base disk */}
      <mesh position={[0, GLASS_H * 0.01, 0]}>
        <cylinderGeometry args={[GLASS_R_BOT, GLASS_R_BOT, 0.006, 20]} />
        <meshStandardMaterial
          color="#a8d8f0"
          transparent
          opacity={0.5}
          roughness={0.04}
          metalness={0.12}
        />
      </mesh>
    </group>
  );
}

/** Napkin — a flat cream-coloured rectangle under the fork. */
function Napkin() {
  return (
    <mesh name="napkin" position={[FORK_X, NAPKIN_H / 2, 0]}>
      <boxGeometry args={[NAPKIN_W, NAPKIN_H, NAPKIN_D]} />
      <meshStandardMaterial color="#f0ebe0" roughness={0.85} metalness={0.0} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// PlaceSetting — composed table dressing
// ---------------------------------------------------------------------------

interface PlaceSettingProps {
  /** World position of the table surface centre — from resolveLayout dining-table target */
  position: [number, number, number];
  /** Mount guard: set false to skip rendering when blowout is not active */
  visible?: boolean;
}

/**
 * Full place setting at the dining table.
 *
 * Layout (all local-space, Y=0 is table surface):
 * - Plate at centre
 * - Fork to the left, Knife to the right
 * - Glass upper-right of plate
 * - Napkin under the fork
 *
 * The cereal box is rendered by BlowoutOrchestrator and sits at [0, 0, -0.22]
 * relative to the table centre — behind the plate.
 */
export function PlaceSetting({position, visible = true}: PlaceSettingProps) {
  if (!visible) return null;

  // Table surface is at Y = minBounds.y = 0.9 above floor in config.
  // The position passed in is the floor-level target; lift to table top.
  const tableTopY = position[1] + 0.9;

  return (
    <group name="place-setting" position={[position[0], tableTopY, position[2]]}>
      <Napkin />
      <Plate />
      <Fork />
      <Knife />
      <Glass />
    </group>
  );
}
