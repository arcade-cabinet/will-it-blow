/**
 * @module SurrealText
 * Diegetic in-world UI text -- renders instructions and state-driven messages
 * as 3D text meshes on kitchen surfaces NEAR the active station for each phase.
 *
 * Four text layers:
 * 1. **Phase instruction** — on the wall/floor near the current station
 * 2. **Demands** — always on the ceiling so the player can glance up any time
 * 3. **Mr. Sausage taunt** — on the left wall near the TV
 * 4. **Bridge messages** — driven by surrealTextBridge (clue announcements,
 *    verdict text, flair events, dialogue effects — anything that calls
 *    `enqueueSurrealMessage()` from anywhere in the codebase)
 *
 * Text is blood-red (#FF1744) with a pulsing glow.
 *
 * Determinism note (T0.A): the taunt-line picker draws from the per-run
 * seeded RNG. The same save replays the same Mr. Sausage commentary.
 */
import {Text} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef, useState} from 'react';
import type * as THREE from 'three';
import type {GamePhase} from '../../ecs/hooks';
import {useGameStore} from '../../ecs/hooks';
import type {SurrealMessageRequest} from '../../engine/surrealTextBridge';
import {onSurrealMessage} from '../../engine/surrealTextBridge';
import {useRunRng} from '../../engine/useRunRng';
import {asset} from '../../utils/assetPath';

// ---------------------------------------------------------------------------
// Phase -> Surface mapping
// ---------------------------------------------------------------------------

interface SurfacePlacement {
  position: [number, number, number];
  rotation: [number, number, number];
}

/**
 * Maps each game phase to a wall/surface position near the relevant station.
 * Rotations orient the text so it faces the room interior from that surface.
 */
const PHASE_SURFACE: Record<GamePhase, SurfacePlacement> = {
  // Freezer — back-left wall, facing +Z into the room
  SELECT_INGREDIENTS: {
    position: [-2.5, 1.5, -3.8],
    rotation: [0, 0, 0],
  },
  // Chopping block — right wall, facing -X into the room
  CHOPPING: {
    position: [2.9, 1.5, 0],
    rotation: [0, -Math.PI / 2, 0],
  },
  // Grinder — left wall, facing +X into the room
  FILL_GRINDER: {
    position: [-2.9, 1.5, -1],
    rotation: [0, Math.PI / 2, 0],
  },
  GRINDING: {
    position: [-2.9, 1.5, -1],
    rotation: [0, Math.PI / 2, 0],
  },
  // Movement phases — point toward stuffer on back wall
  MOVE_BOWL: {
    position: [0, 1.5, -3.8],
    rotation: [0, 0, 0],
  },
  ATTACH_CASING: {
    position: [0, 1.5, -3.8],
    rotation: [0, 0, 0],
  },
  // Stuffer — back wall center, facing +Z
  STUFFING: {
    position: [0, 1.5, -3.8],
    rotation: [0, 0, 0],
  },
  TIE_CASING: {
    position: [0, 1.5, -3.8],
    rotation: [0, 0, 0],
  },
  // Blowout — floor, facing +Y (text on concrete slab)
  BLOWOUT: {
    position: [0, 0.01, 1.5],
    rotation: [-Math.PI / 2, 0, 0],
  },
  // Movement to stove — right wall
  MOVE_SAUSAGE: {
    position: [2.9, 1.5, -2.5],
    rotation: [0, -Math.PI / 2, 0],
  },
  MOVE_PAN: {
    position: [2.9, 1.5, -2.5],
    rotation: [0, -Math.PI / 2, 0],
  },
  // Stove — right wall, facing -X
  COOKING: {
    position: [2.9, 1.5, -2.5],
    rotation: [0, -Math.PI / 2, 0],
  },
  // Done / verdict — TV wall on left, facing +X
  DONE: {
    position: [-2.9, 1.8, 0],
    rotation: [0, Math.PI / 2, 0],
  },
};

