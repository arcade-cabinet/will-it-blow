/**
 * @module SausageButton
 * Procedural sausage-shaped menu button — no PNGs needed.
 *
 * Renders Mr. Sausage as a pill-shaped React Native View with layered
 * colors for depth (body → inner → highlight), cartoon eyes, a tiny mouth,
 * and centered text using the project's Bangers font.
 *
 * Hover/press state swaps to darker body tones (excited/alarmed sausage).
 *
 * Design reference: SOSIS.svg from asset pack — the body is a pill shape
 * with 3-layer depth coloring, two googly eyes on the right end, and
 * a small open mouth. Text is "Bauhaus 93"-style (we use Bangers).
 */

import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

// ---------------------------------------------------------------------------
// Color palettes (derived from SOSIS.svg path fills)
// ---------------------------------------------------------------------------

const NORMAL = {
  outer: '#dd6868', // outer body
  body: '#e48686', // main body
  inner: '#df7272', // inner depth layer
  highlight: '#e99b9b', // specular shine band
  mouth: '#800000',
};

const HOVER = {
  outer: '#c44040', // darker outer
  body: '#d64d4d', // darker body
  inner: '#c83838', // darker inner
  highlight: '#d44545', // darker highlight
  mouth: '#600000',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Googly eye — white sclera + black pupil */
function Eye({top}: {top: number}) {
  return (
    <View style={[eyeStyles.sclera, {top}]}>
      <View style={eyeStyles.pupil} />
    </View>
  );
}

const eyeStyles = StyleSheet.create({
  sclera: {
    position: 'absolute',
    right: 24,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pupil: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#000',
  },
});

// ---------------------------------------------------------------------------
// SausageButton
// ---------------------------------------------------------------------------

interface SausageButtonProps {
  /** Button label text */
  label: string;
  /** Press handler */
  onPress: () => void;
  /** Dim and disable when true */
  disabled?: boolean;
}

export function SausageButton({label, onPress, disabled = false}: SausageButtonProps) {
  const [pressed, setPressed] = useState(false);
  const pal = pressed && !disabled ? HOVER : NORMAL;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onHoverIn={() => setPressed(true)}
      onHoverOut={() => setPressed(false)}
      disabled={disabled}
      style={[styles.wrapper, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
    >
      {/* Layer 1: outer body (darkest pink, full pill) */}
      <View style={[styles.body, {backgroundColor: pal.outer}]}>
        {/* Layer 2: main body (slightly inset, lighter pink) */}
        <View style={[styles.innerBody, {backgroundColor: pal.body}]}>
          {/* Layer 3: highlight band (top specular shine) */}
          <View style={[styles.highlight, {backgroundColor: pal.highlight}]} />

          {/* Text */}
          <Text style={styles.label}>{label}</Text>
        </View>

        {/* Eyes — positioned on the right end of the sausage */}
        <Eye top={12} />
        <Eye top={32} />

        {/* Mouth — small dark crescent between the eyes */}
        <View style={[styles.mouth, {backgroundColor: pal.mouth}]} />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BUTTON_W = 280;
const BUTTON_H = 64;
const RADIUS = BUTTON_H / 2;

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  disabled: {
    opacity: 0.45,
  },
  body: {
    width: BUTTON_W,
    height: BUTTON_H,
    borderRadius: RADIUS,
    justifyContent: 'center',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  innerBody: {
    position: 'absolute',
    left: 4,
    top: 3,
    right: 4,
    bottom: 5,
    borderRadius: RADIUS - 3,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 16,
    top: 4,
    right: 40,
    height: 14,
    borderRadius: 7,
    opacity: 0.6,
  },
  label: {
    fontFamily: 'Bangers',
    fontSize: 24,
    color: '#ffd5d5',
    textAlign: 'center',
    letterSpacing: 4,
    paddingRight: 36, // offset for eyes on right
    // Text outline effect (black stroke in SVG → textShadow in RN)
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  mouth: {
    position: 'absolute',
    right: 38,
    top: 24,
    width: 8,
    height: 14,
    borderRadius: 4,
  },
});
