import {Text} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef, useState} from 'react';
import type * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

function SurrealMessage({
  text,
  onDead,
  isDismissing,
}: {
  text: string;
  onDead: () => void;
  isDismissing: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const state = useRef({
    y: 2.99,
    z: 3.0,
    opacity: 0,
    rotX: Math.PI / 2,
  });

  useFrame((sys, delta) => {
    const s = state.current;

    // Fade/Pulse
    const t = sys.clock.elapsedTime;
    const pulse = 0.8 + Math.sin(t * 2) * 0.2;

    if (isDismissing) {
      s.z -= delta * 3.0; // Slide towards -Z wall
      if (s.z <= -3.98) {
        s.z = -3.98;
        s.y -= delta * 2.0; // Slide down wall
        s.rotX = 0; // Rotate to face room
      }
      s.opacity -= delta * 0.4; // Fade out
      if (s.opacity <= 0) onDead();
    } else {
      s.opacity = Math.min(0.8, s.opacity + delta * 1.5); // Fade in
    }

    if (groupRef.current) {
      groupRef.current.position.set(2.0, s.y, s.z);
      groupRef.current.rotation.set(s.rotX, 0, 0);
    }

    if (materialRef.current) {
      materialRef.current.color.setRGB(0.54 * pulse, 0.01 * pulse, 0.01 * pulse);
      materialRef.current.opacity = Math.max(0, s.opacity);
    }
  });

  return (
    <group ref={groupRef}>
      <Text
        fontSize={0.35}
        maxWidth={3.5} // Forces text to wrap and stay within player FOV horizontally
        lineHeight={1.2}
        font="/fonts/Nosifer-Regular.ttf"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?',. "
      >
        {text}
        <meshStandardMaterial ref={materialRef} transparent depthWrite={false} roughness={0.8} />
      </Text>
    </group>
  );
}

let nextId = 0;

export function SurrealText() {
  const introActive = useGameStore(state => state.introActive);
  const posture = useGameStore(state => state.posture);
  const idleTime = useGameStore(state => state.idleTime);
  const gamePhase = useGameStore(state => state.gamePhase);

  const [messages, setMessages] = useState<{id: number; text: string; active: boolean}[]>([]);

  const finalScore = useGameStore(state => state.finalScore);
  const mrSausageDemands = useGameStore(state => state.mrSausageDemands);
  const currentRound = useGameStore(state => state.currentRound);
  const totalRounds = useGameStore(state => state.totalRounds);

  const textContent = useMemo(() => {
    if (introActive) return 'Hey, wake up lazybones';

    // Waking up sequence texts
    if (posture === 'prone') {
      if (idleTime > 10) return "Use the arrow keys for God's sake";
      return 'Come on, time to get up';
    }
    if (posture === 'sitting') {
      if (idleTime > 10) return "Use the arrow keys for God's sake";
      return 'Almost there, stand up';
    }

    // Main gameplay loop
    if (posture === 'standing') {
      switch (gamePhase) {
        case 'SELECT_INGREDIENTS':
          if (mrSausageDemands) {
            return `ROUND ${currentRound}/${totalRounds}\nWANTS: ${mrSausageDemands.desiredTags.join(', ').toUpperCase()} / HATES: ${mrSausageDemands.hatedTags.join(', ').toUpperCase()} / COOK: ${mrSausageDemands.cookPreference.toUpperCase()}`;
          }
          return "WHAT'S IN THE BOX?";
        case 'CHOPPING':
          return 'CHOP IT UP';
        case 'FILL_GRINDER':
          return 'GRIND THE MEAT';
        case 'GRINDING':
          return 'FASTER!';
        case 'MOVE_BOWL':
          return 'TAKE IT TO THE STUFFER';
        case 'ATTACH_CASING':
          return 'PREPARE THE CASING';
        case 'STUFFING':
          return 'FILL IT UP';
        case 'TIE_CASING':
          return 'TIE IT OFF';
        case 'BLOWOUT':
          return 'WILL IT BLOW? (HOLD TO FIND OUT)';
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
              return `SCORE: ${finalScore.totalScore}%\n${finalScore.breakdown}\nYOU ARE MEAT NOW. (GAME OVER)`;
            }
            return `SCORE: ${finalScore.totalScore}%\n${finalScore.breakdown}\n(CLICK CEREAL BOX FOR NEXT ROUND)`;
          }
          return 'WILL IT BLOW? (CLICK CEREAL BOX TO RESTART)';
        default:
          return '';
      }
    }

    return '';
  }, [
    introActive,
    posture,
    idleTime,
    gamePhase,
    finalScore,
    mrSausageDemands,
    currentRound,
    totalRounds,
  ]);

  useEffect(() => {
    if (textContent) {
      // If the text is the same as the current active one, do nothing
      if (messages.some(m => m.active && m.text === textContent)) return;

      setMessages(prev => {
        const updated = prev.map(m => ({...m, active: false}));
        return [...updated, {id: nextId++, text: textContent, active: true}];
      });
    } else {
      setMessages(prev => prev.map(m => ({...m, active: false})));
    }
  }, [textContent, messages.some]); // Removed messages from dep array to avoid loops

  const removeMessage = (id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <>
      {messages.map(m => (
        <SurrealMessage
          key={m.id}
          text={m.text}
          isDismissing={!m.active}
          onDead={() => removeMessage(m.id)}
        />
      ))}
    </>
  );
}
