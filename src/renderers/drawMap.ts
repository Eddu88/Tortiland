/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileType, GridPos } from '../types';
import { COLS, ROWS, TILE, T_WALL, T_BUSH } from '../constants';
// Cubic Bezier helper for value interpolation
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
}
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
  c: number,
  r: number,
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
        const frontH = TILE - topH; // 26 px shaded front face

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

        const isShaking = breakingTiles.some(tile => tile.col === c && tile.row === r) && playerBreakingAnimTimer >= 13;
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

        // Pebbles
        if (hashVal % 10 < 1.0) {
          const px = x + 8 + (hashVal % 24);
          const py = y + 8 + ((hashVal * 7) % 24);
          ctx.fillStyle = '#9e9a96';
          ctx.strokeStyle = '#6e6a66';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + 4, py - 2);
          ctx.lineTo(px + 6, py + 2);
          ctx.lineTo(px + 2, py + 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
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

// ─── Utility helpers ─────────────────────────────────────────────
function lerpColor(a: string, b: string, t: number): string {
  const h = (s: string) => parseInt(s, 16);
  const r1 = h(a.slice(1, 3)), g1 = h(a.slice(3, 5)), b1 = h(a.slice(5, 7));
  const r2 = h(b.slice(1, 3)), g2 = h(b.slice(3, 5)), b2 = h(b.slice(5, 7));
  const ri = Math.round(r1 + (r2 - r1) * t);
  const gi = Math.round(g1 + (g2 - g1) * t);
  const bi = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${ri},${gi},${bi})`;
}

// ==========================================
// 3. BOSS DEN
// Montículo de tierra multi-nivel, asimétrico.
// Ocupa cuadrícula 4×4 (col 0–3, row 0–3).
// Detalle máximo: entrada central con arco de raíces, 7+ entradas
// de túnel, 3 pares de ojos acechando, ZZZ durmientes.
// ==========================================
function drawBossDen(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  timestamp: number
) {
  ctx.save();

  const W = TILE * 4; // 160px
  const H = TILE * 4; // 160px
  const cx = ox + W / 2;
  const cy = oy + H / 2 + 8;

  // ── 1. Sombra suelo difuminada ─────────────────────────────────
  const shadowGrad = ctx.createRadialGradient(cx, cy + 55, 5, cx, cy + 55, 90);
  shadowGrad.addColorStop(0, "rgba(10,4,0,0.65)");
  shadowGrad.addColorStop(1, "rgba(10,4,0,0)");
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 55, 90, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── 2. Función: dibujar un bloque de tierra isométrico ─────────
  // iso top face + side face right + side face left
  const drawEarthBlock = (
    bx: number,
    by: number,
    bw: number,
    bh: number,
    depth: number,
    colorTop: string,
    colorRight: string,
    colorLeft: string
  ) => {
    // Top face (parallelogram isométrico simplificado = rect con leve skew)
    ctx.fillStyle = colorTop;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx, by + bh);
    ctx.closePath();
    ctx.fill();

    // Right face (depth hacia abajo-derecha)
    ctx.fillStyle = colorRight;
    ctx.beginPath();
    ctx.moveTo(bx + bw, by);
    ctx.lineTo(bx + bw + depth * 0.6, by + depth * 0.5);
    ctx.lineTo(bx + bw + depth * 0.6, by + bh + depth * 0.5);
    ctx.lineTo(bx + bw, by + bh);
    ctx.closePath();
    ctx.fill();

    // Left face (depth hacia abajo-izquierda, más oscura)
    ctx.fillStyle = colorLeft;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh);
    ctx.lineTo(bx + depth * 0.6, by + bh + depth * 0.5);
    ctx.lineTo(bx + bw + depth * 0.6, by + bh + depth * 0.5);
    ctx.lineTo(bx + bw, by + bh);
    ctx.closePath();
    ctx.fill();

    // Borde superior sutil
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);
  };

  // ── 3. BASE DEL MONTÍCULO (nivel 0, el más ancho) ─────────────
  // Forma irregular usando path
  const baseColor = "#7a5230";
  const baseShadow = "#4a2e10";
  const baseLight = "#9c6a3a";

  // Contorno principal del montículo – forma asimétrica
  const moundPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 72, cy + 48);      // esquina inf izq
    ctx.lineTo(cx - 80, cy + 20);      // sube lado izq
    ctx.lineTo(cx - 65, cy - 5);
    ctx.lineTo(cx - 48, cy - 28);      // hombro izq
    ctx.lineTo(cx - 22, cy - 52);      // nivel superior izq
    ctx.lineTo(cx + 5, cy - 62);      // cima central
    ctx.lineTo(cx + 30, cy - 50);      // nivel superior der
    ctx.lineTo(cx + 52, cy - 22);      // hombro der
    ctx.lineTo(cx + 70, cy + 0);
    ctx.lineTo(cx + 78, cy + 22);      // sube lado der
    ctx.lineTo(cx + 72, cy + 48);      // esquina inf der
    ctx.closePath();
  };

  // Relleno base con gradiente de tierra
  const earthGrad = ctx.createLinearGradient(cx - 80, cy - 62, cx + 78, cy + 48);
  earthGrad.addColorStop(0, "#9c6a3a");
  earthGrad.addColorStop(0.4, "#7a5230");
  earthGrad.addColorStop(1, "#4a2e10");
  moundPath();
  ctx.fillStyle = earthGrad;
  ctx.fill();

  // Borde del montículo
  moundPath();
  ctx.strokeStyle = "#2a1500";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── 4. TEXTURAS DE TIERRA: grietas y variación tonal ──────────
  ctx.save();
  moundPath();
  ctx.clip();

  // Variaciones de color internas (manchas de tierra)
  const earthPatches = [
    { x: cx - 55, y: cy + 10, rx: 22, ry: 12, c: "rgba(90,55,25,0.4)" },
    { x: cx + 30, y: cy + 15, rx: 18, ry: 10, c: "rgba(130,85,45,0.35)" },
    { x: cx - 20, y: cy - 10, rx: 25, ry: 14, c: "rgba(60,35,12,0.3)" },
    { x: cx + 10, y: cy + 35, rx: 30, ry: 10, c: "rgba(100,65,30,0.25)" },
    { x: cx - 45, y: cy + 38, rx: 20, ry: 8, c: "rgba(55,30,10,0.4)" },
    { x: cx + 50, y: cy + 28, rx: 18, ry: 9, c: "rgba(80,50,20,0.35)" },
  ];
  earthPatches.forEach(p => {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Grietas de tierra
  ctx.strokeStyle = "rgba(30,12,0,0.5)";
  ctx.lineWidth = 0.8;
  const cracks = [
    [[cx - 60, cy + 30], [cx - 45, cy + 22], [cx - 38, cy + 28]],
    [[cx + 40, cy + 20], [cx + 52, cy + 30], [cx + 48, cy + 40]],
    [[cx - 10, cy + 40], [cx + 5, cy + 44]],
    [[cx - 30, cy - 5], [cx - 18, cy + 5], [cx - 25, cy + 12]],
  ];
  cracks.forEach(pts => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
    ctx.stroke();
  });

  ctx.restore(); // fin clip mound

  // ── 5. NIVELES DE PLATAFORMA (terrazas de tierra) ──────────────
  // Nivel 1: plataforma izquierda
  drawEarthBlock(cx - 72, cy + 12, 28, 12, 8, "#8c6235", "#5a3a18", "#4a2e10");
  // Nivel 1: plataforma derecha
  drawEarthBlock(cx + 44, cy + 12, 28, 12, 8, "#8c6235", "#5a3a18", "#4a2e10");
  // Nivel 2: plataforma central superior
  drawEarthBlock(cx - 20, cy - 38, 40, 12, 8, "#a07040", "#6a4520", "#4a2e10");

  // Rampas de tierra compactada (path diagonales)
  ctx.fillStyle = "#7a5530";
  // Rampa izq → centro inf
  ctx.beginPath();
  ctx.moveTo(cx - 44, cy + 24);
  ctx.lineTo(cx - 20, cy + 24);
  ctx.lineTo(cx - 28, cy + 36);
  ctx.lineTo(cx - 52, cy + 36);
  ctx.closePath();
  ctx.fill();
  // Rampa der → centro inf
  ctx.beginPath();
  ctx.moveTo(cx + 20, cy + 24);
  ctx.lineTo(cx + 44, cy + 24);
  ctx.lineTo(cx + 52, cy + 36);
  ctx.lineTo(cx + 28, cy + 36);
  ctx.closePath();
  ctx.fill();

  // ── 6. ENTRADAS DE TÚNEL (7 bocas de túnel) ───────────────────
  const drawTunnelMouth = (
    tx: number, ty: number,
    tw: number, th: number,
    angle: number = 0,
    isMain: boolean = false
  ) => {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);

    // Borde exterior de tierra (marco)
    ctx.fillStyle = isMain ? "#3a1f05" : "#2e1800";
    ctx.beginPath();
    ctx.ellipse(0, 0, tw + 6, th + 4, 0, Math.PI, 0, true);
    ctx.lineTo(tw + 6, 5);
    ctx.lineTo(-tw - 6, 5);
    ctx.closePath();
    ctx.fill();

    // Oscuridad interior del túnel
    const tunGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, tw);
    tunGrad.addColorStop(0, "#000000");
    tunGrad.addColorStop(0.6, "#0a0400");
    tunGrad.addColorStop(1, "#1a0800");
    ctx.fillStyle = tunGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, tw, th, 0, Math.PI, 0, true);
    ctx.lineTo(tw, 5);
    ctx.lineTo(-tw, 5);
    ctx.closePath();
    ctx.fill();

    // Highlight superior del túnel
    ctx.strokeStyle = "rgba(150,100,50,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -2, tw - 3, th - 2, 0, Math.PI, 0, true);
    ctx.stroke();

    ctx.restore();
  };

  // Entrada CENTRAL PRINCIPAL (la más grande, en el centro superior)
  drawTunnelMouth(cx, cy - 28, 28, 18, 0, true);

  // Entradas nivel superior izquierdo
  drawTunnelMouth(cx - 48, cy - 18, 12, 8, -0.15);
  // Entradas nivel superior derecho
  drawTunnelMouth(cx + 48, cy - 18, 12, 8, 0.15);

  // Entradas nivel medio izquierdo
  drawTunnelMouth(cx - 62, cy + 14, 10, 7, -0.2);
  // Entradas nivel medio derecho
  drawTunnelMouth(cx + 62, cy + 14, 10, 7, 0.2);

  // Entradas base izquierda
  drawTunnelMouth(cx - 30, cy + 42, 14, 9, 0);
  // Entradas base derecha
  drawTunnelMouth(cx + 30, cy + 42, 14, 9, 0);

  // ── 7. RAÍCES SECAS Y RETORCIDAS ─────────────────────────────
  const drawRoot = (
    pts: [number, number][],
    baseWidth: number,
    color: string = "#6b3d15"
  ) => {
    if (pts.length < 2) return;
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 1);
      const w = baseWidth * (1 - t * 0.55);

      // Capa exterior oscura (canal de tierra)
      ctx.strokeStyle = "#1a0800";
      ctx.lineWidth = w + 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();

      // Cuerpo de madera
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();

      // Highlight superior
      ctx.strokeStyle = lerpColor(color, "#c8853a", 0.45);
      ctx.lineWidth = w * 0.5;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();
    }
  };

  // Raíz 1: Arco superior sobre entrada principal (izquierda)
  drawRoot([
    [cx - 38, cy - 18],
    [cx - 42, cy - 35],
    [cx - 32, cy - 50],
    [cx - 18, cy - 58],
    [cx - 5, cy - 62],
  ], 9);

  // Raíz 2: Arco superior sobre entrada principal (derecha)
  drawRoot([
    [cx + 38, cy - 18],
    [cx + 42, cy - 35],
    [cx + 32, cy - 50],
    [cx + 18, cy - 58],
    [cx + 5, cy - 62],
  ], 9);

  // Raíz 3: Lateral izquierda, baja serpenteando
  drawRoot([
    [cx - 52, cy - 5],
    [cx - 70, cy + 8],
    [cx - 75, cy + 28],
    [cx - 68, cy + 44],
  ], 7, "#5a3010");

  // Raíz 4: Lateral derecha
  drawRoot([
    [cx + 52, cy - 5],
    [cx + 70, cy + 8],
    [cx + 72, cy + 30],
    [cx + 62, cy + 48],
  ], 7, "#5a3010");

  // Raíz 5: Base izquierda emergiendo del suelo
  drawRoot([
    [cx - 35, cy + 48],
    [cx - 55, cy + 52],
    [cx - 72, cy + 50],
  ], 6, "#4a2510");

  // Raíz 6: Base derecha
  drawRoot([
    [cx + 35, cy + 48],
    [cx + 55, cy + 52],
    [cx + 70, cy + 50],
  ], 6, "#4a2510");

  // Raíz delgada: pequeña, entrelazada en nivel superior
  drawRoot([
    [cx - 15, cy - 55],
    [cx - 8, cy - 68],
    [cx + 8, cy - 70],
    [cx + 15, cy - 58],
  ], 4, "#7a4a20");

  // ── 8. ROCAS EN LA BASE ───────────────────────────────────────
  const drawRock = (rx: number, ry: number, size: number, angle: number = 0) => {
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle);
    // Cuerpo
    ctx.fillStyle = "#7e7870";
    ctx.strokeStyle = "#3a3530";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(180,170,160,0.4)";
    ctx.beginPath();
    ctx.ellipse(-size * 0.25, -size * 0.25, size * 0.3, size * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawRock(cx - 62, cy + 50, 7, 0.2);
  drawRock(cx - 48, cy + 54, 5.5, -0.3);
  drawRock(cx - 38, cy + 56, 4.5, 0.1);
  drawRock(cx + 60, cy + 50, 7.5, -0.2);
  drawRock(cx + 46, cy + 54, 5, 0.4);
  drawRock(cx + 35, cy + 56, 4, -0.1);
  drawRock(cx - 8, cy + 58, 4.5, 0);
  drawRock(cx + 10, cy + 57, 5, 0.2);

  // ── 9. MUSGO VERDE APAGADO ────────────────────────────────────
  const mossPatches = [
    { x: cx - 55, y: cy + 8, rx: 12, ry: 5 },
    { x: cx + 50, y: cy + 10, rx: 10, ry: 4 },
    { x: cx - 18, y: cy + 20, rx: 8, ry: 3 },
    { x: cx + 25, y: cy - 5, rx: 9, ry: 4 },
    { x: cx - 30, y: cy - 35, rx: 7, ry: 3 },
  ];
  mossPatches.forEach(m => {
    ctx.fillStyle = "rgba(65, 90, 40, 0.55)";
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── 10. OJOS DE REPTIL ACECHANDO (3 pares, rojos/ámbar) ───────
  const blinkPhase = (timestamp * 0.001) % 6;
  const isBlinking = blinkPhase < 0.12 || (blinkPhase > 3 && blinkPhase < 3.08);

  if (!isBlinking) {
    const drawEye = (ex: number, ey: number, ew: number, eh: number) => {
      // Resplandor exterior
      ctx.save();
      ctx.shadowColor = "#ff2200";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#cc1100";
      ctx.beginPath();
      ctx.ellipse(ex, ey, ew + 2, eh + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Iris rojo-naranja
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupila vertical (rendija de reptil)
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(ex, ey, ew * 0.22, eh * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();

      // Reflejo de luz
      ctx.fillStyle = "rgba(255,220,180,0.7)";
      ctx.beginPath();
      ctx.ellipse(ex - ew * 0.3, ey - eh * 0.35, ew * 0.18, eh * 0.15, -0.4, 0, Math.PI * 2);
      ctx.fill();
    };

    // Par central (más grande, detrás de la entrada principal)
    drawEye(cx - 10, cy - 22, 5.5, 3);
    drawEye(cx + 10, cy - 22, 5.5, 3);

    // Par izquierdo (túnel izquierdo superior)
    drawEye(cx - 50, cy - 13, 4, 2.5);
    drawEye(cx - 40, cy - 12, 4, 2.5);

    // Par derecho (túnel derecho superior)
    drawEye(cx + 40, cy - 12, 4, 2.5);
    drawEye(cx + 50, cy - 13, 4, 2.5);
  }

  // ── 11. ZZZ DURMIENTES FLOTANTES ─────────────────────────────
  for (let i = 0; i < 3; i++) {
    const tZ = ((timestamp * 0.00075 + i * 0.7) % 2.0);
    const alpha = Math.max(0, 1.0 - tZ / 1.8);
    if (alpha > 0.02) {
      const zx = cx + 5 + Math.sin(tZ * 3.2 + i * 1.2) * 14;
      const zy = cy - 52 - tZ * 45;
      const fontSize = 12 + tZ * 12;
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = "#b8d8ff";
      ctx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Z", zx, zy);
      ctx.restore();
    }
  }

  // ── 12. PARTÍCULAS DE POLVO ───────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const phase = ((timestamp * 0.0003 + i * 1.8) % 1.0);
    const angle = i * Math.PI * 0.35 + phase * Math.PI;
    const dist = 12 + (i * 9) % 28 + Math.sin(phase * 4) * 5;
    const px = cx + Math.cos(angle) * dist;
    const py = (cy - 22) + Math.sin(angle) * dist * 0.5;
    const pa = 0.08 + Math.sin(phase * Math.PI) * 0.25;
    ctx.fillStyle = `rgba(210,175,140,${pa})`;
    ctx.fillRect(px, py, 1.6, 1.6);
  }

  ctx.restore(); // fin Boss Den
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
