/**
 * @module GameOrchestrator
 * Non-visual React component that drives the game state machine.
 *
 * Responsibilities:
 * 1. Initialize demands + hunger state on mount
 * 2. Generate a clue from ClueGenerator at each round start
 *    (SELECT_INGREDIENTS) and display it via surrealTextBridge
 * 3. Evaluate the selection at round end (DONE phase) — disgust on
 *    mismatch, fridge depletion on match, win/lose branching
 * 4. Dev shortcuts: N → next phase, P → prev phase
 *
 * The orchestrator is mounted OUTSIDE the Canvas (no R3F context)
 * but inside the Suspense that guards the playing phase.
 */
import {useEffect, useRef} from 'react';
import {type GamePhase, useGameStore} from '../ecs/hooks';
import {generateClue, matchSelection} from './ClueGenerator';
import {INGREDIENTS} from './IngredientComposition';
import {createRunRngOrFallback} from './RunSeed';
import {enqueueSurrealMessage} from './surrealTextBridge';

export const PHASES: GamePhase[] = [
  'SELECT_INGREDIENTS',
  'CHOPPING',
  'FILL_GRINDER',
  'GRINDING',
  'MOVE_BOWL',
  'ATTACH_CASING',
  'STUFFING',
  'TIE_CASING',
  'BLOWOUT',
  'MOVE_SAUSAGE',
  'MOVE_PAN',
  'COOKING',
  'DONE',
];

/** Returns the next phase in the sequence, or null if at the end. */
export function nextPhase(current: GamePhase): GamePhase | null {
  const idx = PHASES.indexOf(current);
  if (idx === -1 || idx === PHASES.length - 1) return null;
  return PHASES[idx + 1];
}

/** Returns the previous phase in the sequence, or null if at the start. */
export function prevPhase(current: GamePhase): GamePhase | null {
  const idx = PHASES.indexOf(current);
  if (idx <= 0) return null;
  return PHASES[idx - 1];
}

/**
 * Resolve string IDs to full IngredientDefs. Only used for evaluation
 * at round end — during gameplay the Koota store's `currentRoundSelection`
 * (maintained by `addToSelection`) is the source of truth.
 */
function resolveIds(ids: readonly string[]) {
  const map = new Map(INGREDIENTS.map(i => [i.id, i]));
  return ids.map(id => map.get(id)).filter(Boolean) as (typeof INGREDIENTS)[number][];
}

