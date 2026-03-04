/**
 * @module useChallengeMusic
 * Manages music track lifecycle: ambient drone during exploration,
 * per-challenge tracks during active challenges, and verdict tracks
 * on game end. Crossfade transitions are handled by AudioEngine.
 */

import {useEffect, useRef} from 'react';
import {audioEngine} from '../engine/AudioEngine';
import {CHALLENGE_ORDER} from '../engine/ChallengeManifest';
import {useGameStore} from '../store/gameStore';

/**
 * Subscribes to game state and drives AudioEngine music transitions:
 * - Starts ambient drone when gameStatus becomes 'playing'
 * - Crossfades to challenge track when challengeTriggered becomes true
 * - Crossfades back to ambient when challenge completes (currentChallenge advances)
 * - Plays victory/defeat track on game end
 *
 * Call this hook once from the main game scene component.
 */
export function useChallengeMusic(): void {
  const gameStatus = useGameStore(s => s.gameStatus);
  const currentChallenge = useGameStore(s => s.currentChallenge);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);

  // Track the previous challenge index to detect completion
  const prevChallengeRef = useRef(currentChallenge);

  // Start ambient drone when game begins
  useEffect(() => {
    if (gameStatus === 'playing') {
      audioEngine.startAmbientDrone();
    }
    return () => {
      audioEngine.stopAmbientDrone();
    };
  }, [gameStatus]);

  // Start/stop challenge track based on trigger state
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    if (challengeTriggered) {
      const challengeId = CHALLENGE_ORDER[currentChallenge];
      if (challengeId) {
        audioEngine.startChallengeTrack(challengeId);
      }
    } else if (prevChallengeRef.current !== currentChallenge) {
      // Challenge advanced (completed) — stop challenge track, ambient resumes
      audioEngine.stopChallengeTrack();
    }

    prevChallengeRef.current = currentChallenge;
  }, [gameStatus, currentChallenge, challengeTriggered]);

  // Play verdict track on game end
  useEffect(() => {
    if (gameStatus === 'victory') {
      audioEngine.stopChallengeTrack();
      audioEngine.startChallengeTrack('victory');
    } else if (gameStatus === 'defeat') {
      audioEngine.stopChallengeTrack();
      audioEngine.startChallengeTrack('defeat');
    }
  }, [gameStatus]);
}
