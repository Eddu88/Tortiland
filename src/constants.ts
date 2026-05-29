/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const COLS = 20;
export const ROWS = 15;
export const TILE = 40;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export const T_EMPTY = 0;
export const T_WALL = 1;
export const T_BUSH = 2;
export const T_BURROW = 3;

// Fixed maze design based on Tortiland
export const INNER_WALLS: [number, number][] = [
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
