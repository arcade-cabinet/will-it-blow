import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {type DialogueChoice, DialogueEngine, type DialogueLine} from '../../engine/DialogueEngine';

interface DialogueOverlayProps {
  lines: DialogueLine[];
  onComplete: (effects: string[]) => void;
}

const CHAR_DELAY_MS = 30;

export function DialogueOverlay({lines, onComplete}: DialogueOverlayProps) {
  const engineRef = useRef(new DialogueEngine(lines));
  const [currentLine, setCurrentLine] = useState<DialogueLine | undefined>(undefined);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [choices, setChoices] = useState<DialogueChoice[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullTextRef = useRef('');

  const startTypewriter = useCallback((text: string) => {
    fullTextRef.current = text;
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;

    const tick = () => {
      index++;
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        timerRef.current = setTimeout(tick, CHAR_DELAY_MS);
      } else {
        setIsTyping(false);
      }
    };

    timerRef.current = setTimeout(tick, CHAR_DELAY_MS);
  }, []);

  // Initialize on mount
  useEffect(() => {
    const engine = new DialogueEngine(lines);
    engineRef.current = engine;
    const line = engine.getCurrentLine();
    setCurrentLine(line);
    if (line) {
      startTypewriter(line.text);
      setChoices(engine.getChoices());
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lines, startTypewriter]);

  const skipTypewriter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedText(fullTextRef.current);
    setIsTyping(false);
  }, []);

  const advanceDialogue = useCallback(() => {
    const engine = engineRef.current;
    engine.advance();

    if (engine.isComplete()) {
      onComplete(engine.getEffects());
      return;
    }

    const line = engine.getCurrentLine();
    setCurrentLine(line);
    setChoices(engine.getChoices());
    if (line) {
      startTypewriter(line.text);
    }
  }, [onComplete, startTypewriter]);

  const handleTap = useCallback(() => {
    if (isTyping) {
      skipTypewriter();
      return;
    }

    // If there are choices, don't advance on tap — wait for choice selection
    if (choices.length > 0) {
      return;
    }

    advanceDialogue();
  }, [isTyping, choices, skipTypewriter, advanceDialogue]);

  const handleChoice = useCallback(
    (index: number) => {
      const engine = engineRef.current;
      const response = engine.selectChoice(index);

      // Show the response line briefly, then advance
      setCurrentLine(response);
      setChoices([]);
      startTypewriter(response.text);

      // After typewriter completes for the response, tapping will advance
    },
    [startTypewriter],
  );

  if (!currentLine) return null;

  const speakerLabel = currentLine.speaker === 'sausage' ? 'MR. SAUSAGE' : 'YOU';
  const speakerColor = currentLine.speaker === 'sausage' ? '#FF1744' : '#FFC832';

  return (
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleTap}>
      <View style={styles.dialogueBox}>
        {/* Speaker label */}
        <Text style={[styles.speakerLabel, {color: speakerColor}]}>{speakerLabel}</Text>

        {/* Dialogue text */}
        <Text style={styles.dialogueText}>{displayedText}</Text>

        {/* Tap to continue indicator */}
        {!isTyping && choices.length === 0 && (
          <Text style={styles.tapHint} testID="dialogue-tap">
            Tap to continue...
          </Text>
        )}

        {/* Player choices */}
        {!isTyping && choices.length > 0 && (
          <View style={styles.choiceContainer}>
            {choices.map((choice, index) => (
              <TouchableOpacity
                key={index}
                style={styles.choiceButton}
                onPress={() => handleChoice(index)}
                activeOpacity={0.7}
                testID="dialogue-choice"
              >
                <Text style={styles.choiceText}>{choice.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dialogueBox: {
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
  },
  speakerLabel: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 2,
    marginBottom: 8,
  },
  dialogueText: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  tapHint: {
    fontSize: 12,
    fontFamily: 'Bangers',
    color: '#555',
    textAlign: 'right',
    marginTop: 8,
    fontStyle: 'italic',
  },
  choiceContainer: {
    marginTop: 12,
    gap: 8,
  },
  choiceButton: {
    borderWidth: 2,
    borderColor: '#FFC832',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 200, 50, 0.08)',
  },
  choiceText: {
    fontSize: 16,
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 0.5,
  },
});
