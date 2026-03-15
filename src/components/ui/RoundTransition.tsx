/**
 * @module RoundTransition
 * Brief between-round interstitial shown when transitioning to the next round.
 *
 * Full-screen dark overlay with "ROUND X/Y" in blood-red horror text,
 * a diagonal cleaver slash animation, and screen shake. Auto-advances
 * after 2 seconds by calling onComplete.
 *
 * Uses Tailwind CSS + DaisyUI. CSS keyframes defined in index.css.
 */

import {useEffect, useState} from 'react';

interface RoundTransitionProps {
  roundNumber: number;
  totalRounds: number;
  onComplete: () => void;
}

export function RoundTransition({roundNumber, totalRounds, onComplete}: RoundTransitionProps) {
  const [visible, setVisible] = useState(false);
  const [slashActive, setSlashActive] = useState(false);

  useEffect(() => {
    // Fade in immediately
    requestAnimationFrame(() => setVisible(true));

    // Trigger slash after a beat
    const slashTimer = setTimeout(() => setSlashActive(true), 400);

    // Auto-advance after 2 seconds
    const advanceTimer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(slashTimer);
      clearTimeout(advanceTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/95 flex items-center justify-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-label={`Round ${roundNumber} of ${totalRounds}`}
    >
      {/* Screen shake wrapper */}
      <div className={visible ? 'animate-[horror-shake_0.6s_ease-in-out_0.3s]' : ''}>
        {/* Round text */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-lg font-[Bangers] text-gray-500 tracking-[6px] uppercase">
            Prepare yourself
          </span>
          <h1 className="text-7xl sm:text-8xl font-black font-[Bangers] text-[#FF1744] tracking-wider drop-shadow-[0_0_30px_rgba(255,23,68,0.6)] animate-[horror-pulse_1.5s_ease-in-out_infinite]">
            ROUND {roundNumber}
          </h1>
          <span className="text-2xl font-[Bangers] text-gray-400 tracking-[4px]">
            OF {totalRounds}
          </span>
        </div>
      </div>

      {/* Cleaver slash line — diagonal across the screen */}
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden ${
          slashActive ? 'animate-[slash-flash_0.3s_ease-out]' : 'opacity-0'
        }`}
      >
        {/* Diagonal slash line */}
        <div
          className={`absolute top-0 left-1/2 w-[2px] h-[150%] bg-[#FF1744] origin-top -translate-x-1/2 rotate-[25deg] ${
            slashActive
              ? 'animate-[slash-cut_0.4s_cubic-bezier(0.22,1,0.36,1)_forwards]'
              : 'scale-y-0'
          }`}
        >
          {/* Glow effect on the slash */}
          <div className="absolute inset-0 w-[6px] -translate-x-[2px] bg-[#FF1744]/30 blur-sm" />
        </div>
      </div>
    </div>
  );
}
