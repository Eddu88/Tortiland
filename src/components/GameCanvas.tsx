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
    speed: 2,
    animFrame: 0, animTimer: 0,
    invincible: 0,
    goldenBroccoliTimer: 0,
    powerCooldown: 0,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const prevMapRef = useRef<TileType[][] | null>(null);
  const grassAgesRef = useRef<{ [key: string]: { createdAt: number } }>({});

  // Keyboard state tracker
  const keysRef = useRef<{ [code: string]: boolean }>({});
  const lastDirRef = useRef<Position | null>(null);

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
      if (ghostMode) return false;
      if (isPlayer && playerRef.current.goldenBroccoliTimer > 0) return false;
      return true;
    }
    return false;
  };

  const isEmpty = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return mapRef.current[row][col] === T_EMPTY;
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
    const freshCount = fruitsRef.current.filter(f => f.type === (levelPhase === 'apples' ? 3 : 4)).length;
    setFruitsLeft(freshCount);
  };

  const spawnParticles = (col: number, row: number, color: string) => {
    const cx = col * TILE + TILE / 2;
    const cy = row * TILE + TILE / 2;
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 3.5;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
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
      speed: 2.2, // Slightly increased mobility for pleasant feel
      animFrame: 0, animTimer: 0,
      invincible: 60, // 1 sec protection on load
      goldenBroccoliTimer: 0,
      powerCooldown: 0,
    };

    // Spawn core fruits (5 apples initially)
    fruitsRef.current = [];
    setLevelPhase('apples');
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
        speed: 1.0,
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
        speed: 1.0,
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
        speed: 1.3,
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
        speed: 0.8,
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
    // Power scale limits: 1 to 4 cells dependent on active score limits
    const powerCount = Math.min(4, Math.max(1, Math.floor(score / 2) + 1));

    const firstCc = player.col + dir.x;
    const firstCr = player.row + dir.y;

    if (firstCc <= 0 || firstCc >= COLS - 1 || firstCr <= 0 || firstCr >= ROWS - 1) return;
    if (isWall(firstCc, firstCr)) return;

    let currentCc = firstCc;
    let currentCr = firstCr;
    let actionExecuted = false;

    if (action === 'break') {
      for (let i = 0; i < powerCount; i++) {
        if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;
        if (isWall(currentCc, currentCr)) break;

        if (isIce(currentCc, currentCr)) {
          mapRef.current[currentCr][currentCc] = T_EMPTY;
          actionExecuted = true;
        } else {
          break; // Stop immediately upon meeting space / gaps
        }
        currentCc += dir.x;
        currentCr += dir.y;
      }
      if (actionExecuted) {
        SoundEffects.playBreak();
        player.powerCooldown = 30; // 0.5s cooldown
      }
    } else if (action === 'create') {
      for (let i = 0; i < powerCount; i++) {
        if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;

        const hasPlayer = (player.col === currentCc && player.row === currentCr) ||
                          (player.targetCol === currentCc && player.targetRow === currentCr);
        const hasEnemy = enemiesRef.current.some(e => e.col === currentCc && e.row === currentCr);

        // Check blockage
        if (isWall(currentCc, currentCr) || isIce(currentCc, currentCr) || hasPlayer || hasEnemy) {
          break;
        }

        if (isEmpty(currentCc, currentCr)) {
          mapRef.current[currentCr][currentCc] = T_ICE;
          const key = `${currentCr}_${currentCc}`;
          grassAgesRef.current[key] = { createdAt: Date.now() };
          actionExecuted = true;
        }

        currentCc += dir.x;
        currentCr += dir.y;
      }
      if (actionExecuted) {
        SoundEffects.playBuild();
        player.powerCooldown = 35; // 0.6s cooldown
      }
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
        const hasVKey = keysRef.current['ArrowUp'] || keysRef.current['KeyW'] || keysRef.current['ArrowDown'] || keysRef.current['KeyS'];
        const hasHKey = keysRef.current['ArrowLeft'] || keysRef.current['KeyA'] || keysRef.current['ArrowRight'] || keysRef.current['KeyD'];

        if (['ArrowUp', 'KeyW'].includes(code) && !hasVKey) {
          lastDirRef.current = { x: 0, y: -1 };
        } else if (['ArrowDown', 'KeyS'].includes(code) && !hasVKey) {
          lastDirRef.current = { x: 0, y: 1 };
        } else if (['ArrowLeft', 'KeyA'].includes(code) && !hasHKey) {
          lastDirRef.current = { x: -1, y: 0 };
        } else if (['ArrowRight', 'KeyD'].includes(code) && !hasHKey) {
          lastDirRef.current = { x: 1, y: 0 };
        }
      }

      // Action Keys: Space/Enter/KeyF for creation, Backspace/Shift/KeyE/KeyC for break
      if (['Space', 'Enter', 'KeyF'].includes(code)) {
        e.preventDefault();
        useIcePower('create');
      } else if (['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyC', 'Backspace'].includes(code)) {
        e.preventDefault();
        useIcePower('break');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;

      // Recalculate last direction with actively pressed keys
      lastDirRef.current = null;
      if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) {
        lastDirRef.current = { x: 0, y: -1 };
      } else if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) {
        lastDirRef.current = { x: 0, y: 1 };
      } else if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
        lastDirRef.current = { x: -1, y: 0 };
      } else if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
        lastDirRef.current = { x: 1, y: 0 };
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

    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(virtualCommand)) {
      const dirMap: { [k: string]: Position } = {
        'UP': { x: 0, y: -1 },
        'DOWN': { x: 0, y: 1 },
        'LEFT': { x: -1, y: 0 },
        'RIGHT': { x: 1, y: 0 }
      };
      lastDirRef.current = dirMap[virtualCommand];
      playerRef.current.dir = dirMap[virtualCommand];
    } else if (virtualCommand === 'BUILD') {
      useIcePower('create');
    } else if (virtualCommand === 'BREAK') {
      useIcePower('break');
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
      const targetFruitsCount = currentFruits.filter(f => f.type === (levelPhase === 'apples' ? 3 : 4)).length;
      setFruitsLeft(targetFruitsCount);

      if (targetFruitsCount === 0) {
        if (levelPhase === 'apples') {
          // Switch to Oranges phase
          setLevelPhase('oranges');
          fruitsRef.current = fruitsRef.current.filter(f => f.type !== 5); // Flush active golden broccoli
          // Spawn oranges
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

    if (!player.moving) {
      // Pick current direction requested
      let dir = lastDirRef.current;
      if (!dir) {
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

    // Move center coordinates smoothly toward targeted cell
    if (player.moving) {
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

    e.animTimer++;
    if (e.animTimer > 9) {
      e.animTimer = 0;
      e.animFrame = (e.animFrame + 1) % 4;
    }
  };

  const checkCollisions = () => {
    const player = playerRef.current;
    if (player.invincible > 0) return;

    for (const e of enemiesRef.current) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TILE * 0.65) {
        // Player touched by enemy
        setLives((prev: number) => {
          const updated = prev - 1;
          if (updated <= 0) {
            setGameState('gameover');
            SoundEffects.playGameOver();
          } else {
            SoundEffects.playHurt();
            player.invincible = 120; // 2 seconds protection
            respawnEntities();
            checkGoldenBroccoliSpawn(updated);
          }
          return updated;
        });
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
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (prevMapRef.current[r][c] !== mapRef.current[r][c]) {
          if (mapRef.current[r][c] === T_ICE) {
            spawnParticles(c, r, '#6cb33e'); // healthy grass green particles
          } else if (prevMapRef.current[r][c] === T_ICE) {
            spawnParticles(c, r, '#a3e222'); // dirt particles on breakage
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
        const x = c * TILE;
        const y = r * TILE;
        const t = mapRef.current[r][c];

        if (t === T_WALL) {
          // 3D Bone-White Log Fence Block (#CAC6C7)
          const faceTopHeight = TILE * 0.38;
          const frontHeight = TILE - faceTopHeight;

          // 1. Draw Front Face (shaded body of 4 vertical logs)
          ctx.fillStyle = '#A8A4A5'; // Shaded darker bone-white
          ctx.fillRect(x, y + faceTopHeight, TILE, frontHeight);

          // Vertical division lines between the logs
          ctx.strokeStyle = '#5a5758'; 
          ctx.lineWidth = 1.2;
          for (let i = 1; i < 4; i++) {
            const lx = x + i * 10;
            ctx.beginPath();
            ctx.moveTo(lx, y + faceTopHeight);
            ctx.lineTo(lx, y + TILE);
            ctx.stroke();
          }

          // Subtle dry wood grain texture lines
          ctx.strokeStyle = '#858182';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + 4, y + faceTopHeight + 3);
          ctx.quadraticCurveTo(x + 6, y + faceTopHeight + 12, x + 3, y + TILE - 4);
          ctx.moveTo(x + 14, y + faceTopHeight + 5);
          ctx.quadraticCurveTo(x + 12, y + faceTopHeight + 15, x + 15, y + TILE - 2);
          ctx.moveTo(x + 23, y + faceTopHeight + 2);
          ctx.quadraticCurveTo(x + 25, y + faceTopHeight + 10, x + 24, y + TILE - 5);
          ctx.moveTo(x + 34, y + faceTopHeight + 6);
          ctx.quadraticCurveTo(x + 32, y + faceTopHeight + 14, x + 35, y + TILE - 3);
          ctx.stroke();

          // 2. Draw Top Flat Face (tips of the cladded logs)
          // Renders 4 individual circular log caps side by side
          ctx.save();
          ctx.strokeStyle = '#8c8889';
          ctx.lineWidth = 0.8;
          for (let i = 0; i < 4; i++) {
            const lx = x + i * 10;
            ctx.fillStyle = '#CAC6C7'; // Sunlit bone-white top
            ctx.beginPath();
            ctx.ellipse(lx + 5, y + faceTopHeight * 0.5, 4.8, faceTopHeight * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Growth rings inside the log tops
            ctx.strokeStyle = 'rgba(120, 115, 116, 0.4)';
            ctx.beginPath();
            ctx.ellipse(lx + 5, y + faceTopHeight * 0.5, 2.5, faceTopHeight * 0.25, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          // Highlight bevel edge separating top and front faces
          ctx.strokeStyle = '#E0DCDD';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x, y + faceTopHeight);
          ctx.lineTo(x + TILE, y + faceTopHeight);
          ctx.stroke();

          // Overall block outline
          ctx.strokeStyle = '#4a4849';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, TILE, TILE);

        } else if (t === T_ICE) {
          // Saturated Emerald Green destructible grass blocks (Grow scale animation retained)
          const key = `${r}_${c}`;
          const record = grassAgesRef.current[key];
          const ageMs = record ? Date.now() - record.createdAt : 1000;
          const growProgress = Math.min(1, ageMs / 220); // Scale up over 220ms

          if (growProgress < 0.95) {
            ctx.fillStyle = '#065f46'; // dark emerald base
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, (TILE / 2) * (1 - growProgress + 0.3), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.save();
          ctx.translate(x + TILE / 2, y + TILE / 2);
          ctx.scale(growProgress, growProgress);
          ctx.translate(-(x + TILE / 2), -(y + TILE / 2));

          const topH = TILE * 0.38;
          const frontH = TILE - topH;

          // 1. Front face (dense foliage with highly saturated emerald color)
          ctx.fillStyle = '#047857'; // Saturated emerald green (700)
          ctx.fillRect(x, y + topH, TILE, frontH);

          // Highlights / shadows volume overlays
          ctx.fillStyle = '#065f46'; // deep emerald shadow patch
          ctx.beginPath();
          ctx.arc(x + 8, y + topH + 8, 6.5, 0, Math.PI * 2);
          ctx.arc(x + 20, y + topH + 12, 8.5, 0, Math.PI * 2);
          ctx.arc(x + 32, y + topH + 8, 6.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#10b981'; // bright green highlights
          ctx.beginPath();
          ctx.arc(x + 12, y + topH + 6, 4.2, 0, Math.PI * 2);
          ctx.arc(x + 28, y + topH + 5, 4.2, 0, Math.PI * 2);
          ctx.fill();

          // 2. Top face (extremely bright and saturated emerald neon crowns)
          ctx.fillStyle = '#065f46'; // dark base
          ctx.fillRect(x, y, TILE, topH);

          ctx.fillStyle = '#10b981'; // Saturated emerald (500)
          ctx.beginPath();
          ctx.arc(x + 11, y + 6, 7.5, 0, Math.PI * 2);
          ctx.arc(x + 28, y + 8, 6.5, 0, Math.PI * 2);
          ctx.arc(x + 20, y + 12, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#00ff9f'; // Saturated neon-mint tips
          ctx.beginPath();
          ctx.arc(x + 11, y + 6, 4.0, 0, Math.PI * 2);
          ctx.arc(x + 28, y + 8, 3.2, 0, Math.PI * 2);
          ctx.arc(x + 20, y + 11, 4.8, 0, Math.PI * 2);
          ctx.fill();

          // Flowers
          if ((r + c) % 4 === 0) {
            ctx.fillStyle = '#f43f5e'; // Vibrant pink/red
            ctx.beginPath();
            ctx.arc(x + 15, y + 8, 3, 0, Math.PI * 2);
            ctx.arc(x + 24, y + 10, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a'; // Yellow center
            ctx.beginPath();
            ctx.arc(x + 15, y + 8, 1, 0, Math.PI * 2);
            ctx.arc(x + 24, y + 10, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Edge shine
          ctx.strokeStyle = '#a7f3d0';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x, y + topH);
          ctx.lineTo(x + TILE, y + topH);
          ctx.stroke();

          // Block outline
          ctx.strokeStyle = '#022c22';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, TILE, TILE);

          ctx.restore();

        } else {
          // Organic Light Brown Earth (#C78757)
          ctx.fillStyle = '#C78757'; // Base light brown organic dirt
          ctx.fillRect(x, y, TILE, TILE);

          // Soften the grid: draw very subtle grids plus dust clouds in corners
          ctx.strokeStyle = 'rgba(160, 105, 65, 0.22)';
          ctx.lineWidth = 1.0;
          ctx.strokeRect(x, y, TILE, TILE);

          // Shadow/dirt corner accumulations to organically suggest cell borders
          ctx.fillStyle = 'rgba(145, 95, 55, 0.35)';
          ctx.fillRect(x, y, 4, 4);
          ctx.fillRect(x + TILE - 4, y, 4, 4);
          ctx.fillRect(x, y + TILE - 4, 4, 4);
          ctx.fillRect(x + TILE - 4, y + TILE - 4, 4, 4);

          // Deterministic hash value for organic decorations
          const hashVal = Math.abs(Math.sin(r * 12.9898 + c * 78.233)) * 43758.5453;

          // 1. Grains of sand / Porosity spots (light and dark micro-dots)
          ctx.fillStyle = 'rgba(110, 65, 30, 0.45)'; // dark porous dots
          ctx.fillRect(x + 4 + (hashVal % 6), y + 6 + ((hashVal * 3) % 8), 1.2, 1.2);
          ctx.fillRect(x + 22 + (hashVal % 10), y + 14 + ((hashVal * 5) % 12), 1.0, 1.0);
          ctx.fillRect(x + 12 + (hashVal % 8), y + 26 + ((hashVal * 7) % 10), 1.2, 1.2);

          ctx.fillStyle = '#deb089'; // light shiny grains
          ctx.fillRect(x + 8 + (hashVal % 12), y + 18 + ((hashVal * 11) % 6), 1.0, 1.0);
          ctx.fillRect(x + 28 + (hashVal % 6), y + 22 + ((hashVal * 13) % 8), 1.2, 1.2);

          // 2. Occasional gray Pebbles (10% of tiles)
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

          // 3. Occasional dry Twigs (10% of tiles)
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

          // 4. Heavy stepped-on footprint marks from the Bowser turtle (24% of tiles)
          if (hashVal % 5 < 1.2) {
            const hx = x + 12 + (hashVal % 16);
            const hy = y + 12 + ((hashVal * 3) % 16);
            ctx.fillStyle = 'rgba(142, 92, 52, 0.45)'; // Footprint mud depression
            ctx.beginPath();
            ctx.ellipse(hx, hy, 4.5, 2.8, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            // Tiny toe print dots
            ctx.beginPath();
            ctx.arc(hx - 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
            ctx.arc(hx + 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  };

  // Helper draws a clean retro-modern garden turtle character with monocle, eyebrows and 3D textured shell
  const drawGardenTurtle = (
    ctx: CanvasRenderingContext2D,
    px: number, py: number,
    dir: Position,
    frame: number,
    t: number,
    isGolden: boolean
  ) => {
    ctx.save();
    
    // Scale factor: turtle is pleasantly robust, tall, and chunky
    const s = TILE * 0.44; 
    const bob = Math.sin(t * 0.008 + frame) * 1.5;
    const cy = py + bob;

    const playerIsMoving = playerRef.current.moving;
    const wobbleAngle = playerIsMoving ? Math.sin(t * 0.015) * 0.06 : 0;
    const walkOffset = playerIsMoving ? Math.sin(t * 0.015) * 0.18 : 0;

    // 1. Grounded oval shadow directly under the feet (doesn't bob)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.ellipse(px, py + s * 0.58, s * 0.72, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Color palettes for Bowser-style turtle
    const skinColor = isGolden ? '#fef08a' : '#facc15'; // yellow/light-green skin
    const skinShadow = isGolden ? '#f59e0b' : '#ca8a04';
    const skinOutline = isGolden ? '#78350f' : '#5c3e03';

    const shellBase = isGolden ? '#d97706' : '#15803d'; // Green shell base
    const shellHighlight = isGolden ? '#fef08a' : '#4ade80'; 
    const shellOutline = isGolden ? '#78350f' : '#022c22';

    // Helper to draw robust upright walking legs
    const drawUprightLeg = (lx: number, ly: number, legWalkOffset: number) => {
      ctx.save();
      // Apply offset for walking motion
      ctx.translate(lx, ly + legWalkOffset * s * 0.5);
      
      // Robust thick leg body (vertical capsule)
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.16, s * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Scaly textures
      ctx.fillStyle = skinShadow;
      ctx.beginPath();
      ctx.arc(-s * 0.04, -s * 0.04, 1.8, 0, Math.PI * 2);
      ctx.arc(s * 0.04, s * 0.04, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Foot nails/claws facing down
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-s * 0.08, s * 0.22, 2.2, 0, Math.PI * 2);
      ctx.arc(0, s * 0.24, 2.5, 0, Math.PI * 2);
      ctx.arc(s * 0.08, s * 0.22, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // Helper to draw green shell with thick borders and spikes on the back
    const drawShell = () => {
      ctx.save();
      // Wobble rotation
      ctx.translate(px, cy);
      ctx.rotate(wobbleAngle);
      ctx.translate(-px, -cy);

      const shellX = px - dir.x * s * 0.15;
      const shellY = cy - dir.y * s * 0.05;

      // 1. Draw thick cream-white border rim
      ctx.fillStyle = '#f8fafc'; // Cream-white border
      ctx.strokeStyle = shellOutline;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(shellX, shellY, s * 0.78, s * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Inner green shell base
      ctx.fillStyle = shellBase;
      ctx.beginPath();
      ctx.ellipse(shellX, shellY, s * 0.66, s * 0.60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3. Geometric scutes lines
      ctx.strokeStyle = shellOutline;
      ctx.lineWidth = 1.6;
      ctx.save();
      ctx.translate(shellX, shellY);
      const hexSize = s * 0.25;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const hx = Math.cos(angle) * hexSize;
        const hy = Math.sin(angle) * hexSize;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Radiating lines
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * hexSize, Math.sin(angle) * hexSize);
        ctx.lineTo(Math.cos(angle) * s * 0.66, Math.sin(angle) * s * 0.60);
        ctx.stroke();
      }

      // 4. White spikes on the shell (like Bowser)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      
      // Central spike
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer spikes
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + Math.PI / 6;
        const sx = Math.cos(angle) * s * 0.44;
        const sy = Math.sin(angle) * s * 0.40;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
      ctx.restore();
    };

    // Helper to draw the torso and ribbed belly
    const drawBelly = () => {
      ctx.save();
      
      // Main body yellow mass
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(px, cy + s * 0.08, s * 0.52, s * 0.46, wobbleAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Segmented ribbed belly (front shell chestplate, like Bowser)
      if (dir.y >= 0 || dir.x !== 0) {
        ctx.save();
        ctx.translate(px, cy + s * 0.08);
        ctx.rotate(wobbleAngle);

        ctx.fillStyle = '#fef08a'; // Cream yellow belly plate
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.36, s * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Belly rib lines
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.30, -s * 0.18);
        ctx.lineTo(s * 0.30, -s * 0.18);
        ctx.moveTo(-s * 0.36, 0);
        ctx.lineTo(s * 0.36, 0);
        ctx.moveTo(-s * 0.30, s * 0.18);
        ctx.lineTo(s * 0.30, s * 0.18);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    };

    // Helper to draw robust muscular arms (build/break active actions)
    const drawArms = () => {
      const isCasting = playerRef.current.powerCooldown > 0;
      
      // Left Arm
      ctx.save();
      if (isCasting) {
        // Casting action: punch/extend arms forward dramatically
        ctx.translate(px - s * 0.38, cy + s * 0.08);
        ctx.rotate(Math.atan2(dir.y, dir.x) - Math.PI * 0.2);
      } else {
        // Swinging naturally with walking cycle
        ctx.translate(px - s * 0.44, cy + s * 0.08);
        ctx.rotate(Math.PI * 0.6 + walkOffset * 0.28);
      }
      
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.24, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Muscular wristband (black spiked band for Bowser feel)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(s * 0.04, -s * 0.12, 2.5, s * 0.24);

      // Claw hand
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s * 0.18, -2, 2, 0, Math.PI * 2);
      ctx.arc(s * 0.22, 0, 2.2, 0, Math.PI * 2);
      ctx.arc(s * 0.18, 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Right Arm
      ctx.save();
      if (isCasting) {
        ctx.translate(px + s * 0.38, cy + s * 0.08);
        ctx.rotate(Math.atan2(dir.y, dir.x) + Math.PI * 0.2);
      } else {
        ctx.translate(px + s * 0.44, cy + s * 0.08);
        ctx.rotate(-Math.PI * 0.6 - walkOffset * 0.28);
      }
      
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.24, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Spiked wristband
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-s * 0.08, -s * 0.12, 2.5, s * 0.24);

      // Claw hand
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s * 0.18, -2, 2, 0, Math.PI * 2);
      ctx.arc(s * 0.22, 0, 2.2, 0, Math.PI * 2);
      ctx.arc(s * 0.18, 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // Helper to draw head with determined expression, eyebrows and monocle
    const drawHeadAndNeck = () => {
      ctx.save();

      const faceDirX = dir.x;
      const faceDirY = dir.y;

      // 1. Neck (robust, yellow/light green)
      const neckStartX = px + faceDirX * s * 0.12;
      const neckStartY = cy + faceDirY * s * 0.12;
      const neckEndX = px + faceDirX * s * 0.40;
      const neckEndY = cy + faceDirY * s * 0.40 - s * 0.12;

      const perpX = -faceDirY * s * 0.14;
      const perpY = faceDirX * s * 0.14;

      ctx.fillStyle = skinColor;
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(neckStartX - perpX, neckStartY - perpY);
      ctx.lineTo(neckEndX - perpX, neckEndY - perpY);
      ctx.lineTo(neckEndX + perpX, neckEndY + perpY);
      ctx.lineTo(neckStartX + perpX, neckStartY + perpY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 2. Reptile Head
      const hX = neckEndX;
      const hY = neckEndY;
      const headAngle = Math.atan2(faceDirY, faceDirX);

      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.ellipse(hX, hY, s * 0.31, s * 0.25, headAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Determined slanted eyebrows (cejas rojas decididas, inclinadas hacia el centro)
      const eyeOffsetDist = s * 0.11;
      const eyeLX = hX - faceDirY * eyeOffsetDist + faceDirX * s * 0.04;
      const eyeLY = hY + faceDirX * eyeOffsetDist + faceDirY * s * 0.04;
      const eyeRX = hX + faceDirY * eyeOffsetDist + faceDirX * s * 0.04;
      const eyeRY = hY - faceDirX * eyeOffsetDist + faceDirY * s * 0.04;

      ctx.fillStyle = '#dc2626'; // cejas rojas
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 0.8;

      // Left eyebrow slanted down-right
      ctx.save();
      ctx.translate(eyeLX, eyeLY - 3);
      ctx.rotate(headAngle - 0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.12, s * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Right eyebrow slanted down-left
      ctx.save();
      ctx.translate(eyeRX, eyeRY - 3);
      ctx.rotate(headAngle + 0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.12, s * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Draw Eye helper with monocle integration
      const drawIndividualEye = (ex: number, ey: number, hasMonocle: boolean) => {
        ctx.save();
        // White eyeball
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = skinOutline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ex, ey, s * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dark pupil
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ex + faceDirX * 1.5, ey + faceDirY * 0.8, s * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Reflection glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + faceDirX * 2 - 0.3, ey + faceDirY * 0.8 - 0.3, 0.7, 0, Math.PI * 2);
        ctx.fill();

        if (hasMonocle) {
          // Gold monocle rim
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.12, 0, Math.PI * 2);
          ctx.stroke();

          // Glass blue tint
          ctx.fillStyle = 'rgba(14, 165, 233, 0.24)';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.11, 0, Math.PI * 2);
          ctx.fill();

          // Monocle sheen reflection
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(ex - s * 0.06, ey - s * 0.06);
          ctx.lineTo(ex + s * 0.06, ey + s * 0.06);
          ctx.stroke();

          // Chain
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(ex, ey + s * 0.12);
          ctx.quadraticCurveTo(ex + faceDirY * s * 0.08, ey + s * 0.3, px + faceDirX * s * 0.22, cy + faceDirY * s * 0.15);
          ctx.stroke();
        }

        ctx.restore();
      };

      drawIndividualEye(eyeLX, eyeLY, false);
      drawIndividualEye(eyeRX, eyeRY, true);

      // Snout and confident smirk mouth
      ctx.strokeStyle = skinOutline;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const mouthX = hX + faceDirX * s * 0.13;
      const mouthY = hY + faceDirY * s * 0.13 + s * 0.06;
      ctx.arc(mouthX, mouthY, 2.2, 0, Math.PI * 0.8, false);
      ctx.stroke();

      ctx.restore();
    };

    // Draw upright walking legs first
    drawUprightLeg(px - s * 0.22, cy + s * 0.44, walkOffset);
    drawUprightLeg(px + s * 0.22, cy + s * 0.44, -walkOffset);

    // Layering based on direction
    const headBehindShell = dir.y < 0;

    if (headBehindShell) {
      drawHeadAndNeck();
      drawBelly();
      drawArms();
      drawShell();
    } else {
      drawShell();
      drawBelly();
      drawArms();
      drawHeadAndNeck();
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
    const s = TILE * 0.42;
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
          // Semi-visible translucent overlay representation when inside grass
          ctx.globalAlpha = 0.5;
          const pulse = 0.95 + Math.sin(t * 0.012 + f.anim) * 0.12;
          const jiggleX = Math.cos(t * 0.025 + f.anim) * 1.5;

          ctx.translate(px + jiggleX, yBob);
          ctx.scale(pulse, pulse);
          ctx.translate(-px, -yBob);
        }

        if (f.type === 3) {
          // 🍎 Apple vector representation with 3D Sphere Radial Gradient
          const appleGrad = ctx.createRadialGradient(px - 2, yBob - 2, 1, px, yBob + 1, 9);
          appleGrad.addColorStop(0, '#fca5a5'); // glint light
          appleGrad.addColorStop(0.2, '#ef4444'); // red body
          appleGrad.addColorStop(1, '#7f1d1d'); // shadow red edge

          ctx.fillStyle = appleGrad;
          ctx.beginPath();
          ctx.arc(px - 4, yBob + 1, 8.5, 0, Math.PI * 2);
          ctx.arc(px + 4, yBob + 1, 8.5, 0, Math.PI * 2);
          ctx.fill();

          // Dark outline
          ctx.strokeStyle = '#7f1d1d';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px - 4, yBob + 1, 8.5, 0.3, Math.PI * 1.8);
          ctx.arc(px + 4, yBob + 1, 8.5, -Math.PI * 0.8, Math.PI * 0.7);
          ctx.stroke();

          // Brown Stem
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px, yBob - 5);
          ctx.quadraticCurveTo(px + 2, yBob - 10, px + 5, yBob - 12);
          ctx.stroke();

          // Cute green leaf
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(px + 3, yBob - 9, 4, 2, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#166534';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // High glint shine reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(px - 4, yBob - 3, 2.5, 0, Math.PI * 2);
          ctx.fill();

        } else if (f.type === 4) {
          // 🍊 Orange vector representation with 3D Gloss Gradient
          const orangeGrad = ctx.createRadialGradient(px - 2, yBob - 3, 2, px, yBob + 1, 10);
          orangeGrad.addColorStop(0, '#ffedd5'); // sweet shine
          orangeGrad.addColorStop(0.3, '#f97316'); // orange core
          orangeGrad.addColorStop(1, '#9a3412'); // shadow edge

          ctx.fillStyle = orangeGrad;
          ctx.beginPath();
          ctx.arc(px, yBob + 1, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#9a3412';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Orange surface bumps texture points
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(px - 3, yBob + 3, 1.5, 1.5);
          ctx.fillRect(px + 4, yBob - 2, 1.5, 1.5);

          // Small brown stump stem
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px - 1, yBob - 9, 2, 2.5);

          // Green leaf
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.ellipse(px - 3, yBob - 9.5, 4, 2.2, Math.PI / 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#14532d';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // High glint shine reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(px - 3.5, yBob - 3, 2.5, 0, Math.PI * 2);
          ctx.fill();

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

        // Star glint sparkles loop around uncovered active fruits
        if (!isCovered) {
          const sa = t * 0.05 + f.anim;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const angle = sa + i * Math.PI / 2;
            const r1 = TILE * 0.32;
            const r2 = TILE * 0.42;
            ctx.beginPath();
            ctx.moveTo(px + Math.cos(angle) * r1, py + bob + Math.sin(angle) * r1);
            ctx.lineTo(px + Math.cos(angle) * r2, py + bob + Math.sin(angle) * r2);
            ctx.stroke();
          }
        }

        ctx.restore();
      });
    };

    const drawIndicatorCell = (ctx: CanvasRenderingContext2D, col: number, row: number, isBreaking: boolean) => {
      const fx = col * TILE + TILE / 2;
      const fy = row * TILE + TILE / 2;

      ctx.fillStyle = isBreaking ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)';
      ctx.fillRect(col * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);

      ctx.strokeStyle = isBreaking ? 'rgba(239, 68, 68, 0.85)' : 'rgba(34, 197, 94, 0.85)';
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
        // Green Plus sign
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
        ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
        ctx.stroke();
      }
    };

    const drawPlayerIndicators = (ctx: CanvasRenderingContext2D) => {
      const player = playerRef.current;
      const dir = player.dir;
      const powerCount = Math.min(4, Math.max(1, Math.floor(score / 2) + 1));

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
      drawGardenTurtle(ctx, px, py, player.dir, player.animFrame, t, isGolden);

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

        // Overlay status indicator badge with high-contrast glowing design
        ctx.save();
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0d1117';
        ctx.lineWidth = 2.5;

        const label = e.type === 'patrol' ? '👁' : e.type === 'chaser' ? '🎯' : '👻';
        ctx.strokeText(label, e.x - 6, e.y - TILE * 0.55);
        ctx.fillText(label, e.x - 6, e.y - TILE * 0.55);
        ctx.restore();
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
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
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
          updatePlayer();
          enemiesRef.current.forEach(e => updateEnemy(e));
          checkCollisions();
          detectMapChanges();
        }

        // Render game layers
        drawMap(ctx);
        renderParticlesAndFlush(ctx);
        drawFruits(ctx, timestamp);

        if (['playing', 'dead', 'win', 'paused'].includes(gameState)) {
          drawPlayerMain(ctx, timestamp);
          drawEnemies(ctx, timestamp);
        }

        requestAnimationFrame(renderLoop);
      };

      const animId = requestAnimationFrame(renderLoop);
      return () => {
        isSubscribed = false;
        cancelAnimationFrame(animId);
      };
    }, [gameState, score, levelPhase, lives]);

    return (
      <div className="relative overflow-hidden rounded-2xl border-4 border-[#5c3a21] bg-gradient-to-b from-[#1a0e05] to-[#2d1a10] p-1.5 shadow-2xl shadow-black/80">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full max-w-full rounded-lg bg-[#160d07] object-contain touch-none"
        />

        {/* Action instruction labels within footer of canvas */}
        {gameState === 'playing' && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center rounded-xl bg-gradient-to-r from-[#4b301a] via-[#2f1c0e] to-[#4b301a] border-2 border-[#814e20] px-3.5 py-2 text-xs text-[#fef08a] shadow-[inset_0_2px_8px_rgba(0,0,0,0.85),0_4px_10px_rgba(0,0,0,0.6)] backdrop-blur-md xs:text-[10px] md:text-xs">
            <span className="flex items-center gap-1.5">
              <span className="rounded-lg bg-[#5c3a21] border border-[#a1622e] px-2 py-1 text-[11px] font-mono font-bold text-[#fef3c7] shadow-sm flex items-center gap-1">
                🌱 Espacio / F
              </span>
              <span className="font-sans font-bold text-[#fef08a]/90">Crear Pasto</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rounded-lg bg-[#5c3a21] border border-[#a1622e] px-2 py-1 text-[11px] font-mono font-bold text-[#fef3c7] shadow-sm flex items-center gap-1">
                🍂 Shift / C
              </span>
              <span className="font-sans font-bold text-[#fef08a]/90">Quitar</span>
            </span>
            {playerRef.current.goldenBroccoliTimer > 0 && (
              <span className="animate-pulse font-sans font-extrabold text-[#facc15] flex items-center gap-1">
                🥦 Atravesar Pasto Activo!
              </span>
            )}
          </div>
        )}
      </div>
    );
  };
export default GameCanvas;
