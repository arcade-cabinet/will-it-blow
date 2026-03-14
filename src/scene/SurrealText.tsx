/**
 * @module SurrealText
 * Diegetic feedback — game state rendered as blood text on kitchen surfaces.
 *
 * In Filament, we can't render 3D text directly (no troika equivalent).
 * Instead, we use a React Native Text overlay positioned at the top of the screen
 * with a horror aesthetic. This is the ONLY permitted RN overlay during gameplay —
 * it simulates text painted on the ceiling above the player.
 *
 * The text changes based on game phase, dialogue, demands, and score.
 * It pulses with a blood-red glow animation.
 *
 * TODO: Replace with texture-based text on Filament planes for true diegetic rendering.
 */

import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useGameStore} from '../ecs/hooks';

function getPhaseText(
  gamePhase: string,
  introActive: boolean,
  posture: string,
  mrSausageDemands: any,
  currentRound: number,
  totalRounds: number,
  finalScore: any,
): string {
  if (introActive) return 'Hey, wake up lazybones...';

  if (posture === 'prone') return 'Come on, time to get up';
  if (posture === 'sitting') return 'Almost there, stand up';

  switch (gamePhase) {
    case 'SELECT_INGREDIENTS':
      if (mrSausageDemands) {
        return `ROUND ${currentRound}/${totalRounds}\nWANTS: ${mrSausageDemands.desiredTags?.join(', ').toUpperCase() ?? '?'}\nHATES: ${mrSausageDemands.hatedTags?.join(', ').toUpperCase() ?? '?'}`;
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
      return 'WILL IT BLOW?';
    case 'MOVE_SAUSAGE':
      return 'TO THE STOVE';
    case 'MOVE_PAN':
      return 'TIME TO COOK';
    case 'COOKING':
      return "DON'T LET IT BURN";
    case 'DONE':
      if (finalScore?.calculated) {
        return `SCORE: ${finalScore.totalScore}%`;
      }
      return 'THE VERDICT...';
    default:
      return '';
  }
}

export function SurrealText() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const introActive = useGameStore(s => s.introActive);
  const posture = useGameStore(s => s.posture);
  const mrSausageDemands = useGameStore(s => s.mrSausageDemands);
  const currentRound = useGameStore(s => s.currentRound);
  const totalRounds = useGameStore(s => s.totalRounds);
  const finalScore = useGameStore(s => s.finalScore);

  const text = getPhaseText(
    gamePhase,
    introActive,
    posture,
    mrSausageDemands,
    currentRound,
    totalRounds,
    finalScore,
  );

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1, duration: 1500, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 0.5, duration: 1500, useNativeDriver: true}),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  if (!text) return null;

  return (
    <Animated.View style={[styles.container, {opacity: pulseAnim}]} pointerEvents="none">
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  text: {
    color: '#8B0000',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 4,
    textShadowColor: 'rgba(139, 0, 0, 0.8)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
});
