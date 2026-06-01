/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { GameState, LevelPhase, Player, Enemy, Fruit, Particle, TileType, GridPos, LevelConfig } from '../types';
import { T_EMPTY, T_BUSH, LEVELS } from '../constants';
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
  updatePlayer: () => void;
  updateEnemy: (e: Enemy) => void;
  checkCollisions: () => void;
  respawnEntities: (config?: LevelConfig) => void;
  checkGoldenBroccoliSpawn: (currentLives: number) => void;
  spawnParticles: (col: number, row: number, color: string, dir?: { x: number; y: number }, isDirt?: boolean) => void;
  detectMapChanges: () => void;
  frameCountRef: React.MutableRefObject<number>;
  scheduledPlantsRef: React.MutableRefObject<{ col: number; row: number; triggerAt: number }[]>;
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
  tileReadyRef,
  onRender,
  currentLevelIndex,
}: UseGameLoopProps) => {

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

      frameCountRef.current++;

      if (gameState === 'playing') {
        const player = playerRef.current;

        // Update dying bushes alpha
        const db = dyingBushesRef.current;
        for (let i = db.length - 1; i >= 0; i--) {
          db[i].alpha -= 0.06;
          if (db[i].alpha <= 0) {
            db.splice(i, 1);
          }
        }

        // Escape active particles
        const escapeActive = fruitsRef.current.filter(f => f.type !== 5).length === 0;
        if (escapeActive && frameCountRef.current % 30 === 0) {
          const randomCol = 17 + Math.floor(Math.random() * 3);
          const randomRow = 12 + Math.floor(Math.random() * 3);
          spawnParticles(randomCol, randomRow, '#5ec263', { x: 0, y: -1 });
        }

        // Process scheduled plants
        scheduledPlantsRef.current.forEach(plant => {
          if (plant.triggerAt > 0) {
            plant.triggerAt--;
            if (plant.triggerAt === 0) {
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
        
        // Trigger Break action at start of tick 48 (Impact)
        if (player.breakingAnimTimer === 48 && breakingTilesRef.current.length > 0) {
          breakingTilesRef.current.forEach(({ col, row }) => {
            mapRef.current[row][col] = T_EMPTY;
            const hashVal = Math.abs(Math.sin(row * 12.9898 + col * 78.233)) * 43758.5453;
            const variant = Math.floor(hashVal % 3);
            dyingBushesRef.current.push({ col, row, alpha: 1.0, variant });
            // Directional leaf particles!
            spawnParticles(col, row, '#4caf50', player.dir);
            spawnParticles(col, row, '#2e7d32', player.dir);
          });
          SoundEffects.playBreak();
          breakingTilesRef.current = [];
        }
        
        // Trigger Plant action at start of tick 48 (Lanzamiento)
        if (player.plantingAnimTimer === 48 && plantingTilesRef.current.length > 0) {
          plantingTilesRef.current.forEach(({ col, row }, index) => {
            const delay = index * 8; // 8 frames delay between shrubs
            const triggerOffset = 72 - 48 + delay;
            scheduledPlantsRef.current.push({ col, row, triggerAt: triggerOffset });
            
            // Set individual ready frame
            tileReadyRef.current[row][col] = frameCountRef.current + triggerOffset;
          });
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
                const levelConfig = LEVELS[currentLevelIndex];
                respawnEntities(levelConfig);
                checkGoldenBroccoliSpawn(updated);
              }
              return updated;
            });
          }
        } else if (player.breakingAnimTimer === 48 || player.breakingAnimTimer === 47) {
          // Freeze frame: bypass updates/collisions, manually decrement breakingAnimTimer
          player.breakingAnimTimer--;
        } else {
          updatePlayer();
          enemiesRef.current.forEach(e => updateEnemy(e));
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
