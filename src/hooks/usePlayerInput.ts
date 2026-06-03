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
  const keysRef = useRef<{ [code: string]: boolean }>({});
  const keysPressTimeRef = useRef<{ [code: string]: number }>({});
  const lastDirRef = useRef<Position | null>(null);
  const turnBlockedRef = useRef<boolean>(false);

  const getPowerCount = () => {
    if (playerRef.current.goldenBroccoliTimer > 0) {
      return 10;
    }
    return Math.min(10, levelScore + 1);
  };


  const useBushPower = (action: 'create' | 'break') => {
    const player = playerRef.current;
    if (player.powerCooldown > 0) return;
    if (player.moving) return; // Prevent bugs mid-motion

    const dir = player.dir;
    const powerCount = getPowerCount();

    const firstCc = player.col + dir.x;
    const firstCr = player.row + dir.y;

    if (firstCc <= 0 || firstCc >= COLS - 1 || firstCr <= 0 || firstCr >= ROWS - 1) return;
    if (isWall(firstCc, firstCr, mapRef.current)) return;

    let currentCc = firstCc;
    let currentCr = firstCr;
    let actionExecuted = false;

    if (action === 'break') {
      breakingTilesRef.current = [];
      // Limpiar entradas residuales antes de evaluar
      scheduledBreaksRef.current = scheduledBreaksRef.current.filter(
        b => isBush(b.col, b.row, mapRef.current)
      );
      for (let i = 0; i < powerCount; i++) {
        if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;
        if (isWall(currentCc, currentCr, mapRef.current)) break;

        if (isBush(currentCc, currentCr, mapRef.current)) {
          // Check ready frame for individual tiles
          const readyFrame = tileReadyRef.current[currentCr]?.[currentCc] ?? 0;
          const isScheduledBreak = scheduledBreaksRef.current.some(b => b.col === currentCc && b.row === currentCr);

          if (readyFrame <= frameCountRef.current && !isScheduledBreak) {
            breakingTilesRef.current.push({ col: currentCc, row: currentCr });
            actionExecuted = true;
          }
          // Si no está listo o ya está en cola, simplemente continúa al siguiente
        } else {
          break; // Solo para si no es arbusto (es espacio vacío o pared)
        }
        currentCc += dir.x;
        currentCr += dir.y;
      }
      if (actionExecuted) {
        player.powerCooldown = 620; // 37 frames * 16.67ms = 620ms
        player.breakingAnimTimer = 620; // 37 frames * 16.67ms = 620ms
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

        const isScheduled = scheduledPlantsRef.current.some(p => p.col === currentCc && p.row === currentCr);

        // Check blockage
        if (isWall(currentCc, currentCr, mapRef.current) || isBush(currentCc, currentCr, mapRef.current) || hasPlayer || enemyAtCurrent || isScheduled) {
          break;
        }

        const nextCc = currentCc + dir.x;
        const nextCr = currentCr + dir.y;
        const enemyAtNext = enemiesRef.current.some(e =>
          (e.col === nextCc && e.row === nextCr) ||
          (e.targetCol === nextCc && e.targetRow === nextCr)
        );

        if (isEmpty(currentCc, currentCr, mapRef.current)) {
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
        player.powerCooldown = 620; // 37 frames * 16.67ms = 620ms
        player.plantingAnimTimer = 620; // 37 frames * 16.67ms = 620ms
      }
    }
  };

  const triggerAction = () => {
    const player = playerRef.current;
    if (player.powerCooldown > 0) return;
    if (player.deathAnimTimer > 0) return;

    // Detener movimiento en curso siempre antes de actuar
    player.moving = false;
    player.x = player.col * TILE + TILE / 2;
    player.y = player.row * TILE + TILE / 2;
    player.targetCol = player.col;
    player.targetRow = player.row;

    const dir = player.dir;
    const targetCol = player.col + dir.x;
    const targetRow = player.row + dir.y;

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
