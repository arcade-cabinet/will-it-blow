/**
 * @module CombatHUD
 * Minimal read-only overlay displayed during combat encounters.
 *
 * Shows:
 * - Enemy name and HP bar at top
 * - "GRAB A WEAPON!" prompt when player has empty hands
 * - Red screen-edge vignette that pulses with enemy proximity
 *
 * Data flow: gameStore.combatActive → CombatHUD renders.
 * Zero input handling — all combat logic lives in CombatSystem.
 */

import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useGameStore} from '../../store/gameStore';

/**
 * Pulsing red vignette overlay — opacity pulses with a sine wave.
 * Indicates proximity/danger during combat.
 */
function DangerVignette() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.38],
  });

  return <Animated.View style={[styles.vignette, {opacity}]} pointerEvents="none" />;
}

/**
 * HP bar with filled/empty segments for the active enemy.
 */
function EnemyHpBar({hp, maxHp}: {hp: number; maxHp: number}) {
  const ratio = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
  return (
    <View style={styles.hpBarTrack}>
      <View style={[styles.hpBarFill, {flex: ratio}]} />
      <View style={[styles.hpBarEmpty, {flex: 1 - ratio}]} />
    </View>
  );
}

/**
 * Read-only combat HUD. Only renders when combatActive is true.
 */
export function CombatHUD() {
  const combatActive = useGameStore(s => s.combatActive);
  const activeEnemy = useGameStore(s => s.activeEnemy);
  const grabbedObject = useGameStore(s => s.grabbedObject);

  if (!combatActive || !activeEnemy) return null;

  const handsEmpty = grabbedObject === null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Pulsing danger vignette around screen edges */}
      <DangerVignette />

      {/* Enemy name + HP bar banner */}
      <View style={styles.enemyBanner}>
        <Text style={styles.enemyName}>{activeEnemy.type.toUpperCase()}</Text>
        <EnemyHpBar hp={activeEnemy.hp} maxHp={activeEnemy.maxHp} />
        <Text style={styles.hpLabel}>
          {activeEnemy.hp} / {activeEnemy.maxHp}
        </Text>
      </View>

      {/* Weapon prompt — only when hands are empty */}
      {handsEmpty && (
        <View style={styles.weaponPrompt}>
          <Text style={styles.weaponPromptText}>GRAB A WEAPON!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    // Radial-ish red edge — approximate with a semi-transparent red overlay.
    // On RN web this renders as a flat tint; good enough for horror atmosphere.
    borderWidth: 28,
    borderColor: 'rgba(180, 10, 10, 0.85)',
    borderRadius: 8,
  },
  enemyBanner: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(12, 4, 4, 0.93)',
    borderWidth: 2,
    borderColor: '#8b1a1a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 85,
  },
  enemyName: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#cc2222',
    letterSpacing: 3,
    textShadowColor: 'rgba(200, 20, 20, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
    marginBottom: 6,
  },
  hpBarTrack: {
    flexDirection: 'row',
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#5a1010',
  },
  hpBarFill: {
    backgroundColor: '#cc2222',
  },
  hpBarEmpty: {
    backgroundColor: '#2a0a0a',
  },
  hpLabel: {
    fontFamily: 'Bangers',
    fontSize: 14,
    color: '#884444',
    marginTop: 4,
    letterSpacing: 2,
  },
  weaponPrompt: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 85,
  },
  weaponPromptText: {
    fontFamily: 'Bangers',
    fontSize: 28,
    color: '#FF1744',
    letterSpacing: 4,
    textShadowColor: 'rgba(255, 23, 68, 0.7)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
});