/** Ceiling placement for demands text — always visible when looking up. */
const CEILING_SURFACE: SurfacePlacement = {
  position: [0, 2.99, 0],
  rotation: [Math.PI / 2, 0, 0],
};

/** Left wall near TV for Mr. Sausage taunts. */
const TV_WALL_SURFACE: SurfacePlacement = {
  position: [-2.9, 1.2, 0.8],
  rotation: [0, Math.PI / 2, 0],
};

/**
 * Named surface map for bridge messages. The bridge sends a string key
 * like 'wall-N', 'ceiling', etc.; we resolve it to a placement here.
 * 'auto' defaults to the back wall (wall-N) offset slightly lower than
 * phase text so both are readable simultaneously.
 */
const NAMED_SURFACES: Record<string, SurfacePlacement> = {
  'wall-N': {position: [0, 1.0, -3.8], rotation: [0, 0, 0]},
  'wall-S': {position: [0, 1.0, 3.8], rotation: [0, Math.PI, 0]},
  'wall-E': {position: [2.9, 1.0, 0], rotation: [0, -Math.PI / 2, 0]},
  'wall-W': {position: [-2.9, 1.0, 0], rotation: [0, Math.PI / 2, 0]},
  ceiling: CEILING_SURFACE,
  floor: {position: [0, 0.01, 0], rotation: [-Math.PI / 2, 0, 0]},
  auto: {position: [0, 1.0, -3.8], rotation: [0, 0, 0]},
};

function resolveSurface(name: string): SurfacePlacement {
  return NAMED_SURFACES[name] ?? NAMED_SURFACES.auto;
}

// ---------------------------------------------------------------------------
// Mr. Sausage taunt lines per phase (short quips for the TV wall)
// ---------------------------------------------------------------------------

const PHASE_TAUNTS: Partial<Record<GamePhase, string[]>> = {
  SELECT_INGREDIENTS: [
    'Choose wisely...',
    'I have specific tastes.',
    "Don't disappoint me.",
    'Open that fridge.',
  ],
  CHOPPING: [
    'Feel the rhythm of the blade.',
    'Every piece must be perfect.',
    'Chop like you mean it.',
  ],
  FILL_GRINDER: ['Feed the beast.', 'Now grind my meat.', 'Not too fast. Not too slow.'],
  GRINDING: ['FASTER!', 'Put your back into it.', 'Grind it WELL.'],
  STUFFING: ['Gently...', "Too much pressure and... you'll see.", 'Fill it just right.'],
  TIE_CASING: ['A tight knot. No mistakes.', 'One chance. Make it count.'],
  BLOWOUT: ['The moment of truth.', 'Cover every inch.', 'My cereal box awaits.'],
  COOKING: ["Don't you DARE burn it.", 'Listen for the sizzle.', 'Perfection or nothing.'],
  DONE: ['Let me taste...', '*chews slowly*', 'Hmm...'],
};

// ---------------------------------------------------------------------------
// SurrealMessage — animated 3D text on a surface
// ---------------------------------------------------------------------------

