/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  TileType,
  Player,
  Enemy,
  Fruit,
  Particle,
  GameState,
  LevelPhase,
  Position
} from '../types';
import { SoundEffects } from './SoundEffects';

// Global Game Grid Constants
const COLS = 20;
const ROWS = 15;
const TILE = 40;
const W = COLS * TILE;
const H = ROWS * TILE;

const T_EMPTY = 0;
const T_WALL = 1;
const T_ICE = 2; // Reposted as beautiful grass/weed blocks

// Format seconds into elegant MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Fixed maze design based on Tortiland
const INNER_WALLS = [
  [2, 2], [2, 3], [2, 4],
  [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12],
  [4, 2], [5, 2], [6, 2],
  [4, 5], [4, 6], [4, 7],
  [4, 12], [4, 13], [4, 14], [4, 15], [4, 16],
  [6, 5], [7, 5], [8, 5],
  [6, 10], [6, 11], [6, 12],
  [7, 8], [8, 8], [9, 8],
  [7, 15], [8, 15], [9, 15], [10, 15],
  [10, 3], [10, 4], [10, 5], [10, 6],
  [10, 10], [10, 11], [10, 12],
  [12, 2], [12, 3], [12, 4],
  [12, 7], [12, 8], [12, 9],
  [12, 12], [12, 13], [12, 14], [12, 15], [12, 16],
  [3, 17], [4, 17], [5, 17],
  [7, 17], [7, 18],
  [9, 1], [9, 2], [9, 3],
  [11, 1], [11, 2],
  [13, 5], [13, 6], [13, 7],
  [13, 10], [13, 11],
];

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
    col: 1, row: 1,
    x: 1 * TILE + TILE / 2, y: 1 * TILE + TILE / 2,
    targetCol: 1, targetRow: 1,
    moving: false,
    dir: { x: 1, y: 0 },
    speed: 1.5,
    animFrame: 0, animTimer: 0,
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
  const breakingTilesRef = useRef<{ col: number; row: number }[]>([]);
  const plantingTilesRef = useRef<{ col: number; row: number }[]>([]);

  // Keyboard state tracker
  const keysRef = useRef<{ [code: string]: boolean }>({});
  const keysPressTimeRef = useRef<{ [code: string]: number }>({});
  const lastDirRef = useRef<Position | null>(null);
  const turnBlockedRef = useRef<boolean>(false);

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

  // Handle building base map
  const buildBaseMap = (): TileType[][] => {
    const m: TileType[][] = [];
    for (let r = 0; r < ROWS; r++) {
      m.push([]);
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          m[r].push(T_WALL);
        } else {
          m[r].push(T_EMPTY);
        }
      }
    }
    INNER_WALLS.forEach(([r, c]) => {
      if (r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1) {
        m[r][c] = T_WALL;
      }
    });
    return m;
  };

  // Helper positions
  const isWall = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    return mapRef.current[row][col] === T_WALL;
  };

  const isIce = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return mapRef.current[row][col] === T_ICE;
  };

  const isSolid = (col: number, row: number, ghostMode = false, isPlayer = false) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    if (mapRef.current[row][col] === T_WALL) return true;
    if (mapRef.current[row][col] === T_ICE) {
      if (isPlayer && playerRef.current.goldenBroccoliTimer > 0) return false;
      return true;
    }
    return false;
  };

  const isEmpty = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return mapRef.current[row][col] === T_EMPTY;
  };

  const getPowerCount = () => {
    const player = playerRef.current;
    if (player.goldenBroccoliTimer > 0) {
      return 10;
    }
    return Math.min(4, Math.max(1, Math.floor((score + 1) / 2) + 1));
  };

  const findRandomEmptyCell = (): { col: number; row: number } | null => {
    let tries = 0;
    while (tries++ < 500) {
      const c = 1 + Math.floor(Math.random() * (COLS - 2));
      const r = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (mapRef.current[r][c] !== T_EMPTY) continue;
      if (c === playerRef.current.col && r === playerRef.current.row) continue;
      if (fruitsRef.current.some(f => f.col === c && f.row === r)) continue;
      return { col: c, row: r };
    }
    return null;
  };

  const spawnFruitInMap = (type: number) => {
    const pos = findRandomEmptyCell();
    if (pos) {
      fruitsRef.current.push({
        col: pos.col,
        row: pos.row,
        type: type,
        anim: Math.random() * Math.PI * 2,
      });
    }
  };

  const checkGoldenBroccoliSpawn = (currentLives: number) => {
    if (currentLives === 1) {
      const hasGolden = fruitsRef.current.some(f => f.type === 5);
      if (!hasGolden) {
        spawnFruitInMap(5);
      }
    } else {
      // Remove golden broccoli if lives increased
      fruitsRef.current = fruitsRef.current.filter(f => f.type !== 5);
    }
    // Update local react state representation
    const freshCount = fruitsRef.current.filter(f => f.type === (levelPhase === 'tomatoes' ? 3 : 4)).length;
    setFruitsLeft(freshCount);
  };

  const spawnParticles = (col: number, row: number, color: string, dir?: Position, isDirt = false) => {
    const cx = col * TILE + TILE / 2;
    const cy = row * TILE + TILE / 2;

    if (isDirt) {
      // Spawn 4 brown dirt particles jumping from the ground
      for (let i = 0; i < 4; i++) {
        const vx = (Math.random() - 0.5) * 2.5;
        const vy = -1.5 - Math.random() * 2.5; // pop upwards
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 12,
          y: cy + TILE / 3, // start near bottom of the tile
          vx,
          vy,
          life: 25,
          maxLife: 25,
          color,
        });
      }
      return;
    }

    const count = dir ? 8 : 12; // 8 particles for focused cone, 12 for radial
    for (let i = 0; i < count; i++) {
      let vx = 0;
      let vy = 0;

      if (dir) {
        // Focused cone velocity in direction of 'dir' with lateral spread
        const perpX = -dir.y;
        const perpY = dir.x;
        const factor = (Math.random() - 0.5) * 5.0; // spread of ±2.5
        
        vx = dir.x * 4.5 + perpX * factor + (Math.random() - 0.5) * 1.0;
        vy = dir.y * 4.5 + perpY * factor - (Math.random() * 1.5); // slight upward pop
      } else {
        // Original radial uniform
        const angle = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 3.5;
        vx = Math.cos(angle) * spd;
        vy = Math.sin(angle) * spd;
      }

      particlesRef.current.push({
        x: cx,
        y: cy,
        vx,
        vy,
        life: 30,
        maxLife: 30,
        color,
      });
    }
  };

  // Setup/Reset level structures
  const initLevel = (currentLives: number) => {
    mapRef.current = buildBaseMap();
    grassAgesRef.current = {};

    // Initial ice/grass blocks (distributed in free cells)
    const icePositions = [
      [3, 5], [3, 15], [5, 9], [7, 3], [7, 13], [9, 7], [11, 11], [13, 17]
    ];
    icePositions.forEach(([r, c]) => {
      if (mapRef.current[r][c] === T_EMPTY) {
        mapRef.current[r][c] = T_ICE;
        const key = `${r}_${c}`;
        grassAgesRef.current[key] = { createdAt: Date.now() - 5000 };
      }
    });

    // Reset player parameters safely
    playerRef.current = {
      col: 1, row: 1,
      x: 1 * TILE + TILE / 2, y: 1 * TILE + TILE / 2,
      targetCol: 1, targetRow: 1,
      moving: false,
      dir: { x: 1, y: 0 },
      speed: 1.5, // Calibrated speed for comfortable, delay-free tapping
      animFrame: 0, animTimer: 0,
      invincible: 60, // 1 sec protection on load
      goldenBroccoliTimer: 0,
      powerCooldown: 0,
      plantingAnimTimer: 0,
      breakingAnimTimer: 0,
      deathAnimTimer: 0,
    };

    // Spawn core fruits (5 tomatoes initially)
    fruitsRef.current = [];
    setLevelPhase('tomatoes');
    for (let i = 0; i < 5; i++) {
      spawnFruitInMap(3);
    }
    checkGoldenBroccoliSpawn(currentLives);

    // Load Enemies
    enemiesRef.current = [
      {
        id: '1', type: 'patrol',
        col: 18, row: 13,
        x: 18 * TILE + TILE / 2, y: 13 * TILE + TILE / 2,
        targetCol: 18, targetRow: 13,
        moving: false,
        dir: { x: 0, y: -1 },
        speed: 0.7,
        chaseTimer: 1,
        animFrame: 0, animTimer: 0,
      },
      {
        id: '2', type: 'patrol',
        col: 18, row: 1,
        x: 18 * TILE + TILE / 2, y: 1 * TILE + TILE / 2,
        targetCol: 18, targetRow: 1,
        moving: false,
        dir: { x: -1, y: 0 },
        speed: 0.7,
        chaseTimer: 1,
        animFrame: 0, animTimer: 0,
      },
      {
        id: '3', type: 'chaser',
        col: 10, row: 13,
        x: 10 * TILE + TILE / 2, y: 13 * TILE + TILE / 2,
        targetCol: 10, targetRow: 13,
        moving: false,
        dir: { x: -1, y: 0 },
        speed: 0.9,
        chaseTimer: 1,
        animFrame: 0, animTimer: 0,
      },
      {
        id: '4', type: 'ghost',
        col: 1, row: 13,
        x: 1 * TILE + TILE / 2, y: 13 * TILE + TILE / 2,
        targetCol: 1, targetRow: 13,
        moving: false,
        dir: { x: 0, y: -1 },
        speed: 0.6,
        chaseTimer: 1,
        animFrame: 0, animTimer: 0,
      },
    ];

    particlesRef.current = [];
    prevMapRef.current = mapRef.current.map(r => [...r]);

    // Force synchronization of fruits Left React State representation
    const freshCount = fruitsRef.current.filter(f => f.type === 3).length;
    setFruitsLeft(freshCount);
    setGoldenBroccoliTimer(0);
  };

  // Handle layout loading and reset trigger bounds
  useEffect(() => {
    initLevel(lives);
    keysRef.current = {};
    lastDirRef.current = null;
  }, [resetTrigger]);

  // Construct and break grass blocks (ice logic restructured to be fast/error-free)
  const useIcePower = (action: 'create' | 'break') => {
    const player = playerRef.current;
    if (player.powerCooldown > 0) return;
    if (player.moving) return; // Prevent bugs mid-motion

    const dir = player.dir;
    const powerCount = getPowerCount();

    const firstCc = player.col + dir.x;
    const firstCr = player.row + dir.y;

    if (firstCc <= 0 || firstCc >= COLS - 1 || firstCr <= 0 || firstCr >= ROWS - 1) return;
    if (isWall(firstCc, firstCr)) return;

    let currentCc = firstCc;
    let currentCr = firstCr;
    let actionExecuted = false;

    if (action === 'break') {
      breakingTilesRef.current = [];
      for (let i = 0; i < powerCount; i++) {
        if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;
        if (isWall(currentCc, currentCr)) break;

        if (isIce(currentCc, currentCr)) {
          breakingTilesRef.current.push({ col: currentCc, row: currentCr });
          actionExecuted = true;
        } else {
          break; // Stop immediately upon meeting space / gaps
        }
        currentCc += dir.x;
        currentCr += dir.y;
      }
      if (actionExecuted) {
        player.powerCooldown = 80; // 1.33s cooldown (scaled for 54 frames)
        player.breakingAnimTimer = 54; // 54 frames of break animation
      }
    } else if (action === 'create') {
      plantingTilesRef.current = [];
      for (let i = 0; i < powerCount; i++) {
        if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;

        const hasPlayer = (player.col === currentCc && player.row === currentCr) ||
          (player.targetCol === currentCc && player.targetRow === currentCr);
        
        const enemyAtCurrent = enemiesRef.current.some(e => 
          (e.col === currentCc && e.row === currentCr) ||
          (e.targetCol === currentCc && e.targetRow === currentCr)
        );

        // Check blockage
        if (isWall(currentCc, currentCr) || isIce(currentCc, currentCr) || hasPlayer || enemyAtCurrent) {
          break;
        }

        const nextCc = currentCc + dir.x;
        const nextCr = currentCr + dir.y;
        const enemyAtNext = enemiesRef.current.some(e => 
          (e.col === nextCc && e.row === nextCr) ||
          (e.targetCol === nextCc && e.targetRow === nextCr)
        );

        if (isEmpty(currentCc, currentCr)) {
          plantingTilesRef.current.push({ col: currentCc, row: currentCr });
          actionExecuted = true;
        }

        if (enemyAtNext) {
          break;
        }

        currentCc += dir.x;
        currentCr += dir.y;
      }
      if (actionExecuted) {
        player.powerCooldown = 90; // 1.5s cooldown (scaled for 54 frames)
        player.plantingAnimTimer = 54; // 54 ticks duration for planting animation
      }
    }
  };

  // Unified context-aware action trigger (Space/F/Shift/C all call this)
  const triggerAction = () => {
    const player = playerRef.current;
    if (player.powerCooldown > 0) return;
    if (player.moving) return; // Prevent bugs mid-motion
    if (player.deathAnimTimer > 0) return;

    const dir = player.dir;
    const targetCol = player.col + dir.x;
    const targetRow = player.row + dir.y;

    if (targetCol <= 0 || targetCol >= COLS - 1 || targetRow <= 0 || targetRow >= ROWS - 1) return;
    if (isWall(targetCol, targetRow)) return;

    if (isIce(targetCol, targetRow)) {
      useIcePower('break');
    } else if (isEmpty(targetCol, targetRow)) {
      useIcePower('create');
    }
  };

  // Keyboard Input Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      const code = e.code;
      const prev = keysRef.current[code];
      keysRef.current[code] = true;

      // Lock diagonal movements
      if (!prev) {
        keysPressTimeRef.current[code] = Date.now();
        let newDir: Position | null = null;
        if (['ArrowUp', 'KeyW'].includes(code)) newDir = { x: 0, y: -1 };
        else if (['ArrowDown', 'KeyS'].includes(code)) newDir = { x: 0, y: 1 };
        else if (['ArrowLeft', 'KeyA'].includes(code)) newDir = { x: -1, y: 0 };
        else if (['ArrowRight', 'KeyD'].includes(code)) newDir = { x: 1, y: 0 };

        if (newDir) {
          const player = playerRef.current;
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

      // Action Keys: Space performs context-aware actions
      if (['Space'].includes(code)) {
        e.preventDefault();
        triggerAction();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;

      // Recalculate last direction with actively pressed keys
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
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, score, levelPhase]);

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
    } else if (virtualCommand === 'BUILD' || virtualCommand === 'BREAK') {
      triggerAction();
    }

    clearVirtualCommand();
  }, [virtualCommand, gameState, score, levelPhase]);

  // Collisions and Fruit gathering triggers
  const checkFruitPickup = () => {
    const player = playerRef.current;
    const currentFruits = fruitsRef.current;

    const idx = currentFruits.findIndex(f => f.col === player.col && f.row === player.row);
    if (idx !== -1) {
      const pickedType = currentFruits[idx].type;
      currentFruits.splice(idx, 1);

      if (pickedType === 5) {
        // Golden Broccoli power up consumed!
        player.goldenBroccoliTimer = 600; // 10 seconds of grass-piercing glory
        setGoldenBroccoliTimer(10);
        SoundEffects.playPowerUp();
        spawnParticles(player.col, player.row, '#ffd700');
      } else {
        // Safe standard fruits
        setScore(prev => prev + 1);
        SoundEffects.playCollect();
        spawnParticles(player.col, player.row, '#ffffff');
      }

      // Check state advancement
      const targetFruitsCount = currentFruits.filter(f => f.type === (levelPhase === 'tomatoes' ? 3 : 4)).length;
      setFruitsLeft(targetFruitsCount);

      if (targetFruitsCount === 0) {
        if (levelPhase === 'tomatoes') {
          // Switch to Carrots phase
          setLevelPhase('carrots');
          fruitsRef.current = fruitsRef.current.filter(f => f.type !== 5); // Flush active golden broccoli
          // Spawn carrots
          for (let i = 0; i < 5; i++) {
            spawnFruitInMap(4);
          }
          checkGoldenBroccoliSpawn(lives);
        } else {
          // All phases complete! Victory
          setGameState('win');
          SoundEffects.playVictory();
        }
      }
    }
  };

  // Perform BFS pathfinding search for smart enemy targeting
  const findChaseDirection = (e: Enemy, ghostMode: boolean): Position => {
    const startC = e.col;
    const startR = e.row;
    const goalC = playerRef.current.col;
    const goalR = playerRef.current.row;

    if (startC === goalC && startR === goalR) return e.dir;

    const DIRS = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    // standard Grid representation tracking parents for reconstructing paths
    const visited: ({ fromC: number; fromR: number } | null)[][] = Array.from(
      { length: ROWS },
      () => new Array(COLS).fill(null)
    );

    visited[startR][startC] = { fromC: -1, fromR: -1 };
    const queue: { c: number; r: number }[] = [{ c: startC, r: startR }];
    let found = false;

    bfsLoop: while (queue.length > 0) {
      const { c, r } = queue.shift()!;
      for (const d of DIRS) {
        const nc = c + d.x;
        const nr = r + d.y;

        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (visited[nr][nc] !== null) continue;
        if (isSolid(nc, nr, ghostMode)) continue;

        visited[nr][nc] = { fromC: c, fromR: r };
        if (nc === goalC && nr === goalR) {
          found = true;
          break bfsLoop;
        }
        queue.push({ c: nc, r: nr });
      }
    }

    if (!found) {
      // Greedy fallback path search
      const fallback = DIRS.filter(d => !isSolid(e.col + d.x, e.row + d.y, ghostMode));
      fallback.sort((a, b) => {
        const da = Math.abs((e.col + a.x) - goalC) + Math.abs((e.row + a.y) - goalR);
        const db = Math.abs((e.col + b.x) - goalC) + Math.abs((e.row + b.y) - goalR);
        return da - db;
      });
      return fallback[0] || e.dir;
    }

    // Reconstruct backwards to extract first movement step
    let c = goalC;
    let r = goalR;
    while (true) {
      const parent = visited[r][c];
      if (!parent) break;
      if (parent.fromC === startC && parent.fromR === startR) {
        return { x: c - startC, y: r - startR };
      }
      c = parent.fromC;
      r = parent.fromR;
    }

    return e.dir;
  };

  // Perform responsive grid updates and entity loops
  const updatePlayer = () => {
    const player = playerRef.current;
    if (player.invincible > 0) player.invincible--;

    if (player.goldenBroccoliTimer > 0) {
      player.goldenBroccoliTimer--;
      setGoldenBroccoliTimer(Math.ceil(player.goldenBroccoliTimer / 60));
    } else {
      setGoldenBroccoliTimer(0);
    }

    if (player.powerCooldown > 0) player.powerCooldown--;
    if (player.plantingAnimTimer > 0) player.plantingAnimTimer--;
    if (player.breakingAnimTimer > 0) player.breakingAnimTimer--;

    if (turnBlockedRef.current) {
      // Evaluate if user is holding down the key in player.dir for > 100ms
      let isHoldingDir = false;
      const now = Date.now();
      if (player.dir.x === 0 && player.dir.y === -1) {
        isHoldingDir = (keysRef.current['ArrowUp'] && (now - (keysPressTimeRef.current['ArrowUp'] || 0) > 100)) ||
                       (keysRef.current['KeyW'] && (now - (keysPressTimeRef.current['KeyW'] || 0) > 100));
      } else if (player.dir.x === 0 && player.dir.y === 1) {
        isHoldingDir = (keysRef.current['ArrowDown'] && (now - (keysPressTimeRef.current['ArrowDown'] || 0) > 100)) ||
                       (keysRef.current['KeyS'] && (now - (keysPressTimeRef.current['KeyS'] || 0) > 100));
      } else if (player.dir.x === -1 && player.dir.y === 0) {
        isHoldingDir = (keysRef.current['ArrowLeft'] && (now - (keysPressTimeRef.current['ArrowLeft'] || 0) > 100)) ||
                       (keysRef.current['KeyA'] && (now - (keysPressTimeRef.current['KeyA'] || 0) > 100));
      } else if (player.dir.x === 1 && player.dir.y === 0) {
        isHoldingDir = (keysRef.current['ArrowRight'] && (now - (keysPressTimeRef.current['ArrowRight'] || 0) > 100)) ||
                       (keysRef.current['KeyD'] && (now - (keysPressTimeRef.current['KeyD'] || 0) > 100));
      }

      if (isHoldingDir) {
        turnBlockedRef.current = false;
      }
    }

    if (!player.moving) {
      if (!turnBlockedRef.current) {
        // Pick current direction requested
        let dir = lastDirRef.current;
        if (lastDirRef.current) {
          // Clear simulated virtual direction so virtual buttons move exactly one tile
          lastDirRef.current = null;
        } else {
          if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) dir = { x: 0, y: -1 };
          else if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) dir = { x: 0, y: 1 };
          else if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) dir = { x: -1, y: 0 };
          else if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) dir = { x: 1, y: 0 };
        }

        if (dir) {
          player.dir = dir;
          const nc = player.col + dir.x;
          const nr = player.row + dir.y;
          if (!isSolid(nc, nr, false, true)) {
            player.targetCol = nc;
            player.targetRow = nr;
            player.moving = true;
          }
        }
      }
    }

    const hasMovementKey = keysRef.current['ArrowUp'] || keysRef.current['KeyW'] ||
                           keysRef.current['ArrowDown'] || keysRef.current['KeyS'] ||
                           keysRef.current['ArrowLeft'] || keysRef.current['KeyA'] ||
                           keysRef.current['ArrowRight'] || keysRef.current['KeyD'];
    if (!hasMovementKey) {
      turnBlockedRef.current = false;
    }

    // Move center coordinates smoothly toward targeted cell
    if (player.moving) {
      if (mapRef.current[player.targetRow][player.targetCol] === T_ICE && !(player.goldenBroccoliTimer > 0)) {
        player.moving = false;
        player.targetCol = player.col;
        player.targetRow = player.row;
      } else {
        const tx = player.targetCol * TILE + TILE / 2;
        const ty = player.targetRow * TILE + TILE / 2;
        const dx = tx - player.x;
        const dy = ty - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= player.speed) {
          player.x = tx;
          player.y = ty;
          player.col = player.targetCol;
          player.row = player.targetRow;
          player.moving = false;

          checkFruitPickup();
        } else {
          player.x += (dx / dist) * player.speed;
          player.y += (dy / dist) * player.speed;
        }
      }
    }

    // Animate sprite frames
    player.animTimer++;
    if (player.animTimer > 8) {
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % 4;
    }
  };

  const updateEnemy = (e: Enemy) => {
    const ghost = e.type === 'ghost';

    if (!e.moving) {
      e.chaseTimer--;
      let newDir;

      if (e.chaseTimer <= 0) {
        newDir = findChaseDirection(e, ghost);
        if (e.type === 'patrol') {
          e.chaseTimer = 4 + Math.floor(Math.random() * 4);
        } else if (e.type === 'chaser') {
          e.chaseTimer = 1;
        } else {
          e.chaseTimer = 3;
        }
      } else {
        newDir = e.dir;
      }

      const nc0 = e.col + newDir.x;
      const nr0 = e.row + newDir.y;
      if (isSolid(nc0, nr0, ghost)) {
        newDir = findChaseDirection(e, ghost);
        e.chaseTimer = 1;
      }

      e.dir = newDir;
      const nc = e.col + newDir.x;
      const nr = e.row + newDir.y;

      if (!isSolid(nc, nr, ghost)) {
        e.targetCol = nc;
        e.targetRow = nr;
        e.moving = true;
      }
    }

    if (e.moving) {
      if (mapRef.current[e.targetRow][e.targetCol] === T_ICE) {
        e.moving = false;
        e.targetCol = e.col;
        e.targetRow = e.row;
        e.chaseTimer = 0; // force findChaseDirection on next tick
      } else {
        const tx = e.targetCol * TILE + TILE / 2;
        const ty = e.targetRow * TILE + TILE / 2;
        const dx = tx - e.x;
        const dy = ty - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= e.speed) {
          e.x = tx;
          e.y = ty;
          e.col = e.targetCol;
          e.row = e.targetRow;
          e.moving = false;
        } else {
          e.x += (dx / dist) * e.speed;
          e.y += (dy / dist) * e.speed;
        }
      }
    }

    e.animTimer++;
    if (e.animTimer > 9) {
      e.animTimer = 0;
      e.animFrame = (e.animFrame + 1) % 4;
    }
  };

  const checkCollisions = () => {
    const player = playerRef.current;
    if (player.invincible > 0 || player.deathAnimTimer > 0) return;

    for (const e of enemiesRef.current) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TILE * 0.72) {
        // Trigger arcade death sequence!
        SoundEffects.playHurt();
        player.deathAnimTimer = 75; // 75 frames (1.25s) of cartoon shock, shell refuge, and fall-out
        return;
      }
    }
  };

  const respawnEntities = () => {
    const player = playerRef.current;
    player.col = 1;
    player.row = 1;
    player.x = 1 * TILE + TILE / 2;
    player.y = 1 * TILE + TILE / 2;
    player.targetCol = 1;
    player.targetRow = 1;
    player.moving = false;

    if (enemiesRef.current.length >= 4) {
      const e0 = enemiesRef.current[0];
      e0.col = 18; e0.row = 13; e0.x = 18 * TILE + TILE / 2; e0.y = 13 * TILE + TILE / 2;
      e0.moving = false; e0.chaseTimer = 1;

      const e1 = enemiesRef.current[1];
      e1.col = 18; e1.row = 1; e1.x = 18 * TILE + TILE / 2; e1.y = 1 * TILE + TILE / 2;
      e1.moving = false; e1.chaseTimer = 1;

      const e2 = enemiesRef.current[2];
      e2.col = 10; e2.row = 13; e2.x = 10 * TILE + TILE / 2; e2.y = 13 * TILE + TILE / 2;
      e2.moving = false; e2.chaseTimer = 1;

      const e3 = enemiesRef.current[3];
      e3.col = 1; e3.row = 13; e3.x = 1 * TILE + TILE / 2; e3.y = 13 * TILE + TILE / 2;
      e3.moving = false; e3.chaseTimer = 1;
    }
  };

  const detectMapChanges = () => {
    if (!prevMapRef.current) {
      prevMapRef.current = mapRef.current.map(r => [...r]);
      return;
    }
    const player = playerRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (prevMapRef.current[r][c] !== mapRef.current[r][c]) {
          if (mapRef.current[r][c] === T_ICE) {
            // Only spawn radial green particles for other map changes (e.g. initLevel)
            if (player.plantingAnimTimer === 0) {
              spawnParticles(c, r, '#4caf50'); // vibrant leaf green grow particles
            }
          } else if (prevMapRef.current[r][c] === T_ICE) {
            // Only spawn radial green particles for non-player break changes
            if (player.breakingAnimTimer === 0) {
              spawnParticles(c, r, '#4caf50');
              spawnParticles(c, r, '#2e7d32');
            }
          }
        }
      }
    }
    prevMapRef.current = mapRef.current.map(r => [...r]);
  };

  // Canvas Vector Drawing Helpers (Aesthetic details fully refined)
  const drawMap = (ctx: CanvasRenderingContext2D) => {
    ctx.shadowBlur = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let x = c * TILE;
        const y = r * TILE;
        const t = mapRef.current[r][c];

        if (t === T_WALL) {
          // ==========================================
          // 1. 2.5D BONE-WHITE GARDEN STONE WALLS (#CAC6C7)
          // ==========================================

          // First draw standard ground dirt base underneath to eliminate ANY black holes!
          ctx.fillStyle = '#C78757';
          ctx.fillRect(x, y, TILE, TILE);

          // Draw subtle earth details under the block
          ctx.fillStyle = 'rgba(145, 95, 55, 0.22)';
          ctx.fillRect(x, y, 4, 4);
          ctx.fillRect(x + TILE - 4, y, 4, 4);
          ctx.fillRect(x, y + TILE - 4, 4, 4);
          ctx.fillRect(x + TILE - 4, y + TILE - 4, 4, 4);

          // A. Soft Drop Shadow projected down-right onto dirt floor (40% opacity)
          ctx.fillStyle = 'rgba(32, 19, 10, 0.40)';
          ctx.fillRect(x + 5, y + 5, TILE, TILE);

          // B. Draw 3D Stone Block occupying the full tile
          const topH = 14; // 14 px sunlit flat top face
          const frontH = TILE - topH; // 26 px shaded front face

          // 1. Draw Top Face (sunlit flat stone bricks)
          ctx.fillStyle = '#F5F1F2'; // Sunlit bone-white
          ctx.fillRect(x, y, TILE, topH);

          // Staggered vertical brick joints on top face
          ctx.strokeStyle = '#CAC6C7';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(x + 13, y); ctx.lineTo(x + 13, y + topH);
          ctx.moveTo(x + 27, y); ctx.lineTo(x + 27, y + topH);
          ctx.stroke();

          // Horizontal brick dividing joint
          ctx.beginPath();
          ctx.moveTo(x, y + 7); ctx.lineTo(x + TILE, y + 7);
          ctx.stroke();

          // 2. Draw Front Face (shaded vertical stone brick walls)
          // Row 1 of front bricks
          ctx.fillStyle = '#CAC6C7'; // Base shaded bone-white
          ctx.fillRect(x, y + topH, TILE, 13);

          // Row 2 of front bricks (darker bottom row shadow)
          ctx.fillStyle = '#A5A1A2';
          ctx.fillRect(x, y + topH + 13, TILE, 13);

          // Vertical joints between front bricks (staggered pattern)
          ctx.strokeStyle = '#5C5859';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          // Row 1 joints
          ctx.moveTo(x + 13, y + topH); ctx.lineTo(x + 13, y + topH + 13);
          ctx.moveTo(x + 27, y + topH); ctx.lineTo(x + 27, y + topH + 13);
          // Row 2 joint (centered staggered)
          ctx.moveTo(x + 20, y + topH + 13); ctx.lineTo(x + 20, y + TILE);
          ctx.stroke();

          // Horizontal mortar joint dividing Row 1 and Row 2
          ctx.beginPath();
          ctx.moveTo(x, y + topH + 13); ctx.lineTo(x + TILE, y + topH + 13);
          ctx.stroke();

          // 3. Add realistic weathered stone cracks and chip highlights
          ctx.strokeStyle = '#4A4647'; // dark crack color
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + 8, y + topH + 4);
          ctx.lineTo(x + 11, y + topH + 8);
          ctx.lineTo(x + 9, y + topH + 12);
          ctx.stroke();

          // Highlights on brick row edges to add carved relief
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + 1, y + topH + 1, TILE - 2, 0.8);
          ctx.fillRect(x + 1, y + topH + 14, TILE - 2, 0.8);

          // Micro-dot porosity texturing for stone organic feel
          ctx.fillStyle = '#F5F1F2'; // light grains
          ctx.fillRect(x + 6, y + topH + 8, 1, 1);
          ctx.fillRect(x + 32, y + topH + 18, 1, 1);
          ctx.fillStyle = '#7C7879'; // dark grains
          ctx.fillRect(x + 18, y + topH + 5, 1, 1);
          ctx.fillRect(x + 25, y + topH + 20, 1, 1);

          // Bevel separator crisp highlight line separating top and front
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x, y + topH);
          ctx.lineTo(x + TILE, y + topH);
          ctx.stroke();

          // Solid dark outline for the whole brick block
          ctx.strokeStyle = '#2B2728';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, TILE, TILE);
        } else if (t === T_ICE) {
          // ==========================================
          // 2. LUSH ORGANIC 2.5D CONNECTED SHRUB HEDGES (PASTO/HIERBA)
          // ==========================================

          const isShaking = breakingTilesRef.current.some(tile => tile.col === c && tile.row === r) && playerRef.current.breakingAnimTimer >= 13;
          if (isShaking) {
            x += Math.sin(Date.now() * 0.09) * 3.5;
          }

          const key = `${r}_${c}`;
          const record = grassAgesRef.current[key];
          const ageMs = record ? Date.now() - record.createdAt : 1000;

          // Check adjacent tiles of the same type to support autotiling (Defined first to avoid ReferenceError!)
          const isNeighborGrass = (nc: number, nr: number) => {
            if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
            return mapRef.current[nr][nc] === T_ICE;
          };
          const hasUp = isNeighborGrass(c, r - 1);
          const hasDown = isNeighborGrass(c, r + 1);
          const hasLeft = isNeighborGrass(c - 1, r);
          const hasRight = isNeighborGrass(c + 1, r);

          // FIX 1: Extender el dirt base 1px hacia vecinos del mismo tipo
          // Esto elimina el gap negro de 1px entre tiles adyacentes
          ctx.fillStyle = '#C78757';
          const dL = hasLeft ? -1 : 0;
          const dT = hasUp ? -1 : 0;
          const dR = hasRight ? 1 : 0;
          const dB = hasDown ? 1 : 0;
          ctx.fillRect(x + dL, y + dT, TILE - dL + dR, TILE - dT + dB);

          // Grow animation with bouncy elastic spring overshoot effect
          let growProgress = 1.0;
          if (ageMs < 250) {
            const tNorm = ageMs / 250;
            // Bouncy spring equation: f(t) = -((t-1)^2) * (t-1.25) + 1
            growProgress = -Math.pow(tNorm - 1, 2) * (tNorm - 1.25) + 1;
            growProgress = Math.max(0, Math.min(1.1, growProgress));
          }

          // Deterministic hash based on grid coordinate for layout variations
          const hashVal = Math.abs(Math.sin(r * 12.9898 + c * 78.233)) * 43758.5453;
          const variant = Math.floor(hashVal % 3);

          // A. Organic base shadow projected onto the earth
          if (!hasDown) {
            ctx.fillStyle = 'rgba(32, 19, 10, 0.48)';
            // Rounded shadow beneath the bottom of the shrub hedge
            ctx.beginPath();
            ctx.ellipse(x + TILE / 2, y + TILE + 2, TILE * 0.55, 4, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.save();
          ctx.translate(x + TILE / 2, y + TILE / 2);
          ctx.scale(growProgress, growProgress);
          ctx.translate(-(x + TILE / 2), -(y + TILE / 2));

          // Set up colors based on variant to break monotony and add depth
          // Adjusted original palettes: lightened and softened to be more fresh lettuce-green.
          let colDark = '#1c472d'; // softened original dark foliage
          let colMid = '#2b7835';  // softened original forest base
          let colLight = '#5ec263'; // softened original bright green highlights
          let colWarm = '#94db97'; // softened original sunlit neon tips
          let colLeafGlint = '#b4f07a'; // softened original neon warm leaf glint

          if (variant === 1) {
            colDark = '#1a3e26';
            colMid = '#328543';
            colLight = '#7ccc81';
            colWarm = '#acf2ad';
            colLeafGlint = '#daf7a6';
          } else if (variant === 2) {
            colDark = '#133317';
            colMid = '#24632b';
            colLight = '#439c48';
            colWarm = '#7cd181';
            colLeafGlint = '#9be69e';
          }

          // Base fill con padding para no tocar los bordes exactos del tile
          ctx.fillStyle = colDark;
          // Connect seamless fills with neighbors (extended by 1px to prevent any subpixel anti-aliasing gaps!)
          const padL = hasLeft ? -1 : 2;
          const padR = hasRight ? -1 : 2;
          const padT = hasUp ? -1 : 2;
          const padB = hasDown ? -1 : 2;
          ctx.fillRect(x + padL, y + padT, TILE - padL - padR, TILE - padT - padB);

          // FIX 2 + FIX 3: Bordes autotile dibujados 1px hacia ADENTRO del tile
          // con opacidad reducida para eliminar el efecto de marco duro
          ctx.strokeStyle = 'rgba(5, 20, 8, 0.55)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          if (!hasUp) {
            ctx.moveTo(x + (hasLeft ? 0 : 3), y + 1);
            ctx.lineTo(x + TILE - (hasRight ? 0 : 3), y + 1);
          }
          if (!hasDown) {
            ctx.moveTo(x + (hasLeft ? 0 : 3), y + TILE - 1);
            ctx.lineTo(x + TILE - (hasRight ? 0 : 3), y + TILE - 1);
          }
          if (!hasLeft) {
            ctx.moveTo(x + 1, y + (hasUp ? 0 : 3));
            ctx.lineTo(x + 1, y + TILE - (hasDown ? 0 : 3));
          }
          if (!hasRight) {
            ctx.moveTo(x + TILE - 1, y + (hasUp ? 0 : 3));
            ctx.lineTo(x + TILE - 1, y + TILE - (hasDown ? 0 : 3));
          }
          ctx.stroke();

          // Helper to draw leaf circles that can jut out past the standard grid boundaries
          const drawLeaf = (cx: number, cy: number, rSize: number, fillCol: string, outlineCol: string) => {
            ctx.fillStyle = fillCol;
            ctx.beginPath();
            ctx.arc(cx, cy, rSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw subtle bottom outline for leaf depth
            ctx.strokeStyle = outlineCol;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(cx, cy, rSize, 0, Math.PI);
            ctx.stroke();
          };

          // Draw interior branches (visible in small gaps)
          ctx.strokeStyle = '#4a2e19'; // dark rustic wood brown
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          if (variant === 0) {
            ctx.moveTo(x + 10, y + 25);
            ctx.quadraticCurveTo(x + 18, y + 16, x + 25, y + 22);
          } else if (variant === 1) {
            ctx.moveTo(x + 30, y + 12);
            ctx.quadraticCurveTo(x + 22, y + 20, x + 15, y + 15);
          } else {
            ctx.moveTo(x + 12, y + 12);
            ctx.lineTo(x + 28, y + 28);
          }
          ctx.stroke();

          // Draw dense organic leaf layers with shading (cenital lighting: top light, bottom dark)
          // 1. Dark bottom foliage base layer
          drawLeaf(x + 10, y + 28, 7.5, colDark, '#051408');
          drawLeaf(x + TILE - 10, y + 28, 7.5, colDark, '#051408');
          drawLeaf(x + 20, y + 30, 8.0, colDark, '#051408');

          // 2. Middle green foliage layer
          drawLeaf(x + 8, y + 20, 7.0, colMid, colDark);
          drawLeaf(x + TILE - 8, y + 20, 7.0, colMid, colDark);
          drawLeaf(x + 20, y + 22, 7.5, colMid, colDark);

          // 3. Bright light foliage layer (closer to top)
          drawLeaf(x + 10, y + 12, 6.5, colLight, colMid);
          drawLeaf(x + TILE - 10, y + 12, 6.5, colLight, colMid);
          drawLeaf(x + 20, y + 13, 7.0, colLight, colMid);

          // 4. Hot direct sunlit top tips layer
          drawLeaf(x + 12, y + 6, 5.0, colWarm, colLight);
          drawLeaf(x + TILE - 12, y + 6, 5.0, colWarm, colLight);
          drawLeaf(x + 20, y + 7, 5.5, colWarm, colLight);

          // 5. Warm pixel yellow-green highlights (cenital glint)
          drawLeaf(x + 14, y + 3, 3.5, colLeafGlint, colWarm);
          drawLeaf(x + TILE - 14, y + 3, 3.5, colLeafGlint, colWarm);
          drawLeaf(x + 20, y + 4, 4.0, colLeafGlint, colWarm);

          // B. Leaves that BREAK the rigidity of the square (Jutting out of boundaries!)
          if (!hasLeft) {
            // Draw overlapping leaves sticking out left
            drawLeaf(x - 2, y + 14, 4.5, colMid, colDark);
            drawLeaf(x - 3, y + 22, 5.0, colDark, '#051408');
            drawLeaf(x - 1, y + 8, 4.0, colLight, colMid);
          }
          if (!hasRight) {
            // Draw overlapping leaves sticking out right
            drawLeaf(x + TILE + 2, y + 14, 4.5, colMid, colDark);
            drawLeaf(x + TILE + 3, y + 22, 5.0, colDark, '#051408');
            drawLeaf(x + TILE + 1, y + 8, 4.0, colLight, colMid);
          }
          if (!hasUp) {
            // Draw overlapping leaves sticking out top
            drawLeaf(x + 12, y - 2, 4.5, colLeafGlint, colWarm);
            drawLeaf(x + 28, y - 2, 4.2, colWarm, colLight);
            drawLeaf(x + 20, y - 3, 5.0, colLeafGlint, colWarm);
          }
          if (!hasDown) {
            // Draw leaves sticking out bottom
            drawLeaf(x + 12, y + TILE - 1, 4.5, colDark, '#051408');
            drawLeaf(x + 28, y + TILE - 1, 4.5, colDark, '#051408');
          }

          // C. Cute wild flowers (Variant 0: Pink/Yellow flower, Variant 1: Orange/White flower, Variant 2: deep foliage only)
          if (variant === 0) {
            const fx = x + 15, fy = y + 14;
            ctx.fillStyle = '#ff3366'; // Gorgeous glowing pink
            ctx.beginPath(); ctx.arc(fx, fy, 3.0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffcc00'; // Yellow center
            ctx.beginPath(); ctx.arc(fx, fy, 1.0, 0, Math.PI * 2); ctx.fill();
          } else if (variant === 1) {
            const fx = x + TILE - 15, fy = y + 16;
            ctx.fillStyle = '#ff6600'; // Hot vibrant orange
            ctx.beginPath(); ctx.arc(fx, fy, 3.0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; // White center
            ctx.beginPath(); ctx.arc(fx, fy, 1.0, 0, Math.PI * 2); ctx.fill();
          }

          ctx.restore();

        } else {
          // ==========================================
          // 3. SEAMLESS EARTHEN GARDEN GROUND (EMPTY)
          // ==========================================

          // Organic Light Brown Earth (#C78757)
          ctx.fillStyle = '#C78757';
          ctx.fillRect(x, y, TILE, TILE);

          // Soften the grid: make it almost invisible, giving a seamless seamless ground
          ctx.strokeStyle = 'rgba(150, 95, 55, 0.06)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(x, y, TILE, TILE);

          // Shadow/dirt corner accumulations to organically suggest depth
          ctx.fillStyle = 'rgba(145, 95, 55, 0.22)';
          ctx.fillRect(x, y, 4, 4);
          ctx.fillRect(x + TILE - 4, y, 4, 4);
          ctx.fillRect(x, y + TILE - 4, 4, 4);
          ctx.fillRect(x + TILE - 4, y + TILE - 4, 4, 4);

          // Deterministic hash value for organic decorations
          const hashVal = Math.abs(Math.sin(r * 12.9898 + c * 78.233)) * 43758.5453;

          // Sand grains / Porosity spots (light and dark micro-dots)
          ctx.fillStyle = 'rgba(110, 65, 30, 0.35)'; // dark porous dots
          ctx.fillRect(x + 4 + (hashVal % 6), y + 6 + ((hashVal * 3) % 8), 1.2, 1.2);
          ctx.fillRect(x + 22 + (hashVal % 10), y + 14 + ((hashVal * 5) % 12), 1.0, 1.0);
          ctx.fillRect(x + 12 + (hashVal % 8), y + 26 + ((hashVal * 7) % 10), 1.2, 1.2);

          ctx.fillStyle = '#deb089'; // light shiny grains
          ctx.fillRect(x + 8 + (hashVal % 12), y + 18 + ((hashVal * 11) % 6), 1.0, 1.0);
          ctx.fillRect(x + 28 + (hashVal % 6), y + 22 + ((hashVal * 13) % 8), 1.2, 1.2);

          // Occasional gray Pebbles (10% of tiles)
          if (hashVal % 10 < 1.0) {
            const px = x + 8 + (hashVal % 24);
            const py = y + 8 + ((hashVal * 7) % 24);
            ctx.fillStyle = '#9e9a96';
            ctx.strokeStyle = '#6e6a66';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + 4, py - 2);
            ctx.lineTo(px + 6, py + 2);
            ctx.lineTo(px + 2, py + 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          // Occasional dry Twigs (10% of tiles)
          if (hashVal % 10 > 9.0) {
            const tx = x + 10 + (hashVal % 20);
            const ty = y + 10 + ((hashVal * 13) % 20);
            ctx.strokeStyle = '#7c5230';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 6, ty + 4);
            ctx.moveTo(tx + 3, ty + 2);
            ctx.lineTo(tx + 2, ty + 5);
            ctx.stroke();
          }

          // Stepped-on mud footprint marks (24% of tiles)
          if (hashVal % 5 < 1.2) {
            const hx = x + 12 + (hashVal % 16);
            const hy = y + 12 + ((hashVal * 3) % 16);
            ctx.fillStyle = 'rgba(142, 92, 52, 0.35)'; // mud depression
            ctx.beginPath();
            ctx.ellipse(hx, hy, 4.5, 2.8, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            // Tiny toe prints
            ctx.beginPath();
            ctx.arc(hx - 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
            ctx.arc(hx + 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  };

  // Helper draws the cute Tortiland turtle character matching the provided pixel-art image
  const drawGardenTurtle = (
    ctx: CanvasRenderingContext2D,
    px: number, py: number,
    dir: Position,
    frame: number,
    t: number,
    isGolden: boolean,
    plantingAnimTimer: number = 0,
    breakingAnimTimer: number = 0,
    deathAnimTimer: number = 0
  ) => {
    ctx.save();

    // Scale factor: turtle is pleasantly robust, tall, and chunky.
    // Increased from 0.44 to 0.58 so Torti fills 70-80% of the tile block for higher visibility.
    let breakScale = 1.0;
    let breakOffsetX = 0;
    let breakOffsetY = 0;
    
    // Death animation properties (shock, hide, roll falling and ghost parpadeo)
    let deathJumpY = 0;
    let deathAngle = 0;
    let deathOpacity = 1.0;
    let isShocked = false;
    let isTuckedDeath = false;

    // Shell transformations (independent of rest of turtle body)
    let shellRotation = 0;
    let shellScaleX = 1.0;
    let shellScaleY = 1.0;

    let limbsScale = 1.0;
    let isNaked = false;
    let localOffsetX = 0;
    let localOffsetY = 0;

    const bob = Math.sin(t * 0.008 + frame) * 1.5;
    let cy = py + bob;

    if (deathAnimTimer > 0) {
      if (deathAnimTimer >= 61) {
        // Fase 1 (ticks 75-61, 15 frames): Shock / Surprise Jump!
        isShocked = true;
        // User math: t = (75 - deathAnimTimer) / 14, dy = -AlturaMaxima * sin(t * PI)
        const tNorm = (75 - deathAnimTimer) / 14;
        deathJumpY = -TILE * 0.9 * Math.sin(tNorm * Math.PI);
      } else if (deathAnimTimer >= 46) {
        // Fase 2 (ticks 60-46, 15 frames): Hide in shell & panic shake!
        isTuckedDeath = true;
        const shakeAngle = Math.sin(t * 0.25) * 0.09;
        ctx.translate(px, cy);
        ctx.rotate(shakeAngle);
        ctx.translate(-px, -cy);
      } else {
        // Fase 3 (ticks 45-1, 45 frames): Shell falling, rolling and ghost fade out!
        isTuckedDeath = true;
        const progress = (45 - deathAnimTimer) / 44;
        deathAngle = progress * Math.PI / 2 + progress * Math.PI * 2; // fall 90 deg + spin 360 deg
        deathOpacity = Math.max(0, 1.0 - progress);
        
        ctx.translate(px, cy);
        ctx.rotate(deathAngle);
        ctx.translate(-px, -cy);
      }
    }

    cy += deathJumpY;
    ctx.globalAlpha = ctx.globalAlpha * deathOpacity;

    if (breakingAnimTimer > 0) {
      if (breakingAnimTimer >= 45) {
        // Fase 1 — Ocultamiento (Ticks 54-45)
        limbsScale = 0;
        isNaked = false;
        breakScale = 0.9;
      } else if (breakingAnimTimer >= 24) {
        // Fase 2 — Lanzamiento e Impacto (Ticks 44-24)
        limbsScale = 1.0;
        isNaked = true;
        isShocked = true;

        let vueloOffset = 0;
        if (breakingAnimTimer >= 36) {
          const tVuelo = (44 - breakingAnimTimer) / 8;
          vueloOffset = tVuelo * TILE;
        } else {
          vueloOffset = TILE;
        }

        localOffsetX = Math.abs(dir.x) * vueloOffset;
        localOffsetY = dir.y * vueloOffset;

        shellRotation = (44 - breakingAnimTimer) * 0.5;

        if (breakingAnimTimer === 36 || breakingAnimTimer === 35) {
          shellScaleX = 0.8;
          shellScaleY = 1.15;
        } else {
          shellScaleX = 1.15;
          shellScaleY = 0.85;
        }
      } else if (breakingAnimTimer >= 12) {
        // Fase 3 — El Regreso (Ticks 23-12)
        limbsScale = 1.0;
        isNaked = true;
        isShocked = true;

        const tReturn = (breakingAnimTimer - 12) / 11;
        const vueloOffset = tReturn * TILE;

        localOffsetX = Math.abs(dir.x) * vueloOffset;
        localOffsetY = dir.y * vueloOffset;

        shellRotation = breakingAnimTimer * 0.25;
      } else {
        // Fase 4 — Reasentamiento (Ticks 11-1)
        limbsScale = 1.0;
        isNaked = false;
        const progress = breakingAnimTimer / 11;
        breakScale = 0.85 + (1 - progress) * 0.15;
      }
    }

    const finalPx = px + breakOffsetX;
    const finalCy = cy + breakOffsetY;

    const s = TILE * 0.58 * breakScale;

    // Draw motion lines during impact frames (ticks 36 and 35 of breakingAnimTimer)
    if (breakingAnimTimer === 36 || breakingAnimTimer === 35) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      const perpX = -dir.y;
      const perpY = dir.x;

      // Draw 3 wind lines along dir
      const offsets = [-12, 0, 12];
      offsets.forEach(off => {
        const startX = finalPx + perpX * off - dir.x * s * 0.2;
        const startY = finalCy + perpY * off - dir.y * s * 0.2;
        const endX = startX + dir.x * TILE * 0.9;
        const endY = startY + dir.y * TILE * 0.9;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      });
      ctx.restore();
    }

    const playerIsMoving = playerRef.current.moving;
    const walkOffset = playerIsMoving ? Math.sin(t * 0.015) * 0.18 : 0;

    // Grounded oval shadow directly under the feet (doesn't bob)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(finalPx, py + s * 0.58, s * 0.68, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Color palettes for the cute Tortiland turtle
    const skinColor = isGolden ? '#ffd43b' : '#8bc34a'; // cute green skin
    const skinShadow = isGolden ? '#f59e0b' : '#689f38';
    const skinOutline = isGolden ? '#5c3e03' : '#2b4f0b';

    const shellBase = isGolden ? '#ff922b' : '#14b8a6'; // turquoise/teal shell
    const shellOutline = isGolden ? '#b53f00' : '#0f766e';
    const shellSpot = isGolden ? '#ffe8cc' : '#f0fdfa';

    const bellyColor = isGolden ? '#fff3bf' : '#ece5c8'; // cream/tan belly
    const bellyOutline = isGolden ? '#e67700' : '#4b3f2f';
    const letterColor = isGolden ? '#d9480f' : '#2d6a4f'; // forest green 'T' or orange 'T'

    const blushColor = '#fb7185'; // bright rosy blush cheeks
    const mouthColor = isGolden ? '#5c3e03' : '#1f3807';

    // Animation frames logic for planting/siembra (snappy 18-frame organic effect)
    const isPlanting = plantingAnimTimer > 0;
    let headOffsetX = 0;
    let headOffsetY = 0;
    let headScale = 1;
    let bodyScaleY = 1;
    let bodyOffsetY = 0;
    let legScaleY = 1;
    let legOffsetY = 0;
    let tailScale = 1.0;

    if (isPlanting) {
      if (plantingAnimTimer >= 45) {
        // Fase 1 — El Hundimiento (Ticks 54-45): Carga (hide partially & lower center of gravity)
        headScale = 0.45;
        headOffsetX = -s * 0.15;
        headOffsetY = s * 0.12;
        bodyScaleY = 0.8;
        bodyOffsetY = s * 0.1;
        legScaleY = 0.5;
        legOffsetY = -s * 0.08;
        tailScale = 0.5;
      } else if (plantingAnimTimer >= 15) {
        // Fase 2 — Lanzamiento (Ticks 44-15): head profile normal, legs will stretch independently
        headScale = 1.0;
        headOffsetX = s * 0.05; // normal profile position
        headOffsetY = 0;
      } else {
        // Fase 3 — Retorno y Limpieza (Ticks 14-1): cabeza oscila en X
        const progress = plantingAnimTimer / 14;
        headOffsetX = Math.sin(t * 0.3) * 3 * progress;
      }
    }

    // Hide limbs completely when tucked in shell during death
    if (isTuckedDeath) {
      headScale = 0;
      tailScale = 0;
      legScaleY = 0;
    }

    // If moving left, flip horizontally around turtle's center point
    if (dir.x < 0) {
      ctx.translate(finalPx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-finalPx, 0);
    }

    // Helper to draw chubby legs
    const drawChubbyLeg = (lx: number, ly: number, legWalkOffset: number, isFront: boolean) => {
      if (legScaleY === 0 || limbsScale === 0) return; // Skip drawing when tucked in shell
      
      ctx.save();
      let scaleY = legScaleY;
      let scaleX = 1.0;
      let offY = legOffsetY;
      let offX = 0;

      if (isPlanting) {
        if (plantingAnimTimer >= 45) {
          scaleY = 0.5;
          offY = -s * 0.08;
        } else if (plantingAnimTimer >= 15) {
          // Fase 2 — Pisotón vertical en ambas patas (Ticks 44-15)
          if (plantingAnimTimer >= 30) {
            // Levantamiento (Ticks 44-30)
            offY = -s * 0.5;
          } else {
            // Golpe de impacto (Ticks 29-15)
            offY = s * 0.25;
            if (plantingAnimTimer === 29 || plantingAnimTimer === 28) {
              scaleY = 0.7;
              scaleX = 1.3;
            }
          }
        } else {
          // Fase 3 — Retorno (Ticks 14-1)
          const progress = plantingAnimTimer / 14;
          const pushAmount = s * 0.1 * progress;
          if (dir.x !== 0) {
            offX = pushAmount;
          } else {
            offY = dir.y * pushAmount;
          }
        }
      }

      ctx.translate(lx + offX, ly + offY + legWalkOffset * s * 0.3);
      ctx.scale(scaleX, scaleY);

      // Chubby round capsule leg
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();

      // Draw a rounded rectangle for leg
      if (ctx.roundRect) {
        ctx.roundRect(-s * 0.16, -s * 0.1, s * 0.32, s * 0.35, s * 0.12);
      } else {
        // Fallback for older canvas environments
        const rx = -s * 0.16, ry = -s * 0.1, rw = s * 0.32, rh = s * 0.35, rad = s * 0.12;
        ctx.moveTo(rx + rad, ry);
        ctx.lineTo(rx + rw - rad, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
        ctx.lineTo(rx + rw, ry + rh - rad);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
        ctx.lineTo(rx + rad, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
        ctx.lineTo(rx, ry + rad);
        ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
      }
      ctx.fill();
      ctx.stroke();

      // Shadow on back leg part
      ctx.fillStyle = skinShadow;
      ctx.beginPath();
      ctx.ellipse(-s * 0.04, s * 0.12, s * 0.08, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Draw Tail (cute tiny green tail)
    if (tailScale > 0 && limbsScale > 0) {
      ctx.save();
      ctx.translate(finalPx - s * 0.65, finalCy + s * 0.28);
      ctx.scale(tailScale * limbsScale, tailScale * limbsScale);
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.23, s * 0.08, -s * 0.03, s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // If naked, draw the exposed pink/light-green textured back of Torti behind shell
    if (isNaked) {
      ctx.save();
      const nakedCx = finalPx - s * 0.32;
      const nakedCy = finalCy + s * 0.06 + bodyOffsetY;
      ctx.translate(nakedCx, nakedCy);

      // Draw the naked body oval
      ctx.fillStyle = '#e8a7a1'; // soft pink naked skin color
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.35, s * 0.40, Math.PI * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw spine lines/wrinkles
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.lineTo(0, s * 0.2);
      ctx.stroke();

      ctx.restore();
    }

    // Draw shell behind body (with independent translation, rotation, and squash/stretch scale)
    ctx.save();
    const shellCx = finalPx - s * 0.32 + localOffsetX;
    const shellCy = finalCy + s * 0.06 + bodyOffsetY + localOffsetY;
    ctx.translate(shellCx, shellCy);
    ctx.rotate(shellRotation);
    ctx.scale(shellScaleX, shellScaleY);

    ctx.fillStyle = shellBase;
    ctx.strokeStyle = shellOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.50, s * 0.55, Math.PI * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Add white spots/circles on shell relative to shell center (0, 0)
    ctx.fillStyle = shellSpot;
    ctx.beginPath();
    ctx.arc(-s * 0.16, -s * 0.30, s * 0.11, 0, Math.PI * 2);
    ctx.arc(-s * 0.22, -s * 0.04, s * 0.13, 0, Math.PI * 2);
    ctx.arc(-s * 0.10,  s * 0.20, s * 0.11, 0, Math.PI * 2);
    ctx.arc( s * 0.08, -s * 0.22, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw rear leg (left)
    drawChubbyLeg(finalPx - s * 0.20, finalCy + s * 0.40, walkOffset, false);

    // Draw torso and cream/tan belly (plastron)
    ctx.fillStyle = bellyColor;
    ctx.strokeStyle = bellyOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(finalPx - s * 0.04, finalCy + s * 0.1 + bodyOffsetY, s * 0.41, s * 0.45 * bodyScaleY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw the green letter 'T' centered on the chest
    if (!isTuckedDeath) {
      const bx = finalPx - s * 0.04;
      const by = finalCy + s * 0.1 + bodyOffsetY;
      ctx.fillStyle = letterColor;
      // Horizontal bar
      ctx.fillRect(bx - s * 0.14, by - s * 0.15 * bodyScaleY, s * 0.28, s * 0.08 * bodyScaleY);
      // Vertical bar
      ctx.fillRect(bx - s * 0.045, by - s * 0.15 * bodyScaleY, s * 0.09, s * 0.26 * bodyScaleY);
    }

    // Draw front leg (right)
    drawChubbyLeg(finalPx + s * 0.14, finalCy + s * 0.40, -walkOffset, true);

    // Draw cute stubby left arm (slightly visible at back)
    if (!isTuckedDeath && limbsScale > 0) {
      ctx.save();
      let rArmScale = 1.0;
      if (plantingAnimTimer >= 45) {
        rArmScale = 0.5;
      }
      rArmScale *= limbsScale;
      ctx.translate(finalPx - s * 0.40, finalCy + s * 0.08 + bodyOffsetY);
      ctx.scale(rArmScale, rArmScale);
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.13, s * 0.20, Math.PI * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw neck
    if (headScale > 0 && limbsScale > 0) {
      ctx.save();
      ctx.translate(finalPx + s * 0.08 + headOffsetX, finalCy - s * 0.18 + headOffsetY);
      ctx.scale(headScale * limbsScale, headScale * limbsScale);
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.15, s * 0.22, -Math.PI * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw head (big rounded cute green head)
    if (headScale > 0 && limbsScale > 0) {
      const hx = finalPx + s * 0.12 + headOffsetX;
      const hy = finalCy - s * 0.35 + headOffsetY;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(headScale * limbsScale, headScale * limbsScale);
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw big shiny anime eyes with detailed planting expressions
      const drawCuteEye = (ex: number, ey: number) => {
        if (isShocked) {
          // Draw dramatic X_X cross eye!
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          const r = s * 0.09;
          ctx.beginPath();
          ctx.moveTo(ex - r, ey - r); ctx.lineTo(ex + r, ey + r);
          ctx.moveTo(ex + r, ey - r); ctx.lineTo(ex - r, ey + r);
          ctx.stroke();
        } else if (isPlanting && plantingAnimTimer >= 15) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const r = s * 0.09;

          if (plantingAnimTimer >= 30) {
            // Ticks 54-30 — Concentración / Esfuerzo: semicírculo invertido
            ctx.beginPath();
            ctx.arc(ex, ey, r, Math.PI, 0, true);
            ctx.stroke();

            // Cejas (dos líneas cortas inclinadas hacia el centro)
            ctx.save();
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            if (ex < 0) {
              // Eyebrow left: slope down-right
              ctx.moveTo(ex - r * 1.2, ey - r * 1.5);
              ctx.lineTo(ex + r * 0.2, ey - r * 0.9);
            } else {
              // Eyebrow right: slope down-left
              ctx.moveTo(ex + r * 1.2, ey - r * 1.5);
              ctx.lineTo(ex - r * 0.2, ey - r * 0.9);
            }
            ctx.stroke();
            ctx.restore();

          } else if (plantingAnimTimer >= 28) {
            // Ticks 29-28 — Impacto: símbolos < y > enfrentados
            ctx.beginPath();
            if (ex < 0) {
              // Left eye: '<'
              ctx.moveTo(ex + r, ey - r);
              ctx.lineTo(ex - r, ey);
              ctx.lineTo(ex + r, ey + r);
            } else {
              // Right eye: '>'
              ctx.moveTo(ex - r, ey - r);
              ctx.lineTo(ex + r, ey);
              ctx.lineTo(ex - r, ey + r);
            }
            ctx.stroke();
          } else {
            // Ticks 27-15 — Satisfacción: arcos curvados hacia arriba (media luna feliz)
            ctx.beginPath();
            ctx.arc(ex, ey, r, Math.PI, 0, false);
            ctx.stroke();
          }
        } else {
          // Normal anime eyes with shiny glint
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.09, 0, Math.PI * 2);
          ctx.fill();

          // Shiny reflection glint
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.03, ey - s * 0.03, s * 0.032, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      drawCuteEye(-s * 0.08, -s * 0.02);
      drawCuteEye(s * 0.20, -s * 0.02);

      // Draw blush cheeks (only if not shocked)
      if (!isShocked) {
        ctx.fillStyle = blushColor;
        ctx.beginPath();
        ctx.ellipse(-s * 0.18, s * 0.1, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.25, s * 0.1, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw mouth
      ctx.strokeStyle = mouthColor;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (isShocked) {
        // Big shocked circle mouth!
        ctx.fillStyle = mouthColor;
        ctx.arc(s * 0.06, s * 0.12, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(s * 0.02, s * 0.08);
        ctx.lineTo(s * 0.06, s * 0.13);
        ctx.lineTo(s * 0.10, s * 0.08);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Draw chubby right arm (front arm, in foreground)
    if (!isTuckedDeath && limbsScale > 0) {
      ctx.save();
      let fArmScale = 1.0;
      if (isPlanting) {
        if (plantingAnimTimer >= 45) {
          fArmScale = 0.5; // Carga
        } else if (plantingAnimTimer >= 15) {
          fArmScale = 0.8; // ligeramente retraído
        }
      }
      fArmScale *= limbsScale;
      ctx.translate(finalPx + s * 0.30, finalCy + s * 0.10);
      ctx.scale(fArmScale, fArmScale);
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.15, s * 0.22, -Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  // Helper draws customized beautiful fox enemy variants
  const drawFoxEnemy = (
    ctx: CanvasRenderingContext2D,
    px: number, py: number,
    dir: Position,
    frame: number,
    type: 'patrol' | 'chaser' | 'ghost',
    t: number
  ) => {
    ctx.save();
    
    // Dynamic scale based on enemy type to differentiate mechanics and threat levels:
    let s = TILE * 0.42;
    if (type === 'patrol') {
      s = TILE * 0.48; // Red patrol foxes stay medium but clearly visible (up from 0.42)
    } else if (type === 'chaser') {
      s = TILE * 0.58; // Gray armored chaser rodent is huge, imposing, and terrifying!
    } else if (type === 'ghost') {
      s = TILE * 0.52; // Ghost spectral fox is intermediate size
    }
    
    const abc = Math.sin(t * 0.009 + frame) * 1.5;
    const cy = py + abc;

    // Base floor shadow (placed firmly on ground, not affected by bobbing/jumping)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(px, py + s * 0.52, s * 0.76, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Adjust palettes naturally per fox subtype
    let pCol = '#f97316'; // Red Fox
    let iCol = '#ffffff'; // White fluff chest
    let dCol = '#1e293b'; // Charcoal tail details
    let sCol = '#7c2d12'; // Borders
    let eCol = '#3bf9a0'; // Eyes
    const tailSwing = Math.cos(t * 0.012 + frame) * 0.26;

    if (type === 'chaser') {
      pCol = '#64748b'; // Gray/Steel armored fox
      iCol = '#f1f5f9';
      dCol = '#0f172a';
      sCol = '#334155';
      eCol = '#f43f5e'; // Red focused eyes
    } else if (type === 'ghost') {
      pCol = '#bfdbfe'; // Whimsical ghost-blue spectral fox
      iCol = '#f0fdf4';
      dCol = '#3b82f6';
      sCol = '#1d4ed8';
      eCol = '#facc15'; // Glowing light eyes
    }

    // 1. Cozy fluffy Tail swiping at back
    ctx.save();
    ctx.translate(px, cy);
    const tailAngleOffset = Math.atan2(-dir.y, -dir.x);
    ctx.rotate(tailAngleOffset + tailSwing);

    ctx.fillStyle = pCol;
    ctx.strokeStyle = sCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.4, -s * 1.1, -s * 0.35, -s * 1.1, 0);
    ctx.bezierCurveTo(-s * 1.1, s * 0.35, -s * 0.5, s * 0.4, 0, 0);
    ctx.fill();
    ctx.stroke();

    // White bushy tail cap tip
    ctx.fillStyle = iCol;
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, 0);
    ctx.bezierCurveTo(-s * 0.95, -s * 0.16, -s * 0.78, -s * 0.14, -s * 0.78, 0);
    ctx.bezierCurveTo(-s * 0.78, s * 0.14, -s * 0.95, s * 0.16, -s * 1.1, 0);
    ctx.fill();

    ctx.strokeStyle = sCol;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-s * 0.78, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.92, 0, -s * 0.78, s * 0.1);
    ctx.stroke();

    ctx.restore();

    // 2. Cute tiny feet paws
    ctx.fillStyle = dCol;
    ctx.beginPath();
    ctx.arc(px - s * 0.3, cy + s * 0.58, s * 0.14, 0, Math.PI * 2);
    ctx.arc(px + s * 0.3, cy + s * 0.58, s * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // 3. Fox fluffy circular torso body
    ctx.fillStyle = pCol;
    ctx.strokeStyle = sCol;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(px, cy + s * 0.08, s * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White chest fluff
    ctx.fillStyle = iCol;
    ctx.beginPath();
    ctx.ellipse(px, cy + s * 0.14, s * 0.36, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    // If Chaser type, draw metal neck/pectoral chestplate
    if (type === 'chaser') {
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px - s * 0.22, cy);
      ctx.lineTo(px + s * 0.22, cy);
      ctx.lineTo(px + s * 0.16, cy + s * 0.34);
      ctx.lineTo(px, cy + s * 0.44);
      ctx.lineTo(px - s * 0.16, cy + s * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing power gem central slot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, cy + s * 0.22, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Fox Fox triangular cute face
    const fdX = px + dir.x * 2.5;
    const fdY = cy - s * 0.32;

    // Tall Pointy Left Ear
    ctx.fillStyle = pCol;
    ctx.strokeStyle = sCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fdX - s * 0.42, fdY - s * 0.15);
    ctx.lineTo(fdX - s * 0.52, fdY - s * 0.9);
    ctx.lineTo(fdX - s * 0.08, fdY - s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fecdd3'; // pink inner ear
    ctx.beginPath();
    ctx.moveTo(fdX - s * 0.38, fdY - fdY * 0.01 - s * 0.22);
    ctx.lineTo(fdX - s * 0.46, fdY - s * 0.78);
    ctx.lineTo(fdX - s * 0.15, fdY - s * 0.45);
    ctx.closePath();
    ctx.fill();

    // Tall Pointy Right Ear
    ctx.fillStyle = pCol;
    ctx.strokeStyle = sCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fdX + s * 0.42, fdY - s * 0.15);
    ctx.lineTo(fdX + s * 0.52, fdY - s * 0.9);
    ctx.lineTo(fdX + s * 0.08, fdY - s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fecdd3';
    ctx.beginPath();
    ctx.moveTo(fdX + s * 0.38, fdY - fdY * 0.01 - s * 0.22);
    ctx.lineTo(fdX + s * 0.46, fdY - s * 0.78);
    ctx.lineTo(fdX + s * 0.15, fdY - s * 0.45);
    ctx.closePath();
    ctx.fill();

    // Fox Triangular snout face base
    ctx.fillStyle = pCol;
    ctx.strokeStyle = sCol;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(fdX - s * 0.56, fdY);
    ctx.quadraticCurveTo(fdX - s * 0.58, fdY + s * 0.36, fdX, fdY + s * 0.5);
    ctx.quadraticCurveTo(fdX + s * 0.56, fdY + s * 0.36, fdX + s * 0.56, fdY);
    ctx.quadraticCurveTo(fdX, fdY - s * 0.32, fdX - s * 0.56, fdY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left cheek fluff white
    ctx.fillStyle = iCol;
    ctx.beginPath();
    ctx.moveTo(fdX - s * 0.48, fdY + s * 0.08);
    ctx.quadraticCurveTo(fdX - s * 0.42, fdY + s * 0.4, fdX, fdY + s * 0.48);
    ctx.quadraticCurveTo(fdX - s * 0.1, fdY + s * 0.26, fdX - s * 0.48, fdY + s * 0.08);
    ctx.fill();

    // Right cheek fluff white
    ctx.beginPath();
    ctx.moveTo(fdX + s * 0.48, fdY + s * 0.08);
    ctx.quadraticCurveTo(fdX + s * 0.42, fdY + s * 0.4, fdX, fdY + s * 0.48);
    ctx.quadraticCurveTo(fdX + s * 0.1, fdY + s * 0.26, fdX + s * 0.48, fdY + s * 0.08);
    ctx.fill();

    // If Chaser type, draw dark iron headband armor
    if (type === 'chaser') {
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = sCol;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(fdX, fdY, s * 0.38, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Little forehead central spike
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(fdX - 2.5, fdY - s * 0.38);
      ctx.lineTo(fdX, fdY - s * 0.65);
      ctx.lineTo(fdX + 2.5, fdY - s * 0.38);
      ctx.closePath();
      ctx.fill();
    }

    // Gentle almond fox eyes
    const eyeOffX = dir.x * 2.2;
    const eyeY = fdY + s * 0.05 + dir.y * 1;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(fdX - s * 0.18 + eyeOffX, eyeY, s * 0.11, s * 0.07, Math.PI / 12, 0, Math.PI * 2);
    ctx.ellipse(fdX + s * 0.18 + eyeOffX, eyeY, s * 0.11, s * 0.07, -Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();

    // Sharp bright iris
    ctx.fillStyle = eCol;
    ctx.beginPath();
    ctx.arc(fdX - s * 0.16 + eyeOffX + dir.x * 0.6, eyeY + dir.y * 0.6, s * 0.055, 0, Math.PI * 2);
    ctx.arc(fdX + s * 0.16 + eyeOffX + dir.x * 0.6, eyeY + dir.y * 0.6, s * 0.055, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(fdX - s * 0.16 + eyeOffX + dir.x * 1, eyeY + dir.y * 0.6, 1.2, 0, Math.PI * 2);
    ctx.arc(fdX + s * 0.16 + eyeOffX + dir.x * 1, eyeY + dir.y * 0.6, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Nose tip of fox snout
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(fdX, fdY + s * 0.46, 3, 0, Math.PI * 2);
    ctx.fill();

    // Shy cheeks
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.arc(fdX - s * 0.34, fdY + s * 0.26, 2, 0, Math.PI * 2);
    ctx.arc(fdX + s * 0.34, fdY + s * 0.26, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawFruits = (ctx: CanvasRenderingContext2D, t: number) => {
    fruitsRef.current.forEach(f => {
      const px = f.col * TILE + TILE / 2;
      const py = f.row * TILE + TILE / 2;
      const bob = Math.sin(t * 0.003 + f.anim) * 3;
      const yBob = py + bob;

      const isCovered = mapRef.current[f.row][f.col] === T_ICE;

      ctx.save();

      if (!isCovered) {
        // Grounded float relative floor shadow
        const shadowScale = Math.max(0.3, 1.0 - Math.abs(bob) / 12);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + TILE * 0.35, 7.5 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isCovered) {
        // Semi-visible translucent overlay representation when inside grass (Balanced visibility!)
        ctx.globalAlpha = 0.55;

        // Draw a soft glowing warm aura behind the fruit to make it stand out beautifully inside the foliage
        ctx.save();
        const auraGrad = ctx.createRadialGradient(px, yBob, 2, px, yBob, 11);
        auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        auraGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.32)'); // soft warm yellow glow
        auraGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(px, yBob, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const pulse = 1.05 + Math.sin(t * 0.012 + f.anim) * 0.15;
        const jiggleX = Math.cos(t * 0.025 + f.anim) * 1.5;

        ctx.translate(px + jiggleX, yBob);
        ctx.scale(pulse, pulse);
        ctx.translate(-px, -yBob);
      }

      if (f.type === 3) {
        // 🍅 Tomato vector representation with 3D Sphere Radial Gradient
        const tomatoGrad = ctx.createRadialGradient(px - 2, yBob - 2, 1, px, yBob + 1, 9.5);
        tomatoGrad.addColorStop(0, '#fecaca'); // glint light
        tomatoGrad.addColorStop(0.3, '#ef4444'); // red body
        tomatoGrad.addColorStop(1, '#991b1b'); // dark shadow red edge

        ctx.fillStyle = tomatoGrad;
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.5;

        // Draw slightly flattened juicy tomato circle
        ctx.beginPath();
        ctx.ellipse(px, yBob + 1, 10, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw sepals (green star-like leaf crown on top)
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 0.8;

        // Top stem
        ctx.fillStyle = '#15803d';
        ctx.fillRect(px - 1, yBob - 10, 2, 4);

        // Sepal lobes
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        // Lobe 1 (left)
        ctx.moveTo(px, yBob - 7);
        ctx.quadraticCurveTo(px - 5, yBob - 8, px - 7, yBob - 5);
        ctx.quadraticCurveTo(px - 3, yBob - 5, px, yBob - 7);
        // Lobe 2 (right)
        ctx.moveTo(px, yBob - 7);
        ctx.quadraticCurveTo(px + 5, yBob - 8, px + 7, yBob - 5);
        ctx.quadraticCurveTo(px + 3, yBob - 5, px, yBob - 7);
        // Lobe 3 (center back)
        ctx.moveTo(px, yBob - 7);
        ctx.quadraticCurveTo(px, yBob - 11, px - 3, yBob - 10);
        ctx.quadraticCurveTo(px, yBob - 9, px, yBob - 7);
        // Lobe 4 (front left)
        ctx.moveTo(px, yBob - 7);
        ctx.quadraticCurveTo(px - 3, yBob - 4, px - 4, yBob - 2);
        ctx.quadraticCurveTo(px - 1, yBob - 5, px, yBob - 7);
        // Lobe 5 (front right)
        ctx.moveTo(px, yBob - 7);
        ctx.quadraticCurveTo(px + 3, yBob - 4, px + 4, yBob - 2);
        ctx.quadraticCurveTo(px + 1, yBob - 5, px, yBob - 7);
        ctx.fill();
        ctx.stroke();

        // High glint shine reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(px - 3, yBob - 3, 2.5, 1.5, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (f.type === 4) {
        // 🥕 Carrot vector representation (2.5D premium angled vector)
        ctx.save();
        ctx.translate(px, yBob);
        ctx.rotate(-Math.PI / 8); // nice playful tilt

        // Carrot body (elongated tapered cone)
        const carrotGrad = ctx.createLinearGradient(-4, -8, 4, 8);
        carrotGrad.addColorStop(0, '#fdba74'); // highlight orange
        carrotGrad.addColorStop(0.4, '#f97316'); // main orange
        carrotGrad.addColorStop(1, '#c2410c'); // shadow rust orange

        ctx.fillStyle = carrotGrad;
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.quadraticCurveTo(0, -9, 6, -6); // rounded top
        ctx.lineTo(1, 10); // taper down to point
        ctx.quadraticCurveTo(0, 11, -1, 10); // tiny tip
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Horizontal texture ridges
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-4, -2); ctx.lineTo(1, -2);
        ctx.moveTo(-2, 2); ctx.lineTo(3, 2);
        ctx.moveTo(-1, 6); ctx.lineTo(1, 6);
        ctx.stroke();

        // Green leaf leafy tuft at top
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 0.8;

        // Leaf 1 (center)
        ctx.beginPath();
        ctx.ellipse(0, -11, 2.2, 4.5, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Leaf 2 (left)
        ctx.beginPath();
        ctx.ellipse(-3.5, -9.5, 2, 4, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Leaf 3 (right)
        ctx.beginPath();
        ctx.ellipse(3.5, -9.5, 2, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        ctx.restore();

      } else if (f.type === 5) {
        // 🥦 Golden Broccoli (Power up)
        // Golden stalk stem
        ctx.fillStyle = '#fef08a'; // yellow-200
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px - 4, yBob + 9);
        ctx.lineTo(px - 3, yBob + 1);
        ctx.lineTo(px + 3, yBob + 1);
        ctx.lineTo(px + 4, yBob + 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gold ramillete core layers
        ctx.fillStyle = '#eab308'; // yellow-500
        ctx.beginPath();
        ctx.arc(px, yBob - 3, 7.5, 0, Math.PI * 2);
        ctx.arc(px - 5, yBob - 1, 6.5, 0, Math.PI * 2);
        ctx.arc(px + 5, yBob - 1, 6.5, 0, Math.PI * 2);
        ctx.arc(px - 3, yBob - 6, 5.5, 0, Math.PI * 2);
        ctx.arc(px + 3, yBob - 6, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Golden details outlines
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px - 5, yBob - 1, 6.5, Math.PI * 0.7, Math.PI * 1.6);
        ctx.stroke();

        // Sparkling gold dots
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 2, yBob - 3, 1.5, 1.5);
        ctx.fillRect(px + 2, yBob - 5, 1.5, 1.5);
      }

      ctx.restore();
    });
  };

  const drawIndicatorCell = (ctx: CanvasRenderingContext2D, col: number, row: number, isBreaking: boolean) => {
    const fx = col * TILE + TILE / 2;
    const fy = row * TILE + TILE / 2;

    const isGolden = playerRef.current.goldenBroccoliTimer > 0;

    let fill = isBreaking ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)';
    let stroke = isBreaking ? 'rgba(239, 68, 68, 0.85)' : 'rgba(34, 197, 94, 0.85)';

    if (!isBreaking && isGolden) {
      fill = 'rgba(234, 179, 8, 0.25)';
      stroke = 'rgba(234, 179, 8, 0.85)';
    }

    ctx.fillStyle = fill;
    ctx.fillRect(col * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    const cx = fx;
    const cy = fy;
    const r = 6;

    if (isBreaking) {
      // Red X
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    } else {
      // Plus sign (matches the outline strokeStyle color automatically)
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.stroke();
    }
  };

  const drawPlayerIndicators = (ctx: CanvasRenderingContext2D) => {
    const player = playerRef.current;
    const dir = player.dir;
    const powerCount = getPowerCount();

    // 1. Red preview marker overlays for breaking
    let currentCc = player.col + dir.x;
    let currentCr = player.row + dir.y;
    for (let i = 0; i < powerCount; i++) {
      if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;
      if (isWall(currentCc, currentCr)) break;

      if (isIce(currentCc, currentCr)) {
        drawIndicatorCell(ctx, currentCc, currentCr, true);
      } else {
        break; // Stop immediately upon blank gap or other
      }
      currentCc += dir.x;
      currentCr += dir.y;
    }

    // 2. Green preview marker overlays for building-planting block sequence
    currentCc = player.col + dir.x;
    currentCr = player.row + dir.y;
    for (let i = 0; i < powerCount; i++) {
      if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;

      const hasPlayer = player.col === currentCc && player.row === currentCr;
      const hasEnemy = enemiesRef.current.some(e => e.col === currentCc && e.row === currentCr);

      if (isIce(currentCc, currentCr) || isWall(currentCc, currentCr) || hasPlayer || hasEnemy) {
        break;
      }

      if (isEmpty(currentCc, currentCr)) {
        drawIndicatorCell(ctx, currentCc, currentCr, false);
      }
      currentCc += dir.x;
      currentCr += dir.y;
    }
  };

  const drawPlayerMain = (ctx: CanvasRenderingContext2D, t: number) => {
    const player = playerRef.current;
    const px = player.x;
    const py = player.y;

    // Invincibility protection flashing sequence
    const alpha = player.invincible > 0
      ? (Math.floor(player.invincible / 6) % 2 === 0 ? 0.25 : 1.0)
      : 1.0;

    ctx.globalAlpha = alpha;

    const isGolden = player.goldenBroccoliTimer > 0;

    if (isGolden) {
      // Pulsating golden shielding rings around our cute Bowser turtle
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#eab308';
      ctx.beginPath();
      ctx.arc(px, py, TILE * 0.65 + Math.sin(t * 0.012) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw our cute Bowser character!
    drawGardenTurtle(ctx, px, py, player.dir, player.animFrame, t, isGolden, player.plantingAnimTimer, player.breakingAnimTimer, player.deathAnimTimer);

    if (gameState === 'playing') {
      drawPlayerIndicators(ctx);
    }

    ctx.globalAlpha = 1.0;
  };

  const drawEnemies = (ctx: CanvasRenderingContext2D, t: number) => {
    enemiesRef.current.forEach(e => {
      if (e.type === 'ghost') {
        // Semi transparent spectral render for the ghost fox
        ctx.globalAlpha = 0.55;
      } else {
        ctx.globalAlpha = 1.0;
      }

      // Draw our custom beautiful fox enemy in place!
      drawFoxEnemy(ctx, e.x, e.y, e.dir, e.animFrame, e.type, t);
      ctx.globalAlpha = 1.0;
    });
  };

  const renderParticlesAndFlush = (ctx: CanvasRenderingContext2D) => {
    const parts = particlesRef.current;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // downward gravity pull
      p.life--;

      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;

      // Draw custom leaf shape for green leaf particles
      if (p.color === '#4caf50' || p.color === '#2e7d32') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 0.12); // satisfying organic rotation
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Leaf shape ellipse
        ctx.ellipse(0, 0, 4.5, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#051408';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      } else {
        // Standard retro square particle
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
      }
    }
    ctx.globalAlpha = 1.0;
  };

  // Frame Request Gameloop Execution
  useEffect(() => {
    let isSubscribed = true;

    const renderLoop = (timestamp: number) => {
      if (!isSubscribed) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestAnimationFrame(renderLoop);
        return;
      }

      // Clear layout
      ctx.clearRect(0, 0, W, H);

      if (gameState === 'playing') {
        const player = playerRef.current;
        
        // Trigger Break action at start of tick 36 (Impact)
        if (player.breakingAnimTimer === 36 && breakingTilesRef.current.length > 0) {
          breakingTilesRef.current.forEach(({ col, row }) => {
            mapRef.current[row][col] = T_EMPTY;
            // Directional leaf particles!
            spawnParticles(col, row, '#4caf50', player.dir);
            spawnParticles(col, row, '#2e7d32', player.dir);
          });
          SoundEffects.playBreak();
          breakingTilesRef.current = [];
        }
        
        // Trigger Plant action at start of tick 36 (Lanzamiento)
        if (player.plantingAnimTimer === 36 && plantingTilesRef.current.length > 0) {
          plantingTilesRef.current.forEach(({ col, row }) => {
            mapRef.current[row][col] = T_ICE;
            const key = `${row}_${col}`;
            grassAgesRef.current[key] = { createdAt: Date.now() };
            // Spawn brown dirt particles!
            spawnParticles(col, row, '#8B5E3C', undefined, true);
          });
          SoundEffects.playBuild();
          plantingTilesRef.current = [];
        }

        if (player.deathAnimTimer > 0) {
          player.deathAnimTimer--;
          if (player.deathAnimTimer === 0) {
            // Death animation completed! Handle life reduction and respawn/gameover
            setLives((prev: number) => {
              const updated = prev - 1;
              if (updated <= 0) {
                setGameState('gameover');
                SoundEffects.playGameOver();
              } else {
                player.invincible = 120; // 2 seconds protection
                respawnEntities();
                checkGoldenBroccoliSpawn(updated);
              }
              return updated;
            });
          }
        } else if (player.breakingAnimTimer === 36 || player.breakingAnimTimer === 35) {
          // Freeze frame: bypass updates/collisions, manually decrement breakingAnimTimer
          player.breakingAnimTimer--;
        } else {
          updatePlayer();
          enemiesRef.current.forEach(e => updateEnemy(e));
          checkCollisions();
          detectMapChanges();
        }
      }

      // Screen shake calculation: 3-5 frames during breaking impact (ticks 36-30) and planting huddle (ticks 54-45)
      const isBreakShake = playerRef.current.breakingAnimTimer >= 30 && playerRef.current.breakingAnimTimer <= 36;
      const isPlantShake = playerRef.current.plantingAnimTimer >= 45 && playerRef.current.plantingAnimTimer <= 54;

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

      // Render game layers
      drawMap(ctx);
      renderParticlesAndFlush(ctx);
      drawFruits(ctx, timestamp);

      if (['playing', 'dead', 'win', 'paused'].includes(gameState)) {
        drawPlayerMain(ctx, timestamp);
        drawEnemies(ctx, timestamp);
      }

      ctx.restore();

      requestAnimationFrame(renderLoop);
    };

    const animId = requestAnimationFrame(renderLoop);
    return () => {
      isSubscribed = false;
      cancelAnimationFrame(animId);
    };
  }, [gameState, score, levelPhase, lives]);

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