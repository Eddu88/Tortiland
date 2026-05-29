import React from 'react';
import { GameState, LevelPhase, Player, Enemy, Fruit, Particle, TileType, Position } from '../types';
import { COLS, ROWS, TILE, T_EMPTY, T_WALL, T_ICE, INNER_WALLS } from '../constants';
import { SoundEffects } from '../components/SoundEffects';

interface UseGameEntitiesProps {
  playerRef: React.MutableRefObject<Player>;
  enemiesRef: React.MutableRefObject<Enemy[]>;
  fruitsRef: React.MutableRefObject<Fruit[]>;
  particlesRef: React.MutableRefObject<Particle[]>;
  prevMapRef: React.MutableRefObject<TileType[][] | null>;
  grassAgesRef: React.MutableRefObject<{ [key: string]: { createdAt: number } }>;
  mapRef: React.MutableRefObject<TileType[][]>;
  keysRef: React.MutableRefObject<{ [code: string]: boolean }>;
  keysPressTimeRef: React.MutableRefObject<{ [code: string]: number }>;
  lastDirRef: React.MutableRefObject<Position | null>;
  turnBlockedRef: React.MutableRefObject<boolean>;
  lives: number;
  levelPhase: LevelPhase;
  gameState: GameState;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setFruitsLeft: (n: number) => void;
  setGoldenBroccoliTimer: (t: number) => void;
  setGameState: (s: GameState) => void;
  setLevelPhase: (p: LevelPhase) => void;
  tileReadyRef: React.MutableRefObject<number[][]>;
  scheduledPlantsRef: React.MutableRefObject<{ col: number; row: number; triggerAt: number }[]>;
  frameCountRef: React.MutableRefObject<number>;
}

export const useGameEntities = ({
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
}: UseGameEntitiesProps) => {

  const getPowerCount = () => {
    if (playerRef.current.goldenBroccoliTimer > 0) {
      return 10;
    }
    return Math.min(10, score + 1);
  };

  const isWall = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    return mapRef.current[row]?.[col] === T_WALL;
  };

  const isIce = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return mapRef.current[row]?.[col] === T_ICE;
  };

  const isSolid = (col: number, row: number, ghostMode = false, isPlayer = false) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    if (mapRef.current[row]?.[col] === T_WALL) return true;
    if (mapRef.current[row]?.[col] === T_ICE) {
      if (isPlayer && playerRef.current.goldenBroccoliTimer > 0) return false;
      return true;
    }
    return false;
  };

  const isEmpty = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return mapRef.current[row]?.[col] === T_EMPTY;
  };

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

  const findRandomEmptyCell = (): { col: number; row: number } | null => {
    let tries = 0;
    while (tries++ < 500) {
      const c = 1 + Math.floor(Math.random() * (COLS - 2));
      const r = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (mapRef.current[r]?.[c] !== T_EMPTY) continue;
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

  const initLevel = (currentLives: number) => {
    mapRef.current = buildBaseMap();
    grassAgesRef.current = {};
    tileReadyRef.current = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

    // Initial ice/grass blocks (distributed in free cells)
    const icePositions = [
      [3, 5], [3, 15], [5, 9], [7, 3], [7, 13], [9, 7], [11, 11], [13, 17]
    ];
    icePositions.forEach(([r, c]) => {
      if (mapRef.current[r]?.[c] === T_EMPTY) {
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
      // NUEVO: No iniciar movimiento mientras se está sembrando
      if (player.plantingAnimTimer > 0) return;

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
          const readyFrame = tileReadyRef.current[nr]?.[nc] ?? 0;
          if (!isSolid(nc, nr, false, true) && readyFrame <= frameCountRef.current) {
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
      if (mapRef.current[player.targetRow]?.[player.targetCol] === T_ICE && !player.goldenBroccoliTimer) {
        player.moving = false;
        player.x = player.col * TILE + TILE / 2;
        player.y = player.row * TILE + TILE / 2;
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
      if (mapRef.current[e.targetRow]?.[e.targetCol] === T_ICE) {
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
        if (prevMapRef.current[r]?.[c] !== mapRef.current[r]?.[c]) {
          if (mapRef.current[r]?.[c] === T_ICE) {
            // Only spawn radial green particles for other map changes (e.g. initLevel)
            if (player.plantingAnimTimer === 0) {
              spawnParticles(c, r, '#4caf50'); // vibrant leaf green grow particles
            }
          }
        }
      }
    }
    prevMapRef.current = mapRef.current.map(r => [...r]);
  };

  return {
    spawnParticles,
    findRandomEmptyCell,
    spawnFruitInMap,
    checkGoldenBroccoliSpawn,
    initLevel,
    checkFruitPickup,
    findChaseDirection,
    updatePlayer,
    updateEnemy,
    checkCollisions,
    respawnEntities,
    detectMapChanges,
    getPowerCount,
  };
};
