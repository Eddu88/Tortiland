/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { GameState, LevelPhase, Player, Enemy, Fruit, Particle, TileType, GridPos, LevelConfig, ScheduledBreak } from '../types';
import { T_EMPTY, T_BUSH, LEVELS, FRAME_MS } from '../constants';
import { SoundEffects } from '../components/SoundEffects';

interface UseGameLoopProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameState: GameState;
  score: number;
  levelPhase: LevelPhase;
  lives: number;
  setLives: React.Dispatch<React.SetStateAction<number>>;
  setGameState: (s: GameState) => void;
  playerRef: React.MutableRefObject<Player>;
  enemiesRef: React.MutableRefObject<Enemy[]>;
  fruitsRef: React.MutableRefObject<Fruit[]>;
  particlesRef: React.MutableRefObject<Particle[]>;
  mapRef: React.MutableRefObject<TileType[][]>;
  breakingTilesRef: React.MutableRefObject<GridPos[]>;
  plantingTilesRef: React.MutableRefObject<GridPos[]>;
  grassAgesRef: React.MutableRefObject<{ [key: string]: { createdAt: number } }>;
  dyingBushesRef: React.MutableRefObject<{ col: number; row: number; alpha: number; variant: number }[]>;
  updatePlayer: (deltaMs: number) => void;
  updateEnemy: (e: Enemy, deltaMs: number) => void;
  checkCollisions: () => void;
  respawnEntities: (config?: LevelConfig) => void;
  checkGoldenBroccoliSpawn: (currentLives: number) => void;
  spawnParticles: (col: number, row: number, color: string, dir?: { x: number; y: number }, isDirt?: boolean) => void;
  detectMapChanges: () => void;
  frameCountRef: React.MutableRefObject<number>;
  scheduledPlantsRef: React.MutableRefObject<{ col: number; row: number; triggerAt: number }[]>;
  scheduledBreaksRef: React.MutableRefObject<ScheduledBreak[]>;
  tileReadyRef: React.MutableRefObject<number[][]>;
  onRender: (ctx: CanvasRenderingContext2D, timestamp: number) => void;
  currentLevelIndex: number;
}

