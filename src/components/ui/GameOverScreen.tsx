/**
 * @module GameOverScreen
 * Full-screen results overlay shown after the game ends.
 *
 * Horror-themed verdict screen with dramatic rank reveal,
 * Mr. Sausage's verdict text, score breakdown, and action buttons.
 *
 * Uses Tailwind CSS + DaisyUI components.
 */

import {useEffect, useState} from 'react';

interface GameOverScreenProps {
  /** Rank badge letter: S, A, B, or F */
  rank: string;
  /** Total combined score */
  totalScore: number;
  /** Per-challenge score breakdown */
  breakdown: {label: string; score: number}[];
  /** Demand bonus points */
  demandBonus: number;
  /** Called when PLAY AGAIN button is pressed */
  onPlayAgain: () => void;
  /** Called when MENU button is pressed */
  onMenu: () => void;
}

const RANK_STYLES: Record<string, {text: string; glow: string; shadow: string}> = {
  S: {
    text: 'text-[#FFD700]',
    glow: 'drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]',
    shadow: 'shadow-[0_0_40px_rgba(255,215,0,0.4)]',
  },
  A: {
    text: 'text-green-400',
    glow: 'drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]',
    shadow: 'shadow-[0_0_40px_rgba(74,222,128,0.4)]',
  },
  B: {
    text: 'text-yellow-400',
    glow: 'drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]',
    shadow: 'shadow-[0_0_40px_rgba(250,204,21,0.4)]',
  },
  F: {
    text: 'text-[#FF1744]',
    glow: 'drop-shadow-[0_0_30px_rgba(255,23,68,0.8)]',
    shadow: 'shadow-[0_0_40px_rgba(255,23,68,0.4)]',
  },
};

const VERDICTS: Record<string, string> = {
  S: "MASTERPIECE. Even I'm impressed.",
  A: 'Not bad, meat puppet. Not bad at all.',
  B: 'Mediocre. My grandmother makes better sausage.',
  F: 'PATHETIC. You disgust me.',
};

export function GameOverScreen({
  rank,
  totalScore,
  breakdown,
  demandBonus,
  onPlayAgain,
  onMenu,
}: GameOverScreenProps) {
  const rankStyle = RANK_STYLES[rank] ?? RANK_STYLES.F;
  const verdict = VERDICTS[rank] ?? VERDICTS.F;
  const [visible, setVisible] = useState(false);
  const [rankScale, setRankScale] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => setRankScale(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/95 transition-opacity duration-700 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="w-full h-full overflow-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-10 max-w-md mx-auto">
          {/* Rank letter with glow */}
          <div
            className={`text-8xl font-black font-[Bangers] mb-2 transition-transform duration-500 ${rankStyle.text} ${rankStyle.glow} ${
              rankScale ? 'scale-100' : 'scale-[0.3]'
            }`}
            style={{transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'}}
            title={`Rank ${rank}`}
          >
            {rank}
          </div>

          {/* Mr. Sausage verdict */}
          <p className="text-lg font-[Bangers] text-[#FF1744]/90 tracking-wider text-center mb-6 italic max-w-xs">
            "{verdict}"
          </p>

          {/* Score card */}
          <div className={`card bg-base-300/90 border border-[#8B0000] w-full ${rankStyle.shadow}`}>
            <div className="card-body items-center gap-4 p-6">
              {/* Total score */}
              <h2 className="text-2xl font-black font-[Bangers] text-gray-200 tracking-[3px]">
                TOTAL SCORE
              </h2>
              <div
                className={`text-5xl font-black font-[Bangers] tracking-wider ${rankStyle.text}`}
              >
                {Math.round(totalScore)}
              </div>

              {/* Divider */}
              <div className="divider divider-error my-0 opacity-40" />

              {/* Per-challenge breakdown */}
              <div className="w-full flex flex-col gap-1.5">
                {breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between px-2">
                    <span className="text-sm font-[Bangers] text-gray-500 tracking-wide">
                      {item.label}
                    </span>
                    <span className="text-sm font-black font-[Bangers] text-gray-200 tracking-wide">
                      {Math.round(item.score)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Demand bonus */}
              {demandBonus !== 0 && (
                <>
                  <div className="divider divider-error my-0 opacity-40" />
                  <div className="flex justify-between w-full px-2 py-1 bg-base-100/50 rounded-lg">
                    <span className="text-sm font-black font-[Bangers] text-[#D2A24C] tracking-[2px]">
                      DEMAND BONUS
                    </span>
                    <span
                      className={`text-lg font-black font-[Bangers] tracking-wider ${
                        demandBonus > 0 ? 'text-green-500' : 'text-[#FF1744]'
                      }`}
                    >
                      {demandBonus > 0 ? '+' : ''}
                      {demandBonus}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 w-full mt-8">
            <button
              type="button"
              className="btn btn-primary btn-lg bg-[#B71C1C] border-2 border-[#FF1744] text-white text-xl font-black font-[Bangers] tracking-wider shadow-[0_4px_12px_rgba(255,23,68,0.4)] hover:bg-[#D32F2F] hover:border-[#FF1744]"
              onClick={onPlayAgain}
              aria-label="Start new game"
            >
              PLAY AGAIN
            </button>

            <button
              type="button"
              className="btn btn-ghost text-lg font-black font-[Bangers] text-gray-400 tracking-wider hover:text-gray-200"
              onClick={onMenu}
              aria-label="Return to main menu"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
