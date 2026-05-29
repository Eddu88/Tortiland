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
  GridPos
} from '../types';
import { SoundEffects } from './SoundEffects';
import { W, H, TILE } from '../constants';
import { usePlayerInput } from '../hooks/usePlayerInput';
import { useGameEntities } from '../hooks/useGameEntities';
import { useGameLoop } from '../hooks/useGameLoop';

// Format seconds into elegant MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (s: GameState) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
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
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  score,
  setScore,
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    speed: 1.5,
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
  const tileReadyRef = useRef<number[][]>([]);

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
    score,
    levelPhase,
    playerRef,
    enemiesRef,
    mapRef,
    breakingTilesRef,
    plantingTilesRef,
    triggerActionRef,
    frameCountRef,
    scheduledPlantsRef,
    tileReadyRef,
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
    setFruitsLeft,
    setGoldenBroccoliTimer,
    setGameState,
    setLevelPhase,
    tileReadyRef,
    scheduledPlantsRef,
    frameCountRef,
  });

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
    updatePlayer,
    updateEnemy,
    checkCollisions,
    respawnEntities,
    checkGoldenBroccoliSpawn,
    spawnParticles,
    detectMapChanges,
    getPowerCount,
    frameCountRef,
    scheduledPlantsRef,
    tileReadyRef,
  });

  // Handle layout loading and reset trigger bounds
  useEffect(() => {
    initLevel(lives);
    keysRef.current = {};
    lastDirRef.current = null;
  }, [resetTrigger]);

  // Hook Virtual Pad inputs in preview iframe
  useEffect(() => {
    if (!virtualCommand || gameState !== 'playing') return;

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
        className="block w-full h-full max-w-full max-h-full rounded-lg bg-[#160d07] object-contain touch-none"
      />
    </div>
  );
};

export default GameCanvas;