import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameControls } from './components/GameControls';
import { GameState, LevelPhase } from './types';
import { formatTime } from './utils/map';
import { Shield, Sparkles, Heart, Play, RotateCcw, HelpCircle, Gamepad2, Lock, Star, ChevronLeft } from 'lucide-react';
import { LEVELS } from './constants';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [previousScreen, setPreviousScreen] = useState<'menu' | 'gameover' | 'pause'>('menu');
  const [score, setScore] = useState<number>(0);
  const [levelScore, setLevelScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(2);
  const [levelPhase, setLevelPhase] = useState<LevelPhase>('tomatoes');
  const [gameTimeElapsed, setGameTimeElapsed] = useState<number>(0);
  const [fruitsLeft, setFruitsLeft] = useState<number>(5);
  const [goldenBroccoliTimer, setGoldenBroccoliTimer] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [virtualCommand, setVirtualCommand] = useState<string | null>(null);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(0);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState<boolean>(false);
  const [showLevelSelectConfirm, setShowLevelSelectConfirm] = useState<boolean>(false);
  const [pendingLevelIndex, setPendingLevelIndex] = useState<number>(0);

  // Reset abandon/level select confirm states when gameState changes
  React.useEffect(() => {
    if (gameState !== 'paused') {
      setShowAbandonConfirm(false);
    }
    if (gameState !== 'level_select') {
      setShowLevelSelectConfirm(false);
    }
  }, [gameState]);

  // Persistence of level progress using localStorage
  React.useEffect(() => {
    if (gameState === 'level_complete' || gameState === 'win') {
      const maxUnlocked = parseInt(localStorage.getItem('tortiland_max_level') || '1', 10);
      const nextLevel = currentLevelIndex + 2; // currentLevelIndex is 0-based
      if (nextLevel > maxUnlocked && nextLevel <= 6) {
        localStorage.setItem('tortiland_max_level', String(nextLevel));
      }
    }
  }, [gameState, currentLevelIndex]);

  const launchLevel = (levelIdx: number, isNewGame: boolean) => {
    if (isNewGame) {
      setScore(0);
      setLives(2);
    }
    setLevelScore(0);
    setCurrentLevelIndex(levelIdx);
    setLevelPhase('tomatoes');
    setGameTimeElapsed(0);
    setFruitsLeft(5);
    setGoldenBroccoliTimer(0);
    setResetTrigger(prev => prev + 1);
    setGameState('playing');
  };

  const startNewGame = () => {
    launchLevel(0, true);
  };

  const startNextLevel = () => {
    const nextIdx = currentLevelIndex + 1;
    if (nextIdx < LEVELS.length) {
      launchLevel(nextIdx, false);
    }
  };

  const handleVirtualCommand = (cmd: string) => {
    setVirtualCommand(cmd);
  };

  const clearVirtualCommand = () => {
    setVirtualCommand(null);
  };

  // Render the fruit progress dynamically based on levelPhase (matches updateAppleProgress)
  const renderFruitProgressEmojis = () => {
    const emoji = levelPhase === 'tomatoes' ? '🍅' : (levelPhase === 'carrots' ? '🥕' : '🍠');
    const label = levelPhase === 'tomatoes' ? 'Tomates' : (levelPhase === 'carrots' ? 'Zanahorias' : 'Beterragas');

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

            {/* Level Indicator */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[#86efac]/60 uppercase tracking-wider font-semibold">Nivel</span>
              <span className="font-press-start text-xs text-[#a7f3d0] font-bold">
                {LEVELS[currentLevelIndex]?.number}
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
              levelScore={levelScore}
              setLevelScore={setLevelScore}
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
              currentLevelIndex={currentLevelIndex}
            />

            {/* Overlay Interactive Screens styled with professional cards */}
            {gameState !== 'playing' && (
              <div className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none border-2 border-[#18391d]/80 backdrop-blur-sm transition-all duration-300 ${gameState === 'paused' ? 'bg-[#081109]/80' : 'bg-[#081109]/96'}`}>

                {gameState === 'paused' && (
                  showAbandonConfirm ? (
                    <div className="flex flex-col items-center gap-5 max-w-sm w-full rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#2d1a10] to-[#1a0e05] p-6 shadow-2xl shadow-black/80 select-none animate-fade-in text-[#e2f1e4]">
                      <div className="h-12 w-12 rounded-full bg-red-950/20 border-2 border-red-500 flex items-center justify-center text-red-500 animate-pulse text-lg">
                        ⚠️
                      </div>

                      <h2 className="font-press-start text-xs text-red-400 tracking-widest mt-1 uppercase text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        ¿ABANDONAR?
                      </h2>

                      <p className="text-[#fed7aa]/80 text-[10px] md:text-[11px] leading-relaxed text-center font-mono max-w-xs">
                        ¿Abandonar partida actual? Se perderá el progreso.
                      </p>

                      <div className="w-full flex flex-col gap-3 mt-2">
                        <button
                          onClick={() => {
                            setShowAbandonConfirm(false);
                            setPreviousScreen('pause');
                            setGameState('level_select');
                          }}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-800 hover:bg-red-700 active:bg-red-900 border-2 border-red-500 text-white px-6 py-3 font-press-start text-[9px] tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all font-bold shadow-md shadow-red-950/30"
                        >
                          ABANDONAR
                        </button>

                        <button
                          onClick={() => setShowAbandonConfirm(false)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#14532d] border-2 border-[#22c55e] text-white px-6 py-3 font-press-start text-[9px] tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all font-bold shadow-md shadow-emerald-950/30"
                        >
                          CANCELAR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-5 max-w-sm w-full rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#2d1a10] to-[#1a0e05] p-6 shadow-2xl shadow-black/80 select-none animate-fade-in text-[#e2f1e4]">
                      <div className="h-14 w-14 flex items-center justify-center animate-pulse">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.8)]">
                          <rect x="5" y="3" width="5" height="18" rx="1.5" fill="#eab308" stroke="#5c3a21" strokeWidth="2" />
                          <rect x="14" y="3" width="5" height="18" rx="1.5" fill="#eab308" stroke="#5c3a21" strokeWidth="2" />
                        </svg>
                      </div>

                      <h2 className="font-press-start text-sm text-[#fef08a] tracking-widest mt-1 uppercase text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        PAUSA
                      </h2>

                      <p className="text-[#fed7aa]/80 text-[11px] leading-relaxed text-center font-mono max-w-xs">
                        El juego se encuentra pausado. Tus vidas y marcador están a salvo.
                      </p>

                      <div className="w-full flex flex-col gap-3.5 mt-2">
                        <button
                          onClick={() => setGameState('playing')}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] border-2 border-[#22c55e] text-white px-6 py-3 font-press-start text-[9px] tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all font-bold shadow-md shadow-emerald-950/30"
                        >
                          REANUDAR
                        </button>

                        <button
                          onClick={() => setShowAbandonConfirm(true)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#854d0e] hover:bg-[#a16207] active:bg-[#4a2e19] border-2 border-[#eab308] text-[#fef9c3] px-6 py-3 font-press-start text-[9px] tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all font-bold shadow-md shadow-amber-950/40"
                        >
                          ELEGIR NIVEL
                        </button>
                      </div>
                    </div>
                  )
                )}

                {gameState === 'menu' && (
                  <div className="flex flex-col items-center gap-4 max-w-md animate-fade-in w-full text-[#e2f1e4]">
                    <span className="px-3 py-1 rounded-md text-[9px] font-press-start text-[#4ade80] bg-[#14532d]/40 border border-[#22c55e]/30 tracking-wider">
                      V7.1 TORTILAND
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
                      onClick={() => {
                        const maxUnlocked = parseInt(localStorage.getItem('tortiland_max_level') || '1', 10);
                        setSelectedLevelIndex(Math.min(5, maxUnlocked - 1));
                        setPreviousScreen('menu');
                        setGameState('level_select');
                      }}
                      className="flex items-center gap-2 rounded-xl bg-[#854d0e] hover:bg-[#a16207] active:bg-[#4a2e19] border-2 border-[#eab308] text-[#fef9c3] hover:shadow-lg hover:shadow-amber-950/50 shadow-md shadow-amber-950/40 px-8 py-3.5 font-press-start text-[10px] tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all font-bold mt-2"
                    >
                      <Play size={12} fill="currentColor" />
                      EMPEZAR AVENTURA
                    </button>
                  </div>
                )}

                {gameState === 'level_select' && (
                  <div className="relative flex flex-col items-center max-w-2xl w-full h-[95%] rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#2d1a10] to-[#1a0e05] p-5 shadow-2xl shadow-black/80 select-none animate-fade-in text-[#e2f1e4] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#5c3a21] pb-3 mb-3 w-full">
                      <button
                        onClick={() => {
                          if (previousScreen === 'gameover') {
                            setGameState('gameover');
                          } else if (previousScreen === 'pause') {
                            setGameState('paused');
                          } else {
                            setGameState('menu');
                          }
                        }}
                        className="flex items-center gap-1 text-[#facc15] hover:text-[#fde047] font-press-start text-[8px] cursor-pointer bg-transparent border-none active:scale-95 transition-all"
                      >
                        <ChevronLeft size={10} />
                        VOLVER
                      </button>
                      <h2 className="font-press-start text-xs md:text-sm text-[#facc15] tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        SELECCIÓN DE NIVEL
                      </h2>
                      <div className="w-[65px]"></div>
                    </div>

                    {/* Levels Grid Container */}
                    <div className="flex-1 overflow-y-auto pr-1 mb-4 w-full">
                      <div className="grid grid-cols-8 gap-2.5 p-1">
                        {Array.from({ length: 40 }).map((_, idx) => {
                          const levelNum = idx + 1;
                          const isComingSoon = levelNum >= 7;
                          const maxUnlocked = parseInt(localStorage.getItem('tortiland_max_level') || '1', 10);
                          const isUnlocked = !isComingSoon && levelNum <= maxUnlocked;
                          const isSelected = selectedLevelIndex === idx;
                          const stars = isUnlocked ? parseInt(localStorage.getItem(`tortiland_stars_${levelNum}`) || '0', 10) : 0;

                          return (
                            <button
                              key={idx}
                              disabled={!isUnlocked}
                              onClick={() => setSelectedLevelIndex(idx)}
                              className={`
                                relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200 select-none border-2
                                ${isComingSoon || !isUnlocked
                                  ? 'bg-[#160d07]/60 border-[#5c3a21]/30 text-stone-600 opacity-45 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#5c3a21] border-[#eab308] text-[#fde047] shadow-[0_0_12px_#eab308] scale-[1.05] cursor-pointer animate-pulse'
                                    : 'bg-[#4a2e19] hover:bg-[#5c3a21] active:bg-[#1a0e05] border-[#814e20] text-[#fef9c3] cursor-pointer active:scale-95'
                                }
                              `}
                            >
                              {/* Display stars obtained at the top of the level card */}
                              {isUnlocked && !isComingSoon && (
                                <div className="absolute top-1 flex gap-0.5 justify-center">
                                  {Array.from({ length: 2 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={8}
                                      fill={i < stars ? '#eab308' : 'none'}
                                      className={i < stars ? 'text-[#eab308]' : 'text-stone-600/40'}
                                    />
                                  ))}
                                </div>
                              )}

                              <span className="font-press-start text-[10px] md:text-xs font-bold leading-none mt-1.5">
                                {levelNum}
                              </span>

                              {isComingSoon ? (
                                <span className="absolute bottom-1 text-[6px] font-mono opacity-80 text-stone-500 uppercase tracking-tighter">PRÓX</span>
                              ) : !isUnlocked ? (
                                <Lock size={10} className="absolute bottom-1 text-[#5c3a21]" />
                              ) : levelNum === maxUnlocked ? (
                                <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Details & Play Panel */}
                    <div className="w-full bg-[#160d07] border-2 border-[#5c3a21] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                      <div className="flex-1 text-left w-full">
                        {(() => {
                          const levelNum = selectedLevelIndex + 1;
                          const isComingSoon = levelNum >= 7;
                          if (isComingSoon) {
                            return (
                              <>
                                <h3 className="font-press-start text-[8px] md:text-[9px] text-stone-500 uppercase tracking-wider mb-1">
                                  NIVEL {levelNum}: PRÓXIMAMENTE
                                </h3>
                                <p className="text-stone-600 text-[10px] md:text-[11px] leading-relaxed font-sans font-semibold">
                                  Contenido reservado para futuras aventuras en Tortiland.
                                </p>
                              </>
                            );
                          } else {
                            const config = LEVELS[selectedLevelIndex];
                            const maxUnlocked = parseInt(localStorage.getItem('tortiland_max_level') || '1', 10);
                            const isCompleted = levelNum < maxUnlocked;
                            return (
                              <>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="font-press-start text-[8px] md:text-[9px] text-[#facc15] uppercase tracking-wider">
                                    NIVEL {levelNum}: {config?.name}
                                  </h3>
                                  {isCompleted && (
                                    <span className="bg-[#14532d]/60 border border-[#22c55e]/30 rounded text-[6px] font-press-start px-1 py-0.5 text-[#4ade80] flex items-center gap-0.5 uppercase tracking-wide">
                                      ⭐ Superado
                                    </span>
                                  )}
                                </div>
                                <p className="text-[#fed7aa]/80 text-[10px] md:text-[11px] leading-normal font-sans">
                                  {config?.description}
                                </p>
                              </>
                            );
                          }
                        })()}
                      </div>

                      <button
                        disabled={selectedLevelIndex >= 6}
                        onClick={() => {
                          const isGameInProgress = previousScreen === 'pause';
                          if (isGameInProgress) {
                            setPendingLevelIndex(selectedLevelIndex);
                            setShowLevelSelectConfirm(true);
                          } else {
                            launchLevel(selectedLevelIndex, true);
                          }
                        }}
                        className={`
                          shrink-0 font-press-start text-[9px] tracking-wider px-6 py-3.5 rounded-xl transition-all duration-150 transform font-bold w-full sm:w-auto text-center
                          ${selectedLevelIndex >= 6
                            ? 'bg-[#2d1a10] border-2 border-[#5c3a21] text-stone-600 opacity-50 cursor-not-allowed'
                            : 'bg-[#854d0e] hover:bg-[#a16207] active:bg-[#4a2e19] border-2 border-[#eab308] text-[#fef9c3] cursor-pointer hover:scale-[1.02] active:scale-95 shadow-md shadow-amber-950/40'
                          }
                        `}
                      >
                        JUGAR NIVEL
                      </button>
                    </div>

                    {showLevelSelectConfirm && (
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-[#081109]/90 backdrop-blur-sm z-10 animate-fade-in">
                        <div className="flex flex-col items-center gap-5 max-w-xs w-full rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#2d1a10] to-[#1a0e05] p-6 shadow-2xl shadow-black/80 text-[#e2f1e4]">
                          <div className="h-12 w-12 rounded-full bg-red-950/20 border-2 border-red-500 flex items-center justify-center text-red-500 animate-pulse text-lg">
                            ⚠️
                          </div>
                          <h2 className="font-press-start text-xs text-red-400 tracking-widest uppercase text-center">
                            ¿NUEVA AVENTURA?
                          </h2>
                          <p className="text-[#fed7aa]/80 text-[10px] leading-relaxed text-center font-mono">
                            Se perderá el progreso actual. ¿Continuar?
                          </p>
                          <div className="w-full flex flex-col gap-3 mt-1">
                            <button
                              onClick={() => {
                                setShowLevelSelectConfirm(false);
                                launchLevel(pendingLevelIndex, true);
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-800 hover:bg-red-700 border-2 border-red-500 text-white px-6 py-3.5 font-press-start text-[9px] tracking-wider cursor-pointer hover:scale-[1.02] active:scale-95 transition-all font-bold shadow-md shadow-red-950/30"
                            >
                              CONFIRMAR
                            </button>
                            <button
                              onClick={() => setShowLevelSelectConfirm(false)}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] border-2 border-[#22c55e] text-white px-6 py-3.5 font-press-start text-[9px] tracking-wider cursor-pointer hover:scale-[1.02] active:scale-95 transition-all font-bold shadow-md shadow-emerald-950/30"
                            >
                              CANCELAR
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {gameState === 'gameover' && (
                  <div className="flex flex-col items-center gap-4 max-w-sm w-full">
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

                    {/* Botón: Reintentar mismo nivel */}
                    <button
                      onClick={() => launchLevel(currentLevelIndex, true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] border-2 border-[#f87171] text-white px-6 py-3.5 font-press-start text-[9px] tracking-wider cursor-pointer active:scale-95 transition-all mt-2 font-bold shadow-md shadow-rose-950/40"
                    >
                      <RotateCcw size={12} />
                      REINTENTAR
                    </button>

                    {/* Botón: Elegir nivel */}
                    <button
                      onClick={() => {
                        setSelectedLevelIndex(currentLevelIndex);
                        setPreviousScreen('gameover');
                        setGameState('level_select');
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#854d0e] hover:bg-[#a16207] active:bg-[#4a2e19] border-2 border-[#eab308] text-[#fef9c3] px-6 py-3.5 font-press-start text-[9px] tracking-wider cursor-pointer active:scale-95 transition-all font-bold shadow-md shadow-amber-950/40"
                    >
                      <Gamepad2 size={12} />
                      ELEGIR NIVEL
                    </button>
                  </div>
                )}

                {gameState === 'level_complete' && (
                  <div className="flex flex-col items-center gap-4 max-w-sm w-full rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#2d1a10] to-[#1a0e05] p-6 shadow-2xl shadow-black/80 select-none animate-fade-in text-[#e2f1e4]">
                    <div className="h-12 w-12 rounded-full bg-[#854d0e]/20 border-2 border-[#eab308] flex items-center justify-center text-[#eab308] animate-bounce text-lg">
                      🌿
                    </div>

                    <span className="px-3 py-1 rounded-md text-[8px] font-press-start text-[#4ade80] bg-[#14532d]/40 border border-[#22c55e]/30 tracking-wider">
                      ¡NIVEL COMPLETADO!
                    </span>

                    <h2 className="font-press-start text-xs text-[#facc15] tracking-widest mt-1 uppercase text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      {LEVELS[currentLevelIndex]?.name}
                    </h2>

                    {(() => {
                      const levelNum = currentLevelIndex + 1;
                      const stars = parseInt(localStorage.getItem(`tortiland_stars_${levelNum}`) || '0', 10);
                      return (
                        <div className="flex items-center gap-2 justify-center my-1">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <Star
                              key={i}
                              size={20}
                              fill={i < stars ? '#eab308' : 'none'}
                              className={i < stars ? 'text-[#eab308] drop-shadow-[0_0_4px_rgba(234,179,8,0.6)] animate-pulse' : 'text-stone-600'}
                            />
                          ))}
                        </div>
                      );
                    })()}

                    <p className="text-[#fed7aa]/80 text-[11px] leading-relaxed text-center font-mono max-w-xs">
                      ¡Excelente! Has recolectado los consumibles silvestres de esta zona. Prepárate para el siguiente reto en el laberinto.
                    </p>

                    <div className="w-full rounded-xl bg-[#160d07] border border-[#5c3a21] p-4 text-xs font-mono text-[#fef08a] flex flex-col gap-2 shadow-inner">
                      <div className="flex justify-between border-b border-[#5c3a21]/45 pb-1">
                        <span>Marcador actual:</span>
                        <strong className="text-[#4ade80]">{score * 100} pts</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Tiempo en nivel:</span>
                        <strong className="text-[#eab308]">{formatTime(gameTimeElapsed)}</strong>
                      </div>
                    </div>

                    <button
                      onClick={startNextLevel}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#854d0e] hover:bg-[#a16207] active:bg-[#4a2e19] border-2 border-[#eab308] text-[#fef9c3] px-6 py-3.5 font-press-start text-[9px] tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 transition-all font-bold mt-2 shadow-md shadow-amber-950/40"
                    >
                      <Play size={10} fill="currentColor" />
                      SIGUIENTE NIVEL
                    </button>
                  </div>
                )}

                {gameState === 'win' && (
                  <div className="flex flex-col items-center gap-4 max-w-md select-none">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="animate-bounce filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
                        <defs>
                          <linearGradient id="gold-grad-victory" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#ca8a04" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z"
                          fill="url(#gold-grad-victory)"
                          stroke="#5c3a21"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <h2 className="font-press-start text-sm text-[#facc15] tracking-wider uppercase">
                        ¡VICTORIA!
                      </h2>
                    </div>
                    <p className="text-[#86efac]/70 text-xs">
                      ¡Magnífico! Has recolectado todos los consumibles silvestres con agilidad y completado toda la aventura.
                    </p>
                    <div className="rounded-xl bg-[#0f2413] border border-[#224d27] px-5 py-3.5 text-xs text-[#e2f1e4] font-mono flex flex-col gap-1.5 min-w-[220px] shadow-inner">
                      <span className="flex justify-between">PUNTOS: <strong className="text-[#4ade80]">{(score * 100) + 1000}</strong></span>
                      <span className="flex justify-between">TIEMPO total: <strong className="text-[#eab308]">{formatTime(gameTimeElapsed)}</strong></span>
                      <span className="flex justify-between">VIDAS EXTRA: <strong className="text-[#f43f5e]">+{lives * 200}</strong></span>
                    </div>
                    <button
                      onClick={() => {
                        setPreviousScreen('menu');
                        setGameState('level_select');
                      }}
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
