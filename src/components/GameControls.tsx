/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameState, HighScore, LevelPhase } from '../types';
import { formatTime } from './GameCanvas';
import { Volume2, VolumeX, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Star } from 'lucide-react';

interface GameControlsProps {
  score: number;
  lives: number;
  levelPhase: LevelPhase;
  fruitsLeft: number;
  gameTimeElapsed: number;
  goldenBroccoliTimer: number;
  soundOn: boolean;
  setSoundOn: (s: boolean) => void;
  triggerVirtualCommand: (cmd: string) => void;
  triggerReset: () => void;
  gameState: GameState;
  setGameState: (s: GameState) => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  score,
  lives,
  levelPhase,
  fruitsLeft,
  gameTimeElapsed,
  goldenBroccoliTimer,
  soundOn,
  setSoundOn,
  triggerVirtualCommand,
  triggerReset,
  gameState,
  setGameState,
}) => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [playerName, setPlayerName] = useState<string>('JUGADOR');

  // Load and store high scores locally
  useEffect(() => {
    const raw = localStorage.getItem('tortiland_scores');
    if (raw) {
      try {
        setHighScores(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveHighScore = () => {
    const finalScore = score * 100;
    const newEntry: HighScore = {
      name: playerName.trim() || 'ANÓNIMO',
      score: finalScore,
      time: gameTimeElapsed,
      date: new Date().toLocaleDateString(),
    };

    const updated = [...highScores, newEntry]
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 5);

    setHighScores(updated);
    localStorage.setItem('tortiland_scores', JSON.stringify(updated));
  };

  useEffect(() => {
    if (gameState === 'gameover' || gameState === 'win') {
      saveHighScore();
    }
  }, [gameState]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-md lg:max-w-xs select-none">
      {/* Wooden Carved Control Console Pane */}
      <div className="flex flex-col gap-4 rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#2d1a10] to-[#1a0e05] p-4 shadow-xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-[#5c3a21] pb-2.5">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-[0_0_5px_#f43f5e]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-[0_0_5px_#eab308]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_5px_#10b981]"></div>
            <div className="h-3 w-px bg-[#5c3a21] mx-1.5"></div>
            <span className="font-press-start text-[8px] tracking-widest text-[#fef08a]">CONSOLA JARDÍN</span>
          </div>
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4a2e19] hover:bg-[#5c3a21] border border-[#a1622e] text-[#fef08a] transition-all cursor-pointer shadow-md"
            title="Toggle Sound"
          >
            {soundOn ? <Volume2 size={14} className="text-[#86efac] animate-pulse" /> : <VolumeX size={14} className="text-[#fca5a5]" />}
          </button>
        </div>

        {/* DPAD Controller Design in Carved Wood styling */}
        <div className="flex flex-col items-center gap-1.5 my-1">
          <button
            onTouchStart={() => triggerVirtualCommand('UP')}
            onMouseDown={() => triggerVirtualCommand('UP')}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4a2e19] hover:bg-[#5c3a21] active:bg-[#1a0e05] border-2 border-[#814e20] text-[#fef08a] active:scale-95 cursor-pointer shadow-md transition-all"
          >
            <ArrowUp size={20} className="text-[#fde047]" />
          </button>
          
          <div className="flex items-center gap-7">
            <button
              onTouchStart={() => triggerVirtualCommand('LEFT')}
              onMouseDown={() => triggerVirtualCommand('LEFT')}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4a2e19] hover:bg-[#5c3a21] active:bg-[#1a0e05] border-2 border-[#814e20] text-[#fef08a] active:scale-95 cursor-pointer shadow-md transition-all"
            >
              <ArrowLeft size={20} className="text-[#fde047]" />
            </button>
            <div className="h-6 w-6 rounded-full bg-[#160d07] border-2 border-[#5c3a21] flex items-center justify-center shadow-inner">
              <div className="h-2 w-2 rounded-full bg-[#a1622e]" />
            </div>
            <button
              onTouchStart={() => triggerVirtualCommand('RIGHT')}
              onMouseDown={() => triggerVirtualCommand('RIGHT')}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4a2e19] hover:bg-[#5c3a21] active:bg-[#1a0e05] border-2 border-[#814e20] text-[#fef08a] active:scale-95 cursor-pointer shadow-md transition-all"
            >
              <ArrowRight size={20} className="text-[#fde047]" />
            </button>
          </div>

          <button
            onTouchStart={() => triggerVirtualCommand('DOWN')}
            onMouseDown={() => triggerVirtualCommand('DOWN')}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4a2e19] hover:bg-[#5c3a21] active:bg-[#1a0e05] border-2 border-[#814e20] text-[#fef08a] active:scale-95 cursor-pointer shadow-md transition-all"
          >
            <ArrowDown size={20} className="text-[#fde047]" />
          </button>
        </div>

        {/* Action construction keys (Lush Sprout Planting vs Autumn Foliage Clearing) */}
        <div className="grid grid-cols-2 gap-3.5 mt-1.5">
          <button
            onTouchStart={() => triggerVirtualCommand('BUILD')}
            onMouseDown={() => triggerVirtualCommand('BUILD')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#14532d] hover:bg-[#166534] border-2 border-[#22c55e] px-3 py-2.5 text-[#dbfde3] active:scale-95 cursor-pointer transition-all shadow-md shadow-emerald-950/40"
          >
            <span className="font-press-start text-[8px] tracking-wider font-extrabold flex items-center gap-1">🌱 SEMBRAR</span>
            <span className="text-[10px] text-[#dbfde3]/80 font-mono font-bold">Espacio</span>
          </button>
          <button
            onTouchStart={() => triggerVirtualCommand('BREAK')}
            onMouseDown={() => triggerVirtualCommand('BREAK')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] border-2 border-[#f87171] px-3 py-2.5 text-[#fee2e2] active:scale-95 cursor-pointer transition-all shadow-md shadow-rose-950/40"
          >
            <span className="font-press-start text-[8px] tracking-wider font-extrabold flex items-center gap-1">🍂 QUITAR</span>
            <span className="text-[10px] text-[#fee2e2]/80 font-mono font-bold">Shift</span>
          </button>
        </div>
      </div>

      {/* Leaderboard High Scores List in coherent wood box pane */}
      <div className="flex flex-col gap-3 rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#2d1a10] to-[#1a0e05] p-4 shadow-xl">
        <h3 className="flex items-center gap-1.5 font-press-start text-[9px] text-[#facc15] tracking-widest font-extrabold uppercase">
          <Star className="text-[#facc15] animate-bounce" size={13} fill="currentColor" />
          RÉCORDS DEL BOSQUE
        </h3>

        {highScores.length === 0 ? (
          <p className="font-mono text-xs text-[#fed7aa] italic py-2">Sin registros aún. ¡Comienza a sembrar hoy!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {highScores.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-[#160d07] px-3 py-2 border border-[#5c3a21] font-mono text-xs shadow-inner"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${i === 0 ? 'text-[#facc15]' : 'text-[#fed7aa]/60'}`}>
                    {i + 1}.
                  </span>
                  <span className="text-[#fef08a] font-semibold max-w-[85px] truncate uppercase">{h.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#4ade80] font-bold">{h.score} pts</span>
                  <span className="text-[#fed7aa]/50 text-[10px]">{formatTime(h.time)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-center mt-2.5 border-t border-[#5c3a21] pt-2.5">
          <label className="font-mono text-[9px] text-[#fef08a] font-bold uppercase tracking-wider">APODO:</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 10))}
            placeholder="JUGADOR"
            className="flex-1 rounded-lg border border-[#5c3a21] bg-[#160d07] px-2.5 py-1 text-xs text-[#4ade80] font-mono font-bold focus:border-[#4ade80] focus:outline-none uppercase"
          />
        </div>
      </div>
    </div>
  );
};
export default GameControls;
