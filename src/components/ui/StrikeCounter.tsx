import {StyleSheet, Text, View} from 'react-native';
import {useGameStore} from '../../store/gameStore';

const MAX_STRIKES = 3;

export function StrikeCounter() {
  const {strikes} = useGameStore();

  return (
    <View style={styles.container}>
      {Array.from({length: MAX_STRIKES}, (_, i) => (
        <Text key={i} style={[styles.strike, i < strikes ? styles.used : styles.unused]}>
          {i < strikes ? '\u2715' : '\u25CB'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 80,
  },
  strike: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Bangers',
  },
  used: {
    color: '#FF1744',
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },
  unused: {
    color: '#555',
  },
});
