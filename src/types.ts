/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents the type of tile in the grid.
 * 0: Walkable ground (EMPTY)
 * 1: Solid wall (WALL)
 * 2: Shrub/grass block that can be planted or broke (BUSH/GRASS)
 * 3: Torti's safe burrow (BURROW)
 */
export type TileType = 0 | 1 | 2 | 3;

/**
 * Defines enemy behavioral configurations:
 * - 'fox_patrol': Patrols the maze, shifting directions periodically.
 * - 'fox_chaser': Highly aggressive, recalculates paths to directly hunt down the player.
 * - 'fox_zombie': Summoner zombie fox, periodically howls to spawn fast minions.
 * - 'fox_zombie_spawn': Faster minion spawned by zombie fox, dies when colliding with a bush.
 * - 'snake': Burrowing/emerging snake chaser.
 */
export type EnemyType = 'fox_patrol' | 'fox_chaser' | 'fox_zombie' | 'fox_zombie_spawn' | 'snake' | 'gorilla' | 'eagle' | 'scorpion';

/**
 * A standard 2D vector for position coordinates or directions.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Representation of grid coordinates (0-indexed column and row).
 */
export interface GridPos {
  col: number;
  row: number;
}

/**
 * The player state model (Torti the Turtle).
 */
export interface Player {
  col: number;             // Current column index in the grid.
  row: number;             // Current row index in the grid.
  x: number;               // Current rendering X position on screen (pixels).
  y: number;               // Current rendering Y position on screen (pixels).
  targetCol: number;       // Grid column index of the tile the player is moving towards.
  targetRow: number;       // Grid row index of the tile the player is moving towards.
  moving: boolean;         // True if the player is currently traversing between tiles.
  dir: Position;           // Facing direction vector.
  speed: number;           // Movement speed (pixels per second).
  animFrame: number;       // Current frame index for walking animation.
  animTimer: number;       // Accumulator for frame timing (milliseconds).
  invincible: number;      // Remaining invincibility window after hit (milliseconds).
  goldenBroccoliTimer: number; // Remaining duration of Golden Broccoli power-up (milliseconds).
  powerCooldown: number;   // Cooldown before the player can plant/break bushes again (milliseconds).
  plantingAnimTimer: number; // Remaining duration of the planting animation (milliseconds).
  breakingAnimTimer: number; // Remaining duration of the breaking/pruning animation (milliseconds).
  deathAnimTimer: number;    // Remaining duration of the custom defeat animation sequence (milliseconds).
  breakTriggerFired?: boolean; // Internal flag indicating if the destruction logic was already triggered this animation.
  plantTriggerFired?: boolean; // Internal flag indicating if the planting logic was already triggered this animation.
}

/**
 * The enemy state model (Lobo the Fox).
 */
export interface Enemy {
  id: string;              // Unique identifier of the enemy instance.
  type: EnemyType;         // Subtype ('fox_patrol', 'fox_chaser', 'fox_zombie') defining AI logic.
  col: number;             // Grid column index.
  row: number;             // Grid row index.
  x: number;               // Rendering X coordinate on screen.
  y: number;               // Rendering Y coordinate on screen.
  targetCol: number;       // Target grid column index.
  targetRow: number;       // Target grid row index.
  moving: boolean;         // True if currently sliding between cells.
  dir: Position;           // Movement direction vector.
  speed: number;           // Movement speed (pixels per second).
  chaseTimer: number;      // Countdown before next path recalculation (milliseconds).
  animFrame: number;       // Current sprite frame index.
  animTimer: number;       // Frame animation accumulator (milliseconds).
  isJumping?: boolean;     // Gorilla unexpected jump state
  jumpProgress?: number;   // 0 to 1 representing visual jump arc
  gorillaJumpTimer?: number; // Duration countdown of jump (ms)
  gorillaJumpCooldown?: number; // Cooldown between unexpected jumps (ms)
  isDiving?: boolean;
  diveTargetCol?: number;
  diveTargetRow?: number;
  isStunned?: boolean;
  stunTimer?: number;
  sandstormTimer?: number;
  sandstormCooldown?: number;
  sandstormCol?: number;
  sandstormRow?: number;
  isBurrowed?: boolean;
  burrowTimer?: number;
  telegraphTimer?: number;
  telegraphCol?: number;
  telegraphRow?: number;
  isHowling?: boolean;
  howlTimer?: number;
  howlCooldown?: number;
}

/**
 * Represents a collectible vegetable item on the grid.
 */
export interface Fruit {
  col: number;             // Grid column.
  row: number;             // Grid row.
  type: number;            // Collectible type (0: Herb, 3: Tomato, 4: Carrot, 5: Golden Broccoli, 6: Beetroot).
  anim: number;            // Floating animation offset factor to offset waves.
  spawnAnim?: number;      // Spawn animation remaining duration (milliseconds).
}

/**
 * Particle system node used for visual effect debris.
 */
export interface Particle {
  x: number;               // Current screen X position.
  y: number;               // Current screen Y position.
  vx: number;              // Horizontal velocity.
  vy: number;              // Vertical velocity (influenced by gravity).
  life: number;            // Remaining lifetime ticks.
  maxLife: number;         // Initial lifetime ticks.
  color: string;           // Color hex/rgba value.
}

/**
 * Represents the screen controller states.
 */
export type GameState = 'menu' | 'level_select' | 'playing' | 'paused' | 'dead' | 'gameover' | 'win' | 'level_complete';

/**
 * Defines which veggie phase is active in a level.
 */
export type LevelPhase = 'tomatoes' | 'carrots' | 'beets';

/**
 * Leaderboard record entry.
 */
export interface HighScore {
  name: string;
  score: number;
  time: number;            // Time taken in seconds.
  date: string;
}

/**
 * Spawn configuration for enemies inside LevelConfig.
 */
export interface EnemyConfig {
  id: string;
  type: EnemyType;
  col: number;
  row: number;
  speed: number;
}

/**
 * General configuration for a playable maze level.
 */
export interface LevelConfig {
  number: number;
  name: string;
  description: string;
  playerStartCol: number;
  playerStartRow: number;
  innerWalls: [number, number][]; // Coordinate sets for static stone blocks.
  initialBushes: [number, number][]; // Coordinate sets for starting foliage.
  enemies: EnemyConfig[];
}

/**
 * Represents a queued tile destruction action scheduled in the game loop.
 */
export interface ScheduledBreak {
  col: number;
  row: number;
  triggerAt: number;       // Timing check offset (milliseconds).
  dir: Position;           // Particle blast direction context.
}
