import { LevelConfig } from './types';

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

export const LEVELS: LevelConfig[] = [
  {
    number: 1,
    name: 'El Jardín Clásico',
    description: 'Recolecta los vegetales del laberinto clásico y esquiva a los veloces zorros.',
    playerStartCol: 1,
    playerStartRow: 1,
    innerWalls: INNER_WALLS,
    initialBushes: [
      [3, 5], [3, 15], [5, 9], [7, 3], [7, 13], [9, 7], [11, 11]
    ],
    enemies: [
      { id: '1_1', type: 'patrol', col: 18, row: 10, speed: 0.6 },
      { id: '1_2', type: 'patrol', col: 18, row: 1, speed: 0.6 }
    ]
  },
  {
    number: 2,
    name: 'El Laberinto de Otoño',
    description: 'Un mapa serpenteante con pasillos estrechos y zorros más astutos y agresivos.',
    playerStartCol: 18,
    playerStartRow: 1,
    innerWalls: [
      [2, 2], [2, 3], [2, 4], [2, 5], [2, 6],
      [2, 13], [2, 14], [2, 15], [2, 16], [2, 17],
      [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
      [3, 16], [4, 16], [5, 16], [6, 16], [7, 16], [8, 16], [9, 16], [10, 16], [11, 16],
      [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], [4, 11], [4, 12], [4, 13],
      [10, 5], [10, 6], [10, 7], [10, 8], [10, 9], [10, 10], [10, 11], [10, 12], [10, 13], [10, 14],
      [12, 2], [12, 3], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8],
      [12, 11], [12, 12], [12, 13], [12, 14], [12, 15], [12, 16], [12, 17],
      [13, 7], [13, 12]
    ],
    initialBushes: [
      [3, 1], [3, 18], [6, 6], [8, 13], [11, 2], [11, 17], [13, 5], [13, 14]
    ],
    enemies: [
      { id: '2_1', type: 'patrol', col: 1, row: 2, speed: 0.6 },
      { id: '2_2', type: 'patrol', col: 18, row: 10, speed: 0.6 },
      { id: '2_3', type: 'patrol', col: 1, row: 12, speed: 0.6 },
      { id: '2_4', type: 'patrol', col: 13, row: 1, speed: 0.6 },
      { id: '2_5', type: 'patrol', col: 11, row: 13, speed: 0.6 }
    ]
  },
  {
    number: 3,
    name: 'El Sendero Serpenteante',
    description: 'Rodea con cuidado el nido central del laberinto, esquivando al nuevo zorro perseguidor.',
    playerStartCol: 1,
    playerStartRow: 1,
    innerWalls: [
      [2, 6], [2, 7], [2, 8], [2, 11], [2, 12], [2, 13],
      [12, 6], [12, 7], [12, 8], [12, 11], [12, 12], [12, 13],
      [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [9, 5], [10, 5], [11, 5], [12, 5],
      [2, 14], [3, 14], [4, 14], [5, 14], [6, 14], [9, 14], [10, 14], [11, 14], [12, 14]
    ],
    initialBushes: [
      [4, 2], [4, 17], [10, 2], [10, 17], [13, 3], [13, 15]
    ],
    enemies: [
      { id: '3_1', type: 'patrol', col: 18, row: 1, speed: 0.6 },
      { id: '3_2', type: 'patrol', col: 18, row: 10, speed: 0.6 },
      { id: '3_3', type: 'patrol', col: 2, row: 12, speed: 0.6 },
      { id: '3_4', type: 'chaser', col: 10, row: 13, speed: 0.75 }
    ]
  },
  {
    number: 4,
    name: 'Los Corredores Cruzados',
    description: '¡Beterragas silvestres detectadas! Despeja el laberinto cruzado con doble zorro perseguidor.',
    playerStartCol: 18,
    playerStartRow: 1,
    innerWalls: [
      [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 12], [4, 13], [4, 14], [4, 15], [4, 16], [4, 17],
      [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 12], [10, 13], [10, 14], [10, 15], [10, 16], [10, 17],
      [2, 4], [3, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [11, 4], [12, 4],
      [2, 15], [3, 15], [5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [11, 15], [12, 15]
    ],
    initialBushes: [
      [1, 5], [1, 14], [7, 2], [7, 17], [13, 2], [13, 16]
    ],
    enemies: [
      { id: '4_1', type: 'patrol', col: 18, row: 10, speed: 0.6 },
      { id: '4_2', type: 'patrol', col: 2, row: 1, speed: 0.6 },
      { id: '4_3', type: 'chaser', col: 10, row: 13, speed: 0.75 },
      { id: '4_4', type: 'chaser', col: 1, row: 13, speed: 0.75 }
    ]
  },
  {
    number: 5,
    name: 'La Ciudad de los Hedges',
    description: 'Camina entre bloques simétricos esquivando al sigiloso zorro fantasma.',
    playerStartCol: 1,
    playerStartRow: 13,
    innerWalls: [
      [2, 2], [2, 3], [3, 2], [3, 3],
      [2, 15], [2, 16], [3, 15], [3, 16],
      [11, 2], [11, 3], [12, 2], [12, 3],
      [11, 15], [11, 16], [12, 15], [12, 16],
      [4, 6], [4, 7], [4, 12], [4, 13],
      [10, 6], [10, 7], [10, 12], [10, 13]
    ],
    initialBushes: [
      [1, 8], [1, 11], [7, 3], [7, 16], [13, 8], [13, 11]
    ],
    enemies: [
      { id: '5_1', type: 'patrol', col: 18, row: 10, speed: 0.6 },
      { id: '5_2', type: 'patrol', col: 18, row: 1, speed: 0.6 },
      { id: '5_3', type: 'chaser', col: 10, row: 13, speed: 0.75 },
      { id: '5_4', type: 'ghost', col: 1, row: 13, speed: 0.5 }
    ]
  },
  {
    number: 6,
    name: 'El Laberinto Supremo',
    description: 'El desafío final. Cuatro zorros extremadamente inteligentes patrullan el laberinto estrecho.',
    playerStartCol: 18,
    playerStartRow: 1,
    innerWalls: [
      [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17],
      [12, 2], [12, 3], [12, 4], [12, 5], [12, 6], [12, 13], [12, 14], [12, 15], [12, 16], [12, 17],
      [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 13], [6, 14], [6, 15], [6, 16], [6, 17],
      [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 13], [8, 14], [8, 15], [8, 16], [8, 17],
      [3, 4], [4, 4], [5, 4], [9, 4], [10, 4], [11, 4],
      [3, 15], [4, 15], [5, 15], [9, 15], [10, 15], [11, 15]
    ],
    initialBushes: [
      [3, 2], [3, 17], [5, 5], [5, 14], [9, 5], [9, 14], [11, 2], [11, 17]
    ],
    enemies: [
      { id: '6_1', type: 'chaser', col: 10, row: 13, speed: 0.75 },
      { id: '6_2', type: 'chaser', col: 1, row: 13, speed: 0.75 },
      { id: '6_3', type: 'ghost', col: 18, row: 1, speed: 0.5 },
      { id: '6_4', type: 'ghost', col: 18, row: 10, speed: 0.5 }
    ]
  }
];