export const useGameLoop = ({
  canvasRef,
  gameState,
  levelPhase,
  lives,
  setLives,
  setGameState,
  playerRef,
  enemiesRef,
  fruitsRef,
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
}: UseGameLoopProps) => {

  // Frame Request Gameloop Execution
  useEffect(() => {
    let isSubscribed = true;
    let lastTime = 0;

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

      const deltaMs = lastTime === 0 ? FRAME_MS : Math.min(timestamp - lastTime, 50);
      lastTime = timestamp;

      frameCountRef.current += deltaMs;

      if (gameState === 'playing') {
        const player = playerRef.current;

        // Update dying bushes alpha
        const db = dyingBushesRef.current;
        for (let i = db.length - 1; i >= 0; i--) {
          db[i].alpha -= (0.06 * deltaMs) / FRAME_MS;
          if (db[i].alpha <= 0) {
            db.splice(i, 1);
          }
        }

        // Escape active particles
        const escapeActive = fruitsRef.current.filter(f => f.type !== 5).length === 0;
        if (escapeActive && Math.floor(frameCountRef.current / 500) !== Math.floor((frameCountRef.current - deltaMs) / 500)) {
          const randomCol = 17 + Math.floor(Math.random() * 3);
          const randomRow = 12 + Math.floor(Math.random() * 3);
          spawnParticles(randomCol, randomRow, '#5ec263', { x: 0, y: -1 });
        }

        // Process scheduled plants
        scheduledPlantsRef.current.forEach(plant => {
          if (plant.triggerAt > 0) {
            plant.triggerAt -= deltaMs;
            if (plant.triggerAt <= 0) {
              plant.triggerAt = 0;
              mapRef.current[plant.row][plant.col] = T_BUSH;
              const key = `${plant.row}_${plant.col}`;
              grassAgesRef.current[key] = { createdAt: Date.now() };
              // Spawn brown dirt particles!
              spawnParticles(plant.col, plant.row, '#8B5E3C', undefined, true);
              SoundEffects.playBuild();
            }
          }
        });

        // Filter active schedules
        scheduledPlantsRef.current = scheduledPlantsRef.current.filter(p => p.triggerAt > 0);

        // Process scheduled breaks
        scheduledBreaksRef.current.forEach(b => {
          if (b.triggerAt > 0) {
            b.triggerAt -= deltaMs;
            if (b.triggerAt <= 0) {
              b.triggerAt = 0;
              mapRef.current[b.row][b.col] = T_EMPTY;
              const hashVal = Math.abs(Math.sin(b.row * 12.9898 + b.col * 78.233)) * 43758.5453;
              const variant = Math.floor(hashVal % 3);
              dyingBushesRef.current.push({ col: b.col, row: b.row, alpha: 1.0, variant });
              // Directional leaf particles!
              spawnParticles(b.col, b.row, '#4caf50', b.dir);
              spawnParticles(b.col, b.row, '#2e7d32', b.dir);
              SoundEffects.playBreak();
            }
          }
        });

        // Filter active scheduled breaks
        scheduledBreaksRef.current = scheduledBreaksRef.current.filter(b => b.triggerAt > 0);

        // Trigger Break action at start of tick 48 (Impact) - recalculated for 620ms timer
        if (player.breakingAnimTimer <= 415 && player.breakingAnimTimer > 398 && breakingTilesRef.current.length > 0) {
          breakingTilesRef.current.forEach(({ col, row }, index) => {
            const delay = index * 54; // 54ms delay
            scheduledBreaksRef.current.push({
              col,
              row,
              triggerAt: 16 + delay, // 1 frame en ms + delay
              dir: { ...player.dir }
            });
          });
          breakingTilesRef.current = [];
        }

        // Trigger Plant action at start of tick 48 (Lanzamiento) - recalculated for 620ms timer
        if (player.plantingAnimTimer <= 415 && player.plantingAnimTimer > 398 && plantingTilesRef.current.length > 0) {
          plantingTilesRef.current.forEach(({ col, row }, index) => {
            const delay = index * 54; // 54ms delay
            const triggerOffset = 155 + delay; // 155ms trigger offset
            scheduledPlantsRef.current.push({ col, row, triggerAt: triggerOffset });

            // Set individual ready frame
            tileReadyRef.current[row][col] = frameCountRef.current + triggerOffset;
          });
          plantingTilesRef.current = [];
        }

        if (player.deathAnimTimer > 0) {
          player.deathAnimTimer -= deltaMs;
          if (player.deathAnimTimer <= 0) {
            player.deathAnimTimer = 0;
            // Death animation completed! Handle life reduction and respawn/gameover
            setLives((prev: number) => {
              const updated = prev - 1;
              if (updated <= 0) {
                setGameState('gameover');
                SoundEffects.playGameOver();
              } else {
                player.invincible = 2000; // 2 seconds protection (ms)
                const levelConfig = LEVELS[currentLevelIndex];
                respawnEntities(levelConfig);
                checkGoldenBroccoliSpawn(updated);
              }
              return updated;
            });
          }
        } else if (player.breakingAnimTimer <= 415 && player.breakingAnimTimer > 382) {
          // Freeze frame: bypass updates/collisions, manually decrement breakingAnimTimer
          player.breakingAnimTimer -= deltaMs;
          if (player.breakingAnimTimer < 0) player.breakingAnimTimer = 0;
        } else {
          updatePlayer(deltaMs);
          enemiesRef.current.forEach(e => updateEnemy(e, deltaMs));
          checkCollisions();
          detectMapChanges();
        }
      }

      // Execute decoupled render callback on canvas context
      onRender(ctx, timestamp);

      requestAnimationFrame(renderLoop);
    };

    const animId = requestAnimationFrame(renderLoop);
    return () => {
      isSubscribed = false;
      cancelAnimationFrame(animId);
    };
  }, [gameState, levelPhase, lives, onRender]);
};
