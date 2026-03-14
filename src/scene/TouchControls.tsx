/**
 * @module TouchControls
 * Invisible touch overlay for FPS movement + look + station interactions.
 *
 * Left half: drag for movement (invisible joystick)
 * Right half: drag for camera look (yaw/pitch)
 * Tap: phase-specific interaction (select ingredient, chop, tie, etc.)
 * Vertical drag (during GRINDING/STUFFING/COOKING): fills station meter
 *
 * All interactions drive Koota ECS state + audio engine.
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

// How much each drag pixel fills the meter (0→1 scale)
const DRAG_FILL_RATE = 0.003;

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
  const lastDragYRef = useRef(0);

  // TAP interaction — phase-specific
  const handleTap = useCallback(() => {
    const store = useGameStore.getState();

    switch (gamePhase) {
      case 'SELECT_INGREDIENTS': {
        const available = INGREDIENT_MODELS.filter(
          ing => !store.selectedIngredientIds.includes(ing.id),
        );
        if (available.length === 0) break;
        const ingredient = available[ingredientIndexRef.current % available.length];
        ingredientIndexRef.current++;
        store.addSelectedIngredientId(ingredient.id);
        audioEngine.playSound('click');
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
        // Tap to load chunks → start grinding
        audioEngine.playSound('click');
        setGamePhase('GRINDING');
        break;
      case 'MOVE_BOWL':
        setGamePhase('ATTACH_CASING');
        break;
      case 'ATTACH_CASING':
        // Tap to attach casing
        audioEngine.playSound('click');
        setGamePhase('STUFFING');
        break;
      case 'TIE_CASING': {
        if (!store.casingTied) {
          store.setCasingTied(true);
          audioEngine.playSound('tie');
        } else {
          setGamePhase('BLOWOUT');
        }
        break;
      }
      case 'BLOWOUT': {
        audioEngine.playSound('pressure');
        if (Math.random() < 0.3) {
          audioEngine.playSound('burst');
        }
        setGamePhase('MOVE_SAUSAGE');
        break;
      }
      case 'MOVE_SAUSAGE':
        setGamePhase('MOVE_PAN');
        break;
      case 'MOVE_PAN':
        audioEngine.playSound('click');
        setGamePhase('COOKING');
        break;
      case 'DONE':
        if (!store.finalScore?.calculated) {
          store.calculateFinalScore();
          audioEngine.playSound('rankReveal');
        }
        break;
      // GRINDING, STUFFING, COOKING handled by drag gesture below
    }
  }, [gamePhase, setGamePhase]);

  // VERTICAL DRAG for fill-based phases (grinding, stuffing, cooking)
  const handleVerticalDrag = useCallback(
    (translationY: number) => {
      const store = useGameStore.getState();
      const dragDelta = Math.abs(translationY - lastDragYRef.current) * DRAG_FILL_RATE;
      lastDragYRef.current = translationY;

      if (dragDelta < 0.001) return;

      switch (gamePhase) {
        case 'GRINDING':
          audioEngine.setGrinderSpeed(0.5);
          store.setGroundMeatVol((prev: number) => {
            const next = Math.min(1, prev + dragDelta);
            if (next >= 1) setGamePhase('MOVE_BOWL');
            return next;
          });
          break;
        case 'STUFFING':
          audioEngine.playSound('squelch');
          store.setStuffLevel((prev: number) => {
            const next = Math.min(1, prev + dragDelta);
            if (next >= 1) setGamePhase('TIE_CASING');
            return next;
          });
          break;
        case 'COOKING':
          audioEngine.setSizzleLevel(0.5);
          store.setCookLevel((prev: number) => {
            const next = Math.min(1, prev + dragDelta);
            if (next >= 1) setGamePhase('DONE');
            return next;
          });
          break;
      }
    },
    [gamePhase, setGamePhase],
  );

  // Right-side look gesture (also handles vertical drag during fill phases)
  const lookGesture = Gesture.Pan()
    .onBegin(() => {
      lastDragYRef.current = 0;
    })
    .onUpdate(e => {
      // During fill phases, ANY vertical drag fills the meter
      const isFillPhase =
        gamePhase === 'GRINDING' || gamePhase === 'STUFFING' || gamePhase === 'COOKING';
      if (isFillPhase) {
        handleVerticalDrag(e.translationY);
        return;
      }

      // Normal look: right side only
      if (e.absoluteX < HALF_SCREEN) return;
      onLook(e.velocityX * 0.001, e.velocityY * 0.001);
    });

  // Left-side movement gesture
  const moveGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.absoluteX > HALF_SCREEN) return;
      const isFillPhase =
        gamePhase === 'GRINDING' || gamePhase === 'STUFFING' || gamePhase === 'COOKING';
      if (isFillPhase) return; // Disable movement during fill phases
      const dx = Math.max(-1, Math.min(1, e.translationX / 80));
      const dz = Math.max(-1, Math.min(1, -e.translationY / 80));
      onMove(dx, dz);
    })
    .onEnd(() => {
      onMoveEnd();
    });

  // Tap gesture
  const tapGesture = Gesture.Tap().onEnd(() => {
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
