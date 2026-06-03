/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import {
  TileType,
  Player,
  Enemy,
  Fruit,
  Particle,
  GameState,
  LevelPhase,
  Position,
  GridPos,
  ScheduledBreak
} from '../types';
import { SoundEffects } from './SoundEffects';
import { W, H, TILE, LEVELS } from '../constants';
import { usePlayerInput } from '../hooks/usePlayerInput';
import { useGameEntities } from '../hooks/useGameEntities';
import { useGameLoop } from '../hooks/useGameLoop';
import { formatTime } from '../utils/map';

// Capa de Render drawing functions
import { drawMap } from '../renderers/drawMap';
import { drawFruits, drawPlayerIndicators } from '../renderers/drawFruits';
import { drawGardenTurtle } from '../renderers/drawTurtle';
import { drawFoxEnemy } from '../renderers/drawFox';
import { drawParticles } from '../renderers/drawParticles';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (s: GameState) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  levelScore: number;
  setLevelScore: React.Dispatch<React.SetStateAction<number>>;
  lives: number;
  setLives: React.Dispatch<React.SetStateAction<number>>;
  levelPhase: LevelPhase;
  setLevelPhase: (p: LevelPhase) => void;
  gameTimeElapsed: number;
  setGameTimeElapsed: React.Dispatch<React.SetStateAction<number>>;
  fruitsLeft: number;
  setFruitsLeft: (n: number) => void;
  goldenBroccoliTimer: number;
  setGoldenBroccoliTimer: (t: number) => void;
  resetTrigger: number;
  soundOn: boolean;
  virtualCommand: string | null;
  clearVirtualCommand: () => void;
  currentLevelIndex: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  score,
  setScore,
  levelScore,
  setLevelScore,
  lives,
  setLives,
  levelPhase,
  setLevelPhase,
  gameTimeElapsed,
  setGameTimeElapsed,
  fruitsLeft,
  setFruitsLeft,
  goldenBroccoliTimer,
  setGoldenBroccoliTimer,
  resetTrigger,
  soundOn,
  virtualCommand,
  clearVirtualCommand,
  currentLevelIndex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelConfig = LEVELS[currentLevelIndex];

  // References to keep high-frequency loops extremely fast without component re-renders
  const mapRef = useRef<TileType[][]>([]);
  const playerRef = useRef<Player>({
    col: 1,
    row: 1,
    x: 1 * TILE + TILE / 2,
    y: 1 * TILE + TILE / 2,
    targetCol: 1,
    targetRow: 1,
    moving: false,
    dir: { x: 1, y: 0 },
    speed: 130, // px/s (era 120)
    animFrame: 0,
    animTimer: 0,
    invincible: 0,
    goldenBroccoliTimer: 0,
    powerCooldown: 0,
    plantingAnimTimer: 0,
    breakingAnimTimer: 0,
    deathAnimTimer: 0,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const prevMapRef = useRef<TileType[][] | null>(null);
  const grassAgesRef = useRef<{ [key: string]: { createdAt: number } }>({});
  const breakingTilesRef = useRef<GridPos[]>([]);
  const plantingTilesRef = useRef<GridPos[]>([]);
  const triggerActionRef = useRef<() => void>(() => {});
  const frameCountRef = useRef<number>(0);
  const scheduledPlantsRef = useRef<{ col: number; row: number; triggerAt: number }[]>([]);
  const scheduledBreaksRef = useRef<ScheduledBreak[]>([]);
  const tileReadyRef = useRef<number[][]>([]);
  const awaitingBurrowRef = useRef<boolean>(false);
  const dyingBushesRef = useRef<{ col: number; row: number; alpha: number; variant: number }[]>([]);
  const goldenBroccoliUsedRef = useRef<boolean>(false);
  const usedGoldenBroccoliRef = useRef<boolean>(false);

  // Sounds active state tracker (to sync with prop without closures stale)
  const soundOnRef = useRef<boolean>(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
    SoundEffects.toggle(soundOn);
  }, [soundOn]);

  // Synchronize game elapsed timer (1s frequency timer helper safely initialized)
  useEffect(() => {
    let timerInterval: any = null;
    if (gameState === 'playing') {
      timerInterval = setInterval(() => {
        setGameTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [gameState, setGameTimeElapsed]);

  // Initialize Input management
  const {
    keysRef,
    keysPressTimeRef,
    lastDirRef,
    turnBlockedRef,
    getPowerCount,
  } = usePlayerInput({
    gameState,
    levelScore,
    levelPhase,
    playerRef,
    enemiesRef,
    mapRef,
    breakingTilesRef,
    plantingTilesRef,
    triggerActionRef,
    frameCountRef,
    scheduledPlantsRef,
    scheduledBreaksRef,
    tileReadyRef,
    setGameState,
  });

  // Initialize Game Entity simulation methods
  const {
    updatePlayer,
    updateEnemy,
    checkCollisions,
    respawnEntities,
    checkGoldenBroccoliSpawn,
    spawnParticles,
    detectMapChanges,
    initLevel,
  } = useGameEntities({
    playerRef,
    enemiesRef,
    fruitsRef,
    particlesRef,
    prevMapRef,
    grassAgesRef,
    mapRef,
    keysRef,
    keysPressTimeRef,
    lastDirRef,
    turnBlockedRef,
    lives,
    levelPhase,
    gameState,
    score,
    setScore,
    levelScore,
    setLevelScore,
    setFruitsLeft,
    setGoldenBroccoliTimer,
    setGameState,
    setLevelPhase,
    tileReadyRef,
    scheduledPlantsRef,
    scheduledBreaksRef,
    frameCountRef,
    awaitingBurrowRef,
    currentLevelIndex,
    goldenBroccoliUsedRef,
    usedGoldenBroccoliRef,
  });

  // Decoupled unified rendering callback function
  const onRender = (ctx: CanvasRenderingContext2D, timestamp: number) => {
    // Clear layout
    ctx.clearRect(0, 0, W, H);

    const player = playerRef.current;

    // Screen shake calculation: proportional for new 620ms duration
    const isBreakShake = player.breakingAnimTimer >= 344 && player.breakingAnimTimer <= 415;
    const isPlantShake = player.plantingAnimTimer >= 517 && player.plantingAnimTimer <= 620;

    ctx.save();
    
    if (isBreakShake) {
      const shakeX = (Math.random() * 2 - 1) * 2.5;
      const shakeY = (Math.random() * 2 - 1) * 2.5;
      ctx.translate(shakeX, shakeY);
    } else if (isPlantShake) {
      const shakeX = (Math.random() * 2 - 1) * 1.5;
      const shakeY = (Math.random() * 2 - 1) * 1.5;
      ctx.translate(shakeX, shakeY);
    }

    const escapeActive = fruitsRef.current.filter(f => f.type !== 5).length === 0;

    // Render game layers using pure functions from the Capa de Render
    drawMap(ctx, mapRef.current, grassAgesRef.current, breakingTilesRef.current, player.breakingAnimTimer, escapeActive, timestamp, dyingBushesRef.current, 18, 13);
    drawParticles(ctx, particlesRef.current);
    drawFruits(ctx, fruitsRef.current, mapRef.current, timestamp);

    if (['playing', 'dead', 'win', 'paused'].includes(gameState)) {
      // Draw player main
      const px = player.x;
      const py = player.y;

      const alpha = player.invincible > 0
        ? (Math.floor(player.invincible / 6) % 2 === 0 ? 0.25 : 1.0)
        : 1.0;

      ctx.globalAlpha = alpha;

      const isGolden = player.goldenBroccoliTimer > 0;
      const isFlickering = player.goldenBroccoliTimer <= 3000 && isGolden;
      const flickerOn = isFlickering ? Math.floor(player.goldenBroccoliTimer / 133) % 2 === 0 : true;

      if (isGolden) {
        ctx.save();
        if (!flickerOn) {
          ctx.globalAlpha = ctx.globalAlpha * 0.3;
        }
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#eab308';
        ctx.beginPath();
        ctx.arc(px, py, TILE * 0.65 + Math.sin(timestamp * 0.012) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      drawGardenTurtle(
        ctx,
        px,
        py,
        player.dir,
        player.animFrame,
        timestamp,
        player.goldenBroccoliTimer,
        player.moving,
        player.plantingAnimTimer,
        player.breakingAnimTimer,
        player.deathAnimTimer
      );

      if (gameState === 'playing') {
        const powerCount = getPowerCount();
        drawPlayerIndicators(ctx, player, enemiesRef.current, mapRef.current, powerCount);
      }

      ctx.globalAlpha = 1.0;

      // Draw enemies
      enemiesRef.current.forEach(e => {
        if (e.type === 'ghost') {
          ctx.globalAlpha = 0.55;
        } else {
          ctx.globalAlpha = 1.0;
        }

        drawFoxEnemy(ctx, e.x, e.y, e.dir, e.animFrame, e.type, timestamp);
        ctx.globalAlpha = 1.0;
      });
    }

    ctx.restore();
  };

  // Initialize main canvas requestAnimationFrame loop hook
  useGameLoop({
    canvasRef,
    gameState,
    score,
    levelPhase,
    lives,
    setLives,
    setGameState,
    playerRef,
    enemiesRef,
    fruitsRef,
    particlesRef,
    mapRef,
    breakingTilesRef,
    plantingTilesRef,
    grassAgesRef,
    dyingBushesRef,
    updatePlayer,
    updateEnemy,
    checkCollisions,
    respawnEntities,
    checkGoldenBroccoliSpawn,
    spawnParticles,
    detectMapChanges,
    frameCountRef,
    scheduledPlantsRef,
    scheduledBreaksRef,
    tileReadyRef,
    onRender,
    currentLevelIndex,
  });

  // Handle layout loading and reset trigger bounds
  useEffect(() => {
    initLevel(lives);
    keysRef.current = {};
    lastDirRef.current = null;
  }, [resetTrigger]);

  // Hook Virtual Pad inputs in preview iframe
  useEffect(() => {
    if (!virtualCommand) return;

    if (virtualCommand === 'PAUSE') {
      if (gameState === 'playing') {
        setGameState('paused');
      } else if (gameState === 'paused') {
        setGameState('playing');
      }
      clearVirtualCommand();
      return;
    }

    if (gameState !== 'playing') {
      clearVirtualCommand();
      return;
    }

    if (virtualCommand.endsWith('_START')) {
      const dirStr = virtualCommand.replace('_START', '');
      const dirMap: { [k: string]: { code: string; dir: Position } } = {
        'UP': { code: 'ArrowUp', dir: { x: 0, y: -1 } },
        'DOWN': { code: 'ArrowDown', dir: { x: 0, y: 1 } },
        'LEFT': { code: 'ArrowLeft', dir: { x: -1, y: 0 } },
        'RIGHT': { code: 'ArrowRight', dir: { x: 1, y: 0 } }
      };
      const mapping = dirMap[dirStr];
      if (mapping) {
        const code = mapping.code;
        const newDir = mapping.dir;
        const player = playerRef.current;

        const prev = keysRef.current[code];
        keysRef.current[code] = true;

        if (!prev) {
          keysPressTimeRef.current[code] = Date.now();
          const isTurning = player.dir.x !== newDir.x || player.dir.y !== newDir.y;
          if (isTurning) {
            player.dir = newDir;
            turnBlockedRef.current = true;
          } else {
            lastDirRef.current = newDir;
            turnBlockedRef.current = false;
          }
        }
      }
    } else if (virtualCommand.endsWith('_END')) {
      const dirStr = virtualCommand.replace('_END', '');
      const dirMap: { [k: string]: string } = {
        'UP': 'ArrowUp',
        'DOWN': 'ArrowDown',
        'LEFT': 'ArrowLeft',
        'RIGHT': 'ArrowRight'
      };
      const code = dirMap[dirStr];
      if (code) {
        keysRef.current[code] = false;

        const hasMovementKey = keysRef.current['ArrowUp'] || keysRef.current['KeyW'] ||
                               keysRef.current['ArrowDown'] || keysRef.current['KeyS'] ||
                               keysRef.current['ArrowLeft'] || keysRef.current['KeyA'] ||
                               keysRef.current['ArrowRight'] || keysRef.current['KeyD'];
        if (!hasMovementKey) {
          turnBlockedRef.current = false;
          lastDirRef.current = null;
        } else {
          if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) lastDirRef.current = { x: 0, y: -1 };
          else if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) lastDirRef.current = { x: 0, y: 1 };
          else if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) lastDirRef.current = { x: -1, y: 0 };
          else if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) lastDirRef.current = { x: 1, y: 0 };
        }
      }
    } else if (virtualCommand === 'ACTION') {
      triggerActionRef.current();
    }

    clearVirtualCommand();
  }, [virtualCommand, gameState, score, levelPhase]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#1a0e05] to-[#2d1a10] p-1.5 shadow-2xl shadow-black/80 w-full h-full max-h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={(e) => {
          if (gameState === 'playing') {
            const nativeEvt = e.nativeEvent;
            if ('pointerType' in nativeEvt && (nativeEvt as any).pointerType !== 'mouse') {
              return;
            }
            setGameState('paused');
          }
        }}
        className={`block w-full h-full max-w-full max-h-full rounded-lg bg-[#160d07] object-contain touch-none ${gameState === 'playing' ? 'cursor-pointer' : ''}`}
      />
    </div>
  );
};

export default GameCanvas;