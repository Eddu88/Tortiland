import React from 'react';
import { GameState, LevelPhase, Player, Enemy, Fruit, Particle, TileType, Position, ScheduledBreak } from '../types';
import { COLS, ROWS, TILE, T_EMPTY, T_WALL, T_BUSH, T_BURROW, LEVELS } from '../constants';
import { SoundEffects } from '../components/SoundEffects';
import {
  buildBaseMap,
  isWall,
  isBush,
  isEmpty,
  isSolid,
  findRandomEmptyCell,
} from '../utils/map';

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
  levelScore: number;
  setLevelScore: React.Dispatch<React.SetStateAction<number>>;
  setFruitsLeft: (n: number) => void;
  setGoldenBroccoliTimer: (t: number) => void;
  setGameState: (s: GameState) => void;
  setLevelPhase: (p: LevelPhase) => void;
  tileReadyRef: React.MutableRefObject<number[][]>;
  scheduledPlantsRef: React.MutableRefObject<{ col: number; row: number; triggerAt: number }[]>;
  scheduledBreaksRef: React.MutableRefObject<ScheduledBreak[]>;
  frameCountRef: React.MutableRefObject<number>;
  awaitingBurrowRef: React.MutableRefObject<boolean>;
  currentLevelIndex: number;
  goldenBroccoliUsedRef: React.MutableRefObject<boolean>;
  usedGoldenBroccoliRef: React.MutableRefObject<boolean>;
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
}: UseGameEntitiesProps) => {

  const levelConfig = LEVELS[currentLevelIndex];

  const getPowerCount = () => {
    if (playerRef.current.goldenBroccoliTimer > 0) {
      return 10;
    }
    return Math.min(10, levelScore + 1);
  };


  const spawnFruitInMap = (type: number) => {
    const pos = findRandomEmptyCell(
      mapRef.current,
      playerRef.current.col,
      playerRef.current.row,
      fruitsRef.current,
      18,
      13
    );
    if (pos) {
      fruitsRef.current.push({
        col: pos.col,
        row: pos.row,
        type: type,
        anim: Math.random() * Math.PI * 2,
      });
    }
  };

  const findCellNearPlayer = (): { col: number; row: number } | null => {
    const player = playerRef.current;
    const candidates: { col: number; row: number; dist: number }[] = [];
    for (let c = 1; c < COLS - 1; c++) {
      for (let r = 1; r < ROWS - 1; r++) {
        const dist = Math.abs(c - player.col) + Math.abs(r - player.row);
        if (dist < 3 || dist > 5) continue;
        if (mapRef.current[r][c] !== T_EMPTY) continue;
        if (fruitsRef.current.some(f => f.col === c && f.row === r)) continue;
        if (c >= 8 && c <= 11 && r >= 5 && r <= 8) continue;
        if (c === 18 && r === 13) continue;
        candidates.push({ col: c, row: r, dist });
      }
    }
    if (candidates.length === 0) {
      return findRandomEmptyCell(mapRef.current, player.col, player.row, fruitsRef.current, 18, 13);
    }
    candidates.sort((a, b) => a.dist - b.dist);
    return candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
  };

  const checkGoldenBroccoliSpawn = (currentLives: number) => {
    // Solo permitido si: 1 vida Y no se ha usado ya en este nivel
    if (currentLives !== 1) return;
    if (goldenBroccoliUsedRef.current) return;

    const hasGolden = fruitsRef.current.some(f => f.type === 5);
    if (hasGolden) return;

    const pos = findCellNearPlayer();
    if (pos) {
      fruitsRef.current.push({
        col: pos.col,
        row: pos.row,
        type: 5,
        anim: Math.random() * Math.PI * 2,
      });
    } else {
      spawnFruitInMap(5);
    }

    goldenBroccoliUsedRef.current = true; // Marcar como usado para este nivel

    // Sync fruits left
    const targetType = levelPhase === 'tomatoes' ? 3 : levelPhase === 'carrots' ? 4 : 6;
    const freshCount = fruitsRef.current.filter(f => f.type === targetType).length;
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
    goldenBroccoliUsedRef.current = false; // ← agregar esta línea al inicio
    usedGoldenBroccoliRef.current = false;
    awaitingBurrowRef.current = false;
    grassAgesRef.current = {};
    scheduledPlantsRef.current = [];
    scheduledBreaksRef.current = [];
    mapRef.current = buildBaseMap(levelConfig.innerWalls, grassAgesRef.current);
    tileReadyRef.current = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

    // Initialize Torti's House (T_BURROW)
    mapRef.current[13][18] = T_BURROW;

    // Initial bush blocks (distributed in free cells)
    levelConfig.initialBushes.forEach(([r, c]) => {
      if (mapRef.current[r]?.[c] === T_EMPTY) {
        mapRef.current[r][c] = T_BUSH;
        const key = `${r}_${c}`;
        grassAgesRef.current[key] = { createdAt: Date.now() - 5000 };
      }
    });

    // Reset player parameters safely
    playerRef.current = {
      col: levelConfig.playerStartCol, row: levelConfig.playerStartRow,
      x: levelConfig.playerStartCol * TILE + TILE / 2, y: levelConfig.playerStartRow * TILE + TILE / 2,
      targetCol: levelConfig.playerStartCol, targetRow: levelConfig.playerStartRow,
      moving: false,
      dir: { x: 1, y: 0 },
      speed: 156, // Velocidad fija en px/s (era 120)
      animFrame: 0, animTimer: 0,
      invincible: 0, // no protection on load
      goldenBroccoliTimer: 0,
      powerCooldown: 0,
      plantingAnimTimer: 0,
      breakingAnimTimer: 0,
      deathAnimTimer: 0,
    };

    // Spawn core fruits (tomatoes initially)
    fruitsRef.current = [];
    setLevelPhase('tomatoes');
    for (let i = 0; i < 5; i++) {
      spawnFruitInMap(3);
    }
    checkGoldenBroccoliSpawn(currentLives);

    // Load Enemies
    enemiesRef.current = levelConfig.enemies.map(e => ({
      id: e.id,
      type: e.type,
      col: e.col,
      row: e.row,
      x: e.col * TILE + TILE / 2,
      y: e.row * TILE + TILE / 2,
      targetCol: e.col,
      targetRow: e.row,
      moving: false,
      dir: e.type === 'chaser' ? { x: -1, y: 0 } : { x: 0, y: -1 },
      speed: e.speed,
      chaseTimer: 16, // 1 frame en ms
      animFrame: 0,
      animTimer: 0,
    }));

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
        player.goldenBroccoliTimer = 10000; // 10 seconds of grass-piercing glory (ms)
        setGoldenBroccoliTimer(10);
        usedGoldenBroccoliRef.current = true; // ← confirmar consumo
        SoundEffects.playPowerUp();
        spawnParticles(player.col, player.row, '#ffd700');
      } else {
        // Safe standard fruits
        setScore(prev => prev + 1);
        setLevelScore(prev => prev + 1);
        SoundEffects.playCollect();
        spawnParticles(player.col, player.row, '#ffffff');
      }

      // Check state advancement
      const targetFruitsCount = currentFruits.filter(f => f.type === (levelPhase === 'tomatoes' ? 3 : (levelPhase === 'carrots' ? 4 : 6))).length;
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
        } else if (levelPhase === 'carrots') {
          if (currentLevelIndex >= 3) {
            // Switch to Beets phase (Level 4, 5, 6)
            setLevelPhase('beets');
            fruitsRef.current = fruitsRef.current.filter(f => f.type !== 5); // Flush active golden broccoli
            // Spawn beets
            for (let i = 0; i < 5; i++) {
              spawnFruitInMap(6);
            }
            checkGoldenBroccoliSpawn(lives);
          } else {
            // Carrots phase complete! The escape house is now active.
            if (fruitsRef.current.filter(f => f.type !== 5).length === 0) {
              awaitingBurrowRef.current = true;
            }
          }
        } else if (levelPhase === 'beets') {
          // Beets phase complete! The escape house is now active.
          if (fruitsRef.current.filter(f => f.type !== 5).length === 0) {
            awaitingBurrowRef.current = true;
          }
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
        if (isSolid(nc, nr, mapRef.current, ghostMode)) continue;

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
      const fallback = DIRS.filter(d => !isSolid(e.col + d.x, e.row + d.y, mapRef.current, ghostMode));
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

  const updatePlayer = (deltaMs: number) => {
    const player = playerRef.current;
    if (player.invincible > 0) {
      player.invincible -= deltaMs;
      if (player.invincible < 0) player.invincible = 0;
    }

    if (player.goldenBroccoliTimer > 0) {
      player.goldenBroccoliTimer -= deltaMs;
      if (player.goldenBroccoliTimer < 0) player.goldenBroccoliTimer = 0;
      setGoldenBroccoliTimer(Math.ceil(player.goldenBroccoliTimer / 1000));
    } else {
      setGoldenBroccoliTimer(0);
    }

    if (player.powerCooldown > 0) {
      player.powerCooldown -= deltaMs;
      if (player.powerCooldown < 0) player.powerCooldown = 0;
    }
    if (player.plantingAnimTimer > 0) {
      player.plantingAnimTimer -= deltaMs;
      if (player.plantingAnimTimer < 0) player.plantingAnimTimer = 0;
    }
    if (player.breakingAnimTimer > 0) {
      player.breakingAnimTimer -= deltaMs;
      if (player.breakingAnimTimer < 0) player.breakingAnimTimer = 0;
    }

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
          if (!isSolid(nc, nr, mapRef.current, false, true, player.goldenBroccoliTimer > 0, awaitingBurrowRef.current) && readyFrame <= frameCountRef.current) {
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
      if (mapRef.current[player.targetRow]?.[player.targetCol] === T_BUSH && !player.goldenBroccoliTimer) {
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

        const step = (player.speed * deltaMs) / 1000;

        if (dist <= step) {
          player.x = tx;
          player.y = ty;
          player.col = player.targetCol;
          player.row = player.targetRow;
          player.moving = false;

          checkFruitPickup();

          // Check escape victory condition when Torti enters the house cell and escape is active
          if (player.col === 18 && player.row === 13 && awaitingBurrowRef.current) {
            // Calculate stars:
            // 0 stars: consumed golden broccoli during level
            // 1 star: finished with 1 life, no golden broccoli
            // 2 stars: finished with 2 lives, no golden broccoli
            const stars = usedGoldenBroccoliRef.current ? 0 : (lives === 1 ? 1 : lives === 2 ? 2 : 0);
            const levelNum = currentLevelIndex + 1;

            // Save to localStorage
            const prevStars = parseInt(localStorage.getItem(`tortiland_stars_${levelNum}`) || '0', 10);
            if (stars > prevStars) {
              localStorage.setItem(`tortiland_stars_${levelNum}`, String(stars));
            }

            // Sync max unlocked level
            const maxUnlocked = parseInt(localStorage.getItem('tortiland_max_level') || '1', 10);
            const nextLevel = currentLevelIndex + 2; // currentLevelIndex is 0-based
            if (nextLevel > maxUnlocked && nextLevel <= 6) {
              localStorage.setItem('tortiland_max_level', String(nextLevel));
            }

            if (currentLevelIndex < LEVELS.length - 1) {
              setGameState('level_complete');
              SoundEffects.playVictory();
            } else {
              setGameState('win');
              SoundEffects.playVictory();
            }
          }
        } else {
          player.x += (dx / dist) * step;
          player.y += (dy / dist) * step;
        }
      }
    }

    // Animate sprite frames
    player.animTimer += deltaMs;
    if (player.animTimer > 133) { // 8 frames * 16.67ms ≈ 133ms
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % 4;
    }
  };

  const updateEnemy = (e: Enemy, deltaMs: number) => {
    const ghost = e.type === 'ghost';

    if (!e.moving) {
      e.chaseTimer -= deltaMs;
      let newDir;

      if (e.chaseTimer <= 0) {
        newDir = findChaseDirection(e, ghost);
        if (e.type === 'patrol') {
          e.chaseTimer = 67 + Math.floor(Math.random() * 67); // patrol=4~8 frames → 67~133ms
        } else if (e.type === 'chaser') {
          e.chaseTimer = 16; // chaser=1 frame → 16ms
        } else {
          e.chaseTimer = 50; // ghost=3 frames → 50ms
        }
      } else {
        newDir = e.dir;
      }

      const nc0 = e.col + newDir.x;
      const nr0 = e.row + newDir.y;
      if (isSolid(nc0, nr0, mapRef.current, ghost)) {
        newDir = findChaseDirection(e, ghost);
        e.chaseTimer = 16; // 1 frame en ms
      }

      e.dir = newDir;
      const nc = e.col + newDir.x;
      const nr = e.row + newDir.y;

      if (!isSolid(nc, nr, mapRef.current, ghost)) {
        e.targetCol = nc;
        e.targetRow = nr;
        e.moving = true;
      }
    }

    if (e.moving) {
      if (mapRef.current[e.targetRow]?.[e.targetCol] === T_BUSH && !ghost) {
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

        const step = (e.speed * deltaMs) / 1000;

        if (dist <= step) {
          e.x = tx;
          e.y = ty;
          e.col = e.targetCol;
          e.row = e.targetRow;
          e.moving = false;
        } else {
          e.x += (dx / dist) * step;
          e.y += (dy / dist) * step;
        }
      }
    }

    e.animTimer += deltaMs;
    if (e.animTimer > 150) { // 9 frames * 16.67ms ≈ 150ms
      e.animTimer = 0;
      e.animFrame = (e.animFrame + 1) % 4;
    }
  };

  const checkCollisions = () => {
    const player = playerRef.current;
    if (player.invincible > 0 || player.deathAnimTimer > 0 || player.goldenBroccoliTimer > 0) return;

    for (const e of enemiesRef.current) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TILE * 0.72) {
        // Trigger arcade death sequence!
        SoundEffects.playHurt();
        player.deathAnimTimer = 3000; // 3000ms (3s) of cartoon shock, shell refuge, and fall-out
        return;
      }
    }
  };

  const respawnEntities = (config = levelConfig) => {
    const player = playerRef.current;
    player.col = config.playerStartCol;
    player.row = config.playerStartRow;
    player.x = config.playerStartCol * TILE + TILE / 2;
    player.y = config.playerStartRow * TILE + TILE / 2;
    player.targetCol = config.playerStartCol;
    player.targetRow = config.playerStartRow;
    player.moving = false;

    enemiesRef.current = config.enemies.map((e, idx) => {
      const existing = enemiesRef.current[idx];
      return {
        id: e.id,
        type: e.type,
        col: e.col,
        row: e.row,
        x: e.col * TILE + TILE / 2,
        y: e.row * TILE + TILE / 2,
        targetCol: e.col,
        targetRow: e.row,
        moving: false,
        dir: existing?.dir || (e.type === 'chaser' ? { x: -1, y: 0 } : { x: 0, y: -1 }),
        speed: e.speed,
        chaseTimer: 16, // 1 frame en ms
        animFrame: existing?.animFrame || 0,
        animTimer: existing?.animTimer || 0,
      };
    });
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
          if (mapRef.current[r]?.[c] === T_BUSH) {
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
