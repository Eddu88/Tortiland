/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fruit, TileType, Player, Enemy } from '../types';
import { TILE, T_BUSH, T_WALL, T_EMPTY, COLS, ROWS } from '../constants';

export const drawIndicatorCell = (
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  isBreaking: boolean,
  isGolden: boolean
) => {
  const fx = col * TILE + TILE / 2;
  const fy = row * TILE + TILE / 2;

  let fill = isBreaking ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)';
  let stroke = isBreaking ? 'rgba(239, 68, 68, 0.85)' : 'rgba(34, 197, 94, 0.85)';

  if (!isBreaking && isGolden) {
    fill = 'rgba(234, 179, 8, 0.25)';
    stroke = 'rgba(234, 179, 8, 0.85)';
  }

  ctx.fillStyle = fill;
  ctx.fillRect(col * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  const cx = fx;
  const cy = fy;
  const r = 6;

  if (isBreaking) {
    // Red X
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
    ctx.stroke();
  } else {
    // Plus sign (matches the outline strokeStyle color automatically)
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.stroke();
  }
};

export const drawPlayerIndicators = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  enemies: Enemy[],
  map: TileType[][],
  powerCount: number
) => {
  const dir = player.dir;
  const isGolden = player.goldenBroccoliTimer > 0;

  const isWall = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    return map[row]?.[col] === T_WALL;
  };

  const isIce = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return map[row]?.[col] === T_BUSH;
  };

  const isEmpty = (col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return map[row]?.[col] === T_EMPTY;
  };

  // 1. Red preview marker overlays for breaking
  let currentCc = player.col + dir.x;
  let currentCr = player.row + dir.y;
  for (let i = 0; i < powerCount; i++) {
    if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;
    if (isWall(currentCc, currentCr)) break;

    if (isIce(currentCc, currentCr)) {
      drawIndicatorCell(ctx, currentCc, currentCr, true, isGolden);
    } else {
      break; // Stop immediately upon blank gap or other
    }
    currentCc += dir.x;
    currentCr += dir.y;
  }

  // 2. Green preview marker overlays for building-planting block sequence
  currentCc = player.col + dir.x;
  currentCr = player.row + dir.y;
  for (let i = 0; i < powerCount; i++) {
    if (currentCc <= 0 || currentCc >= COLS - 1 || currentCr <= 0 || currentCr >= ROWS - 1) break;

    const hasPlayer = player.col === currentCc && player.row === currentCr;
    const hasEnemy = enemies.some(e => e.col === currentCc && e.row === currentCr);

    if (isIce(currentCc, currentCr) || isWall(currentCc, currentCr) || hasPlayer || hasEnemy) {
      break;
    }

    if (isEmpty(currentCc, currentCr)) {
      drawIndicatorCell(ctx, currentCc, currentCr, false, isGolden);
    }
    currentCc += dir.x;
    currentCr += dir.y;
  }
};

