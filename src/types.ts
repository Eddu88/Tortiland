/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TileType = 0 | 1 | 2 | 3; // 0: EMPTY, 1: WALL, 2: BUSH/GRASS, 3: BURROW

export type EnemyType = 'patrol' | 'chaser' | 'ghost';

export interface Position {
  x: number;
  y: number;
}

export interface GridPos {
  col: number;
  row: number;
}

export interface Player {
  col: number;
  row: number;
  x: number;
  y: number;
  targetCol: number;
  targetRow: number;
  moving: boolean;
  dir: Position; // direction vector (x: -1..1, y: -1..1)
  speed: number;
  animFrame: number;
  animTimer: number;
  invincible: number; // frames left
  goldenBroccoliTimer: number; // frames left
  powerCooldown: number; // frames left
  plantingAnimTimer: number; // frames left for planting animation
  breakingAnimTimer: number; // frames left for breaking animation
  deathAnimTimer: number; // frames left for death animation
}

export interface Enemy {
  id: string;
  type: EnemyType;
  col: number;
  row: number;
  x: number;
  y: number;
  targetCol: number;
  targetRow: number;
  moving: boolean;
  dir: Position;
  speed: number;
  chaseTimer: number;
  animFrame: number;
  animTimer: number;
}

export interface Fruit {
  col: number;
  row: number;
  type: number; // 0: Wild Herb, 1: Broccoli, 2: Cabbage, 3: Tomato, 4: Carrot, 5: Golden Broccoli, 6: Beetroot (Beterraga)
  anim: number; // offset animation factor
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export type GameState = 'menu' | 'level_select' | 'playing' | 'paused' | 'dead' | 'gameover' | 'win' | 'level_complete';
export type LevelPhase = 'tomatoes' | 'carrots' | 'beets';

export interface HighScore {
  name: string;
  score: number;
  time: number;
  date: string;
}

export interface EnemyConfig {
  id: string;
  type: EnemyType;
  col: number;
  row: number;
  speed: number;
}

export interface LevelConfig {
  number: number;
  name: string;
  description: string;
  playerStartCol: number;
  playerStartRow: number;
  innerWalls: [number, number][];
  initialBushes: [number, number][];
  enemies: EnemyConfig[];
}

export interface ScheduledBreak {
  col: number;
  row: number;
  triggerAt: number;
  dir: Position;
}


