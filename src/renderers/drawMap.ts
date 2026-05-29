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
  dyingBushes: { col: number; row: number; alpha: number; variant: number }[] = []
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

  // ==========================================
  // 4. MADRIGUERA DEL JEFE (4x4 - Center: col 8-11, row 5-8)
  // Pixel art isométrico de alta calidad: montículo de tierra multi‑nivel, asimétrico, con raíces secas y retorcidas, rocas grises y musgo verde apagado.
  // Detalles: nivel superior con túneles laterales y entrada central arqueada con tres pares de ojos rojos; niveles medios con rampas y al menos siete entradas de túneles; base sólida con dos grandes entradas frontales conectadas por rampas.
  // Texto UI: dos líneas pixeladas centradas "Boss Den (Dormant)" (línea inferior ligeramente más grande), fondo marrón‑ocre uniforme y un ícono de brillo en esquina inferior derecha.
  // ==========================================
  const bossX = 8 * TILE;
  const bossY = 5 * TILE;
  const bCenterX = bossX + (TILE * 2);
  const bCenterY = bossY + (TILE * 2);

  ctx.save();

  // --- 1. Sombra base difuminada (Ocupa el espacio central) ---
  ctx.fillStyle = 'rgba(20, 8, 2, 0.55)';
  ctx.beginPath();
  ctx.ellipse(bCenterX, bCenterY + 15, 105, 65, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 2. Lista de Raíces con Curvatura Bézier Fiel al Prototipo ---
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const fixedRoots = [
    // Raíz 1: Superior Derecha (Sinuosa, esquiva arbustos, se angosta en la punta)
    {
      start: { x: bCenterX + 35, y: bCenterY - 15 },
      cp1: { x: bCenterX + 60, y: bCenterY - 55 },
      cp2: { x: bCenterX + 95, y: bCenterY - 75 },
      end: { x: bCenterX + 122, y: bCenterY - 110 },
      maxWidth: 32,
      minWidth: 14,
      isTextured: true
    },
    // Raíz 2: Lateral Derecha (Curva cerrada en forma de Gancho)
    {
      start: { x: bCenterX + 40, y: bCenterY + 15 },
      cp1: { x: bCenterX + 95, y: bCenterY + 15 },
      cp2: { x: bCenterX + 130, y: bCenterY + 45 },
      end: { x: bCenterX + 115, y: bCenterY + 80 },
      maxWidth: 28,
      minWidth: 16,
      isTextured: false
    },
    // Raíz 3: Inferior Central (Zanja sinuosa vertical)
    {
      start: { x: bCenterX, y: bCenterY + 30 },
      cp1: { x: bCenterX + 5, y: bCenterY + 65 },
      cp2: { x: bCenterX - 10, y: bCenterY + 90 },
      end: { x: bCenterX - 2, y: bCenterY + 115 },
      maxWidth: 32,
      minWidth: 18,
      isMouth: true
    },
    // Raíz 4: Inferior Izquierda (Cueva con curva dinámica hacia abajo)
    {
      start: { x: bCenterX - 35, y: bCenterY + 15 },
      cp1: { x: bCenterX - 75, y: bCenterY + 55 },
      cp2: { x: bCenterX - 95, y: bCenterY + 75 },
      end: { x: bCenterX - 118, y: bCenterY + 95 },
      maxWidth: 30,
      minWidth: 18,
      isTunnelArch: true
    },
    // Raíz 5: Lateral Izquierda (Brazo robusto horizontal)
    {
      start: { x: bCenterX - 40, y: bCenterY - 5 },
      cp1: { x: bCenterX - 70, y: bCenterY - 10 },
      cp2: { x: bCenterX - 90, y: bCenterY + 2 },
      end: { x: bCenterX - 110, y: bCenterY + 5 },
      maxWidth: 32,
      minWidth: 22,
      isTextured: false
    }
  ];

  fixedRoots.forEach(root => {
    const steps = 20; // Resolution of the curve
    const sampleBezier = (t) => {
      const u = 1 - t;
      return {
        x: u * u * u * root.start.x + 3 * u * u * t * root.cp1.x + 3 * u * t * t * root.cp2.x + t * t * t * root.end.x,
        y: u * u * u * root.start.y + 3 * u * u * t * root.cp1.y + 3 * u * t * t * root.cp2.y + t * t * t * root.end.y
      };
    };

    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      const p1 = sampleBezier(t1);
      const p2 = sampleBezier(t2);
      const currentWidth = root.maxWidth - (root.maxWidth - root.minWidth) * t1;

      // Capa A: Canal exterior / Bordes de tierra excavada profunda
      ctx.strokeStyle = '#180902';
      ctx.lineWidth = currentWidth + 5;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

      // Capa B: Cuerpo cilíndrico base de la madera
      ctx.strokeStyle = '#5c3a1b';
      ctx.lineWidth = currentWidth;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

      // Capa C: Iluminación de relieve (Brillo superior)
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = currentWidth * 0.65;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

      // Capa D: Fondo oscuro del túnel interno (Hollow channel)
      ctx.strokeStyle = '#110500';
      ctx.lineWidth = currentWidth * 0.38;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }

    if (root.isMouth) {
      ctx.fillStyle = '#0a0300';
      ctx.beginPath();
      ctx.ellipse(root.end.x, root.end.y, root.minWidth * 0.55, root.minWidth * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (root.isTunnelArch) {
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(root.end.x, root.end.y, 11, 7, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.beginPath();
  ctx.ellipse(bCenterX, bCenterY + 18, 38, 22, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Saliente protector de madera y raíces colgantes (ceja)
  ctx.fillStyle = '#5c3a1b';
  ctx.beginPath();
  ctx.ellipse(bCenterX, bCenterY + 1, 38, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 4. Los Ojos de Reptil en la Oscuridad (6 Glowing Slit Eyes) ---
  const isBlinking = (timestamp % 6000) < 180;
  if (!isBlinking) {
    ctx.save();
    ctx.shadowBlur = 10;

    const drawAlmondEye = (cx: number, cy: number, w: number, h: number) => {
      ctx.save();
      // Neon amber-yellow with red-orange glow
      ctx.fillStyle = '#ffd200';
      ctx.shadowColor = '#ff4500';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
      ctx.fill();

      // vertical thin black pupil
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 0.7, cy - h * 0.8, 1.4, h * 1.6);
      ctx.restore();
    };

    // Par Central Superior (Más grande y dominante)
    drawAlmondEye(bCenterX - 8, bCenterY + 14, 5.0, 2.5);
    drawAlmondEye(bCenterX + 8, bCenterY + 14, 5.0, 2.5);

    // Par Lateral Inferior Izquierdo (Pequeño, orientado al frente)
    drawAlmondEye(bCenterX - 22, bCenterY + 22, 4.0, 2.0);
    drawAlmondEye(bCenterX - 14, bCenterY + 22, 4.0, 2.0);

    // Par Lateral Inferior Derecho (Pequeño, orientado al frente)
    drawAlmondEye(bCenterX + 14, bCenterY + 22, 4.0, 2.0);
    drawAlmondEye(bCenterX + 22, bCenterY + 22, 4.0, 2.0);

    ctx.restore();
  }

  // --- 5. Rocas de Contención en la Base ---
  const drawBaseRock = (rx: number, ry: number, rSize: number) => {
    ctx.fillStyle = '#8e8680'; // stones gray
    ctx.strokeStyle = '#4e4844';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rx - rSize * 0.35, ry - rSize * 0.35, rSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
  };

  drawBaseRock(bCenterX - 55, bCenterY + 38, 7.5);
  drawBaseRock(bCenterX - 45, bCenterY + 42, 6.0);
  drawBaseRock(bCenterX - 65, bCenterY + 32, 9.0);
  drawBaseRock(bCenterX + 45, bCenterY + 42, 6.0);
  drawBaseRock(bCenterX + 55, bCenterY + 38, 7.5);
  drawBaseRock(bCenterX + 65, bCenterY + 32, 9.0);
  drawBaseRock(bCenterX - 18, bCenterY + 43, 5.0);
  drawBaseRock(bCenterX + 18, bCenterY + 43, 5.0);

  // Floating sleeping ZZZ effects (Boss Den is Dormant)
  for (let i = 0; i < 3; i++) {
    const tZ = (timestamp * 0.0008 + i * 0.65) % 2.0;
    const alpha = 1.0 - (tZ / 2.0);
    if (alpha > 0) {
      ctx.fillStyle = `rgba(180, 220, 255, ${alpha * 0.85})`;
      ctx.font = `bold ${8 + tZ * 10}px "Press Start 2P", monospace`;
      const zx = bCenterX - 15 + Math.sin(tZ * 3.5 + i) * 15;
      const zy = bCenterY - 45 - tZ * 50;
      ctx.fillText("Z", zx, zy);
    }
  }

  // Micro dust particles floating in huddle
  for (let i = 0; i < 8; i++) {
    const phase = (timestamp * 0.0004 + i * 1.5) % 1.0;
    const angle = i * Math.PI * 0.25 + phase * Math.PI * 2;
    const rDist = 15 + ((i * 11) % 36) + Math.sin(phase * 3) * 6;
    const px = bCenterX + Math.cos(angle) * rDist;
    const py = bCenterY + Math.sin(angle) * rDist;
    ctx.fillStyle = `rgba(220, 190, 160, ${0.12 + Math.sin(phase * Math.PI) * 0.3})`;
    ctx.fillRect(px, py, 1.8, 1.8);
  }

  // Centered Label
  ctx.save();
  ctx.fillStyle = '#fed7aa';
  ctx.globalAlpha = 0.55;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText('Boss Den (Dormant)', bCenterX, bCenterY + 54);
  ctx.restore();

  ctx.restore(); // end Boss Den

  // ==========================================
  // 5. TURTLE SHRINE (1x2 - col 18, row 13)
  // Pixel art isométrico de alta calidad: altar de piedra escalonado con musgo, viña frondosa y orbe verde lima brillante.
  // Detalles: tres niveles de base de piedra, columnas con inscripciones rúnicas verdes, arco con escudo de tortuga, orbe central pulsante, viña con setas verdes brillantes, texto pixelado "Turtle Shrine Shrine" abajo.
  // ==========================================
  const bx = 18 * TILE;
  const by = 13 * TILE;

  // Base floor
  ctx.fillStyle = '#C78757';
  ctx.fillRect(bx, by, TILE, TILE);

  // A. Earthen green dome mound cover (semispherical perfectly integrated to floor)
  const domeCX = bx + 20;
  const domeCY = by + 20;
  const domeR = 17;

  // Moss/ochre verdoso apagado gradient
  const domeGrad = ctx.createRadialGradient(
    domeCX - 3, domeCY - 3, 2,
    domeCX, domeCY, domeR
  );
  domeGrad.addColorStop(0, '#7c9c43'); // light ocre verdoso
  domeGrad.addColorStop(0.7, '#556b2f'); // olive green
  domeGrad.addColorStop(1, '#3b4d1f'); // shadow dark green

  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(domeCX, domeCY, domeR, 0, Math.PI * 2);
  ctx.fill();

  // B. Vegetación: tres brotes en la parte superior en forma de puntas de flecha
  ctx.fillStyle = '#4ade80';
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 0.8;

  const drawSprout = (sx: number, sy: number) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 3, sy + 6);
    ctx.lineTo(sx + 3, sy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  drawSprout(domeCX - 5, domeCY - 16);
  drawSprout(domeCX, domeCY - 19);
  drawSprout(domeCX + 5, domeCY - 16);

  // C. Entrada (Arco de herradura achatado perfectamente simétrico)
  const doorWidth = 14;
  const doorHeight = 12;
  const doorX = domeCX - doorWidth / 2;
  const doorY = domeCY + 2;

  ctx.save();
  ctx.beginPath();
  // horseshoe/arch shape
  ctx.moveTo(doorX, doorY + doorHeight);
  ctx.lineTo(doorX, doorY + 4);
  ctx.quadraticCurveTo(domeCX, doorY - 4, doorX + doorWidth, doorY + 4);
  ctx.lineTo(doorX + doorWidth, doorY + doorHeight);
  ctx.closePath();

  if (escapeActive) {
    // Glowing active golden entrance
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();

    const goldPulse = Math.sin(timestamp * 0.005) * 5 + 8;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(timestamp * 0.005) * 0.25})`;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = goldPulse;
    ctx.stroke();
  } else {
    // Flat grey/dark brown shadow dormant entrance
    ctx.fillStyle = '#3e2f25';
    ctx.fill();
    ctx.strokeStyle = '#271b14';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // D. Runas/Inscripciones talladas directamente encima del arco
  ctx.strokeStyle = '#3e1f0a';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  // Central square/face shape
  ctx.strokeRect(domeCX - 1.5, doorY - 6.5, 3, 2.5);
  // Left abstract line
  ctx.moveTo(domeCX - 5, doorY - 5);
  ctx.lineTo(domeCX - 3, doorY - 6);
  // Right abstract line
  ctx.moveTo(domeCX + 5, doorY - 5);
  ctx.lineTo(domeCX + 3, doorY - 6);
  ctx.stroke();

  // E. Piedras de Soporte (Muro de contención de rocas grises ordenadas de mayor a menor)
  const drawRiverStone = (rx: number, ry: number, size: number) => {
    ctx.fillStyle = '#8e8680'; // River gray
    ctx.strokeStyle = '#4e4844';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(rx, ry, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  // Left stack (largest to smallest)
  drawRiverStone(bx + 7, by + 30, 4.0);
  drawRiverStone(bx + 9, by + 23, 3.0);
  drawRiverStone(bx + 11, by + 17, 2.0);

  // Right stack (largest to smallest)
  drawRiverStone(bx + 33, by + 30, 4.0);
  drawRiverStone(bx + 31, by + 23, 3.0);
  drawRiverStone(bx + 29, by + 17, 2.0);

  // F. Cell outer boundary frame
  ctx.strokeStyle = '#2d1a0a'; // firm outline
  ctx.lineWidth = 2.0;
  ctx.strokeRect(bx, by, TILE, TILE);
};