export const drawFruits = (
  ctx: CanvasRenderingContext2D,
  fruits: Fruit[],
  map: TileType[][],
  t: number
) => {
  fruits.forEach(f => {
    const px = f.col * TILE + TILE / 2;
    const py = f.row * TILE + TILE / 2;
    const bob = Math.sin(t * 0.003 + f.anim) * 3;
    const yBob = py + bob;

    const isCovered = map[f.row]?.[f.col] === T_BUSH;

    ctx.save();

    if (!isCovered) {
      // Grounded float relative floor shadow
      const shadowScale = Math.max(0.3, 1.0 - Math.abs(bob) / 12);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(px, py + TILE * 0.35, 7.5 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isCovered) {
      // Semi-visible translucent overlay representation when inside grass (Balanced visibility!)
      ctx.globalAlpha = 0.55;

      // Draw a soft glowing warm aura behind the fruit to make it stand out beautifully inside the foliage
      ctx.save();
      const auraGrad = ctx.createRadialGradient(px, yBob, 2, px, yBob, 11);
      auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      auraGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.32)'); // soft warm yellow glow
      auraGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(px, yBob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const pulse = 1.05 + Math.sin(t * 0.012 + f.anim) * 0.15;
      const jiggleX = Math.cos(t * 0.025 + f.anim) * 1.5;

      ctx.translate(px + jiggleX, yBob);
      ctx.scale(pulse, pulse);
      ctx.translate(-px, -yBob);
    }

    if (f.type === 3) {
      // 🍅 Tomato vector representation with 3D Sphere Radial Gradient
      const tomatoGrad = ctx.createRadialGradient(px - 2, yBob - 2, 1, px, yBob + 1, 9.5);
      tomatoGrad.addColorStop(0, '#fecaca'); // glint light
      tomatoGrad.addColorStop(0.3, '#ef4444'); // red body
      tomatoGrad.addColorStop(1, '#991b1b'); // dark shadow red edge

      ctx.fillStyle = tomatoGrad;
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.5;

      // Draw slightly flattened juicy tomato circle
      ctx.beginPath();
      ctx.ellipse(px, yBob + 1, 10, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw sepals (green star-like leaf crown on top)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 0.8;

      // Top stem
      ctx.fillStyle = '#15803d';
      ctx.fillRect(px - 1, yBob - 10, 2, 4);

      // Sepal lobes
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      // Lobe 1 (left)
      ctx.moveTo(px, yBob - 7);
      ctx.quadraticCurveTo(px - 5, yBob - 8, px - 7, yBob - 5);
      ctx.quadraticCurveTo(px - 3, yBob - 5, px, yBob - 7);
      // Lobe 2 (right)
      ctx.moveTo(px, yBob - 7);
      ctx.quadraticCurveTo(px + 5, yBob - 8, px + 7, yBob - 5);
      ctx.quadraticCurveTo(px + 3, yBob - 5, px, yBob - 7);
      // Lobe 3 (center back)
      ctx.moveTo(px, yBob - 7);
      ctx.quadraticCurveTo(px, yBob - 11, px - 3, yBob - 10);
      ctx.quadraticCurveTo(px, yBob - 9, px, yBob - 7);
      // Lobe 4 (front left)
      ctx.moveTo(px, yBob - 7);
      ctx.quadraticCurveTo(px - 3, yBob - 4, px - 4, yBob - 2);
      ctx.quadraticCurveTo(px - 1, yBob - 5, px, yBob - 7);
      // Lobe 5 (front right)
      ctx.moveTo(px, yBob - 7);
      ctx.quadraticCurveTo(px + 3, yBob - 4, px + 4, yBob - 2);
      ctx.quadraticCurveTo(px + 1, yBob - 5, px, yBob - 7);
      ctx.fill();
      ctx.stroke();

      // High glint shine reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(px - 3, yBob - 3, 2.5, 1.5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (f.type === 4) {
      // 🥕 Carrot vector representation (2.5D premium angled vector)
      ctx.save();
      ctx.translate(px, yBob);
      ctx.rotate(-Math.PI / 8); // nice playful tilt

      // Carrot body (elongated tapered cone)
      const carrotGrad = ctx.createLinearGradient(-4, -8, 4, 8);
      carrotGrad.addColorStop(0, '#fdba74'); // highlight orange
      carrotGrad.addColorStop(0.4, '#f97316'); // main orange
      carrotGrad.addColorStop(1, '#c2410c'); // shadow rust orange

      ctx.fillStyle = carrotGrad;
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.quadraticCurveTo(0, -9, 6, -6); // rounded top
      ctx.lineTo(1, 10); // taper down to point
      ctx.quadraticCurveTo(0, 11, -1, 10); // tiny tip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Horizontal texture ridges
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-4, -2); ctx.lineTo(1, -2);
      ctx.moveTo(-2, 2); ctx.lineTo(3, 2);
      ctx.moveTo(-1, 6); ctx.lineTo(1, 6);
      ctx.stroke();

      // Green leafy tuft at top
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 0.8;

      // Leaf 1 (center)
      ctx.beginPath();
      ctx.ellipse(0, -11, 2.2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Leaf 2 (left)
      ctx.beginPath();
      ctx.ellipse(-3.5, -9.5, 2, 4, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Leaf 3 (right)
      ctx.beginPath();
      ctx.ellipse(3.5, -9.5, 2, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.restore();

    } else if (f.type === 5) {
      // 🥦 Golden Broccoli (Power up)
      // Golden stalk stem
      ctx.fillStyle = '#fef08a'; // yellow-200
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 4, yBob + 9);
      ctx.lineTo(px - 3, yBob + 1);
      ctx.lineTo(px + 3, yBob + 1);
      ctx.lineTo(px + 4, yBob + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold ramillete core layers
      ctx.fillStyle = '#eab308'; // yellow-500
      ctx.beginPath();
      ctx.arc(px, yBob - 3, 7.5, 0, Math.PI * 2);
      ctx.arc(px - 5, yBob - 1, 6.5, 0, Math.PI * 2);
      ctx.arc(px + 5, yBob - 1, 6.5, 0, Math.PI * 2);
      ctx.arc(px - 3, yBob - 6, 5.5, 0, Math.PI * 2);
      ctx.arc(px + 3, yBob - 6, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Golden details outlines
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px - 5, yBob - 1, 6.5, Math.PI * 0.7, Math.PI * 1.6);
      ctx.stroke();

      // Sparkling gold dots
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, yBob - 3, 1.5, 1.5);
      ctx.fillRect(px + 2, yBob - 5, 1.5, 1.5);
    }

    ctx.restore();
  });
};
