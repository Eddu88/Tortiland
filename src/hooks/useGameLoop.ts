/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { GameState, LevelPhase, Player, Enemy, Fruit, Particle, TileType, GridPos } from '../types';
import { W, H, TILE, T_EMPTY, T_ICE } from '../constants';
import { SoundEffects } from '../components/SoundEffects';
import { drawMap } from '../renderers/drawMap';
import { drawFruits, drawPlayerIndicators } from '../renderers/drawFruits';
import { drawGardenTurtle } from '../renderers/drawTurtle';
import { drawFoxEnemy } from '../renderers/drawFox';

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
  updatePlayer: () => void;
  updateEnemy: (e: Enemy) => void;
  checkCollisions: () => void;
  respawnEntities: () => void;
  checkGoldenBroccoliSpawn: (currentLives: number) => void;
  spawnParticles: (col: number, row: number, color: string, dir?: { x: number; y: number }, isDirt?: boolean) => void;
  detectMapChanges: () => void;
  getPowerCount: () => number;
  frameCountRef: React.MutableRefObject<number>;
  scheduledPlantsRef: React.MutableRefObject<{ col: number; row: number; triggerAt: number }[]>;
  tileReadyRef: React.MutableRefObject<number[][]>;
}

export const useGameLoop = ({
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
}: UseGameLoopProps) => {

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
      // Pulsating golden shielding rings around our cute Torti character
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

    // Draw our cute Torti character!
    drawGardenTurtle(
      ctx,
      px,
      py,
      player.dir,
      player.animFrame,
      t,
      isGolden,
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
  };

  const drawEnemies = (ctx: CanvasRenderingContext2D, t: number) => {
    enemiesRef.current.forEach(e => {
      if (e.type === 'ghost') {
        // Semi transparent spectral render for the ghost lobo
        ctx.globalAlpha = 0.55;
      } else {
        ctx.globalAlpha = 1.0;
      }

      // Draw our custom beautiful lobo enemy in place!
      drawFoxEnemy(ctx, e.x, e.y, e.dir, e.animFrame, e.type, t);
      ctx.globalAlpha = 1.0;
    });
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

      frameCountRef.current++;

      if (gameState === 'playing') {
        const player = playerRef.current;

        // Process scheduled plants
        scheduledPlantsRef.current.forEach(plant => {
          if (plant.triggerAt > 0) {
            plant.triggerAt--;
            if (plant.triggerAt === 0) {
              mapRef.current[plant.row][plant.col] = T_ICE;
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
          plantingTilesRef.current.forEach(({ col, row }, index) => {
            const delay = index * 8; // 8 frames delay between shrubs
            const triggerOffset = 54 - 36 + delay;
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
      drawMap(ctx, mapRef.current, grassAgesRef.current, breakingTilesRef.current, playerRef.current.breakingAnimTimer);
      renderParticlesAndFlush(ctx);
      drawFruits(ctx, fruitsRef.current, mapRef.current, timestamp);

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

  return {
    renderParticlesAndFlush,
  };
};
