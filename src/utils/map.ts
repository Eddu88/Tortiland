/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileType } from '../types';
import { COLS, ROWS, T_EMPTY, T_WALL, T_BUSH, T_BURROW, INNER_WALLS } from '../constants';

/**
 * Format seconds into elegant MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate the initial playfield map design
 */
export function buildBaseMap(grassAges?: Record<string, { createdAt: number }>): TileType[][] {
  const m: TileType[][] = [];
  for (let r = 0; r < ROWS; r++) {
    m.push([]);
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        m[r].push(T_WALL);
      } else if (r >= 5 && r <= 8 && c >= 8 && c <= 11) {
        m[r].push(T_WALL); // permanent Boss Burrow (4x4)
      } else {
        m[r].push(T_EMPTY);
      }
    }
  }
  INNER_WALLS.forEach(([r, c]) => {
    const isBossBurrow = r >= 5 && r <= 8 && c >= 8 && c <= 11;
    if (r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1 && !isBossBurrow) {
      m[r][c] = T_BUSH;
      if (grassAges) {
        grassAges[`${r}_${c}`] = { createdAt: Date.now() - 5000 };
      }
    }
  });
  return m;
}

/**
 * Check if the target cell is a solid wall
 */
export function isWall(col: number, row: number, map: TileType[][]): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  return map[row]?.[col] === T_WALL;
}

/**
 * Check if the target cell has a bush/foliage block
 */
export function isBush(col: number, row: number, map: TileType[][]): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  return map[row]?.[col] === T_BUSH;
}

/**
 * Check if the target cell is completely empty and walkable
 */
export function isEmpty(col: number, row: number, map: TileType[][]): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  return map[row]?.[col] === T_EMPTY;
}

/**
 * Resolve solid barriers including context factors (ghost mode, golden broccoli power, escape burrow activation)
 */
export function isSolid(
  col: number,
  row: number,
  map: TileType[][],
  ghostMode = false,
  isPlayer = false,
  goldenBroccoliActive = false,
  awaitingBurrow = false
): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  if (map[row]?.[col] === T_WALL) return true;
  if (map[row]?.[col] === T_BUSH) {
    if (ghostMode) return false;
    if (isPlayer && goldenBroccoliActive) return false;
    return true;
  }
  if (map[row]?.[col] === T_BURROW) {
    if (isPlayer && awaitingBurrow) return false;
    return true;
  }
  return false;
}

/**
 * Search for a random empty cell that is not Torti's house, boss burrow, nor occupied by players/fruits
 */
export function findRandomEmptyCell(
  map: TileType[][],
  playerCol: number,
  playerRow: number,
  fruits: { col: number; row: number }[]
): { col: number; row: number } | null {
  let tries = 0;
  while (tries++ < 500) {
    const c = 1 + Math.floor(Math.random() * (COLS - 2));
    const r = 1 + Math.floor(Math.random() * (ROWS - 2));
    if (map[r]?.[c] !== T_EMPTY) continue;

    // Exclude Torti's Burrow (col 18, row 13)
    if (c === 18 && r === 13) continue;

    // Exclude Boss Burrow (4x4)
    if (c >= 8 && c <= 11 && r >= 5 && r <= 8) continue;

    if (c === playerCol && r === playerRow) continue;
    if (fruits.some(f => f.col === c && f.row === r)) continue;
    return { col: c, row: r };
  }
  return null;
}
