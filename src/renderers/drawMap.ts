/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileType, GridPos } from '../types';
import { COLS, ROWS, TILE, T_WALL, T_BUSH } from '../constants';

// Helper to draw leaf circles that can jut out past the standard grid boundaries
const drawLeaf = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rSize: number,
  fillCol: string,
  outlineCol: string
) => {
  ctx.fillStyle = fillCol;
  ctx.beginPath();
  ctx.arc(cx, cy, rSize, 0, Math.PI * 2);
  ctx.fill();

  // Draw subtle bottom outline for leaf depth
  ctx.strokeStyle = outlineCol;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(cx, cy, rSize, 0, Math.PI);
  ctx.stroke();
};

// Helper to draw a single bush/shrub with optional scale and alpha
const drawBushSingle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _c: number,
  _r: number,
  variant: number,
  alpha: number,
  growProgress: number,
  hasLeft: boolean,
  hasRight: boolean,
  hasUp: boolean,
  hasDown: boolean
) => {
  ctx.save();
  ctx.globalAlpha = alpha;

  // A. Organic base shadow projected onto the earth
  if (!hasDown) {
    ctx.fillStyle = 'rgba(32, 19, 10, 0.48)';
    ctx.beginPath();
    ctx.ellipse(x + TILE / 2, y + TILE + 2, TILE * 0.55, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.scale(growProgress, growProgress);
  ctx.translate(-(x + TILE / 2), -(y + TILE / 2));

  // Set up colors based on variant to break monotony and add depth
  let colDark = '#1c472d';
  let colMid = '#2b7835';
  let colLight = '#5ec263';
  let colWarm = '#94db97';
  let colLeafGlint = '#b4f07a';

  if (variant === 1) {
    colDark = '#1a3e26';
    colMid = '#328543';
    colLight = '#7ccc81';
    colWarm = '#acf2ad';
    colLeafGlint = '#daf7a6';
  } else if (variant === 2) {
    colDark = '#133317';
    colMid = '#24632b';
    colLight = '#439c48';
    colWarm = '#7cd181';
    colLeafGlint = '#9be69e';
  }

  // Base fill con padding
  ctx.fillStyle = colDark;
  const padL = hasLeft ? -1 : 2;
  const padR = hasRight ? -1 : 2;
  const padT = hasUp ? -1 : 2;
  const padB = hasDown ? -1 : 2;
  ctx.fillRect(x + padL, y + padT, TILE - padL - padR, TILE - padT - padB);

  // Bordes autotile dibujados 1px hacia ADENTRO del tile
  ctx.strokeStyle = 'rgba(5, 20, 8, 0.55)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  if (!hasUp) {
    ctx.moveTo(x + (hasLeft ? 0 : 3), y + 1);
    ctx.lineTo(x + TILE - (hasRight ? 0 : 3), y + 1);
  }
  if (!hasDown) {
    ctx.moveTo(x + (hasLeft ? 0 : 3), y + TILE - 1);
    ctx.lineTo(x + TILE - (hasRight ? 0 : 3), y + TILE - 1);
  }
  if (!hasLeft) {
    ctx.moveTo(x + 1, y + (hasUp ? 0 : 3));
    ctx.lineTo(x + 1, y + TILE - (hasDown ? 0 : 3));
  }
  if (!hasRight) {
    ctx.moveTo(x + TILE - 1, y + (hasUp ? 0 : 3));
    ctx.lineTo(x + TILE - 1, y + TILE - (hasDown ? 0 : 3));
  }
  ctx.stroke();

  // Draw interior branches
  ctx.strokeStyle = '#4a2e19';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (variant === 0) {
    ctx.moveTo(x + 10, y + 25);
    ctx.quadraticCurveTo(x + 18, y + 16, x + 25, y + 22);
  } else if (variant === 1) {
    ctx.moveTo(x + 30, y + 12);
    ctx.quadraticCurveTo(x + 22, y + 20, x + 15, y + 15);
  } else {
    ctx.moveTo(x + 12, y + 12);
    ctx.lineTo(x + 28, y + 28);
  }
  ctx.stroke();

  // Draw dense organic leaf layers with shading
  drawLeaf(ctx, x + 10, y + 28, 7.5, colDark, '#051408');
  drawLeaf(ctx, x + TILE - 10, y + 28, 7.5, colDark, '#051408');
  drawLeaf(ctx, x + 20, y + 30, 8.0, colDark, '#051408');

  drawLeaf(ctx, x + 8, y + 20, 7.0, colMid, colDark);
  drawLeaf(ctx, x + TILE - 8, y + 20, 7.0, colMid, colDark);
  drawLeaf(ctx, x + 20, y + 22, 7.5, colMid, colDark);

  drawLeaf(ctx, x + 10, y + 12, 6.5, colLight, colMid);
  drawLeaf(ctx, x + TILE - 10, y + 12, 6.5, colLight, colMid);
  drawLeaf(ctx, x + 20, y + 13, 7.0, colLight, colMid);

  drawLeaf(ctx, x + 12, y + 6, 5.0, colWarm, colLight);
  drawLeaf(ctx, x + TILE - 12, y + 6, 5.0, colWarm, colLight);
  drawLeaf(ctx, x + 20, y + 7, 5.5, colWarm, colLight);

  drawLeaf(ctx, x + 14, y + 3, 3.5, colLeafGlint, colWarm);
  drawLeaf(ctx, x + TILE - 14, y + 3, 3.5, colLeafGlint, colWarm);
  drawLeaf(ctx, x + 20, y + 4, 4.0, colLeafGlint, colWarm);

  // Leaves that jut out
  if (!hasLeft) {
    drawLeaf(ctx, x - 2, y + 14, 4.5, colMid, colDark);
    drawLeaf(ctx, x - 3, y + 22, 5.0, colDark, '#051408');
    drawLeaf(ctx, x - 1, y + 8, 4.0, colLight, colMid);
  }
  if (!hasRight) {
    drawLeaf(ctx, x + TILE + 2, y + 14, 4.5, colMid, colDark);
    drawLeaf(ctx, x + TILE + 3, y + 22, 5.0, colDark, '#051408');
    drawLeaf(ctx, x + TILE + 1, y + 8, 4.0, colLight, colMid);
  }
  if (!hasUp) {
    drawLeaf(ctx, x + 12, y - 2, 4.5, colLeafGlint, colWarm);
    drawLeaf(ctx, x + 28, y - 2, 4.2, colWarm, colLight);
    drawLeaf(ctx, x + 20, y - 3, 5.0, colLeafGlint, colWarm);
  }
  if (!hasDown) {
    drawLeaf(ctx, x + 12, y + TILE - 1, 4.5, colDark, '#051408');
    drawLeaf(ctx, x + 28, y + TILE - 1, 4.5, colDark, '#051408');
  }

  // Cute wild flowers
  if (variant === 0) {
    const fx = x + 15, fy = y + 14;
    ctx.fillStyle = '#ff3366';
    ctx.beginPath(); ctx.arc(fx, fy, 3.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.arc(fx, fy, 1.0, 0, Math.PI * 2); ctx.fill();
  } else if (variant === 1) {
    const fx = x + TILE - 15, fy = y + 16;
    ctx.fillStyle = '#ff6600';
    ctx.beginPath(); ctx.arc(fx, fy, 3.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(fx, fy, 1.0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
  ctx.restore();
};

export const drawMap = (
  ctx: CanvasRenderingContext2D,
  map: TileType[][],
  grassAges: { [key: string]: { createdAt: number } },
  breakingTiles: GridPos[],
  playerBreakingAnimTimer: number,
  escapeActive = false,
  timestamp = 0,
  dyingBushes: { col: number; row: number; alpha: number; variant: number }[] = [],
  burrowCol = 18,
  burrowRow = 13
) => {
  ctx.shadowBlur = 0;

  // Main tile render loop
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let x = c * TILE;
      const y = r * TILE;
      const t = map[r]?.[c] ?? 0;

      const isBossBurrowTile = c >= 8 && c <= 11 && r >= 5 && r <= 8;

      if (t === T_WALL && !isBossBurrowTile) {
        // ==========================================
        // 1. 2.5D BONE-WHITE GARDEN STONE WALLS (#CAC6C7)
        // ==========================================

        // First draw standard ground dirt base underneath to eliminate ANY black holes!
        ctx.fillStyle = '#C78757';
        ctx.fillRect(x, y, TILE, TILE);

        // Draw subtle earth details under the block
        ctx.fillStyle = 'rgba(145, 95, 55, 0.22)';
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x + TILE - 4, y, 4, 4);
        ctx.fillRect(x, y + TILE - 4, 4, 4);
        ctx.fillRect(x + TILE - 4, y + TILE - 4, 4, 4);

        // A. Soft Drop Shadow projected down-right onto dirt floor (40% opacity)
        ctx.fillStyle = 'rgba(32, 19, 10, 0.40)';
        ctx.fillRect(x + 5, y + 5, TILE, TILE);

        // B. Draw 3D Stone Block occupying the full tile
        const topH = 14; // 14 px sunlit flat top face

        // 1. Draw Top Face (sunlit flat stone bricks)
        ctx.fillStyle = '#F5F1F2'; // Sunlit bone-white
        ctx.fillRect(x, y, TILE, topH);

        // Staggered vertical brick joints on top face
        ctx.strokeStyle = '#CAC6C7';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x + 13, y); ctx.lineTo(x + 13, y + topH);
        ctx.moveTo(x + 27, y); ctx.lineTo(x + 27, y + topH);
        ctx.stroke();

        // Horizontal brick dividing joint
        ctx.beginPath();
        ctx.moveTo(x, y + 7); ctx.lineTo(x + TILE, y + 7);
        ctx.stroke();

        // 2. Draw Front Face (shaded vertical stone brick walls)
        // Row 1 of front bricks
        ctx.fillStyle = '#CAC6C7'; // Base shaded bone-white
        ctx.fillRect(x, y + topH, TILE, 13);

        // Row 2 of front bricks (darker bottom row shadow)
        ctx.fillStyle = '#A5A1A2';
        ctx.fillRect(x, y + topH + 13, TILE, 13);

        // Vertical joints between front bricks (staggered pattern)
        ctx.strokeStyle = '#5C5859';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        // Row 1 joints
        ctx.moveTo(x + 13, y + topH); ctx.lineTo(x + 13, y + topH + 13);
        ctx.moveTo(x + 27, y + topH); ctx.lineTo(x + 27, y + topH + 13);
        // Row 2 joint (centered staggered)
        ctx.moveTo(x + 20, y + topH + 13); ctx.lineTo(x + 20, y + TILE);
        ctx.stroke();

        // Horizontal mortar joint dividing Row 1 and Row 2
        ctx.beginPath();
        ctx.moveTo(x, y + topH + 13); ctx.lineTo(x + TILE, y + topH + 13);
        ctx.stroke();

        // 3. Add realistic weathered stone cracks and chip highlights
        ctx.strokeStyle = '#4A4647'; // dark crack color
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + topH + 4);
        ctx.lineTo(x + 11, y + topH + 8);
        ctx.lineTo(x + 9, y + topH + 12);
        ctx.stroke();

        // Highlights on brick row edges to add carved relief
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 1, y + topH + 1, TILE - 2, 0.8);
        ctx.fillRect(x + 1, y + topH + 14, TILE - 2, 0.8);

        // Micro-dot porosity texturing for stone organic feel
        ctx.fillStyle = '#F5F1F2'; // light grains
        ctx.fillRect(x + 6, y + topH + 8, 1, 1);
        ctx.fillRect(x + 32, y + topH + 18, 1, 1);
        ctx.fillStyle = '#7C7879'; // dark grains
        ctx.fillRect(x + 18, y + topH + 5, 1, 1);
        ctx.fillRect(x + 25, y + topH + 20, 1, 1);

        // Bevel separator crisp highlight line separating top and front
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y + topH);
        ctx.lineTo(x + TILE, y + topH);
        ctx.stroke();

        // Solid dark outline for the whole brick block
        ctx.strokeStyle = '#2B2728';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, TILE, TILE);



      } else if (t === T_BUSH) {
        // ==========================================
        // 2. LUSH ORGANIC 2.5D CONNECTED SHRUB HEDGES (PASTO/HIERBA)
        // ==========================================

        const isShaking = breakingTiles.some(tile => tile.col === c && tile.row === r) && playerBreakingAnimTimer >= 112;
        if (isShaking) {
          x += Math.sin(Date.now() * 0.09) * 3.5;
        }

        const key = `${r}_${c}`;
        const record = grassAges[key];
        const ageMs = record ? Date.now() - record.createdAt : 1000;

        // Check adjacent tiles of the same type to support autotiling
        const isNeighborGrass = (nc: number, nr: number) => {
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
          return map[nr]?.[nc] === T_BUSH;
        };
        const hasUp = isNeighborGrass(c, r - 1);
        const hasDown = isNeighborGrass(c, r + 1);
        const hasLeft = isNeighborGrass(c - 1, r);
        const hasRight = isNeighborGrass(c + 1, r);

        // FIX 1: Extender el dirt base 1px hacia vecinos del mismo tipo
        ctx.fillStyle = '#C78757';
        const dL = hasLeft ? -1 : 0;
        const dT = hasUp ? -1 : 0;
        const dR = hasRight ? 1 : 0;
        const dB = hasDown ? 1 : 0;
        ctx.fillRect(x + dL, y + dT, TILE - dL + dR, TILE - dT + dB);

        // Grow animation with soft elastic overshoot curve (420ms duration)
        let growProgress = 1.0;
        if (ageMs < 420) {
          const tNorm = ageMs / 420;
          growProgress = 1 - Math.pow(1 - tNorm, 3) + Math.sin(tNorm * Math.PI) * 0.08;
          growProgress = Math.max(0, Math.min(1.1, growProgress));
        }

        // Deterministic hash based on grid coordinate for layout variations
        const hashVal = Math.abs(Math.sin(r * 12.9898 + c * 78.233)) * 43758.5453;
        const variant = Math.floor(hashVal % 3);

        drawBushSingle(ctx, x, y, c, r, variant, 1.0, growProgress, hasLeft, hasRight, hasUp, hasDown);

      } else {
        // ==========================================
        // 3. SEAMLESS EARTHEN GARDEN GROUND (EMPTY)
        // ==========================================

        ctx.fillStyle = '#C78757';
        ctx.fillRect(x, y, TILE, TILE);

        ctx.strokeStyle = 'rgba(150, 95, 55, 0.06)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, y, TILE, TILE);

        ctx.fillStyle = 'rgba(145, 95, 55, 0.22)';
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x + TILE - 4, y, 4, 4);
        ctx.fillRect(x, y + TILE - 4, 4, 4);
        ctx.fillRect(x + TILE - 4, y + TILE - 4, 4, 4);

        const hashVal = Math.abs(Math.sin(r * 12.9898 + c * 78.233)) * 43758.5453;

        ctx.fillStyle = 'rgba(110, 65, 30, 0.35)';
        ctx.fillRect(x + 4 + (hashVal % 6), y + 6 + ((hashVal * 3) % 8), 1.2, 1.2);
        ctx.fillRect(x + 22 + (hashVal % 10), y + 14 + ((hashVal * 5) % 12), 1.0, 1.0);
        ctx.fillRect(x + 12 + (hashVal % 8), y + 26 + ((hashVal * 7) % 10), 1.2, 1.2);

        ctx.fillStyle = '#deb089';
        ctx.fillRect(x + 8 + (hashVal % 12), y + 18 + ((hashVal * 11) % 6), 1.0, 1.0);
        ctx.fillRect(x + 28 + (hashVal % 6), y + 22 + ((hashVal * 13) % 8), 1.2, 1.2);

        // Step 3.5: Scattered Organic Stones
        if (hashVal % 100 < 10.0) {
          const rx = x + 8 + (hashVal % 20);
          const ry = y + 8 + ((hashVal * 9) % 20);
          const rSize = 2.5 + (hashVal % 3.0); // size 2.5 to 5.5px
          const mossy = (hashVal % 10 > 7.0); // 30% of stones are mossy

          ctx.save();
          // Draw subtle shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
          ctx.beginPath();
          ctx.ellipse(rx + 0.5, ry + rSize * 0.4, rSize * 1.1, rSize * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw rock body
          ctx.fillStyle = '#9e9a92';
          ctx.strokeStyle = '#2B2728';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Clip to rock shape for highlights and moss
          ctx.clip();

          ctx.fillStyle = '#c2beb6'; // light face
          ctx.beginPath();
          ctx.ellipse(rx - rSize * 0.3, ry - rSize * 0.3, rSize * 0.6, rSize * 0.4, -0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#78746c'; // dark shadow face
          ctx.beginPath();
          ctx.ellipse(rx + rSize * 0.3, ry + rSize * 0.3, rSize * 0.6, rSize * 0.4, 0.3, 0, Math.PI * 2);
          ctx.fill();

          if (mossy) {
            ctx.fillStyle = '#5a782b'; // green moss
            ctx.beginPath();
            ctx.ellipse(rx - rSize * 0.05, ry - rSize * 0.55, rSize * 0.6, rSize * 0.25, 0.15, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Dry Twigs
        if (hashVal % 10 > 9.0) {
          const tx = x + 10 + (hashVal % 20);
          const ty = y + 10 + ((hashVal * 13) % 20);
          ctx.strokeStyle = '#7c5230';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + 6, ty + 4);
          ctx.moveTo(tx + 3, ty + 2);
          ctx.lineTo(tx + 2, ty + 5);
          ctx.stroke();
        }

        // Footprint marks
        if (hashVal % 5 < 1.2) {
          const hx = x + 12 + (hashVal % 16);
          const hy = y + 12 + ((hashVal * 3) % 16);
          ctx.fillStyle = 'rgba(142, 92, 52, 0.35)';
          ctx.beginPath();
          ctx.ellipse(hx, hy, 4.5, 2.8, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(hx - 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
          ctx.arc(hx + 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw dying bushes overlay
        const dyingBush = dyingBushes.find(b => b.col === c && b.row === r);
        if (dyingBush) {
          const isNeighborGrass = (nc: number, nr: number) => {
            if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
            return map[nr]?.[nc] === T_BUSH || dyingBushes.some(db => db.col === nc && db.row === nr);
          };
          const hasUp = isNeighborGrass(c, r - 1);
          const hasDown = isNeighborGrass(c, r + 1);
          const hasLeft = isNeighborGrass(c - 1, r);
          const hasRight = isNeighborGrass(c + 1, r);

          drawBushSingle(ctx, x, y, c, r, dyingBush.variant, dyingBush.alpha, 1.0, hasLeft, hasRight, hasUp, hasDown);
        }
      }
    }
  }

  // ─ Boss Den: columnas 8–11, filas 5–8 (4×4) ─
  drawBossDen(ctx, 8 * TILE, 5 * TILE, timestamp);

  // ─ Turtle Shrine: (1×2 structure extending upwards from burrowRow) ─
  drawTurtleShrine(ctx, burrowCol * TILE, (burrowRow - 1) * TILE, timestamp, escapeActive);
};



// ==========================================
// 3. BOSS DEN
// Montículo de tierra multi-nivel, asimétrico.
// Ocupa cuadrícula 4×4 (col 0–3, row 0–3).
// Detalle máximo: entrada central con arco de raíces, 7+ entradas
// de túnel, 3 pares de ojos acechando, ZZZ durmientes.
// ==========================================
function mulberry32(a: number) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function drawBossDen(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  timestamp: number
) {
  ctx.save();
  const S = TILE * 4;
  const L = ox, T = oy, R = ox + S, B = oy + S;
  const cx = ox + S / 2;
  const cy = oy + S / 2 + 4;

  const P = {
    dirtDeep: "#2a1504",
    dirtDark: "#4d2a10",
    dirtBase: "#7a5230",
    dirtMid: "#663f1a",
    dirtLight: "#9c6a3a",
    outline: "#201000",
    holeBlack: "#000000",
    holeDark: "#0c0600",
    rock: "#7a746c",
    rockLight: "#a6a096",
    rockDark: "#524c44",
    moss: "#5c7d30",
    mossDark: "#3d541f",
    root: "#663a15",
    rootDark: "#301805",
    rootLight: "#a36c34"
  };

  // ════ helpers ════════════════════════════════════════

  const lumpyBlob = (x: number, y: number, rx: number, ry: number, seedR: number, lump = 0.16) => {
    const r2 = mulberry32(seedR);
    const n = 16, pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const j = 1 + (r2() - 0.35) * lump;
      pts.push([x + Math.cos(a) * rx * j, y + Math.sin(a) * ry * j]);
    }
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % n];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const px = x + (mx - x) * 1.07, py = y + (my - y) * 1.07;
      if (i === 0) ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(px, py, x2, y2);
    }
    ctx.closePath();
  };

  // Rectángulo redondeado GRUMOSO: la base cuadrada 4×4
  const lumpyRect = (x0: number, y0: number, x1: number, y1: number, cr: number, seedR: number, lump = 3) => {
    const r2 = mulberry32(seedR);
    const ptsBase: [number, number][] = [];
    const seg = (ax: number, ay: number, bx: number, by: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const t = i / n;
        ptsBase.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      }
    };
    const arc = (ccx: number, ccy: number, a0: number, a1: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        ptsBase.push([ccx + Math.cos(a) * cr, ccy + Math.sin(a) * cr]);
      }
    };
    seg(x0 + cr, y0, x1 - cr, y0, 7);
    arc(x1 - cr, y0 + cr, -Math.PI / 2, 0, 4);
    seg(x1, y0 + cr, x1, y1 - cr, 7);
    arc(x1 - cr, y1 - cr, 0, Math.PI / 2, 4);
    seg(x1 - cr, y1, x0 + cr, y1, 7);
    arc(x0 + cr, y1 - cr, Math.PI / 2, Math.PI, 4);
    seg(x0, y1 - cr, x0, y0 + cr, 7);
    arc(x0 + cr, y0 + cr, Math.PI, Math.PI * 1.5, 4);
    const mcx = (x0 + x1) / 2, mcy = (y0 + y1) / 2;
    const pts = ptsBase.map(([px, py]) => {
      const dx = px - mcx, dy = py - mcy;
      const d = Math.hypot(dx, dy) || 1;
      const j = (r2() - 0.4) * lump;
      return [px + (dx / d) * j, py + (dy / d) * j];
    });
    ctx.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [x1p, y1p] = pts[i];
      const [x2p, y2p] = pts[(i + 1) % n];
      if (i === 0) ctx.moveTo(x1p, y1p);
      ctx.quadraticCurveTo(x1p, y1p, (x1p + x2p) / 2, (y1p + y2p) / 2);
    }
    ctx.closePath();
  };

  const speckle = (x: number, y: number, rx: number, ry: number, count: number, seedR: number) => {
    const r2 = mulberry32(seedR);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = r2() > 0.5 ? "rgba(50,26,8,0.28)" : "rgba(230,180,115,0.25)";
      const a = r2() * Math.PI * 2, rr = Math.sqrt(r2());
      ctx.fillRect(x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr, 1.2, 1.2);
    }
  };

  const plateau = (x: number, y: number, rx: number, ry: number, h: number, seedR: number) => {
    lumpyBlob(x, y + h, rx, ry, seedR);
    ctx.fillStyle = P.dirtDeep; ctx.fill();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 1.3; ctx.stroke();
    lumpyBlob(x, y + h * 0.5, rx, ry, seedR);
    ctx.fillStyle = P.dirtDark; ctx.fill();
    lumpyBlob(x, y, rx, ry, seedR);
    ctx.fillStyle = P.dirtBase; ctx.fill();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.save();
    lumpyBlob(x, y, rx, ry, seedR); ctx.clip();
    ctx.fillStyle = "rgba(224,174,110,0.45)";
    ctx.beginPath(); ctx.ellipse(x - rx * 0.1, y - ry * 0.35, rx * 0.8, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(60,32,8,0.3)";
    ctx.beginPath(); ctx.ellipse(x + rx * 0.05, y + ry * 0.65, rx * 0.85, ry * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    speckle(x, y, rx, ry, 26, seedR + 3);
    ctx.restore();
  };

  const hole = (x: number, y: number, rx: number, ry: number, rot = 0, seedR = 1) => {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    lumpyBlob(0, 0.5, rx + 2.6, ry + 2.6, seedR, 0.28);
    ctx.fillStyle = P.dirtLight; ctx.fill();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 0.9; ctx.stroke();
    lumpyBlob(0, -0.4, rx + 1.4, ry + 1.4, seedR + 1, 0.2);
    ctx.fillStyle = P.dirtDark; ctx.fill();
    const g = ctx.createRadialGradient(0, -ry * 0.35, 0.5, 0, 0, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, P.holeBlack);
    g.addColorStop(0.65, P.holeDark);
    g.addColorStop(1, "#33190a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  };

  const rock = (x: number, y: number, r: number, mossy: boolean, seedR: number) => {
    const r2 = mulberry32(seedR);
    const n = 7, pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - 0.5;
      const j = 0.72 + r2() * 0.5;
      pts.push([x + Math.cos(a) * r * j, y + Math.sin(a) * r * 0.78 * j]);
    }
    ctx.beginPath();
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
    ctx.closePath();
    ctx.fillStyle = P.rock; ctx.fill();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.fillStyle = P.rockLight;
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.55, r * 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.rockDark;
    ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.4, r * 0.6, r * 0.35, 0.3, 0, Math.PI * 2); ctx.fill();
    if (mossy) {
      ctx.fillStyle = P.moss;
      ctx.beginPath(); ctx.ellipse(x - r * 0.05, y - r * 0.55, r * 0.55, r * 0.25, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.mossDark;
      ctx.beginPath(); ctx.ellipse(x + r * 0.3, y - r * 0.42, r * 0.3, r * 0.14, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  // Roca semi-enterrada en el terreno
  const buriedRock = (x: number, y: number, r: number, mossy: boolean, seedR: number) => {
    rock(x, y, r, mossy, seedR);
    lumpyBlob(x, y + r * 0.62, r * 1.15, r * 0.45, seedR + 5, 0.3);
    ctx.fillStyle = P.dirtMid; ctx.fill();
    ctx.strokeStyle = "rgba(42,20,4,0.5)"; ctx.lineWidth = 0.7; ctx.stroke();
  };

  const rockCluster = (x: number, y: number, baseR: number, count: number, mossy: boolean, seedR: number) => {
    const r2 = mulberry32(seedR);
    for (let i = 0; i < count; i++) {
      rock(x + (r2() - 0.5) * baseR * 2.8, y + (r2() - 0.5) * baseR * 1.5,
        baseR * (0.45 + r2() * 0.7), mossy && r2() > 0.45, seedR + i * 13);
    }
  };

  // Parche de erosión: zona hundida con grietas
  const erosion = (x: number, y: number, rx: number, ry: number, seedR: number) => {
    const r2 = mulberry32(seedR);
    lumpyBlob(x, y, rx, ry, seedR, 0.35);
    ctx.fillStyle = "rgba(58,30,8,0.4)"; ctx.fill();
    lumpyBlob(x + rx * 0.1, y + ry * 0.15, rx * 0.6, ry * 0.55, seedR + 1, 0.35);
    ctx.fillStyle = "rgba(40,20,5,0.35)"; ctx.fill();
    ctx.strokeStyle = "rgba(30,14,2,0.55)"; ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      const a0 = r2() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a0) * rx * 0.3, y + Math.sin(a0) * ry * 0.3);
      ctx.lineTo(x + Math.cos(a0) * rx * (0.9 + r2() * 0.4), y + Math.sin(a0) * ry * (0.9 + r2() * 0.4));
      ctx.lineTo(x + Math.cos(a0 + 0.5) * rx * (1.1 + r2() * 0.3), y + Math.sin(a0 + 0.5) * ry * (1.1 + r2() * 0.3));
      ctx.stroke();
    }
  };

  // ── RAÍCES RAMIFICADAS: trazo cónico + ramas hijas recursivas ──
  const sampleQuad = (x1: number, y1: number, qx: number, qy: number, x2: number, y2: number, segs: number, wob: number, seedR: number) => {
    const r2 = mulberry32(seedR);
    const phase = r2() * 6.28;
    const pts: number[][] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, mt = 1 - t;
      let px = mt * mt * x1 + 2 * mt * t * qx + t * t * x2;
      let py = mt * mt * y1 + 2 * mt * t * qy + t * t * y2;
      const dx = 2 * mt * (qx - x1) + 2 * t * (x2 - qx);
      const dy = 2 * mt * (qy - y1) + 2 * t * (y2 - qy);
      const dl = Math.hypot(dx, dy) || 1;
      const off = Math.sin(t * Math.PI * 3 + phase) * wob * Math.sin(t * Math.PI)
        + (r2() - 0.5) * 1.4;
      px += (-dy / dl) * off; py += (dx / dl) * off;
      pts.push([px, py, dx / dl, dy / dl]);
    }
    return pts;
  };

  const drawTaperedPath = (pts: number[][], w0: number, wEnd: number) => {
    const pass = (col: string, mul: number, add: number) => {
      ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 0; i < pts.length - 1; i++) {
        const t = i / (pts.length - 1);
        ctx.lineWidth = Math.max(0.6, (w0 + (wEnd - w0) * t) * mul + add);
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
        ctx.stroke();
      }
    };
    pass(P.rootDark, 1, 1.8);
    pass(P.root, 1, 0);
    pass(P.rootLight, 0.45, 0);
  };

  const rootBranch = (x1: number, y1: number, qx: number, qy: number, x2: number, y2: number, w: number, seedR: number, depth: number) => {
    const segs = 22;
    const pts = sampleQuad(x1, y1, qx, qy, x2, y2, segs, 1.4 + w * 0.25, seedR);
    drawTaperedPath(pts, w, Math.max(0.8, w * 0.28));
    const r2 = mulberry32(seedR + 7);
    // nudos engrosados
    for (let i = 4; i < segs - 3; i += 7) {
      const [px, py] = pts[i];
      ctx.fillStyle = P.rootDark;
      ctx.beginPath(); ctx.arc(px, py, w * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.root;
      ctx.beginPath(); ctx.arc(px - 0.5, py - 0.5, w * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // ramas hijas recursivas
    if (depth > 0 && w > 1.4) {
      for (let b = 0; b < 2; b++) {
        const ti = Math.floor(segs * (0.38 + b * 0.3 + r2() * 0.08));
        const [bx, by, tx, ty] = pts[ti];
        const side = b % 2 === 0 ? 1 : -1;
        const len = 10 + w * 4 + r2() * 8;
        const ang = Math.atan2(ty, tx) + side * (0.7 + r2() * 0.4);
        const ex = bx + Math.cos(ang) * len;
        const ey = by + Math.sin(ang) * len;
        const mxq = bx + Math.cos(ang + side * 0.4) * len * 0.55;
        const myq = by + Math.sin(ang + side * 0.4) * len * 0.55;
        rootBranch(bx, by, mxq, myq, ex, ey, w * 0.5, seedR + 31 + b * 17, depth - 1);
      }
    }
    // punta enterrándose en la tierra (solo raíces principales)
    if (w >= 2.2) {
      const [ex2, ey2] = pts[segs];
      lumpyBlob(ex2, ey2 + 1, w * 1.3 + 1.5, w * 0.8 + 1.2, seedR + 91, 0.3);
      ctx.fillStyle = P.dirtMid; ctx.fill();
      ctx.strokeStyle = "rgba(42,20,4,0.45)"; ctx.lineWidth = 0.6; ctx.stroke();
    }
  };

  const eyes = (x: number, y: number, s: number, phase: number) => {
    const t = timestamp * 0.001 + phase;
    const blink = (Math.sin(t * 0.6 + phase) > 0.99) ? 0.12 : 1;
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.0 + phase);
    const g = ctx.createRadialGradient(x, y, 0.5, x, y, s * 3.8);
    g.addColorStop(0, `rgba(255,40,25,${0.38 * pulse * blink})`);
    g.addColorStop(0.5, `rgba(200,15,10,${0.1 * pulse * blink})`);
    g.addColorStop(1, "rgba(180,10,10,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 3.8, 0, Math.PI * 2); ctx.fill();
    [-1, 1].forEach(side => {
      const ex = x + side * s * 1.6;
      ctx.save();
      ctx.translate(ex, y);
      ctx.scale(1, blink);
      ctx.fillStyle = "#ff2a1a";
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff8a60";
      ctx.beginPath(); ctx.ellipse(-side * s * 0.05, s * 0.05, s * 0.5, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd9c0";
      ctx.beginPath(); ctx.ellipse(-side * s * 0.3, -s * 0.05, s * 0.18, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0c0500";
      ctx.beginPath();
      ctx.moveTo(-s * 1.2, -s * 0.9);
      ctx.lineTo(s * 1.2, -s * 0.9);
      ctx.lineTo(s * 1.2, side > 0 ? -s * 0.48 : -s * 0.12);
      ctx.lineTo(-s * 1.2, side > 0 ? -s * 0.12 : -s * 0.48);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  };

  // ════ 1. SOMBRA cuadrada suave ════════════════════════
  for (let k = 3; k >= 1; k--) {
    lumpyRect(L - k * 3, T + 8 - k * 2, R + k * 3, B + k * 3, 22, 200, 0);
    ctx.fillStyle = "rgba(20,8,0,0.1)";
    ctx.fill();
  }

  // ════ 2. DISIPACIÓN hacia el terreno normal ═══════════
  {
    const r2 = mulberry32(901);
    for (let i = 0; i < 110; i++) {
      const edge = Math.floor(r2() * 4);
      const along = r2(), dist = r2() * r2() * 16 + 1;
      let px: number, py: number;
      if (edge === 0) { px = L + along * S; py = T + 6 - dist; }
      else if (edge === 1) { px = L + along * S; py = B + dist; }
      else if (edge === 2) { px = L - dist; py = T + 10 + along * (S - 10); }
      else { px = R + dist; py = T + 10 + along * (S - 10); }
      const fade = Math.max(0, 1 - dist / 16);
      if (r2() < 0.82) {
        ctx.fillStyle = r2() > 0.5
          ? `rgba(110,65,30,${0.4 * fade})`
          : `rgba(60,32,10,${0.32 * fade})`;
        ctx.fillRect(px, py, 1.2 + r2(), 1.2 + r2());
      } else {
        ctx.fillStyle = `rgba(158,154,150,${0.8 * fade})`;
        ctx.strokeStyle = `rgba(70,66,62,${0.7 * fade})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(px, py, 1.6 + r2() * 1.2, 1.1 + r2(), r2(), 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
    for (let i = 0; i < 14; i++) {
      const edge = Math.floor(r2() * 4);
      const along = 0.08 + r2() * 0.84;
      let px: number, py: number;
      if (edge === 0) { px = L + along * S; py = T + 4 - r2() * 5; }
      else if (edge === 1) { px = L + along * S; py = B + 2 + r2() * 6; }
      else if (edge === 2) { px = L - 2 - r2() * 6; py = T + 14 + along * (S - 18); }
      else { px = R + 2 + r2() * 6; py = T + 14 + along * (S - 18); }
      lumpyBlob(px, py, 2.2 + r2() * 2.4, 1.6 + r2() * 1.6, 910 + i, 0.35);
      ctx.fillStyle = r2() > 0.5 ? P.dirtMid : P.dirtBase;
      ctx.fill();
      ctx.strokeStyle = "rgba(42,20,4,0.4)"; ctx.lineWidth = 0.6; ctx.stroke();
    }
  }

  // ════ 3. BASE CUADRADA 4×4 (dos niveles) ══════════════
  lumpyRect(L + 1, T + 12, R - 1, B - 1, 18, 201, 3.5);
  ctx.fillStyle = P.dirtDark; ctx.fill();
  ctx.strokeStyle = P.outline; ctx.lineWidth = 1.4; ctx.stroke();
  lumpyRect(L + 3, T + 9, R - 3, B - 6, 17, 202, 3);
  ctx.fillStyle = P.dirtMid; ctx.fill();
  ctx.strokeStyle = P.outline; ctx.lineWidth = 1.1; ctx.stroke();

  // ── 3b. DETALLE GLOBAL DEL TERRENO ──
  ctx.save();
  lumpyRect(L + 3, T + 9, R - 3, B - 6, 17, 202, 3);
  ctx.clip();
  {
    const r2 = mulberry32(903);
    const tonePatches: [number, number, number, number, string][] = [
      [L + 30, T + 40, 26, 14, "rgba(160,106,56,0.45)"],
      [R - 34, T + 44, 24, 13, "rgba(92,53,20,0.35)"],
      [L + 36, B - 34, 28, 12, "rgba(198,140,78,0.3)"],
      [R - 40, B - 38, 26, 13, "rgba(60,32,10,0.3)"],
      [cx, T + 26, 34, 10, "rgba(138,85,38,0.4)"],
      [cx - 10, B - 22, 36, 10, "rgba(74,42,16,0.32)"],
    ];
    tonePatches.forEach(([x, y, rx, ry, c], i) => {
      lumpyBlob(x, y, rx, ry, 920 + i * 7, 0.3);
      ctx.fillStyle = c; ctx.fill();
    });
    speckle(cx, cy + 4, 78, 74, 260, 904);
    for (let i = 0; i < 26; i++) {
      const px = L + 10 + r2() * (S - 20);
      const py = T + 16 + r2() * (S - 26);
      ctx.fillStyle = r2() > 0.5 ? "#9e9a92" : "#8c8076";
      ctx.strokeStyle = "rgba(50,40,30,0.6)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(px, py, 1 + r2() * 1.2, 0.9 + r2(), r2() * 3, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const px = L + 14 + r2() * (S - 28);
      const py = T + 20 + r2() * (S - 34);
      const rr = 2.5 + r2() * 3;
      ctx.fillStyle = "rgba(40,20,5,0.3)";
      ctx.beginPath(); ctx.ellipse(px + 1, py + 1.4, rr, rr * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      lumpyBlob(px, py, rr, rr * 0.65, 930 + i, 0.35);
      ctx.fillStyle = r2() > 0.5 ? P.dirtBase : P.dirtLight;
      ctx.fill();
      ctx.strokeStyle = "rgba(42,20,4,0.45)"; ctx.lineWidth = 0.6; ctx.stroke();
    }
    erosion(L + 44, T + 58, 13, 7, 941);
    erosion(R - 46, B - 52, 14, 7, 942);
    erosion(cx + 30, T + 36, 10, 6, 943);
    erosion(L + 30, B - 46, 11, 6, 944);
  }
  ctx.restore();

  // ════ 5. ESQUINAS: domos y mesetas con túneles ════════
  hole(L + 16, T + 18, 5.5, 4.5, 0.05, 12);
  hole(L + 32, T + 18, 5.0, 4.0, -0.08, 13);
  hole(L + 24, T + 28, 6.0, 5.0, 0.12, 14); // 3 holes grouped in this corner (no plateau)
  rockCluster(L + 10, T + 32, 5.2, 9, true, 21); // Richer rock cluster (9 stones, larger base)
  buriedRock(L + 6, T + 24, 3.8, true, 22); // Additional mossy corner stone

  plateau(R - 24, T + 26, 21, 12, 8, 31);
  hole(R - 26, T + 24, 6.5, 5, -0.05, 32);
  rockCluster(R - 12, T + 32, 5.8, 10, true, 41); // Richer rock cluster (10 stones, larger base)
  buriedRock(R - 6, T + 20, 4.0, true, 42); // Additional mossy corner stone

  plateau(L + 26, B - 22, 23, 11, 8, 71);
  hole(L + 15, B - 15, 6, 6.5, -0.1, 72);
  rockCluster(L + 32, B - 28, 5.5, 9, true, 91); // Richer rock cluster (9 stones, larger base)
  buriedRock(L + 6, B - 20, 3.8, true, 92); // Additional mossy corner stone

  plateau(R - 26, B - 22, 23, 11, 8, 81);
  hole(R - 10, B - 16, 6.5, 7, 0.08, 82);
  rockCluster(R - 48, B - 15, 5.5, 9, true, 191); // Richer rock cluster (9 stones, larger base)

  // (Las excavaciones/trincheras han sido eliminadas por el momento)

  // rocas incrustadas a lo largo de los bordes
  buriedRock(cx - 26, T + 18, 4.5, false, 601);
  buriedRock(cx + 30, T + 16, 3.8, true, 602);
  buriedRock(L + 12, cy - 30, 4, false, 603);
  buriedRock(R - 12, cy + 28, 4.2, true, 604);
  buriedRock(cx - 34, B - 12, 4.5, true, 605);
  buriedRock(cx + 22, B - 10, 3.6, false, 606);

  // rocas incrustadas dispersas por todo el escenario para mayor variedad
  buriedRock(L + 54, T + 46, 3.2, false, 610);
  buriedRock(R - 54, T + 42, 3.5, true, 611);
  buriedRock(L + 42, B - 46, 3.0, true, 612);
  buriedRock(R - 44, B - 42, 3.4, false, 613);
  buriedRock(L + 20, cy, 3.8, false, 614);
  buriedRock(R - 20, cy - 10, 3.6, true, 615);
  buriedRock(cx - 52, cy + 26, 3.2, false, 616);
  buriedRock(cx + 50, cy + 28, 3.5, true, 617);

  // ════ 6. MONTÍCULO CENTRAL ═══════════════════════════
  const moundPts: [number, number][] = [
    [cx - 48, cy + 36], [cx - 54, cy + 12], [cx - 46, cy - 8],
    [cx - 36, cy - 24], [cx - 24, cy - 38], [cx - 10, cy - 48],
    [cx + 8, cy - 50], [cx + 24, cy - 40], [cx + 36, cy - 26],
    [cx + 46, cy - 10], [cx + 54, cy + 10], [cx + 48, cy + 36],
  ];
  const moundPath = () => {
    const r2 = mulberry32(99);
    ctx.beginPath();
    ctx.moveTo(moundPts[0][0], moundPts[0][1]);
    for (let i = 0; i < moundPts.length; i++) {
      const [x1, y1] = moundPts[i];
      const [x2, y2] = moundPts[(i + 1) % moundPts.length];
      const mx = (x1 + x2) / 2 + (r2() - 0.5) * 4;
      const my = (y1 + y2) / 2 - 1.5 - r2() * 2.5;
      ctx.quadraticCurveTo(mx, my, x2, y2);
    }
    ctx.closePath();
  };
  const eg = ctx.createLinearGradient(cx - 54, cy - 50, cx + 54, cy + 36);
  eg.addColorStop(0, P.dirtLight);
  eg.addColorStop(0.45, P.dirtBase);
  eg.addColorStop(1, P.dirtDark);
  moundPath(); ctx.fillStyle = eg; ctx.fill();
  moundPath(); ctx.strokeStyle = P.outline; ctx.lineWidth = 1.8; ctx.stroke();

  ctx.save();
  moundPath(); ctx.clip();
  ctx.strokeStyle = "rgba(50,26,8,0.45)"; ctx.lineWidth = 1.1;
  [[-42, 0, -27, -22], [-34, 16, -28, 2], [28, -26, 44, -6], [34, 14, 48, 2]].forEach(([ax, ay, bx, by]) => {
    ctx.beginPath();
    ctx.moveTo(cx + ax, cy + ay);
    ctx.quadraticCurveTo(cx + (ax + bx) / 2 - 4, cy + (ay + by) / 2 - 5, cx + bx, cy + by);
    ctx.stroke();
  });
  const patches: [number, number, number, number, string][] = [
    [cx - 36, cy + 4, 13, 8, "rgba(60,32,8,0.35)"],
    [cx + 34, cy + 8, 12, 8, "rgba(198,140,78,0.32)"],
    [cx - 2, cy - 36, 16, 8, "rgba(228,178,114,0.35)"],
    [cx + 12, cy + 26, 18, 6, "rgba(50,26,8,0.3)"],
  ];
  patches.forEach(([x, y, rx, ry, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); ctx.fill();
  });
  speckle(cx, cy - 6, 50, 42, 90, 207);
  {
    const r2 = mulberry32(908);
    for (let i = 0; i < 10; i++) {
      const px = cx - 40 + r2() * 80, py = cy - 30 + r2() * 56;
      ctx.fillStyle = "#9e9a92"; ctx.strokeStyle = "rgba(50,40,30,0.6)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(px, py, 1 + r2() * 1.2, 0.8 + r2() * 0.8, r2() * 3, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();

  // ════ 7. ENTRADA CENTRAL ═════════════════════════════
  const archPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 36);
    ctx.lineTo(cx - 27, cy + 4);
    ctx.quadraticCurveTo(cx - 25, cy - 23, cx, cy - 29);
    ctx.quadraticCurveTo(cx + 25, cy - 23, cx + 27, cy + 4);
    ctx.lineTo(cx + 24, cy + 36);
    ctx.closePath();
  };
  const r3 = mulberry32(303);
  const archPt = (t: number): [number, number] => {
    const ang = Math.PI - t * Math.PI;
    const rX = 30, rY = 32;
    return [cx + Math.cos(ang) * rX, cy + 6 - Math.sin(ang) * rY];
  };
  for (let i = 0; i <= 12; i++) {
    const [ax, ay] = archPt(i / 12);
    lumpyBlob(ax, ay, 5 + r3() * 3.0, 4 + r3() * 2.5, 310 + i, 0.3);
    ctx.fillStyle = i % 2 ? P.dirtMid : P.dirtDark;
    ctx.fill();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 0.9; ctx.stroke();
  }
  const ig = ctx.createLinearGradient(cx, cy - 29, cx, cy + 36);
  ig.addColorStop(0, P.holeBlack);
  ig.addColorStop(0.7, "#150a02");
  ig.addColorStop(1, "#2e1808");
  archPath(); ctx.fillStyle = ig; ctx.fill();
  archPath(); ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); archPath(); ctx.clip();
  ctx.fillStyle = "rgba(140,90,45,0.16)";
  ctx.beginPath(); ctx.ellipse(cx, cy + 34, 23, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ════ 8. RAÍCES RAMIFICADAS (antes de re-tallar el arco) ══════
  // Thick primary roots
  rootBranch(cx - 27, cy + 34, cx - 36, cy - 14, cx - 6, cy - 30, 5.2, 401, 2); // Left arch wrap
  rootBranch(cx + 27, cy + 34, cx + 36, cy - 12, cx + 6, cy - 29, 4.8, 402, 2); // Right arch wrap
  rootBranch(cx - 15, cy - 25, L + 50, T + 32, L + 55, T + 12, 4.5, 420, 1); // Upper-left corner connector

  // Medium roots
  rootBranch(cx - 24, cy + 12, cx - 44, cy + 2, cx - 56, cy - 22, 3.0, 403, 1); // Leftward
  rootBranch(cx + 24, cy + 10, cx + 46, cy, cx + 58, cy - 20, 3.0, 404, 1); // Rightward
  rootBranch(cx - 10, cy + 32, L + 60, T + 145, L + 48, T + 152, 2.6, 422, 1); // Bottom-left crawl

  // Thin roots
  rootBranch(cx - 30, cy + 30, cx - 46, cy + 42, L + 46, T + 108, 1.8, 406, 1); // Down-left crawl
  rootBranch(cx + 32, cy + 28, cx + 48, cy + 42, L + 114, T + 108, 1.8, 407, 1); // Down-right crawl
  rootBranch(L + 110, T + 8, L + 134, T + 8, L + 150, T + 10, 1.6, 424, 0); // Top-right border crawl
  rootBranch(cx + 10, cy - 28, L + 100, T + 20, L + 110, T + 8, 1.5, 421, 0); // Top border crawl

  // Very thin roots
  rootBranch(L + 48, T + 152, L + 24, T + 154, L + 10, T + 150, 1.3, 425, 0); // Bottom-left border crawl
  rootBranch(L + 120, T + 146, L + 136, T + 152, L + 150, T + 148, 1.3, 426, 0); // Bottom-right border crawl
  rootBranch(cx + 42, cy + 44, cx + 45, cy + 56, L + 120, T + 146, 1.2, 405, 0); // Bottom-right corner connect
  rootBranch(L + 42, T + 12, L + 26, T + 6, L + 12, T + 8, 1.2, 423, 0); // Top-left border crawl


  // ════ 8b. RE-TALLAR el interior del arco sobre las raíces ═════
  // (las raíces que invaden el hueco quedan cortadas en el borde,
  //  como si se hundieran en la tierra alrededor de la entrada)
  archPath(); ctx.fillStyle = ig; ctx.fill();
  archPath(); ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); archPath(); ctx.clip();
  ctx.fillStyle = "rgba(140,90,45,0.16)";
  ctx.beginPath(); ctx.ellipse(cx, cy + 34, 23, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ════ 9. OJOS ACECHANDO (3 pares) ════════════════════
  ctx.save();
  archPath(); ctx.clip();
  eyes(cx, cy - 10, 4.2, 0);
  eyes(cx - 12, cy + 10, 3.2, 2.1);
  eyes(cx + 13, cy + 12, 3.4, 4.4);
  ctx.restore();

  // musgo sobre el arco
  ctx.fillStyle = P.moss;
  ctx.beginPath(); ctx.ellipse(cx - 30, cy - 6, 5.5, 2.5, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 28, cy - 16, 4.5, 2.0, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = P.mossDark;
  ctx.beginPath(); ctx.ellipse(cx - 28, cy - 3, 2.8, 1.2, 0.5, 0, Math.PI * 2); ctx.fill();

  rockCluster(cx - 23, cy + 34, 3.2, 3, true, 111);
  rockCluster(cx + 23, cy + 38, 3, 3, false, 121);

  // ════ 11. ZZZ durmientes ═════════════════════════════
  const zSpots = [
    { x: cx, y: cy - 8, ph: 0 }
  ];
  ctx.textAlign = "center";
  zSpots.forEach(sp => {
    for (let i = 0; i < 3; i++) {
      const t = ((timestamp * 0.0003 + sp.ph + i * 0.33) % 1);
      const a = Math.sin(t * Math.PI);
      ctx.fillStyle = `rgba(255,250,235,${0.8 * a})`;
      ctx.font = `bold ${12 + i * 5 + t * 8}px sans-serif`;
      ctx.fillText("Z", sp.x + Math.sin(t * 6 + i) * 8, sp.y - i * 8 - t * 30);
    }
  });

  ctx.restore();
}

// ==========================================
// 4. TURTLE SHRINE
// Altar de piedra escalonado (3 niveles), columnas con runas verdes,
// arco con escudo de tortuga, orbe pulsante verde lima, viña con setas.
// Ocupa cuadrícula 1×2.
// ==========================================
function drawTurtleShrine(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  timestamp: number,
  escapeActive: boolean = false
) {
  ctx.save();

  const W = TILE;       // 40px
  const H = TILE * 2;   // 80px
  const cx = ox + W / 2;
  // El altar lo centramos visualmente dejando espacio para el texto
  const baseY = oy + H - 2; // pie del altar

  // Función para dibujar una losa de piedra escalonada
  const drawStoneSlab = (
    sx: number, sy: number,
    sw: number, sh: number,
    depth: number
  ) => {
    // Top
    ctx.fillStyle = "#8a8275";
    ctx.fillRect(sx, sy, sw, sh);
    // Right side
    ctx.fillStyle = "#5c5650";
    ctx.beginPath();
    ctx.moveTo(sx + sw, sy);
    ctx.lineTo(sx + sw + depth, sy + depth * 0.5);
    ctx.lineTo(sx + sw + depth, sy + sh + depth * 0.5);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.closePath();
    ctx.fill();
    // Front face (bottom)
    ctx.fillStyle = "#6e6760";
    ctx.beginPath();
    ctx.moveTo(sx, sy + sh);
    ctx.lineTo(sx + depth, sy + sh + depth * 0.5);
    ctx.lineTo(sx + sw + depth, sy + sh + depth * 0.5);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.closePath();
    ctx.fill();
    // Outline
    ctx.strokeStyle = "#2a2420";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(sx, sy, sw, sh);
    // Musgo en grietas
    ctx.strokeStyle = "rgba(60,90,35,0.5)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.25, sy + sh);
    ctx.lineTo(sx + sw * 0.25, sy + sh * 0.4);
    ctx.moveTo(sx + sw * 0.6, sy + sh);
    ctx.lineTo(sx + sw * 0.6, sy + sh * 0.6);
    ctx.stroke();
  };

  // ── 1. TRES NIVELES DE BASE ────────────────────────────────────
  // Nivel 3 (inferior, más ancho)
  const n3W = 38, n3H = 7, n3D = 4;
  const n3X = cx - n3W / 2, n3Y = baseY - n3H;
  drawStoneSlab(n3X, n3Y, n3W, n3H, n3D);

  // Nivel 2 (mediano)
  const n2W = 30, n2H = 6, n2D = 3;
  const n2X = cx - n2W / 2, n2Y = n3Y - n2H;
  drawStoneSlab(n2X, n2Y, n2W, n2H, n2D);

  // Nivel 1 (superior, más estrecho)
  const n1W = 22, n1H = 5, n1D = 3;
  const n1X = cx - n1W / 2, n1Y = n2Y - n1H;
  drawStoneSlab(n1X, n1Y, n1W, n1H, n1D);

  // ── 2. COLUMNAS CON INSCRIPCIONES RÚNICAS ─────────────────────
  const colW = 5, colH = 22;
  const colY = n1Y - colH;
  const colLX = n1X + 1;         // columna izquierda
  const colRX = n1X + n1W - colW - 1; // columna derecha

  const drawColumn = (colX: number) => {
    // Cuerpo columna
    ctx.fillStyle = "#7a7468";
    ctx.fillRect(colX, colY, colW, colH);
    // Lado derecho 3D
    ctx.fillStyle = "#4e4a44";
    ctx.beginPath();
    ctx.moveTo(colX + colW, colY);
    ctx.lineTo(colX + colW + 2, colY + 1);
    ctx.lineTo(colX + colW + 2, colY + colH + 1);
    ctx.lineTo(colX + colW, colY + colH);
    ctx.closePath();
    ctx.fill();
    // Borde
    ctx.strokeStyle = "#252018";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(colX, colY, colW, colH);
    // Capitel (parte superior)
    ctx.fillStyle = "#8c8478";
    ctx.fillRect(colX - 1, colY, colW + 2, 3);
    // Basa (parte inferior)
    ctx.fillStyle = "#8c8478";
    ctx.fillRect(colX - 1, colY + colH - 3, colW + 2, 3);

    // Runas verticales en la columna (líneas horizontales cortas)
    ctx.save();
    if (escapeActive) {
      ctx.shadowColor = "#50C83C";
      ctx.shadowBlur = 3;
    }
    ctx.strokeStyle = escapeActive ? "rgba(80,200,60,0.8)" : "#4a443a";
    ctx.lineWidth = 0.8;
    const runeY = [colY + 7, colY + 11, colY + 15];
    runeY.forEach(ry => {
      ctx.beginPath();
      ctx.moveTo(colX + 1, ry);
      ctx.lineTo(colX + colW - 1, ry);
      ctx.stroke();
    });
    // Runa vertical (línea central)
    ctx.beginPath();
    ctx.moveTo(colX + colW / 2, colY + 6);
    ctx.lineTo(colX + colW / 2, colY + colH - 5);
    ctx.stroke();
    ctx.restore();
  };

  drawColumn(colLX);
  drawColumn(colRX);

  // ── 3. ARCO SUPERIOR CON ESCUDO DE TORTUGA ───────────────────
  const archY = colY - 5;
  const archW = n1W + 2, archH = 9;
  const archX = n1X - 1;

  // Cuerpo del arco
  ctx.fillStyle = "#7a7468";
  ctx.beginPath();
  ctx.moveTo(archX, archY + archH);
  ctx.lineTo(archX, archY + archH * 0.4);
  ctx.quadraticCurveTo(cx, archY - 4, archX + archW, archY + archH * 0.4);
  ctx.lineTo(archX + archW, archY + archH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#252018";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(archX, archY + archH);
  ctx.lineTo(archX, archY + archH * 0.4);
  ctx.quadraticCurveTo(cx, archY - 4, archX + archW, archY + archH * 0.4);
  ctx.lineTo(archX + archW, archY + archH);
  ctx.closePath();
  ctx.stroke();

  // Escudo de tortuga en el centro del arco (bajorrelieve)
  const shieldCX = cx, shieldCY = archY + archH * 0.5 + 1;
  // Caparazón simplificado
  ctx.strokeStyle = "#4a6e30";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(shieldCX, shieldCY, 4, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Patrón hexagonal del caparazón (simplificado)
  ctx.beginPath();
  ctx.moveTo(shieldCX, shieldCY - 2);
  ctx.lineTo(shieldCX, shieldCY + 2);
  ctx.moveTo(shieldCX - 2, shieldCY);
  ctx.lineTo(shieldCX + 2, shieldCY);
  ctx.stroke();
  // Cabeza y patas
  ctx.fillStyle = "#4a6e30";
  ctx.beginPath();
  ctx.arc(shieldCX, shieldCY - 3.5, 1, 0, Math.PI * 2);
  ctx.fill();

  // ── 4. INSCRIPCIONES RÚNICAS HORIZONTALES ─────────────────────
  // En nivel 2 (mediano)
  ctx.save();
  if (escapeActive) {
    ctx.shadowColor = "#50C83C";
    ctx.shadowBlur = 3;
  }
  ctx.strokeStyle = escapeActive ? "rgba(80,200,60,0.7)" : "#4a443a";
  ctx.lineWidth = 0.7;
  // Runa en nivel 2
  const rune2Y = n2Y + n2H / 2;
  [[n2X + 4, n2X + n2W - 2]].forEach(([x1, x2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, rune2Y);
    ctx.lineTo(x2, rune2Y);
    ctx.stroke();
    // Marcas verticales en la runa
    for (let xi = x1 + 2; xi < x2 - 1; xi += 4) {
      ctx.beginPath();
      ctx.moveTo(xi, rune2Y - 1.5);
      ctx.lineTo(xi, rune2Y + 1.5);
      ctx.stroke();
    }
  });

  // Runa en nivel 3 (más corta)
  const rune3Y = n3Y + n3H / 2;
  ctx.beginPath();
  ctx.moveTo(n3X + 6, rune3Y);
  ctx.lineTo(n3X + n3W - 4, rune3Y);
  ctx.stroke();
  for (let xi = n3X + 8; xi < n3X + n3W - 5; xi += 5) {
    ctx.beginPath();
    ctx.moveTo(xi, rune3Y - 1.5);
    ctx.lineTo(xi, rune3Y + 1.5);
    ctx.stroke();
  }
  ctx.restore();

  // ── 5. ORB CENTRAL PULSANTE (verde lima) ──────────────────────
  const orbCX = cx;
  const orbCY = colY - 2;
  const orbR = 6;
  const pulse = Math.sin(timestamp * 0.003) * 0.5 + 0.5; // 0–1

  if (escapeActive) {
    // ACTIVE STATE: Pulsing visibly, glowing bright lime green
    // Resplandor exterior (glow) - extra bright and pulsing!
    ctx.save();
    // Increase size and opacity of the glow to make it "brillar un poco más"
    const glowR = orbR + 6 + pulse * 6; // slightly larger than original (was 4 + pulse * 4)
    const glowGrad = ctx.createRadialGradient(orbCX, orbCY, 0, orbCX, orbCY, glowR);
    // Increase opacities (was 0.55 / 0.25)
    glowGrad.addColorStop(0, `rgba(130,255,80,${0.75 + pulse * 0.25})`);
    glowGrad.addColorStop(0.5, `rgba(60,230,30,${0.35 + pulse * 0.2})`);
    glowGrad.addColorStop(1, "rgba(20,120,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(orbCX, orbCY, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Orbe de cristal: bright, pulsing lime green, yellow, white
    const orbGrad = ctx.createRadialGradient(
      orbCX - orbR * 0.3, orbCY - orbR * 0.3, 0,
      orbCX, orbCY, orbR
    );
    orbGrad.addColorStop(0, `rgba(220,255,140,${0.95 + pulse * 0.05})`);
    orbGrad.addColorStop(0.4, `rgba(90,240,40,${0.9})`);
    orbGrad.addColorStop(0.8, `rgba(40,180,0,0.95)`);
    orbGrad.addColorStop(1, "rgba(10,100,0,0.95)");
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orbCX, orbCY, orbR, 0, Math.PI * 2);
    ctx.fill();

    // Borde del orbe
    ctx.strokeStyle = `rgba(150,255,90,${0.8 + pulse * 0.2})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(orbCX, orbCY, orbR, 0, Math.PI * 2);
    ctx.stroke();

    // Tortuga interior del orbe (bajorrelieve brillante)
    ctx.strokeStyle = `rgba(240,255,200,${0.85 + pulse * 0.15})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(orbCX, orbCY, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(orbCX, orbCY - 1.5);
    ctx.lineTo(orbCX, orbCY + 1.5);
    ctx.moveTo(orbCX - 1.5, orbCY);
    ctx.lineTo(orbCX + 1.5, orbCY);
    ctx.stroke();

    // Reflejo interno del orbe
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(orbCX - 2, orbCY - 2, 2, 1.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // INACTIVE/DORMANT STATE: completely off and dark, no glow at all.
    // Orbe de cristal apagado/oscuro (dark grey-green stone/glass look)
    const orbGrad = ctx.createRadialGradient(
      orbCX - orbR * 0.3, orbCY - orbR * 0.3, 0,
      orbCX, orbCY, orbR
    );
    orbGrad.addColorStop(0, "#4ca039ff");
    orbGrad.addColorStop(0.5, "#50C83C");
    orbGrad.addColorStop(1, "#2F5A1F");
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orbCX, orbCY, orbR, 0, Math.PI * 2);
    ctx.fill();

    // Borde del orbe apagado (dull dark stroke)
    ctx.strokeStyle = "rgba(45, 50, 40, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(orbCX, orbCY, orbR, 0, Math.PI * 2);
    ctx.stroke();

    // Tortuga interior del orbe apagada (very sutil/faint and dark)
    ctx.strokeStyle = "rgba(15, 20, 10, 0.4)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(orbCX, orbCY, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(orbCX, orbCY - 1.5);
    ctx.lineTo(orbCX, orbCY + 1.5);
    ctx.moveTo(orbCX - 1.5, orbCY);
    ctx.lineTo(orbCX + 1.5, orbCY);
    ctx.stroke();

    // Reflejo sutil (opaque glass reflection, very dim)
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(orbCX - 2, orbCY - 2, 1.8, 1.0, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 6. VIÑA CON HOJAS Y SETAS ─────────────────────────────────
  // La viña sube por los lados del altar
  const drawVine = (startX: number, startY: number, side: -1 | 1) => {
    // Tallo principal
    ctx.strokeStyle = "#2d6b20";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let vx = startX, vy = startY;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const dy = -8;
      const dx = side * (Math.sin(i * 1.5) * 3);
      const nx = vx + dx, ny = vy + dy;
      ctx.quadraticCurveTo(vx + side * 2, vy + dy / 2, nx, ny);
      vx = nx; vy = ny;
    }
    ctx.stroke();

    // Hojas a lo largo de la viña
    const leafPositions = [
      { x: startX + side * 3, y: startY - 12 },
      { x: startX + side * 5, y: startY - 25 },
      { x: startX + side * 2, y: startY - 38 },
      { x: startX + side * 4, y: startY - 50 },
    ];

    leafPositions.forEach((lp, idx) => {
      const la = side * (0.3 + idx * 0.15);
      ctx.save();
      ctx.translate(lp.x, lp.y);
      ctx.rotate(la);
      ctx.fillStyle = "#3a8c28";
      ctx.strokeStyle = "#1e5015";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Nervio de la hoja
      ctx.beginPath();
      ctx.moveTo(-3.5, 0);
      ctx.lineTo(3.5, 0);
      ctx.strokeStyle = "#1e5015";
      ctx.lineWidth = 0.4;
      ctx.stroke();
      ctx.restore();
    });

    // Setas brillantes (grupos)
    const mushroomGroups = [
      { x: startX + side * 1, y: startY - 8 },
      { x: startX + side * 3, y: startY - 28 },
      { x: startX + side * 1, y: startY - 48 },
    ];

    mushroomGroups.forEach(mg => {
      for (let m = 0; m < 2; m++) {
        const mx = mg.x + m * side * 4;
        const my = mg.y + m * 2;
        const mPulse = Math.sin(timestamp * 0.004 + mx * 0.1) * 0.3 + 0.7;

        // Tallo seta
        ctx.fillStyle = "rgba(160,200,100,0.7)";
        ctx.fillRect(mx - 0.5, my, 1, 4);

        // Sombrero seta
        ctx.save();
        ctx.shadowColor = `rgba(120,255,60,${mPulse * 0.8})`;
        ctx.shadowBlur = 4;
        ctx.fillStyle = `rgba(${80 + m * 20},${200 + m * 30},${60},${mPulse})`;
        ctx.beginPath();
        ctx.ellipse(mx, my, 2.5, 1.5, 0, Math.PI, 0, true);
        ctx.fill();
        ctx.restore();
      }
    });
  };

  // Viña izquierda (sube desde la base izquierda)
  drawVine(n3X + 3, n3Y + n3H, -1);
  // Viña derecha
  drawVine(n3X + n3W - 1, n3Y + n3H, 1);

  ctx.restore(); // fin Turtle Shrine
}
