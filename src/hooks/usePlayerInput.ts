/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { GameState, LevelPhase, Player, Enemy, TileType, GridPos, Position, ScheduledBreak } from '../types';
import { COLS, ROWS, TILE } from '../constants';
import { isWall, isBush, isEmpty } from '../utils/map';

interface UsePlayerInputProps {
  gameState: GameState;
  levelScore: number;
  levelPhase: LevelPhase;
  playerRef: React.MutableRefObject<Player>;
  enemiesRef: React.MutableRefObject<Enemy[]>;
  mapRef: React.MutableRefObject<TileType[][]>;
  breakingTilesRef: React.MutableRefObject<GridPos[]>;
  plantingTilesRef: React.MutableRefObject<GridPos[]>;
  triggerActionRef: React.MutableRefObject<() => void>;
  frameCountRef: React.MutableRefObject<number>;
  scheduledPlantsRef: React.MutableRefObject<{ col: number; row: number; triggerAt: number }[]>;
  scheduledBreaksRef: React.MutableRefObject<ScheduledBreak[]>;
  tileReadyRef: React.MutableRefObject<number[][]>;
  setGameState?: (s: GameState) => void;
}

/**
 * Hook that manages physical keyboard input, virtual gamepad controllers events,
 * and context-aware action triggers (planting or breaking bushes) for the player character.
 * 
 * It tracks active key presses, handles turn restrictions, and coordinates multi-tile 
 * power animations (clearing or creating bushes in lines).
 * 
 * @param props Configurations, game state callbacks, and mutable refs linking to player/enemies/map structures.
 * @returns Input ref maps, command handlers, and utility calculations.
 */
