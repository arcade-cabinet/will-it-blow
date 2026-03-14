/**
 * @module TouchControls
 * Invisible dual-zone touch overlay for FPS movement + look + interact.
 *
 * Left half: virtual joystick (drag for movement direction)
 * Right half: drag for camera yaw/pitch
 * Tap anywhere: interact with current station (phase-dependent)
 *
 * This is a React Native overlay positioned OVER the FilamentView.
 * It's invisible — the player sees only the 3D scene and their hands.
 */

import {useRef, useCallback} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useGameStore} from '../ecs/hooks';
import {audioEngine} from '../audio/AudioEngine';
import {INGREDIENT_MODELS} from '../engine/Ingredients';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const HALF_SCREEN = SCREEN_WIDTH / 2;
const REQUIRED_INGREDIENTS = 3;

interface TouchControlsProps {
  onLook: (dx: number, dy: number) => void;
  onMove: (x: number, z: number) => void;
  onMoveEnd: () => void;
}

export function TouchControls({onLook, onMove, onMoveEnd}: TouchControlsProps) {
  const gamePhase = useGameStore(s => s.gamePhase);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const chopCountRef = useRef(0);
  const ingredientIndexRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle tap interaction based on current game phase
  const handleTap = useCallback(() => {
    const store = useGameStore.getState();

    switch (gamePhase) {
      case 'SELECT_INGREDIENTS': {
        // Cycle through ingredients, add one per tap
        const available = INGREDIENT_MODELS.filter(
          ing => !store.selectedIngredientIds.includes(ing.id),
        );
        if (available.length === 0) break;

        const ingredient = available[ingredientIndexRef.current % available.length];
        ingredientIndexRef.current++;
        store.addSelectedIngredientId(ingredient.id);
        audioEngine.playSound('click');

        // After selecting required number, advance phase
        if (store.selectedIngredientIds.length + 1 >= REQUIRED_INGREDIENTS) {
          setGamePhase('CHOPPING');
        }
        break;
      }
      case 'CHOPPING':
        audioEngine.playChop();
        chopCountRef.current += 1;
        if (chopCountRef.current >= 5) {
          chopCountRef.current = 0;
          setGamePhase('FILL_GRINDER');
        }
        break;
      case 'FILL_GRINDER':
        setGamePhase('GRINDING');
        break;
      case 'GRINDING':
        // Each tap grinds — advance groundMeatVol
        useGameStore.getState().setGroundMeatVol((prev: number) => {
          const next = Math.min(1, prev + 0.2);
          if (next >= 1) setGamePhase('MOVE_BOWL');
          return next;
        });
        break;
      case 'MOVE_BOWL':
        setGamePhase('ATTACH_CASING');
        break;
      case 'ATTACH_CASING':
        setGamePhase('STUFFING');
        break;
      case 'STUFFING':
        audioEngine.playSound('squelch');
        useGameStore.getState().setStuffLevel((prev: number) => {
          const next = Math.min(1, prev + 0.2);
          if (next >= 1) setGamePhase('TIE_CASING');
          return next;
        });
        break;
      case 'TIE_CASING': {
        // Two taps needed: tie left, then tie right
        if (!store.casingTied) {
          // First tap: mark as tied
          store.setCasingTied(true);
          audioEngine.playSound('tie');
        } else {
          // Already tied — advance
          setGamePhase('BLOWOUT');
        }
        break;
      }
      case 'BLOWOUT': {
        // Each tap builds pressure — check burst probability
        audioEngine.playSound('pressure');
        const burstChance = Math.random();
        if (burstChance < 0.3) {
          // Burst! (30% chance per tap)
          audioEngine.playSound('burst');
        }
        setGamePhase('MOVE_SAUSAGE');
        break;
      }
      case 'MOVE_SAUSAGE':
        setGamePhase('MOVE_PAN');
        break;
      case 'MOVE_PAN':
        setGamePhase('COOKING');
        break;
      case 'COOKING':
        audioEngine.playSound('sizzle');
        useGameStore.getState().setCookLevel((prev: number) => {
          const next = Math.min(1, prev + 0.2);
          if (next >= 1) setGamePhase('DONE');
          return next;
        });
        break;
      case 'DONE':
        if (!store.finalScore?.calculated) {
          store.calculateFinalScore();
          audioEngine.playSound('rankReveal');
        }
        break;
    }
  }, [gamePhase, setGamePhase]);

  // Right-side look gesture
  const lookGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.absoluteX < HALF_SCREEN) return;
      onLook(e.velocityX * 0.001, e.velocityY * 0.001);
    });

  // Left-side movement gesture
  const moveGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.absoluteX > HALF_SCREEN) return;
      const dx = Math.max(-1, Math.min(1, e.translationX / 80));
      const dz = Math.max(-1, Math.min(1, -e.translationY / 80));
      onMove(dx, dz);
    })
    .onEnd(() => {
      onMoveEnd();
    });

  // Tap gesture for station interaction
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      handleTap();
    });

  const composed = Gesture.Simultaneous(
    Gesture.Simultaneous(lookGesture, moveGesture),
    tapGesture,
  );

  return (
    <GestureDetector gesture={composed}>
      <View style={StyleSheet.absoluteFill} />
    </GestureDetector>
  );
}