/** Individual animated message positioned on a specific surface. */
function SurrealMessage({
  text,
  onDead,
  isDismissing,
  surface,
  fontSize = 0.4,
  maxWidth = 5.0,
  dropOffset = 0,
}: {
  text: string;
  onDead: () => void;
  isDismissing: boolean;
  surface: SurfacePlacement;
  fontSize?: number;
  maxWidth?: number;
  /** Vertical offset for slide-down animation (bridge messages). */
  dropOffset?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const bgRef = useRef<THREE.MeshBasicMaterial>(null);

  const state = useRef({
    opacity: 0,
  });

  useFrame((sys, delta) => {
    const s = state.current;
    const t = sys.clock.elapsedTime;
    const pulse = 0.8 + Math.sin(t * 2) * 0.2;

    if (isDismissing) {
      s.opacity -= delta * 1.2;
      if (s.opacity <= 0) onDead();
    } else {
      s.opacity = Math.min(0.95, s.opacity + delta * 1.5);
    }

    if (materialRef.current) {
      materialRef.current.color.setRGB(0.54 * pulse, 0.01 * pulse, 0.01 * pulse);
      materialRef.current.opacity = Math.max(0, s.opacity);
    }

    if (bgRef.current) {
      bgRef.current.opacity = Math.max(0, s.opacity * 0.5);
    }

    // Apply slide-down offset to the group Y position.
    if (groupRef.current && dropOffset !== 0) {
      groupRef.current.position.y = surface.position[1] - dropOffset;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[surface.position[0], surface.position[1] - dropOffset, surface.position[2]]}
      rotation={surface.rotation}
    >
      {/* Semi-transparent dark background plane for contrast */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[maxWidth + 0.4, fontSize * 4 + 0.3]} />
        <meshBasicMaterial ref={bgRef} color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>
      <Text
        fontSize={fontSize}
        maxWidth={maxWidth}
        lineHeight={1.2}
        font={asset('/fonts/Nosifer-Regular.ttf')}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        color="#FF1744"
        outlineColor="#000000"
        outlineWidth={0.02}
        characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?',.:%/ "
      >
        {text}
        <meshStandardMaterial ref={materialRef} transparent depthWrite={false} roughness={0.8} />
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Message ID generator
// ---------------------------------------------------------------------------

let nextId = 0;

// ---------------------------------------------------------------------------
// SurrealText — orchestrator
// ---------------------------------------------------------------------------

interface MessageEntry {
  id: number;
  text: string;
  active: boolean;
  surface: SurfacePlacement;
  fontSize?: number;
  maxWidth?: number;
}

/**
 * Bridge message entry — carries the FSM dropOffset for the slide-down
 * animation. Regular phase/demand/taunt messages use the simpler
 * MessageEntry because they snap-replace rather than slide.
 */
interface BridgeMessageEntry extends MessageEntry {
  /** Accumulated drop offset for the DROPPING phase. */
  dropOffset: number;
  /** FSM state: MOUNTED -> SEEN -> READING -> DROPPING -> REMOVED. */
  fsmState: 'MOUNTED' | 'SEEN' | 'READING' | 'DROPPING';
  /** Accumulated time in current FSM state (seconds). */
  fsmElapsed: number;
  /** How long to dwell in READING before dropping (seconds). */
  readDuration: number;
}

/**
 * Manages the queue of surreal 3D text messages displayed in the scene.
 * Derives message content from game phase, posture, demands, and score state.
 *
 * Four concurrent text layers:
 * 1. Phase instruction on the wall/floor near the active station
 * 2. Demands on the ceiling (persistent)
 * 3. Mr. Sausage taunt near the TV on the left wall
 * 4. Bridge messages (from surrealTextBridge — clues, verdicts, effects)
 */
export function SurrealText() {
  const introActive = useGameStore(state => state.introActive);
  const posture = useGameStore(state => state.posture);
  const idleTime = useGameStore(state => state.idleTime);
  const gamePhase = useGameStore(state => state.gamePhase);
  const finalScore = useGameStore(state => state.finalScore);
  const mrSausageDemands = useGameStore(state => state.mrSausageDemands);
  const currentRound = useGameStore(state => state.currentRound);
  const totalRounds = useGameStore(state => state.totalRounds);

  // Per-run seeded RNG for taunt picks. Same seed -> same line order.
  // `useRunRng` returns a stable ref-cached closure, so listing it as
  // a useMemo dep is harmless and satisfies the exhaustive-deps lint.
  const tauntRng = useRunRng('SurrealText.taunt');

  // -- Phase instruction messages (positioned near active station) ----------

  const [phaseMessages, setPhaseMessages] = useState<MessageEntry[]>([]);

  const phaseContent = useMemo(() => {
    if (introActive) return 'Hey, wake up lazybones';

    if (posture === 'prone') {
      if (idleTime > 10) return "Use the arrow keys for God's sake";
      return 'Come on, time to get up';
    }
    if (posture === 'sitting') {
      if (idleTime > 10) return "Use the arrow keys for God's sake";
      return 'Almost there, stand up';
    }

    if (posture === 'standing') {
      switch (gamePhase) {
        case 'SELECT_INGREDIENTS':
          return 'PICK 3 INGREDIENTS';
        case 'CHOPPING':
          return 'CHOP IT UP';
        case 'FILL_GRINDER':
          return 'FEED THE GRINDER';
        case 'GRINDING':
          return 'GRIND IT DOWN';
        case 'MOVE_BOWL':
          return 'TAKE IT TO THE STUFFER';
        case 'ATTACH_CASING':
          return 'PREPARE THE CASING';
        case 'STUFFING':
          return 'STUFF THE CASING';
        case 'TIE_CASING':
          return 'TIE IT OFF';
        case 'BLOWOUT':
          return 'WILL IT BLOW?';
        case 'MOVE_SAUSAGE':
          return 'TO THE STOVE';
        case 'MOVE_PAN':
          return 'TIME TO COOK';
        case 'COOKING':
          return "DON'T LET IT BURN";
        case 'DONE':
          if (finalScore?.calculated) {
            if (currentRound >= totalRounds) {
              return `SCORE: ${finalScore.totalScore}%\n${finalScore.breakdown}\nYOU ESCAPED.`;
            }
            if (finalScore.totalScore < 50) {
              return `SCORE: ${finalScore.totalScore}%\n${finalScore.breakdown}\nYOU ARE MEAT NOW.`;
            }
            return `SCORE: ${finalScore.totalScore}%\n${finalScore.breakdown}`;
          }
          return 'THE VERDICT AWAITS';
        default:
          return '';
      }
    }

    return '';
  }, [introActive, posture, idleTime, gamePhase, finalScore, currentRound, totalRounds]);

  const phaseSurface = useMemo((): SurfacePlacement => {
    // Pre-standing phases: ceiling (player is on the mattress looking up)
    if (introActive || posture !== 'standing') {
      return CEILING_SURFACE;
    }
    return PHASE_SURFACE[gamePhase] ?? CEILING_SURFACE;
  }, [introActive, posture, gamePhase]);

  useEffect(() => {
    if (phaseContent) {
      setPhaseMessages(prev => {
        if (prev.some(m => m.active && m.text === phaseContent)) return prev;
        const updated = prev.map(m => ({...m, active: false}));
        return [
          ...updated,
          {id: nextId++, text: phaseContent, active: true, surface: phaseSurface},
        ];
      });
    } else {
      setPhaseMessages(prev => prev.map(m => ({...m, active: false})));
    }
  }, [phaseContent, phaseSurface]);

  // -- Demands text (always on ceiling) ------------------------------------

  const [demandMessages, setDemandMessages] = useState<MessageEntry[]>([]);

  const demandContent = useMemo(() => {
    if (!mrSausageDemands || posture !== 'standing') return '';
    return `ROUND ${currentRound}/${totalRounds}\nWANTS: ${mrSausageDemands.desiredTags.join(', ').toUpperCase()}\nHATES: ${mrSausageDemands.hatedTags.join(', ').toUpperCase()}\nCOOK: ${mrSausageDemands.cookPreference.toUpperCase()}`;
  }, [mrSausageDemands, posture, currentRound, totalRounds]);

  useEffect(() => {
    if (demandContent) {
      setDemandMessages(prev => {
        if (prev.some(m => m.active && m.text === demandContent)) return prev;
        const updated = prev.map(m => ({...m, active: false}));
        return [
          ...updated,
          {
            id: nextId++,
            text: demandContent,
            active: true,
            surface: CEILING_SURFACE,
            fontSize: 0.25,
            maxWidth: 4.5,
          },
        ];
      });
    } else {
      setDemandMessages(prev => prev.map(m => ({...m, active: false})));
    }
  }, [demandContent]);

  // -- Mr. Sausage taunt (near TV on left wall) ----------------------------

  const [tauntMessages, setTauntMessages] = useState<MessageEntry[]>([]);

  // Pick a deterministic taunt when the phase changes. The seeded RNG
  // advances once per phase change so a save-scummed reload picks the
  // same taunt sequence as the original run.
  const tauntContent = useMemo(() => {
    if (posture !== 'standing' || introActive) return '';
    const lines = PHASE_TAUNTS[gamePhase];
    if (!lines || lines.length === 0) return '';
    return lines[Math.floor(tauntRng() * lines.length)];
  }, [gamePhase, posture, introActive, tauntRng]);

  useEffect(() => {
    if (tauntContent) {
      setTauntMessages(prev => {
        const updated = prev.map(m => ({...m, active: false}));
        return [
          ...updated,
          {
            id: nextId++,
            text: tauntContent,
            active: true,
            surface: TV_WALL_SURFACE,
            fontSize: 0.2,
            maxWidth: 2.5,
          },
        ];
      });
    } else {
      setTauntMessages(prev => prev.map(m => ({...m, active: false})));
    }
  }, [tauntContent]);

  // -- Bridge messages (layer 4 — from surrealTextBridge) ------------------

  const [bridgeMessages, setBridgeMessages] = useState<BridgeMessageEntry[]>([]);

  useEffect(() => {
    const unsubscribe = onSurrealMessage((msg: SurrealMessageRequest) => {
      const surface = resolveSurface(msg.surface);
      const entry: BridgeMessageEntry = {
        id: nextId++,
        text: msg.text,
        active: true,
        surface,
        fontSize: 0.3,
        maxWidth: 4.0,
        dropOffset: 0,
        fsmState: 'MOUNTED',
        fsmElapsed: 0,
        readDuration: msg.readDurationMs / 1000, // convert to seconds
      };
      setBridgeMessages(prev => [...prev, entry]);
    });
    return unsubscribe;
  }, []);

  // -- Cleanup helpers -----------------------------------------------------

  const removePhaseMessage = (id: number) =>
    setPhaseMessages(prev => prev.filter(m => m.id !== id));
  const removeDemandMessage = (id: number) =>
    setDemandMessages(prev => prev.filter(m => m.id !== id));
  const removeTauntMessage = (id: number) =>
    setTauntMessages(prev => prev.filter(m => m.id !== id));
  const removeBridgeMessage = (id: number) =>
    setBridgeMessages(prev => prev.filter(m => m.id !== id));

  // -- Render ---------------------------------------------------------------

  return (
    <>
      {/* Phase instructions — near active station */}
      {phaseMessages.map(m => (
        <SurrealMessage
          key={m.id}
          text={m.text}
          isDismissing={!m.active}
          onDead={() => removePhaseMessage(m.id)}
          surface={m.surface}
          fontSize={m.fontSize}
          maxWidth={m.maxWidth}
        />
      ))}

      {/* Demands — always on ceiling */}
      {demandMessages.map(m => (
        <SurrealMessage
          key={m.id}
          text={m.text}
          isDismissing={!m.active}
          onDead={() => removeDemandMessage(m.id)}
          surface={m.surface}
          fontSize={m.fontSize}
          maxWidth={m.maxWidth}
        />
      ))}

      {/* Mr. Sausage taunts — near TV on left wall */}
      {tauntMessages.map(m => (
        <SurrealMessage
          key={m.id}
          text={m.text}
          isDismissing={!m.active}
          onDead={() => removeTauntMessage(m.id)}
          surface={m.surface}
          fontSize={m.fontSize}
          maxWidth={m.maxWidth}
        />
      ))}

      {/* Bridge messages — clues, verdicts, dialogue effects */}
      {bridgeMessages.map(m => (
        <SurrealMessage
          key={m.id}
          text={m.text}
          isDismissing={m.fsmState === 'DROPPING'}
          onDead={() => removeBridgeMessage(m.id)}
          surface={m.surface}
          fontSize={m.fontSize}
          maxWidth={m.maxWidth}
          dropOffset={m.dropOffset}
        />
      ))}
    </>
  );
}
