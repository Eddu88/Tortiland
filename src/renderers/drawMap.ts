/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileType, GridPos } from '../types';
import { COLS, ROWS, TILE, T_WALL, T_ICE } from '../constants';

export const drawMap = (
  ctx: CanvasRenderingContext2D,
  map: TileType[][],
  grassAges: { [key: string]: { createdAt: number } },
  breakingTiles: GridPos[],
  playerBreakingAnimTimer: number
) => {
  ctx.shadowBlur = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let x = c * TILE;
      const y = r * TILE;
      const t = map[r]?.[c] ?? 0;

      if (t === T_WALL) {
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
      } else if (t === T_ICE) {
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

        // Check adjacent tiles of the same type to support autotiling (Defined first to avoid ReferenceError!)
        const isNeighborGrass = (nc: number, nr: number) => {
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
          return map[nr]?.[nc] === T_ICE;
        };
        const hasUp = isNeighborGrass(c, r - 1);
        const hasDown = isNeighborGrass(c, r + 1);
        const hasLeft = isNeighborGrass(c - 1, r);
        const hasRight = isNeighborGrass(c + 1, r);

        // FIX 1: Extender el dirt base 1px hacia vecinos del mismo tipo
        // Esto elimina el gap negro de 1px entre tiles adyacentes
        ctx.fillStyle = '#C78757';
        const dL = hasLeft ? -1 : 0;
        const dT = hasUp ? -1 : 0;
        const dR = hasRight ? 1 : 0;
        const dB = hasDown ? 1 : 0;
        ctx.fillRect(x + dL, y + dT, TILE - dL + dR, TILE - dT + dB);

        // Grow animation with bouncy elastic spring overshoot effect
        let growProgress = 1.0;
        if (ageMs < 250) {
          const tNorm = ageMs / 250;
          // Bouncy spring equation: f(t) = -((t-1)^2) * (t-1.25) + 1
          growProgress = -Math.pow(tNorm - 1, 2) * (tNorm - 1.25) + 1;
          growProgress = Math.max(0, Math.min(1.1, growProgress));
        }

        // Deterministic hash based on grid coordinate for layout variations
        const hashVal = Math.abs(Math.sin(r * 12.9898 + c * 78.233)) * 43758.5453;
        const variant = Math.floor(hashVal % 3);

        // A. Organic base shadow projected onto the earth
        if (!hasDown) {
          ctx.fillStyle = 'rgba(32, 19, 10, 0.48)';
          // Rounded shadow beneath the bottom of the shrub hedge
          ctx.beginPath();
          ctx.ellipse(x + TILE / 2, y + TILE + 2, TILE * 0.55, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        ctx.translate(x + TILE / 2, y + TILE / 2);
        ctx.scale(growProgress, growProgress);
        ctx.translate(-(x + TILE / 2), -(y + TILE / 2));

        // Set up colors based on variant to break monotony and add depth
        // Adjusted original palettes: lightened and softened to be more fresh lettuce-green.
        let colDark = '#1c472d'; // softened original dark foliage
        let colMid = '#2b7835';  // softened original forest base
        let colLight = '#5ec263'; // softened original bright green highlights
        let colWarm = '#94db97'; // softened original sunlit neon tips
        let colLeafGlint = '#b4f07a'; // softened original neon warm leaf glint

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

        // Base fill con padding para no tocar los bordes exactos del tile
        ctx.fillStyle = colDark;
        // Connect seamless fills with neighbors (extended by 1px to prevent any subpixel anti-aliasing gaps!)
        const padL = hasLeft ? -1 : 2;
        const padR = hasRight ? -1 : 2;
        const padT = hasUp ? -1 : 2;
        const padB = hasDown ? -1 : 2;
        ctx.fillRect(x + padL, y + padT, TILE - padL - padR, TILE - padT - padB);

        // FIX 2 + FIX 3: Bordes autotile dibujados 1px hacia ADENTRO del tile
        // con opacidad reducida para eliminar el efecto de marco duro
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

        // Helper to draw leaf circles that can jut out past the standard grid boundaries
        const drawLeaf = (cx: number, cy: number, rSize: number, fillCol: string, outlineCol: string) => {
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

        // Draw interior branches (visible in small gaps)
        ctx.strokeStyle = '#4a2e19'; // dark rustic wood brown
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

        // Draw dense organic leaf layers with shading (cenital lighting: top light, bottom dark)
        // 1. Dark bottom foliage base layer
        drawLeaf(x + 10, y + 28, 7.5, colDark, '#051408');
        drawLeaf(x + TILE - 10, y + 28, 7.5, colDark, '#051408');
        drawLeaf(x + 20, y + 30, 8.0, colDark, '#051408');

        // 2. Middle green foliage layer
        drawLeaf(x + 8, y + 20, 7.0, colMid, colDark);
        drawLeaf(x + TILE - 8, y + 20, 7.0, colMid, colDark);
        drawLeaf(x + 20, y + 22, 7.5, colMid, colDark);

        // 3. Bright light foliage layer (closer to top)
        drawLeaf(x + 10, y + 12, 6.5, colLight, colMid);
        drawLeaf(x + TILE - 10, y + 12, 6.5, colLight, colMid);
        drawLeaf(x + 20, y + 13, 7.0, colLight, colMid);

        // 4. Hot direct sunlit top tips layer
        drawLeaf(x + 12, y + 6, 5.0, colWarm, colLight);
        drawLeaf(x + TILE - 12, y + 6, 5.0, colWarm, colLight);
        drawLeaf(x + 20, y + 7, 5.5, colWarm, colLight);

        // 5. Warm pixel yellow-green highlights (cenital glint)
        drawLeaf(x + 14, y + 3, 3.5, colLeafGlint, colWarm);
        drawLeaf(x + TILE - 14, y + 3, 3.5, colLeafGlint, colWarm);
        drawLeaf(x + 20, y + 4, 4.0, colLeafGlint, colWarm);

        // B. Leaves that BREAK the rigidity of the square (Jutting out of boundaries!)
        if (!hasLeft) {
          // Draw overlapping leaves sticking out left
          drawLeaf(x - 2, y + 14, 4.5, colMid, colDark);
          drawLeaf(x - 3, y + 22, 5.0, colDark, '#051408');
          drawLeaf(x - 1, y + 8, 4.0, colLight, colMid);
        }
        if (!hasRight) {
          // Draw overlapping leaves sticking out right
          drawLeaf(x + TILE + 2, y + 14, 4.5, colMid, colDark);
          drawLeaf(x + TILE + 3, y + 22, 5.0, colDark, '#051408');
          drawLeaf(x + TILE + 1, y + 8, 4.0, colLight, colMid);
        }
        if (!hasUp) {
          // Draw overlapping leaves sticking out top
          drawLeaf(x + 12, y - 2, 4.5, colLeafGlint, colWarm);
          drawLeaf(x + 28, y - 2, 4.2, colWarm, colLight);
          drawLeaf(x + 20, y - 3, 5.0, colLeafGlint, colWarm);
        }
        if (!hasDown) {
          // Draw leaves sticking out bottom
          drawLeaf(x + 12, y + TILE - 1, 4.5, colDark, '#051408');
          drawLeaf(x + 28, y + TILE - 1, 4.5, colDark, '#051408');
        }

        // C. Cute wild flowers (Variant 0: Pink/Yellow flower, Variant 1: Orange/White flower, Variant 2: deep foliage only)
        if (variant === 0) {
          const fx = x + 15, fy = y + 14;
          ctx.fillStyle = '#ff3366'; // Gorgeous glowing pink
          ctx.beginPath(); ctx.arc(fx, fy, 3.0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffcc00'; // Yellow center
          ctx.beginPath(); ctx.arc(fx, fy, 1.0, 0, Math.PI * 2); ctx.fill();
        } else if (variant === 1) {
          const fx = x + TILE - 15, fy = y + 16;
          ctx.fillStyle = '#ff6600'; // Hot vibrant orange
          ctx.beginPath(); ctx.arc(fx, fy, 3.0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff'; // White center
          ctx.beginPath(); ctx.arc(fx, fy, 1.0, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();

      } else {
        // ==========================================
        // 3. SEAMLESS EARTHEN GARDEN GROUND (EMPTY)
        // ==========================================

        // Organic Light Brown Earth (#C78757)
        ctx.fillStyle = '#C78757';
        ctx.fillRect(x, y, TILE, TILE);

        // Soften the grid: make it almost invisible, giving a seamless seamless ground
        ctx.strokeStyle = 'rgba(150, 95, 55, 0.06)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, y, TILE, TILE);

        // Shadow/dirt corner accumulations to organically suggest depth
        ctx.fillStyle = 'rgba(145, 95, 55, 0.22)';
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x + TILE - 4, y, 4, 4);
        ctx.fillRect(x, y + TILE - 4, 4, 4);
        ctx.fillRect(x + TILE - 4, y + TILE - 4, 4, 4);

        // Deterministic hash value for organic decorations
        const hashVal = Math.abs(Math.sin(r * 12.9898 + c * 78.233)) * 43758.5453;

        // Sand grains / Porosity spots (light and dark micro-dots)
        ctx.fillStyle = 'rgba(110, 65, 30, 0.35)'; // dark porous dots
        ctx.fillRect(x + 4 + (hashVal % 6), y + 6 + ((hashVal * 3) % 8), 1.2, 1.2);
        ctx.fillRect(x + 22 + (hashVal % 10), y + 14 + ((hashVal * 5) % 12), 1.0, 1.0);
        ctx.fillRect(x + 12 + (hashVal % 8), y + 26 + ((hashVal * 7) % 10), 1.2, 1.2);

        ctx.fillStyle = '#deb089'; // light shiny grains
        ctx.fillRect(x + 8 + (hashVal % 12), y + 18 + ((hashVal * 11) % 6), 1.0, 1.0);
        ctx.fillRect(x + 28 + (hashVal % 6), y + 22 + ((hashVal * 13) % 8), 1.2, 1.2);

        // Occasional gray Pebbles (10% of tiles)
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

        // Occasional dry Twigs (10% of tiles)
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

        // Stepped-on mud footprint marks (24% of tiles)
        if (hashVal % 5 < 1.2) {
          const hx = x + 12 + (hashVal % 16);
          const hy = y + 12 + ((hashVal * 3) % 16);
          ctx.fillStyle = 'rgba(142, 92, 52, 0.35)'; // mud depression
          ctx.beginPath();
          ctx.ellipse(hx, hy, 4.5, 2.8, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          // Tiny toe prints
          ctx.beginPath();
          ctx.arc(hx - 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
          ctx.arc(hx + 2.5, hy - 2.5, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
};
