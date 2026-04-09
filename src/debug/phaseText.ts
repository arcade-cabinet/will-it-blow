/**
 * Pure mapping from `(introActive, posture, gamePhase, finalScore,
 * currentRound, totalRounds)` → the headline SurrealText that the
 * player sees on the wall. Extracted from `SurrealText.tsx` so the
 * read-only perception bridge can compute it without mounting React.
 *
 * Keep this in sync with `SurrealText.tsx` — there's a unit test that
 * pins both implementations to the same output for every game phase.
 *
 * Last reconciled: 2026-04-08 (matched line-by-line with SurrealText.tsx
 * phaseContent useMemo).
 */
import type {GamePhase, Posture} from '../ecs/hooks';

export interface PhaseTextInputs {
  introActive: boolean;
  posture: Posture;
  idleTime: number;
  gamePhase: GamePhase;
  finalScore: {
    calculated: boolean;
    totalScore: number;
    breakdown: string;
  } | null;
  currentRound: number;
  totalRounds: number;
}

export function computePhaseText(inputs: PhaseTextInputs): string {
  const {introActive, posture, idleTime, gamePhase, finalScore, currentRound, totalRounds} = inputs;

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
}
