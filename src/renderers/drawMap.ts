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
  // Hollow Tree Trunk Stump Cave matching Mockup Image
  // ==========================================
  const bossX = 8 * TILE;
  const bossY = 5 * TILE;
  const bCenterX = bossX + 80;
  const bCenterY = bossY + 80;

  // Base ellipse with radial gradient simulating depth
  const baseGrad = ctx.createRadialGradient(
    bCenterX, bCenterY, 0,
    bCenterX, bCenterY, 80
  );
  baseGrad.addColorStop(0, '#1a0a02');
  baseGrad.addColorStop(1, '#3d1f0a');

  // --- Drawing Winding Trenches/Tunnels emerging from the Boss Den (Mockup Match) ---
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const trenches = [
    // 1. Top-Right Trench (winding up and right)
    {
      start: { x: bCenterX + 45, y: bCenterY - 15 },
      cp1: { x: bCenterX + 70, y: bCenterY - 50 },
      cp2: { x: bCenterX + 100, y: bCenterY - 80 },
      end: { x: bCenterX + 140, y: bCenterY - 110 },
      width: 24
    },
    // 2. Left Trench (winding left)
    {
      start: { x: bCenterX - 50, y: bCenterY + 30 },
      cp1: { x: bCenterX - 90, y: bCenterY + 20 },
      cp2: { x: bCenterX - 130, y: bCenterY + 15 },
      end: { x: bCenterX - 180, y: bCenterY + 30 },
      width: 22
    },
    // 3. Right Trench (winding right and curving down)
    {
      start: { x: bCenterX + 50, y: bCenterY + 30 },
      cp1: { x: bCenterX + 90, y: bCenterY + 35 },
      cp2: { x: bCenterX + 120, y: bCenterY + 60 },
      end: { x: bCenterX + 130, y: bCenterY + 130 },
      width: 22
    },
    // 4. Bottom-Left Trench (winding down and curving left)
    {
      start: { x: bCenterX - 10, y: bCenterY + 50 },
      cp1: { x: bCenterX - 20, y: bCenterY + 100 },
      cp2: { x: bCenterX - 80, y: bCenterY + 120 },
      end: { x: bCenterX - 130, y: bCenterY + 110 },
      width: 20
    }
  ];

  trenches.forEach(t => {
    // A. Outer trench shadow/edge (extra wide, dark)
    ctx.strokeStyle = '#2d1a0a';
    ctx.lineWidth = t.width + 4;
    ctx.beginPath();
    ctx.moveTo(t.start.x, t.start.y);
    ctx.bezierCurveTo(t.cp1.x, t.cp1.y, t.cp2.x, t.cp2.y, t.end.x, t.end.y);
    ctx.stroke();

    // B. Main trench channel (medium dirt brown)
    ctx.strokeStyle = '#854c24';
    ctx.lineWidth = t.width;
    ctx.beginPath();
    ctx.moveTo(t.start.x, t.start.y);
    ctx.bezierCurveTo(t.cp1.x, t.cp1.y, t.cp2.x, t.cp2.y, t.end.x, t.end.y);
    ctx.stroke();

    // C. Deep inner shading line (thin, very dark)
    ctx.strokeStyle = '#3d1f0a';
    ctx.lineWidth = t.width * 0.4;
    ctx.beginPath();
    ctx.moveTo(t.start.x, t.start.y);
    ctx.bezierCurveTo(t.cp1.x, t.cp1.y, t.cp2.x, t.cp2.y, t.end.x, t.end.y);
    ctx.stroke();
  });
  ctx.restore();

  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.ellipse(bCenterX, bCenterY, 80, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  // Breathing effect: slight colour oscillation
  const breath = Math.sin(timestamp * 0.001) * 0.05;
  ctx.fillStyle = `rgba(${58 + breath * 10}, ${31 + breath * 8}, ${10 + breath * 5}, 1)`;
  ctx.beginPath();
  ctx.ellipse(bCenterX, bCenterY, 78, 68, 0, 0, Math.PI * 2);
  ctx.fill();

  // A. Main Tree Stump organic body in wood brown with bark shape flare
  ctx.fillStyle = '#8B5A2B';
  ctx.beginPath();
  ctx.moveTo(bCenterX - 75, bCenterY + 60); // bottom left root flare
  ctx.bezierCurveTo(bCenterX - 60, bCenterY + 20, bCenterX - 50, bCenterY - 45, bCenterX - 30, bCenterY - 50); // left side up
  ctx.bezierCurveTo(bCenterX - 10, bCenterY - 55, bCenterX + 10, bCenterY - 55, bCenterX + 30, bCenterY - 50); // top cap
  ctx.bezierCurveTo(bCenterX + 50, bCenterY - 45, bCenterX + 60, bCenterY + 20, bCenterX + 75, bCenterY + 60); // right side down
  ctx.bezierCurveTo(bCenterX + 45, bCenterY + 60, bCenterX + 25, bCenterY + 50, bCenterX, bCenterY + 55); // bottom center curve
  ctx.closePath();
  ctx.fill();

  // Vertical dark wood grains texture
  ctx.strokeStyle = '#5c3a1b';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  // Left grain line
  ctx.moveTo(bCenterX - 25, bCenterY - 45);
  ctx.bezierCurveTo(bCenterX - 35, bCenterY - 10, bCenterX - 45, bCenterY + 20, bCenterX - 55, bCenterY + 55);
  // Center grain line
  ctx.moveTo(bCenterX, bCenterY - 48);
  ctx.bezierCurveTo(bCenterX + 5, bCenterY - 15, bCenterX - 5, bCenterY + 15, bCenterX - 10, bCenterY + 50);
  // Right grain line
  ctx.moveTo(bCenterX + 25, bCenterY - 45);
  ctx.bezierCurveTo(bCenterX + 35, bCenterY - 10, bCenterX + 45, bCenterY + 20, bCenterX + 55, bCenterY + 55);
  ctx.stroke();

  // B. Left Cave Tunnel opening
  // Left cave tunnel opening (oval)
  ctx.fillStyle = '#0a0502'; // deep black
  ctx.beginPath();
  ctx.ellipse(bCenterX - 50, bCenterY + 30, 12, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2d1a0a'; // compressed earth border
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // C. Right Cave Tunnel opening
  // Right cave tunnel opening (oval)
  ctx.fillStyle = '#0a0502';
  ctx.beginPath();
  ctx.ellipse(bCenterX + 50, bCenterY + 30, 12, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2d1a0a';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // D. Central Cave entrance opening
  // Central cave entrance (oval arch)
  ctx.fillStyle = '#0a0502';
  ctx.beginPath();
  ctx.ellipse(bCenterX, bCenterY + 45, 35, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2d1a0a';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // E. ZZZ floating sleeping effects
  for (let i = 0; i < 3; i++) {
    const tZ = (timestamp * 0.0008 + i * 0.65) % 2.0;
    const alpha = 1.0 - (tZ / 2.0);
    if (alpha > 0) {
      ctx.fillStyle = `rgba(180, 220, 255, ${alpha * 0.85})`;
      ctx.font = `bold ${9 + tZ * 10}px "Press Start 2P", monospace`;
      const zx = bCenterX - 12 + Math.sin(tZ * 3.5 + i) * 15;
      const zy = bCenterY - 15 - tZ * 50;
      ctx.fillText("Z", zx, zy);
    }
  }

  // F. Micro dust particles in the hollow center
  for (let i = 0; i < 8; i++) {
    const phase = (timestamp * 0.0004 + i * 1.5) % 1.0;
    const angle = i * Math.PI * 0.25 + phase * Math.PI * 2;
    const rDist = 12 + ((i * 11) % 36) + Math.sin(phase * 3) * 6;
    const px = bCenterX + Math.cos(angle) * rDist;
    const py = bCenterY + Math.sin(angle) * rDist;
    ctx.fillStyle = `rgba(220, 190, 160, ${0.12 + Math.sin(phase * Math.PI) * 0.3})`;
    ctx.fillRect(px, py, 1.8, 1.8);
  }

  // G. Three Pairs of Blinking Glowing Amber Eyes deep inside central cave (Mockup Match)
  const isBlinking = (timestamp % 6000) < 180;
  if (!isBlinking) {
    ctx.save();
    ctx.fillStyle = '#ff9f1c'; // Beautiful glowing amber/orange eyes
    ctx.shadowColor = '#ff6b00';
    ctx.shadowBlur = 8;

    const drawEyePair = (ex: number, ey: number) => {
      // Left eye of the pair (tilted)
      ctx.beginPath();
      ctx.ellipse(ex - 5, ey, 3.5, 2.0, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 5, ey, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9f1c';

      // Right eye of the pair (tilted)
      ctx.beginPath();
      ctx.ellipse(ex + 5, ey, 3.5, 2.0, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 5, ey, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9f1c';
    };

    // Pair 1 (Left side)
    drawEyePair(bCenterX - 22, bCenterY + 8);
    // Pair 2 (Center-top side)
    drawEyePair(bCenterX, bCenterY - 2);
    // Pair 3 (Right side)
    drawEyePair(bCenterX + 22, bCenterY + 8);

    ctx.restore();
  }

  // H. Thick exposed gnarled tree roots wrapping the opening
  ctx.strokeStyle = '#5c3a1b'; // main root colour
  ctx.lineCap = 'round';

  // Left gnarled root
  // Left gnarled root with highlight and shadow
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(bCenterX - 15, bCenterY - 10);
  ctx.bezierCurveTo(bCenterX - 35, bCenterY + 10, bCenterX - 40, bCenterY + 30, bCenterX - 38, bCenterY + 50);
  ctx.stroke();
  // Highlight
  ctx.strokeStyle = '#8B5A2B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bCenterX - 20, bCenterY - 5);
  ctx.bezierCurveTo(bCenterX - 30, bCenterY + 12, bCenterX - 35, bCenterY + 28, bCenterX - 33, bCenterY + 45);
  ctx.stroke();
  // Reset colour
  ctx.strokeStyle = '#5c3a1b';

  // Right gnarled root
  // Right gnarled root with highlight and shadow
  ctx.beginPath();
  ctx.moveTo(bCenterX + 15, bCenterY - 10);
  ctx.bezierCurveTo(bCenterX + 35, bCenterY + 10, bCenterX + 40, bCenterY + 30, bCenterX + 38, bCenterY + 50);
  ctx.stroke();
  ctx.strokeStyle = '#8B5A2B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bCenterX + 20, bCenterY - 5);
  ctx.bezierCurveTo(bCenterX + 30, bCenterY + 12, bCenterX + 35, bCenterY + 28, bCenterX + 33, bCenterY + 45);
  ctx.stroke();
  ctx.strokeStyle = '#5c3a1b';

  // Crawling top root
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bCenterX - 25, bCenterY - 30);
  ctx.bezierCurveTo(bCenterX - 55, bCenterY - 20, bCenterX - 65, bCenterY + 10, bCenterX - 72, bCenterY + 25);
  ctx.stroke();

  // I. Round Grey Stones scattered around the base roots
  const drawRock = (rx: number, ry: number, rSize: number) => {
    ctx.fillStyle = '#9e9a96'; // stone colour
    ctx.strokeStyle = '#6e6a66'; // dark border
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Small white highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(rx - rSize * 0.3, ry - rSize * 0.3, rSize * 0.15, 0, Math.PI * 2);
    ctx.stroke();

    // Light reflection bevel highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(rx, ry, rSize * 0.85, Math.PI, Math.PI * 1.8, false);
    ctx.stroke();
  };

  drawRock(bCenterX - 35, bCenterY + 45, 8);
  drawRock(bCenterX + 35, bCenterY + 46, 7);
  drawRock(bCenterX - 62, bCenterY + 25, 9);
  drawRock(bCenterX + 62, bCenterY + 32, 8);
  drawRock(bCenterX - 15, bCenterY + 52, 6);
  drawRock(bCenterX + 18, bCenterY + 52, 6.5);

  // J. Centered label: Boss Den (Dormant)
  // Centered label: Boss Den (Dormant)
  ctx.save();
  ctx.fillStyle = '#fed7aa';
  ctx.globalAlpha = 0.6;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText('Boss Den (Dormant)', bCenterX, bCenterY + 68);
  ctx.restore();
  ctx.globalAlpha = 1.0;


  // ==========================================
  // 5. CASA DE TORTI (1x1 - col 18, row 13)
  // Rustic cabin house matching mockup
  // ==========================================
  const bx = 18 * TILE;
  const by = 13 * TILE;

  // Draw base floor first
  ctx.fillStyle = '#C78757';
  ctx.fillRect(bx, by, TILE, TILE);

  // A. Earthen green dome mound cover
  ctx.fillStyle = '#2e7d32'; // dark green base
  ctx.beginPath();
  ctx.ellipse(bx + 20, by + 22, 21, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4caf50'; // light green cap
  ctx.beginPath();
  ctx.ellipse(bx + 20, by + 16, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // B. Exposed stone arch/pebbles border surrounding the cave mouth
  const drawMiniRock = (mx: number, my: number, mr: number) => {
    ctx.fillStyle = '#8e8680';
    ctx.strokeStyle = '#5a5450';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  drawMiniRock(bx + 9, by + 30, 4);
  drawMiniRock(bx + 31, by + 30, 4);
  drawMiniRock(bx + 11, by + 18, 3.5);
  drawMiniRock(bx + 29, by + 18, 3.5);
  drawMiniRock(bx + 20, by + 13, 3);

  // C. Cave mouth opening (Lower center circular entrance)
  const caveMouthX = bx + 20;
  const caveMouthY = by + 26;
  const caveMouthR = 9;

  if (escapeActive) {
    // Glowing active entrance (open and shining yellow/gold)
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(caveMouthX, caveMouthY, caveMouthR, 0, Math.PI * 2);
    ctx.fill();

    // Golden outer halo
    const goldPulse = Math.sin(timestamp * 0.005) * 6 + 10;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + Math.sin(timestamp * 0.005) * 0.2})`;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = goldPulse;
    ctx.beginPath();
    ctx.arc(caveMouthX, caveMouthY, caveMouthR + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
    // God rays (2 translucent lines)
    ctx.strokeStyle = 'rgba(255, 235, 59, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(caveMouthX, caveMouthY - caveMouthR);
    ctx.lineTo(caveMouthX, caveMouthY - caveMouthR - 20);
    ctx.moveTo(caveMouthX, caveMouthY - caveMouthR);
    ctx.lineTo(caveMouthX + 12, caveMouthY - caveMouthR - 10);
    ctx.stroke();
  } else {
    // Dark dormant entrance
    // Dark dormant entrance (door closed)
    ctx.fillStyle = '#0d0704';
    ctx.beginPath();
    ctx.arc(caveMouthX, caveMouthY, caveMouthR, 0, Math.PI * 2);
    ctx.fill();
    // Door knob
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(caveMouthX + 4, caveMouthY, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // D. Cute green sprouts/blades growing on top of the dome
  ctx.strokeStyle = '#acf2ad';
  ctx.lineWidth = 1.5;
  // Blade 1
  ctx.beginPath();
  ctx.moveTo(bx + 16, by + 6);
  ctx.quadraticCurveTo(bx + 13, by + 1, bx + 10, by + 2);
  ctx.stroke();
  // Blade 2
  ctx.beginPath();
  ctx.moveTo(bx + 24, by + 6);
  ctx.quadraticCurveTo(bx + 27, by + 1, bx + 30, by + 2);
  ctx.stroke();

  // E. Cell outer boundary frame
  ctx.strokeStyle = '#2d1a0a'; // firm outline
  ctx.lineWidth = 2.0;
  ctx.strokeRect(bx, by, TILE, TILE);
};
