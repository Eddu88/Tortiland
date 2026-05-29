/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameCanvas, formatTime } from './components/GameCanvas';
import { GameControls } from './components/GameControls';
import { GameState, LevelPhase } from './types';
import { Shield, Sparkles, Heart, Play, RotateCcw, HelpCircle, Gamepad2 } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [levelPhase, setLevelPhase] = useState<LevelPhase>('tomatoes');
  const [gameTimeElapsed, setGameTimeElapsed] = useState<number>(0);
  const [fruitsLeft, setFruitsLeft] = useState<number>(5);
  const [goldenBroccoliTimer, setGoldenBroccoliTimer] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [virtualCommand, setVirtualCommand] = useState<string | null>(null);

  const startNewGame = () => {
    setScore(0);
    setLives(3);
    setLevelPhase('tomatoes');
    setGameTimeElapsed(0);
    setFruitsLeft(5);
    setGoldenBroccoliTimer(0);
    setResetTrigger(prev => prev + 1);
    setGameState('playing');
  };

  const handleVirtualCommand = (cmd: string) => {
    setVirtualCommand(cmd);
  };

  const clearVirtualCommand = () => {
    setVirtualCommand(null);
  };

  // Render the fruit progress dynamically based on levelPhase (matches updateAppleProgress)
  const renderFruitProgressEmojis = () => {
    const emoji = levelPhase === 'tomatoes' ? '🍅' : '🥕';
    const label = levelPhase === 'tomatoes' ? 'Tomates' : 'Zanahorias';

    if (fruitsLeft === 0) {
      return (
        <span className="text-slate-400 italic text-xs animate-pulse">¡Fase completada!</span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-[13px] tracking-wide text-amber-300">
        <span className="opacity-90">{label}:</span>
        <span className="animate-pulse">{Array(fruitsLeft).fill(emoji).join(' ')}</span>
      </span>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-3 md:p-4 bg-gradient-to-br from-[#0c1e0e] via-[#050b06] to-[#122414] text-[#e2f1e4] font-sans selection:bg-[#22c55e]/30 selection:text-[#a7f3d0] overflow-hidden">

      {/* Main Container Dashboard enclosing the entire app workspace */}
      <div className="flex flex-col lg:flex-row gap-5 items-center lg:items-stretch justify-center max-w-[95vw] w-full h-full max-h-[92vh] bg-[#112415] border-2 border-[#224d27] rounded-2xl p-4 md:p-5 shadow-2xl shadow-black/80 overflow-hidden">

        {/* Playfield Area Box */}
        <div className="flex-1 flex flex-col items-center w-full h-full min-h-0">

          {/* Top Stats HUD Bar matching custom wood panels */}
          <div className="w-full flex flex-wrap gap-4 items-center justify-between rounded-xl border-2 border-[#203f25] bg-[#09130a] p-4 mb-4 select-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">

            {/* Score ticker */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[#86efac]/60 uppercase tracking-wider font-semibold">Marcador</span>
              <span className="font-press-start text-xs md:text-sm text-[#facc15] tracking-wider font-bold">
                {score * 100}
              </span>
            </div>

            {/* Fruits Left Counter Indicator */}
            <div className="flex flex-col animate-pulse">
              <span className="text-[10px] font-mono text-[#86efac]/60 uppercase tracking-wider font-semibold">Remanente</span>
              {renderFruitProgressEmojis()}
            </div>

            {/* Lives and active level indicators */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[#86efac]/60 uppercase tracking-wider font-semibold">Vidas</span>
              <span className="flex items-center gap-1 mt-0.5" aria-label={`${lives} vidas restantes`}>
                {lives <= 0 ? (
                  <span className="text-[#f87171] text-xs font-mono font-bold">MIN</span>
                ) : (
                  Array(lives).fill(0).map((_, i) => (
                    <Heart
                      key={i}
                      size={13}
                      fill="#f43f5e"
                      className="text-[#f43f5e] drop-shadow-[0_0_4px_rgba(244,63,94,0.5)] animate-pulse"
                    />
                  ))
                )}
              </span>
            </div>

            {/* Glow Digital Chronometer Timer */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-[#86efac]/60 uppercase tracking-wider font-semibold">Tiempo</span>
              <span className="font-press-start text-[10px] text-[#4ade80] font-bold tracking-widest">
                {formatTime(gameTimeElapsed)}
              </span>
            </div>

          </div>

          {/* Interactive Play Canvas Section */}
          <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
            <GameCanvas
              gameState={gameState}
              setGameState={setGameState}
              score={score}
              setScore={setScore}
              lives={lives}
              setLives={setLives}
              levelPhase={levelPhase}
              setLevelPhase={setLevelPhase}
              gameTimeElapsed={gameTimeElapsed}
              setGameTimeElapsed={setGameTimeElapsed}
              fruitsLeft={fruitsLeft}
              setFruitsLeft={setFruitsLeft}
              goldenBroccoliTimer={goldenBroccoliTimer}
              setGoldenBroccoliTimer={setGoldenBroccoliTimer}
              resetTrigger={resetTrigger}
              soundOn={soundOn}
              virtualCommand={virtualCommand}
              clearVirtualCommand={clearVirtualCommand}
            />

            {/* Overlay Interactive Screens styled with professional cards */}
            {gameState !== 'playing' && (
              <div className="absolute inset-0 rounded-2xl bg-[#081109]/96 flex flex-col items-center justify-center p-6 text-center select-none border-2 border-[#18391d]/80 backdrop-blur-sm">

                {gameState === 'menu' && (
                  <div className="flex flex-col items-center gap-4 max-w-md animate-fade-in w-full text-[#e2f1e4]">
                    <span className="px-3 py-1 rounded-md text-[9px] font-press-start text-[#4ade80] bg-[#14532d]/40 border border-[#22c55e]/30 tracking-wider">
                      V5.1 TORTILAND
                    </span>
                    <h2 className="font-press-start text-base md:text-lg text-[#facc15] tracking-widest mt-1 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      TORTILAND
                    </h2>

                    <p className="text-[#86efac]/70 text-xs leading-relaxed font-sans max-w-sm">
                      Maneja a nuestra carismática tortuga para sembrar y remover tupidas barreras de arbustos mágicos. ¡Come todas las verduras silvestres antes de que los zorros te atrapen!
                    </p>

                    <div className="rounded-xl bg-[#0f2413] border border-[#224d27] p-4 text-left w-full text-xs text-[#86efac]/80 flex flex-col gap-2 shadow-inner">
                      <div className="flex items-center gap-1.5 text-[#facc15] font-bold uppercase tracking-wider">
                        CRÓNICA DE UN JARDÍN MÁGICO
                      </div>
                      <p>🎮 <span className="text-white font-semibold">Flechas:</span> Mueve a la tortuga por el laberinto.</p>
                      <p>⚡ <span className="text-[#facc15] font-semibold">Espacio / F:</span> Siembra en celda vacía o Poda(Quita) el arbusto mágico.</p>
                      <p>🥦 Al quedar con <span className="text-[#facc15] font-semibold">1 sola vida</span>... ¡Busca el <span className="text-[#facc15] font-semibold">Brócoli Dorado</span> para atravesar arbustos libremente y crear más arbustos!</p>
                    </div>

                    <button
                      onClick={startNewGame}
                      className="flex items-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] border-2 border-[#22c55e] text-white hover:shadow-lg hover:shadow-[#14532d]/50 px-8 py-3.5 font-press-start text-[10px] tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all font-bold mt-2"
                    >
                      <Play size={12} fill="currentColor" />
                      EMPEZAR AVENTURA
                    </button>
                  </div>
                )}

                {gameState === 'gameover' && (
                  <div className="flex flex-col items-center gap-4 max-w-sm">
                    <div className="h-12 w-12 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e] flex items-center justify-center text-[#f43f5e] animate-pulse text-lg font-bold">
                      🍂
                    </div>
                    <h2 className="font-press-start text-base text-[#f43f5e] tracking-wider uppercase">
                      FIN DE PARTIDA
                    </h2>
                    <p className="text-[#86efac]/70 text-xs leading-relaxed">
                      Puntaje obtenido: <span className="text-white font-mono font-bold">{score * 100} pts</span>.<br />
                      Tiempo transcurrido: <span className="text-white font-mono font-bold">{formatTime(gameTimeElapsed)}</span>.
                    </p>
                    <button
                      onClick={startNewGame}
                      className="flex items-center gap-2 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] border-2 border-[#f87171] text-white px-6 py-3 font-press-start text-[9px] tracking-wider cursor-pointer active:scale-95 transition-all mt-2 font-bold shadow-md shadow-rose-950/40"
                    >
                      <RotateCcw size={12} />
                      REINTENTAR
                    </button>
                  </div>
                )}

                {gameState === 'win' && (
                  <div className="flex flex-col items-center gap-4 max-w-md">
                    <div className="h-12 w-12 rounded-full bg-[#facc15]/10 border border-[#facc15] flex items-center justify-center text-[#facc15] animate-bounce text-lg font-bold">
                      🏆
                    </div>
                    <h2 className="font-press-start text-sm text-[#facc15] tracking-wider uppercase">
                      ¡TORTI SALVADO!
                    </h2>
                    <p className="text-[#86efac]/70 text-xs">
                      ¡Magnífico! Has recolectado todos los consumibles silvestres con agilidad.
                    </p>
                    <div className="rounded-xl bg-[#0f2413] border border-[#224d27] px-5 py-3.5 text-xs text-[#e2f1e4] font-mono flex flex-col gap-1.5 min-w-[220px] shadow-inner">
                      <span className="flex justify-between">PUNTOS: <strong className="text-[#4ade80]">{(score * 100) + 1000}</strong></span>
                      <span className="flex justify-between">TIEMPO total: <strong className="text-[#eab308]">{formatTime(gameTimeElapsed)}</strong></span>
                      <span className="flex justify-between">VIDAS EXTRA: <strong className="text-[#f43f5e]">+{lives * 200}</strong></span>
                    </div>
                    <button
                      onClick={startNewGame}
                      className="flex items-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] border-2 border-[#22c55e] text-white px-6 py-3.5 font-press-start text-[9px] tracking-wider cursor-pointer active:scale-95 transition-all mt-2 font-bold shadow-md shadow-emerald-950/30"
                    >
                      <RotateCcw size={12} />
                      VOLVER A JUGAR
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

        {/* Handheld Controllers Sidebar Column */}
        <GameControls
          score={score}
          lives={lives}
          levelPhase={levelPhase}
          fruitsLeft={fruitsLeft}
          gameTimeElapsed={gameTimeElapsed}
          goldenBroccoliTimer={goldenBroccoliTimer}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          triggerVirtualCommand={handleVirtualCommand}
          triggerReset={startNewGame}
          gameState={gameState}
          setGameState={setGameState}
        />

      </div>
    </div>
  );
}