export function GameOrchestrator() {
  const introActive = useGameStore(state => state.introActive);
  const posture = useGameStore(state => state.posture);
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const generateDemands = useGameStore(state => state.generateDemands);
  const calculateFinalScore = useGameStore(state => state.calculateFinalScore);

  // Hunger state actions
  const initializeHungerState = useGameStore(s => s.initializeHungerState);
  const setCurrentClue = useGameStore(s => s.setCurrentClue);
  const getCurrentClueJson = useGameStore(s => s.getCurrentClueJson);
  const incrementDisgust = useGameStore(s => s.incrementDisgust);
  const depleteFromFridge = useGameStore(s => s.depleteFromFridge);
  const getFridgeInventoryJson = useGameStore(s => s.getFridgeInventoryJson);
  const advanceRound = useGameStore(s => s.advanceRound);
  const clearSelection = useGameStore(s => s.clearSelection);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);
  const setAppPhase = useGameStore(s => s.setAppPhase);

  const hungerRoundIndex = useGameStore(s => s.hungerRoundIndex);
  const hungerDisgustMeter = useGameStore(s => s.hungerDisgustMeter);
  const hungerDisgustThreshold = useGameStore(s => s.hungerDisgustThreshold);
  const selectedIngredientIds = useGameStore(s => s.selectedIngredientIds);

  // Track the previous phase to detect transitions.
  const prevPhaseRef = useRef<GamePhase | null>(null);

  // Initialize demands + hunger state on mount.
  useEffect(() => {
    generateDemands();
    initializeHungerState();
  }, [generateDemands, initializeHungerState]);

  // ── Clue generation on SELECT_INGREDIENTS entry ──────────────────
  useEffect(() => {
    if (gamePhase === 'SELECT_INGREDIENTS' && prevPhaseRef.current !== 'SELECT_INGREDIENTS') {
      // Generate a clue from the remaining fridge inventory.
      const fridgeIds: string[] = JSON.parse(getFridgeInventoryJson());
      const available = resolveIds(fridgeIds);

      if (available.length === 0) {
        // Fridge is empty → PLAYER WINS!
        enqueueSurrealMessage('The fridge is empty. You are free.', 'ceiling', 100);
        setMrSausageReaction('disgust');
        setTimeout(() => setAppPhase('results'), 3000);
        prevPhaseRef.current = gamePhase;
        return;
      }

      const rng = createRunRngOrFallback(`clue.round.${hungerRoundIndex}`);
      const clue = generateClue(hungerRoundIndex, available, rng);

      // Store in ECS and display via SurrealText.
      setCurrentClue(JSON.stringify(clue));
      enqueueSurrealMessage(clue.text, 'auto', 10);
    }
    prevPhaseRef.current = gamePhase;
  }, [
    gamePhase,
    hungerRoundIndex,
    getFridgeInventoryJson,
    setCurrentClue,
    setMrSausageReaction,
    setAppPhase,
  ]);

  // ── Round evaluation on DONE phase entry ─────────────────────────
  useEffect(() => {
    if (gamePhase !== 'DONE') return;

    // Calculate score (existing system).
    calculateFinalScore();

    // Evaluate the Zoombinis deduction match.
    const clueJson = getCurrentClueJson();
    if (clueJson === 'null') return; // No clue this round (shouldn't happen).

    const clue = JSON.parse(clueJson);
    const selection = resolveIds(selectedIngredientIds);
    const result = matchSelection(selection, clue);

    if (result.isMatch) {
      // SUCCESS — deplete fridge, award satisfaction.
      depleteFromFridge(selectedIngredientIds);
      enqueueSurrealMessage('Acceptable.', 'auto', 5);
      setMrSausageReaction('nod');
    } else {
      // FAILURE — increment disgust based on severity.
      const disgustDelta = result.missingTraits.length * 25;
      incrementDisgust(disgustDelta);

      const newDisgust = hungerDisgustMeter + disgustDelta;
      if (newDisgust >= hungerDisgustThreshold) {
        // GAME OVER — player becomes the next sausage.
        enqueueSurrealMessage('You have failed me for the last time.', 'ceiling', 100);
        setMrSausageReaction('disgust');
        setTimeout(() => setAppPhase('results'), 3000);
        return;
      }

      enqueueSurrealMessage(
        `Not what I asked for. ${result.missingTraits.join(', ')} missing.`,
        'auto',
        8,
      );
      setMrSausageReaction('disgust');
    }

    // Advance to the next round after a delay (the PresentationFlow
    // drives the visual — trapdoor open, plate descend, plate ascend,
    // verdict display — then the round transition overlay takes over).
    advanceRound();
    clearSelection();
  }, [
    gamePhase,
    calculateFinalScore,
    getCurrentClueJson,
    selectedIngredientIds,
    depleteFromFridge,
    incrementDisgust,
    hungerDisgustMeter,
    hungerDisgustThreshold,
    advanceRound,
    clearSelection,
    setMrSausageReaction,
    setAppPhase,
  ]);

  // ── Dev shortcuts (N/P keys) ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !introActive && posture === 'standing') {
        const currentIndex = PHASES.indexOf(gamePhase);
        if (currentIndex < PHASES.length - 1) {
          setGamePhase(PHASES[currentIndex + 1]);
        }
      }

      if (e.key === 'p' && !introActive && posture === 'standing') {
        const currentIndex = PHASES.indexOf(gamePhase);
        if (currentIndex > 0) {
          setGamePhase(PHASES[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introActive, posture, gamePhase, setGamePhase]);

  return null;
}
