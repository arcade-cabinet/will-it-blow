/**
 * @module DialogueOverlay
 * Web-compatible dialogue overlay with typewriter effect.
 *
 * NOTE: Per design rules, this is NOT used during gameplay (all dialogue
 * goes through SurrealText on kitchen surfaces). Kept as a utility in case
 * it's needed for pre-game or debug contexts.
 *
 * Rewritten from react-native to web HTML/CSS.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {useGameStore} from '../../ecs/hooks';
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

  const setMrSausageReaction = useGameStore(state => state.setMrSausageReaction);

  const startTypewriter = useCallback(
    (line: DialogueLine) => {
      fullTextRef.current = line.text;
      setDisplayedText('');
      setIsTyping(true);
      let index = 0;

      if (line.reaction) {
        setMrSausageReaction(line.reaction);
      }

      const tick = () => {
        index++;
        if (index <= line.text.length) {
          setDisplayedText(line.text.slice(0, index));
          timerRef.current = setTimeout(tick, CHAR_DELAY_MS);
        } else {
          setIsTyping(false);
        }
      };

      timerRef.current = setTimeout(tick, CHAR_DELAY_MS);
    },
    [setMrSausageReaction],
  );

  useEffect(() => {
    const engine = new DialogueEngine(lines);
    engineRef.current = engine;
    const line = engine.getCurrentLine();
    setCurrentLine(line);
    if (line) {
      startTypewriter(line);
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
      startTypewriter(line);
    }
  }, [onComplete, startTypewriter]);

  const handleTap = useCallback(() => {
    if (isTyping) {
      skipTypewriter();
      return;
    }

    if (choices.length > 0) {
      return;
    }

    advanceDialogue();
  }, [isTyping, choices, skipTypewriter, advanceDialogue]);

  const handleChoice = useCallback(
    (index: number) => {
      const engine = engineRef.current;
      const response = engine.selectChoice(index);

      setCurrentLine(response);
      setChoices([]);
      startTypewriter(response);
    },
    [startTypewriter],
  );

  if (!currentLine) return null;

  const speakerLabel = currentLine.speaker === 'sausage' ? 'MR. SAUSAGE' : 'YOU';
  const speakerColor = currentLine.speaker === 'sausage' ? '#FF1744' : '#FFC832';

  return (
    <div style={styles.overlay} onClick={handleTap} onKeyDown={undefined}>
      <div style={styles.dialogueBox}>
        <div style={{...styles.speakerLabel, color: speakerColor}}>{speakerLabel}</div>

        <div style={styles.dialogueText}>{displayedText}</div>

        {!isTyping && choices.length === 0 && <div style={styles.tapHint}>Tap to continue...</div>}

        {!isTyping && choices.length > 0 && (
          <div style={styles.choiceContainer}>
            {choices.map((choice, index) => (
              <button
                key={index}
                type="button"
                style={styles.choiceButton}
                onClick={e => {
                  e.stopPropagation();
                  handleChoice(index);
                }}
              >
                <span style={styles.choiceText}>{choice.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    bottom: 20,
    left: '10%',
    width: '80%',
    zIndex: 90,
    padding: '0 16px 24px',
    cursor: 'pointer',
  },
  dialogueBox: {
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    border: '2px solid #333',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  speakerLabel: {
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 2,
    marginBottom: 8,
  },
  dialogueText: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: '22px',
    letterSpacing: 0.3,
  },
  tapHint: {
    fontSize: 12,
    color: '#555',
    textAlign: 'right',
    marginTop: 8,
    fontStyle: 'italic',
  },
  choiceContainer: {
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  choiceButton: {
    border: '2px solid #FFC832',
    borderRadius: 8,
    padding: '10px 16px',
    backgroundColor: 'rgba(255, 200, 50, 0.08)',
    cursor: 'pointer',
    textAlign: 'left',
    outline: 'none',
  },
  choiceText: {
    fontSize: 16,
    color: '#FFC832',
    letterSpacing: 0.5,
  },
};