export const usePlayerInput = ({
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
}: UsePlayerInputProps) => {
  // Map of currently pressed key codes to their boolean state (true = down, false = up)
  const keysRef = useRef<{ [code: string]: boolean }>({});
  // Timestamps of when movement keys were first pressed, used to detect holding patterns and override turn locks
  const keysPressTimeRef = useRef<{ [code: string]: number }>({});
  // Direction vector requested by the user that will be applied on the next grid alignment check
  const lastDirRef = useRef<Position | null>(null);
  // Turn lock toggle preventing diagonal or double-movement registers when quickly switching axes
  const turnBlockedRef = useRef<boolean>(false);

  /**
   * Calculates the maximum tile range affected by the player's plant/break action.
   * If the player is powered by the Golden Broccoli, the range is maxed out at 10.
   * Otherwise, the range scales linearly with the player's levelScore + 1, capped at 10.
   * 
   * @returns Integer count between 1 and 10.
   */
  const getPowerCount = () => {
    if (playerRef.current.goldenBroccoliTimer > 0) {
      return 10;
    }
    return Math.min(10, levelScore + 1);
  };


  /**
   * Triggers a linear projection action, propagating outward from the player's facing direction.
   * - 'break': Sweeps outward, detecting contiguous bushes and queueing them to dissolve.
   * - 'create': Sweeps outward, detecting empty space and queueing new bushes to grow.
   * 
   * Actions are blocked if player.powerCooldown is active or player is currently moving.
   * The action sequence sets player.powerCooldown and animation timers to 620ms (equivalent to 37 frames at 60 FPS).
   * 
   * @param action Identifier ('create' or 'break') mapping to the requested command.
   */
  const useBushPower = (action: 'create' | 'break') => {
    const player = playerRef.current;
    if (player.powerCooldown > 0) return;
    if (player.moving) return; // Prevent bugs and alignment glitches mid-motion

    const dir = player.dir;
    const powerCount = getPowerCount();

    // Coordinates of the first tile directly in front of the player
    const firstCc = player.col + dir.x;
    const firstCr = player.row + dir.y;

    // Check map boundaries to prevent array index out-of-bounds access
    if (firstCc <= 0 || firstCc >= COLS - 1 || firstCr <= 0 || firstCr >= ROWS - 1) return;
    if (isWall(firstCc, firstCr, mapRef.current)) return;

    let currentCc = firstCc;
    let currentCr = firstCr;
    let actionExecuted = false;

    if (action === 'break') {
      breakingTilesRef.current = [];
      // Clean residual scheduled breaks pointing to non-bush tiles to prevent visual glitches
      scheduledBreaksRef.current = scheduledBreaksRef.current.filter(
        b => isBush(b.col, b.row, mapRef.current)
      );
      
      // Sweep forward in a line to select bushes for breaking
      for (let i = 0; i < powerCount; i++) {
        if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;
        if (isWall(currentCc, currentCr, mapRef.current)) break;

        if (isBush(currentCc, currentCr, mapRef.current)) {
          // Check if this specific tile has finished its previous growth cycle
          const readyFrame = tileReadyRef.current[currentCr]?.[currentCc] ?? 0;
          const isScheduledBreak = scheduledBreaksRef.current.some(b => b.col === currentCc && b.row === currentCr);

          // Only queue for breaking if it is fully grown and not already scheduled for demolition
          if (readyFrame <= frameCountRef.current && !isScheduledBreak) {
            breakingTilesRef.current.push({ col: currentCc, row: currentCr });
            actionExecuted = true;
          }
        } else {
          break; // Stop line sweep immediately if we hit an empty space
        }
        currentCc += dir.x;
        currentCr += dir.y;
      }
      
      if (actionExecuted) {
        player.powerCooldown = 620; // Block further actions for 620ms (37 frames * 16.67ms)
        player.breakingAnimTimer = 620; // Trigger the breaking animation sequence
      }
    } else if (action === 'create') {
      plantingTilesRef.current = [];
      
      // Sweep forward in a line to select empty spaces for planting
      for (let i = 0; i < powerCount; i++) {
        if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;

        // Check if player's current or target tile overlaps with this cell
        const hasPlayer = (player.col === currentCc && player.row === currentCr) ||
          (player.targetCol === currentCc && player.targetRow === currentCr);

        // Check if any enemy is currently occupying or moving towards this cell
        const enemyAtCurrent = enemiesRef.current.some(e =>
          (e.col === currentCc && e.row === currentCr) ||
          (e.targetCol === currentCc && e.targetRow === currentCr)
        );

        // Check if a bush is already scheduled to be planted here
        const isScheduled = scheduledPlantsRef.current.some(p => p.col === currentCc && p.row === currentCr);

        // Terminate sweep if blocked by wall, existing bush, characters, or active schedules
        if (isWall(currentCc, currentCr, mapRef.current) || isBush(currentCc, currentCr, mapRef.current) || hasPlayer || enemyAtCurrent || isScheduled) {
          break;
        }

        const nextCc = currentCc + dir.x;
        const nextCr = currentCr + dir.y;
        
        // Prevent planting directly in front of an oncoming enemy to avoid instant entrapment glitches
        const enemyAtNext = enemiesRef.current.some(e =>
          (e.col === nextCc && e.row === nextCr) ||
          (e.targetCol === nextCc && e.targetRow === nextCr)
        );

        if (isEmpty(currentCc, currentCr, mapRef.current)) {
          plantingTilesRef.current.push({ col: currentCc, row: currentCr });
          actionExecuted = true;
        }

        if (enemyAtNext) {
          break; // Stop sweep if an enemy is approaching on the next tile
        }

        currentCc += dir.x;
        currentCr += dir.y;
      }
      
      if (actionExecuted) {
        player.powerCooldown = 620; // Block further actions for 620ms (37 frames * 16.67ms)
        player.plantingAnimTimer = 620; // Trigger the planting animation sequence
      }
    }

    if (actionExecuted) {
      console.log(`[POWER] action=${action} tiles=${action === 'create' ? plantingTilesRef.current.length : breakingTilesRef.current.length} cooldown=${player.powerCooldown}`);
    }
  };

  /**
   * Main high-level selector that triggers planting or breaking depending on the state
   * of the tile directly in front of the player.
   * If the adjacent tile is a bush, it fires the 'break' action.
   * If the adjacent tile is empty dirt, it fires the 'create' action.
   */
  const triggerAction = () => {
    const player = playerRef.current;
    if (player.powerCooldown > 0) return;
    if (player.deathAnimTimer > 0) return; // Prevent actions during death sequence

    // Force turtle alignment with the current grid cell to prevent mid-motion visual drift
    player.moving = false;
    player.x = player.col * TILE + TILE / 2;
    player.y = player.row * TILE + TILE / 2;
    player.targetCol = player.col;
    player.targetRow = player.row;

    const dir = player.dir;
    const targetCol = player.col + dir.x;
    const targetRow = player.row + dir.y;
 
    console.log(`[ACTION] dir=${JSON.stringify(player.dir)} targetCol=${targetCol} targetRow=${targetRow} isBush=${isBush(targetCol, targetRow, mapRef.current)}`);
 
    if (targetCol <= 0 || targetCol >= COLS - 1 || targetRow <= 0 || targetRow >= ROWS - 1) return;
    if (isWall(targetCol, targetRow, mapRef.current)) return;

    if (isBush(targetCol, targetRow, mapRef.current)) {
      const readyFrame = tileReadyRef.current[targetRow]?.[targetCol] ?? 0;
      if (readyFrame <= frameCountRef.current) {
        useBushPower('break');
      }
    } else if (isEmpty(targetCol, targetRow, mapRef.current)) {
      useBushPower('create');
    }
  };

  // Keep triggerActionRef updated
  triggerActionRef.current = triggerAction;

  // Keyboard Input Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      if (code === 'Escape') {
        if (gameState === 'playing') {
          e.preventDefault();
          setGameState?.('paused');
          return;
        } else if (gameState === 'paused') {
          e.preventDefault();
          setGameState?.('playing');
          return;
        }
      }

      if (gameState !== 'playing') return;

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

      // Action Keys: Space/F perform context-aware actions
      if (['Space', 'KeyF'].includes(code)) {
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
  }, [gameState, levelScore, levelPhase]);

  return {
    keysRef,
    keysPressTimeRef,
    lastDirRef,
    turnBlockedRef,
    triggerAction,
    useBushPower,
    getPowerCount,
  };
};
