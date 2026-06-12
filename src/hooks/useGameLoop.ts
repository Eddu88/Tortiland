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

/**
 * Hook that manages the core requestAnimationFrame render and update loops.
 * 
 * Functions:
 * 1. Computes delta milliseconds per tick, capping frame time at 50ms to prevent game coordinate
 *    glitches and collision tunnel breakthroughs on heavy lag spikes.
 * 2. Processes timed plant growths and leaf dissolvings.
 * 3. Triggers player breaking/planting animations and synchronizes audio triggers.
 * 4. Checks entity positions and coordinates collision response triggers.
 * 5. Executes decoupled render loop calls.
 * 
 * @param props Game states, callbacks, refs, and update functions.
 */
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
  // Subscribes requestAnimationFrame loop on mounting, cleans it up on unmounting.
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

        // 1. Update opacity of dissolving bushes
        // Decrements alpha values based on delta time to ensure smooth, frame-rate independent fading.
        const db = dyingBushesRef.current;
        for (let i = db.length - 1; i >= 0; i--) {
          db[i].alpha -= (0.06 * deltaMs) / FRAME_MS;
          if (db[i].alpha <= 0) {
            db.splice(i, 1);
          }
        }

        // 2. Trigger particles near the escape burrow
        // When all main fruits are collected, emit celebratory leaf particles around Torti's house.
        const escapeActive = fruitsRef.current.filter(f => f.type !== 5).length === 0;
        if (escapeActive && Math.floor(frameCountRef.current / 500) !== Math.floor((frameCountRef.current - deltaMs) / 500)) {
          const randomCol = 17 + Math.floor(Math.random() * 3);
          const randomRow = 12 + Math.floor(Math.random() * 3);
          spawnParticles(randomCol, randomRow, '#5ec263', { x: 0, y: -1 });
        }

        // 3. Process scheduled plants (bushes growing)
        // Decrements growth timers and sets grid cells to T_BUSH upon completion, emitting dirt particles.
        scheduledPlantsRef.current.forEach(plant => {
          plant.triggerAt -= deltaMs;
          if (plant.triggerAt <= 0) {
            console.log(`[PLANT EJECUTADO] col=${plant.col} row=${plant.row}`);
            mapRef.current[plant.row][plant.col] = T_BUSH;
            const key = `${plant.row}_${plant.col}`;
            grassAgesRef.current[key] = { createdAt: Date.now() };
            // Spawn brown dirt particles indicating soil planting impact
            spawnParticles(plant.col, plant.row, '#8B5E3C', undefined, true);
            SoundEffects.playBuild();
          }
        });

        // Filter out completed schedules
        scheduledPlantsRef.current = scheduledPlantsRef.current.filter(p => p.triggerAt > 0);

        // 4. Process scheduled breaks (bushes breaking)
        // Decrements breaking timers and sets grid cells to T_EMPTY upon completion, triggering fading leaves and sound.
        scheduledBreaksRef.current.forEach(b => {
          b.triggerAt -= deltaMs;
          if (b.triggerAt <= 0) {
            console.log(`[BREAK EJECUTADO] col=${b.col} row=${b.row}`);
            mapRef.current[b.row][b.col] = T_EMPTY;
            // Compute a stable hash variant for foliage texture chip variety
            const hashVal = Math.abs(Math.sin(b.row * 12.9898 + b.col * 78.233)) * 43758.5453;
            const variant = Math.floor(hashVal % 3);
            dyingBushesRef.current.push({ col: b.col, row: b.row, alpha: 1.0, variant });
            // Emit leaf green particles in the direction of the action hit
            spawnParticles(b.col, b.row, '#4caf50', b.dir);
            spawnParticles(b.col, b.row, '#2e7d32', b.dir);
            SoundEffects.playBreak();
          }
        });

        // Filter out completed scheduled breaks
        scheduledBreaksRef.current = scheduledBreaksRef.current.filter(b => b.triggerAt > 0);

        const prevBreak = player.breakingAnimTimer + deltaMs;
        const prevPlant = player.plantingAnimTimer + deltaMs;

        // Reset action triggers when timers run out to prepare for subsequent commands
        if (player.breakingAnimTimer <= 0) {
          player.breakTriggerFired = false;
        }
        if (player.plantingAnimTimer <= 0) {
          player.plantTriggerFired = false;
        }

        if (player.breakingAnimTimer > 0) {
          console.log(`[BREAK TRIGGER CHECK] timer=${player.breakingAnimTimer.toFixed(1)} prev=${prevBreak.toFixed(1)} tilesEnRef=${breakingTilesRef.current.length} fired=${player.breakTriggerFired}`);
        }
        if (player.plantingAnimTimer > 0) {
          console.log(`[PLANT TRIGGER CHECK] timer=${player.plantingAnimTimer.toFixed(1)} prev=${prevPlant.toFixed(1)} tilesEnRef=${plantingTilesRef.current.length} fired=${player.plantTriggerFired}`);
        }
 
        // 5. Trigger Break schedule when animation reaches impact frames (<= 415ms)
        // Queues breaking events with a 54ms staggered delay to create a nice visual ripple wave effect.
        if (!player.breakTriggerFired && player.breakingAnimTimer > 0 && player.breakingAnimTimer <= 415 && breakingTilesRef.current.length > 0) {
          player.breakTriggerFired = true;
          breakingTilesRef.current.forEach(({ col, row }, index) => {
            const delay = index * 54;
            scheduledBreaksRef.current.push({
              col,
              row,
              triggerAt: 16 + delay, // 1 frame delay (16ms) + cumulative offset
              dir: { ...player.dir }
            });
          });
          breakingTilesRef.current = [];
        }

        // 6. Trigger Plant schedule when animation reaches impact frames (<= 415ms)
        // Queues planting events with a 54ms staggered delay, registering ready frames to avoid action conflicts.
        if (!player.plantTriggerFired && player.plantingAnimTimer > 0 && player.plantingAnimTimer <= 415 && plantingTilesRef.current.length > 0) {
          player.plantTriggerFired = true;
          plantingTilesRef.current.forEach(({ col, row }, index) => {
            const delay = index * 54;
            const triggerOffset = 155 + delay; // 155ms trigger offset
            scheduledPlantsRef.current.push({ col, row, triggerAt: triggerOffset });

            // Mark when the individual tile will be fully grown and ready for breaking
            tileReadyRef.current[row][col] = frameCountRef.current + triggerOffset;
          });
          plantingTilesRef.current = [];
        }

        // 7. Process Player Death Animation and lives reduction sequence
        // Freezes normal updates, decrementing lives and triggering player/enemies respawn coordinates reset.
        if (player.deathAnimTimer > 0) {
          player.deathAnimTimer -= deltaMs;
          if (player.deathAnimTimer <= 0) {
            player.deathAnimTimer = 0;
            // Death animation finished! Decrement lives
            setLives((prev: number) => {
              const updated = prev - 1;
              if (updated <= 0) {
                setGameState('gameover');
                SoundEffects.playGameOver();
              } else {
                player.invincible = 2000; // Give 2 seconds of invincibility
                const levelConfig = LEVELS[currentLevelIndex];
                respawnEntities(levelConfig);
                checkGoldenBroccoliSpawn(updated);
              }
              return updated;
            });
          }
        } 
        // 8. Freeze-frame effect on break stomp impact
        // Pauses player and enemy movements for a brief frame to add kinetic weight to actions.
        else if (player.breakingAnimTimer > 0 && (
          (player.breakingAnimTimer <= 415 && player.breakingAnimTimer > 382) ||
          (prevBreak > 415 && player.breakingAnimTimer <= 382)
        )) {
          player.breakingAnimTimer -= deltaMs;
          if (player.breakingAnimTimer < 0) player.breakingAnimTimer = 0;
        } 
        // 9. Standard Entity Updates
        // Moves the player character, triggers enemy pathfinding decisions, checks collisions, and tracks map variations.
        else {
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
