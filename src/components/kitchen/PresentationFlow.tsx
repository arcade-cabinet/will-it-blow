/**
 * @module PresentationFlow
 * Orchestrates the round-end presentation climax (design pillar #4).
 *
 * When the DONE game phase is reached and rounds remain, the
 * presentation sequence plays:
 *
 *   1. TrapdoorOpening -- ceiling trapdoor swings open (2s)
 *   2. PlateDescending -- plate on rope lowers to waist height (2s)
 *   3. JudgmentPause -- silence while Mr. Sausage "tastes" (3s)
 *   4. PlateAscending -- plate rises back through trapdoor (2s)
 *   5. VerdictDisplay -- Mr. Sausage reacts, score shown (3s)
 *
 * The flow is a simple ref-based state machine driven by useFrame
 * (no React state for per-frame animation). When the sequence ends,
 * it calls `onComplete` so the parent can advance to the next round.
 *
 * This component renders nothing visible itself -- it composes
 * PlateOnRope and controls TrapDoorAnimation via the shared ECS state.
 */
import {useFrame} from '@react-three/fiber';
import {useCallback, useRef} from 'react';
import {useGameStore} from '../../ecs/hooks';
import {enqueueSurrealMessage} from '../../engine/surrealTextBridge';
import {PlateOnRope} from './PlateOnRope';

export type PresentationPhase =
  | 'TrapdoorOpening'
  | 'PlateDescending'
  | 'JudgmentPause'
  | 'PlateAscending'
  | 'VerdictDisplay'
  | 'Complete';

/** Phase durations in seconds. */
const PHASE_DURATIONS: Record<Exclude<PresentationPhase, 'Complete'>, number> = {
  TrapdoorOpening: 2.0,
  PlateDescending: 2.0,
  JudgmentPause: 3.0,
  PlateAscending: 2.0,
  VerdictDisplay: 3.0,
};

/** Ceiling Y and waist-height Y for the plate animation. */
const CEILING_Y = 2.9;
const WAIST_Y = 1.0;

interface PresentationFlowProps {
  /** Called when the entire presentation sequence finishes. */
  onComplete: () => void;
  /** XZ position under the trapdoor. */
  position?: [number, number];
}

export function PresentationFlow({onComplete, position = [0, 0]}: PresentationFlowProps) {
  const phaseRef = useRef<PresentationPhase>('TrapdoorOpening');
  const timerRef = useRef(0);
  const plateYRef = useRef(CEILING_Y);
  const completedRef = useRef(false);

  const setMrSausageReaction = useGameStore(state => state.setMrSausageReaction);
  const finalScore = useGameStore(state => state.finalScore);

  const advancePhase = useCallback(() => {
    switch (phaseRef.current) {
      case 'TrapdoorOpening':
        phaseRef.current = 'PlateDescending';
        break;
      case 'PlateDescending':
        phaseRef.current = 'JudgmentPause';
        // Flash surreal text during the judgment pause.
        enqueueSurrealMessage('...tasting...', 'wall-N', 1);
        // 'judging' is the eating/judgment animation.
        setMrSausageReaction('judging');
        break;
      case 'JudgmentPause':
        phaseRef.current = 'PlateAscending';
        break;
      case 'PlateAscending':
        phaseRef.current = 'VerdictDisplay';
        // Announce the verdict via surreal text.
        {
          const score = finalScore?.totalScore ?? 0;
          const verdict =
            score >= 92
              ? 'MASTERPIECE.'
              : score >= 75
                ? 'Acceptable.'
                : score >= 50
                  ? 'Mediocre.'
                  : 'PATHETIC.';
          enqueueSurrealMessage(verdict, 'wall-N', 2);
          const reaction = score >= 75 ? 'excitement' : score >= 50 ? 'nod' : 'disgust';
          setMrSausageReaction(reaction);
        }
        break;
      case 'VerdictDisplay':
        phaseRef.current = 'Complete';
        break;
      default:
        break;
    }
    timerRef.current = 0;
  }, [setMrSausageReaction, finalScore]);

  useFrame((_state, delta) => {
    if (phaseRef.current === 'Complete') {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }

    timerRef.current += delta;
    const duration = PHASE_DURATIONS[phaseRef.current];

    // Animate plate Y based on current phase.
    const t = Math.min(1, timerRef.current / duration);

    if (phaseRef.current === 'PlateDescending') {
      // Ease-out descent.
      const eased = 1 - (1 - t) * (1 - t);
      plateYRef.current = CEILING_Y + (WAIST_Y - CEILING_Y) * eased;
    } else if (phaseRef.current === 'PlateAscending') {
      // Ease-in ascent.
      const eased = t * t;
      plateYRef.current = WAIST_Y + (CEILING_Y - WAIST_Y) * eased;
    }

    if (timerRef.current >= duration) {
      advancePhase();
    }
  });

  return <PlateOnRope ceilingY={CEILING_Y} plateY={plateYRef.current} position={position} />;
}
