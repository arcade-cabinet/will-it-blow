import type {Object3D, Side, Vector2} from 'three';
import type {InputBinding} from './inputTypes';
import type {MaterialPreset} from './materialPresets';

export type GeometryType =
  | 'box'
  | 'cylinder'
  | 'sphere'
  | 'torus'
  | 'circle'
  | 'plane'
  | 'lathe'
  | 'cone'
  | 'dodecahedron';

export type MachineId = 'grinder' | 'stuffer' | 'stove';

export type RGB = [number, number, number];

export interface Entity {
  name?: string;

  // Scene graph
  geometry?: {type: GeometryType; args: number[]; lathePoints?: Vector2[]};
  material?: {
    type: 'standard' | 'basic' | 'physical';
    preset?: MaterialPreset;
    color: number | string | [number, number, number];
    roughness?: number;
    metalness?: number;
    opacity?: number;
    transparent?: boolean;
    side?: Side;
    visible?: boolean;
    emissiveIntensity?: number;
    clearcoat?: number;
  };
  transform?: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  three?: Object3D;

  // Machine membership
  machineSlot?: {
    machineId: MachineId;
    slotName: string;
    removable?: boolean;
    findableTier?: string;
  };

  // Behavior components
  vibration?: {
    frequency: number;
    amplitude: number;
    active: boolean;
    axes: ('x' | 'y' | 'z')[];
  };
  rotation?: {axis: 'x' | 'y' | 'z'; speed: number; active: boolean};
  orbit?: {
    center: [number, number, number];
    radiusX: number;
    radiusZ: number;
    speedX: number;
    speedZ: number;
    active: boolean;
  };
  cookAppearance?: {
    cookLevel: number;
    colorRaw: RGB;
    colorCooked: RGB;
    colorCharred: RGB;
    colorBurnt: RGB;
  };
  inflation?: {
    fillLevel: number;
    maxScale: number;
    pulseThreshold: number;
    pulseSpeed: number;
    pulseAmplitude: number;
  };
  fillDriven?: {minY: number; maxY: number; fillLevel: number};
  particle?: {
    active: boolean;
    velocity: [number, number, number];
    life: number;
    maxLife: number;
  };
  particleEmitter?: {
    type: 'steam' | 'smoke' | 'grind';
    maxCount: number;
    spawnRate: number;
    active: boolean;
  };

  // Interaction
  clickable?: {action: string; enabled: boolean};
  draggable?: {
    axis: 'x' | 'y' | 'z';
    minValue: number;
    maxValue: number;
    sensitivity: number;
    isDragging: boolean;
  };

  // Lighting
  lightDef?: {type: 'point'; intensity: number; distance: number; color: number};

  // --- Input primitives ---

  /** Segmented rotary selector. Works for stove heat dial AND grinder speed dial. */
  dial?: {
    segments: string[];
    currentIndex: number;
    wraps: boolean;
    pendingTap: boolean;
    enabled: boolean;
  };

  /** Continuous rotary input. Player turning speed IS the output speed. */
  crank?: {
    angle: number;
    angularVelocity: number;
    sensitivity: number;
    damping: number;
    dragDelta: number;
    isDragging: boolean;
    enabled: boolean;
  };

  /** Linear drag producing displacement 0-1. Plunger, slider, lever. */
  plunger?: {
    displacement: number;
    axis: 'x' | 'y' | 'z';
    minWorld: number;
    maxWorld: number;
    sensitivity: number;
    dragDelta: number;
    isDragging: boolean;
    springBack: boolean;
    enabled: boolean;
  };

  /** Binary toggle. */
  toggle?: {
    isOn: boolean;
    pendingTap: boolean;
    enabled: boolean;
  };

  /** One-shot impulse button. */
  button?: {
    fired: boolean;
    pendingTap: boolean;
    enabled: boolean;
  };

  // --- Input contract ---

  inputContract?: {
    machineId: MachineId;
    bindings: InputBinding[];
  };

  // --- Power source ---

  powerSource?: {
    type: 'electric' | 'gas' | 'manual';
    powerLevel: number;
    active: boolean;
  };

  // Tags
  isStatic?: true;
  isHitbox?: true;
  isMachineRoot?: true;
  parentEntity?: Entity;
}
