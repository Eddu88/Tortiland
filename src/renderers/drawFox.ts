/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position, EnemyType } from '../types';
import { TILE } from '../constants';
import { drawSnake } from './drawSnakes';
import { drawGorilla } from './drawGorillas';
import { drawEagle } from './drawEagle';
import { drawScorpion } from './drawScorpion';

/**
 * Vector rendering function that draws the enemy character (Fox/Lobo) onto the Canvas context.
 * Delegates to other files for non-fox enemy types.
 */
export const drawFoxEnemy = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: Position,
  frame: number,
  type: EnemyType,
  t: number,
  extra?: { 
    isJumping?: boolean; 
    jumpProgress?: number;
    isDiving?: boolean;
    isStunned?: boolean;
    stunTimer?: number;
    isBurrowed?: boolean;
    telegraphTimer?: number;
    isHowling?: boolean;
    howlTimer?: number;
    isOverBush?: boolean;
  }
) => {
  if (type === 'snake') {
    drawSnake(ctx, px, py, dir, frame, t, 0, true, 0, 0, 0, type, extra);
    return;
  }

  if (type === 'gorilla') {
    drawGorilla(ctx, px, py, dir, frame, type, t, extra);
    return;
  }

  if (type === 'eagle') {
    drawEagle(ctx, px, py, dir, frame, t, 0, true, 0, 0, 0, extra);
    return;
  }

  if (type === 'scorpion') {
    drawScorpion(ctx, px, py, dir, frame, t, 0, true, 0, 0, 0);
    return;
  }

  // Draw Fox (fox_patrol, fox_chaser, fox_zombie, fox_zombie_spawn) using high-fidelity vector drawFox
  drawFox(ctx, px, py, dir, frame, t, 0, true, 0, 0, 0, type, extra);
};

/**
 * High-fidelity vector renderer for Todd the Fox.
 * Implements 4-directional facing, stylized proportions (large ears, puffy tail),
 * interactive gameplay expressions, impact squash-stretch, and a green explorer bandana.
 */
export const drawFox = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: Position,
  frame: number,
  t: number,
  goldenBroccoliTimer: number,
  playerIsMoving: boolean,
  plantingAnimTimer: number = 0,
  breakingAnimTimer: number = 0,
  deathAnimTimer: number = 0,
  type?: EnemyType,
  extra?: { isHowling?: boolean; howlTimer?: number }
) => {
  const isGolden = goldenBroccoliTimer > 0;
  ctx.save();

  let animScale = 1.0;
  let bodyOffsetY = 0;
  let headOffsetX = 0;
  let headOffsetY = 0;
  let tailRotation = 0;

  if (extra?.isHowling) {
    headOffsetY = -TILE * 0.15;
    headOffsetX = -TILE * 0.08;
    tailRotation = Math.sin(t * 0.05) * 0.2;
  }

  // Active state flags
  let isShocked = false;
  let isTuckedDeath = false;
  let tuckProgress = 0;
  let deathFallY = 0;
  let deathJumpY = 0;
  let deathOpacity = 1.0;
  let shellRotation = 0;
  let limbsScale = 1.0;

  const bob = Math.sin(t * 0.008 + frame) * 1.8;
  let cy = py + bob;

  // 1. Death Animation
  if (deathAnimTimer > 0) {
    if (deathAnimTimer >= 2450) {
      isShocked = true;
      const tNorm = (3000 - deathAnimTimer) / 550;
      deathJumpY = -TILE * 0.9 * Math.sin(tNorm * Math.PI);
    } else if (deathAnimTimer >= 1850) {
      isShocked = true;
      tuckProgress = (2450 - deathAnimTimer) / 600;
      isTuckedDeath = tuckProgress >= 0.5;
      const shakeAngle = Math.sin(t * 0.28) * 0.10;
      ctx.translate(px, cy);
      ctx.rotate(shakeAngle);
      ctx.translate(-px, -cy);
    } else {
      isTuckedDeath = true;
      tuckProgress = 1.0;
      const progress = (1850 - deathAnimTimer) / 1850;
      deathFallY = progress * TILE * 0.7;
      shellRotation = progress * Math.PI * 4;
      deathOpacity = Math.max(0, 1.0 - progress);
    }
  }

  cy += deathJumpY + deathFallY;
  ctx.globalAlpha = ctx.globalAlpha * deathOpacity;

  const isFlickering = goldenBroccoliTimer <= 3000 && isGolden;
  const flickerOn = isFlickering ? Math.floor(goldenBroccoliTimer / 133) % 2 === 0 : true;
  if (isGolden && !flickerOn) {
    ctx.globalAlpha = ctx.globalAlpha * 0.3;
  }

  // 2. Breaking Tiles / Spinning Dash
  if (breakingAnimTimer > 0) {
    if (breakingAnimTimer >= 517) {
      limbsScale = 0;
      animScale = 0.9;
    } else if (breakingAnimTimer >= 276) {
      limbsScale = 1.0;
      isShocked = true;
      let vueloOffset = (517 - breakingAnimTimer >= 102) ? TILE : ((517 - breakingAnimTimer) / 102) * TILE;
      const localOffsetX = Math.abs(dir.x) * vueloOffset;
      const localOffsetY = dir.y * vueloOffset;
      ctx.translate(localOffsetX, localOffsetY);
      shellRotation = (517 - breakingAnimTimer) * 0.05; // Spin!
      animScale = 1.1;
    } else {
      const progress = breakingAnimTimer / 276;
      animScale = 0.85 + (1 - progress) * 0.15;
    }
  }

  // 3. Planting / Stomp Impact
  if (plantingAnimTimer > 0) {
    if (plantingAnimTimer >= 517) {
      bodyOffsetY = TILE * 0.08;
      headOffsetY = TILE * 0.05;
      animScale = 0.95;
    } else if (plantingAnimTimer >= 172) {
      if (plantingAnimTimer >= 344) {
        bodyOffsetY = -TILE * 0.22;
        headOffsetY = -TILE * 0.08;
      } else {
        bodyOffsetY = TILE * 0.15;
        headOffsetY = TILE * 0.04;
        if (plantingAnimTimer <= 336 && plantingAnimTimer > 318) {
          animScale = 0.82;
        }
      }
    } else {
      const progress = plantingAnimTimer / 172;
      headOffsetX = Math.sin(t * 0.3) * 3 * progress;
    }
  }

  // Adjust scale naturally per subtype
  let sizeBase = TILE * 0.58;
  if (type === 'fox_patrol') {
    sizeBase = TILE * 0.48;
  } else if (type === 'fox_chaser') {
    sizeBase = TILE * 0.58;
  } else if (type === 'fox_zombie') {
    sizeBase = TILE * 0.60;
  } else if (type === 'fox_zombie_spawn') {
    sizeBase = TILE * 0.38;
  }

  const s = sizeBase * animScale;
  const finalPx = px;
  const finalCy = cy;

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(finalPx, py + s * 0.56, s * 0.62, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color Palette (3-Tone System)
  let baseOrange = isGolden ? '#ffd43b' : '#ff781f'; // Fox bright orange / Yellow-gold
  let lightCream = isGolden ? '#fef08a' : '#fcfbf7'; // White fur / Light cream yellow
  let earPink = isGolden ? '#eab308' : '#f43f5e'; // Inside ear pink / Yellow-orange
  let darkDetail = isGolden ? '#78350f' : '#3c1800'; // Dark tips & outline
  const bandanaGreen = '#10b981'; // Cozy emerald green bandana

  if (type === 'fox_chaser') {
    baseOrange = '#64748b'; // Gray/Steel armored lobo
    lightCream = '#f1f5f9';
    earPink = '#334155';
    darkDetail = '#0f172a';
  } else if (type === 'fox_zombie' || type === 'fox_zombie_spawn') {
    baseOrange = '#4a5d4e'; // Zombie decay green/gray
    lightCream = '#a9bfa8'; // Pale moldy green
    earPink = '#ef4444'; // Crimson zombie ears
    darkDetail = '#1b261c'; // Rotten dark highlights
  }

  const facing: 'right' | 'left' | 'up' | 'down' =
    dir.x > 0 ? 'right' :
      dir.x < 0 ? 'left' :
        dir.y < 0 ? 'up' : 'down';

  // Mirror horizontal for left
  if (facing === 'left') {
    ctx.translate(finalPx, finalCy);
    ctx.scale(-1, 1);
    ctx.translate(-finalPx, -finalCy);
  }

  const walkCycle = playerIsMoving ? Math.sin(t * 0.015) * 0.20 : 0;

  // Legs helper
  const drawFoxLeg = (lx: number, walkOff: number) => {
    if (isTuckedDeath || limbsScale === 0) return;
    ctx.save();
    ctx.translate(lx, finalCy + s * 0.45 + bodyOffsetY + walkOff * s * 0.2);
    ctx.fillStyle = baseOrange;
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 1.8;

    // Drawn as a cute dark tipped paw
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-s * 0.08, 0, s * 0.16, s * 0.18, s * 0.05);
    } else {
      ctx.rect(-s * 0.08, 0, s * 0.16, s * 0.18);
    }
    ctx.fill();
    ctx.stroke();

    // Dark paw tip
    ctx.fillStyle = darkDetail;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-s * 0.08, s * 0.1, s * 0.16, s * 0.08, s * 0.03);
    } else {
      ctx.rect(-s * 0.08, s * 0.1, s * 0.16, s * 0.08);
    }
    ctx.fill();
    ctx.restore();
  };

  // 4. RENDERING ACCORDING TO FACING DIRECTION

  // A. FACING UP (DE ESPALDAS)
  if (facing === 'up') {
    // 1. Large Puffy Fox Tail (elongated dragging brush tail)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx - s * 0.05, finalCy + s * 0.15 + bodyOffsetY);
      ctx.rotate(Math.sin(t * 0.01) * 0.15 + tailRotation);
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;

      // Elongated dragging brush tail shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s * 0.35, s * 0.1, -s * 0.7, s * 0.25, -s * 1.0, s * 0.25);
      ctx.bezierCurveTo(-s * 1.25, s * 0.25, -s * 1.2, 0, -s * 1.0, -s * 0.08);
      ctx.bezierCurveTo(-s * 0.7, -s * 0.2, -s * 0.35, -s * 0.1, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White tip
      ctx.fillStyle = lightCream;
      ctx.beginPath();
      ctx.moveTo(-s * 0.75, s * 0.12);
      ctx.bezierCurveTo(-s * 0.9, s * 0.2, -s * 1.0, s * 0.25, -s * 1.0, s * 0.25);
      ctx.bezierCurveTo(-s * 1.25, s * 0.25, -s * 1.2, 0, -s * 1.0, -s * 0.08);
      ctx.bezierCurveTo(-s * 0.85, -s * 0.15, -s * 0.7, -s * 0.05, -s * 0.75, s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Legs
    drawFoxLeg(finalPx - s * 0.15, walkCycle);
    drawFoxLeg(finalPx + s * 0.15, -walkCycle);

    // 2. Torso
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.08 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseOrange;
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Add Chaser chestplate:
    if (type === 'fox_chaser') {
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, 0);
      ctx.lineTo(s * 0.22, 0);
      ctx.lineTo(s * 0.16, s * 0.34);
      ctx.lineTo(0, s * 0.44);
      ctx.lineTo(-s * 0.16, s * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing power gem central slot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, s * 0.22, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Explorer Bandana Knot
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx, finalCy - s * 0.12 + bodyOffsetY);
      ctx.fillStyle = bandanaGreen;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;

      // Bandana wrap line
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.2, s * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Waving tails
      ctx.rotate(Math.sin(t * 0.02) * 0.25 - 0.2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 0.18, s * 0.16);
      ctx.lineTo(-s * 0.06, s * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Head (plain back of head dome)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.35 + headOffsetY);

      // Ears (Rear ear and front ear)
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * s * 0.16, -s * 0.2);
        ctx.rotate(side * 0.12);
        ctx.fillStyle = baseOrange;
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, 0);
        ctx.quadraticCurveTo(-s * 0.15, -s * 0.38, 0, -s * 0.42);
        ctx.quadraticCurveTo(s * 0.15, -s * 0.38, s * 0.12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Main head dome
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Add Chaser headband armor:
      if (type === 'fox_chaser') {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.38, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Little forehead central spike
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(-2.5, -s * 0.38);
        ctx.lineTo(0, -s * 0.65);
        ctx.lineTo(2.5, -s * 0.38);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // B. FACING DOWN (HACIA CÁMARA)
  else if (facing === 'down') {
    // 1. Tail (partially showing at the left side)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx - s * 0.18, finalCy + s * 0.18 + bodyOffsetY);
      ctx.rotate(-Math.PI * 0.12 + Math.sin(t * 0.01) * 0.1 + tailRotation);
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s * 0.3, s * 0.15, -s * 0.6, s * 0.3, -s * 0.85, s * 0.28);
      ctx.bezierCurveTo(-s * 1.05, s * 0.25, -s * 1.0, 0.05, -s * 0.82, -s * 0.04);
      ctx.bezierCurveTo(-s * 0.55, -s * 0.15, -s * 0.25, -s * 0.08, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White tip
      ctx.fillStyle = lightCream;
      ctx.beginPath();
      ctx.moveTo(-s * 0.65, s * 0.18);
      ctx.bezierCurveTo(-s * 0.78, s * 0.25, -s * 0.85, s * 0.28, -s * 0.85, s * 0.28);
      ctx.bezierCurveTo(-s * 1.05, s * 0.25, -s * 1.0, 0.05, -s * 0.82, -s * 0.04);
      ctx.bezierCurveTo(-s * 0.72, -s * 0.08, -s * 0.6, -s * 0.02, -s * 0.55, s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Legs
    drawFoxLeg(finalPx - s * 0.15, walkCycle);
    drawFoxLeg(finalPx + s * 0.15, -walkCycle);

    // 2. Torso with white belly patch
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.08 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseOrange;
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.42, s * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Belly patch cream
    ctx.fillStyle = lightCream;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.08, s * 0.25, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Add Chaser chestplate:
    if (type === 'fox_chaser') {
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, 0);
      ctx.lineTo(s * 0.22, 0);
      ctx.lineTo(s * 0.16, s * 0.34);
      ctx.lineTo(0, s * 0.44);
      ctx.lineTo(-s * 0.16, s * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing power gem central slot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, s * 0.22, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Bandana scarf around neck
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx, finalCy - s * 0.14 + bodyOffsetY);
      ctx.fillStyle = bandanaGreen;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;

      // Wrap
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.22, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tails
      ctx.rotate(Math.sin(t * 0.015) * 0.2 - 0.1);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, s * 0.03);
      ctx.lineTo(-s * 0.22, s * 0.2);
      ctx.lineTo(-s * 0.12, s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Head (Symmetrical face, big eyes)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.35 + headOffsetY);

      // Ears (Rear ear and front ear)
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * s * 0.18, -s * 0.2);
        ctx.rotate(side * 0.12);
        ctx.fillStyle = baseOrange;
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, 0);
        ctx.quadraticCurveTo(-s * 0.15, -s * 0.38, 0, -s * 0.42);
        ctx.quadraticCurveTo(s * 0.15, -s * 0.38, s * 0.12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner pink
        ctx.fillStyle = earPink;
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, -s * 0.04);
        ctx.quadraticCurveTo(-s * 0.08, -s * 0.26, 0, -s * 0.3);
        ctx.quadraticCurveTo(s * 0.06, -s * 0.26, s * 0.06, -s * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Cheek fluff points (Left & Right cheeks)
      ctx.fillStyle = lightCream;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.1);
      ctx.quadraticCurveTo(-s * 0.52, s * 0.15, -s * 0.44, s * 0.26);
      ctx.quadraticCurveTo(-s * 0.26, s * 0.22, -s * 0.16, s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s * 0.3, s * 0.1);
      ctx.quadraticCurveTo(s * 0.52, s * 0.15, s * 0.44, s * 0.26);
      ctx.quadraticCurveTo(s * 0.26, s * 0.22, s * 0.16, s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main head dome
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Add Chaser headband armor:
      if (type === 'fox_chaser') {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.38, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Little forehead central spike
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(-2.5, -s * 0.38);
        ctx.lineTo(0, -s * 0.65);
        ctx.lineTo(2.5, -s * 0.38);
        ctx.closePath();
        ctx.fill();
      }

      // White cheek accents around snout
      ctx.fillStyle = lightCream;
      ctx.beginPath();
      ctx.ellipse(-s * 0.14, s * 0.16, s * 0.16, s * 0.14, -0.05, 0, Math.PI * 2);
      ctx.ellipse(s * 0.14, s * 0.16, s * 0.16, s * 0.14, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      const drawEye = (ex: number, ey: number) => {
        const isZombie = type === 'fox_zombie' || type === 'fox_zombie_spawn';
        if (plantingAnimTimer > 0) {
          ctx.strokeStyle = darkDetail;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.06, 0, Math.PI, true);
          ctx.stroke();
        } else if (isShocked) {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = lightCream;
          ctx.beginPath();
          ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.04, 0, Math.PI * 2);
          ctx.fill();
        } else if (isZombie) {
          // Glowing red zombie eyes
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.075, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a'; // yellow glint
          ctx.beginPath();
          ctx.arc(ex - s * 0.015, ey - s * 0.015, s * 0.02, 0, Math.PI * 2);
          ctx.fill();
          
          // Angry zombie eyebrow
          ctx.strokeStyle = darkDetail;
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - s * 0.12, ey - s * 0.09);
          ctx.lineTo(ex + s * 0.1, ey - s * 0.05); // tilted angry
          ctx.stroke();
        } else {
          // Determined almond eyes
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.075, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.025, 0, Math.PI * 2);
          ctx.fill();

          // Determined eyebrows
          ctx.strokeStyle = darkDetail;
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - s * 0.12, ey - s * 0.09);
          ctx.lineTo(ex + s * 0.1, ey - s * 0.12);
          ctx.stroke();
        }
      };

      drawEye(-s * 0.14, -s * 0.02);
      drawEye(s * 0.14, -s * 0.02);

      // Symmetrical snout pointing down-center
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, s * 0.06);
      ctx.lineTo(s * 0.15, s * 0.06);
      ctx.lineTo(0, s * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Nose tip
      ctx.fillStyle = darkDetail;
      ctx.beginPath();
      ctx.arc(0, s * 0.28, s * 0.045, 0, Math.PI * 2);
      ctx.fill();

      // Blush
      if (!isShocked) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.6)';
        ctx.beginPath();
        ctx.arc(-s * 0.25, s * 0.12, s * 0.05, 0, Math.PI * 2);
        ctx.arc(s * 0.25, s * 0.12, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // C. PROFILE OR 3/4 (DEFAULT FACING - RIGHT / LEFT)
  else {
    // 1. Cozy fluffy Tail swiping at back
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx - s * 0.1, finalCy + s * 0.12 + bodyOffsetY);
      ctx.rotate(Math.sin(t * 0.012) * 0.15 + tailRotation);
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;

      // Elongated dragging brush tail shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s * 0.4, s * 0.15, -s * 0.8, s * 0.35, -s * 1.1, s * 0.35); // lower boundary dragging down-left
      ctx.bezierCurveTo(-s * 1.3, s * 0.35, -s * 1.3, s * 0.15, -s * 1.1, s * 0.05); // sharp tip
      ctx.bezierCurveTo(-s * 0.8, -s * 0.1, -s * 0.4, -s * 0.1, 0, 0); // upper boundary
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White tip
      ctx.fillStyle = lightCream;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.25);
      ctx.bezierCurveTo(-s * 1.0, s * 0.32, -s * 1.1, s * 0.35, -s * 1.1, s * 0.35);
      ctx.bezierCurveTo(-s * 1.3, s * 0.35, -s * 1.3, s * 0.15, -s * 1.1, s * 0.05);
      ctx.bezierCurveTo(-s * 0.95, 0, -s * 0.85, -s * 0.03, -s * 0.75, -s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Legs
    drawFoxLeg(finalPx - s * 0.12, walkCycle);
    drawFoxLeg(finalPx + s * 0.16, -walkCycle);

    // 2. Torso with white belly patch at the right edge
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.08 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseOrange;
    ctx.strokeStyle = darkDetail;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3/4 White chest
    ctx.fillStyle = lightCream;
    ctx.beginPath();
    ctx.ellipse(s * 0.15, s * 0.05, s * 0.2, s * 0.3, Math.PI * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Add Chaser chestplate:
    if (type === 'fox_chaser') {
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, 0);
      ctx.lineTo(s * 0.22, 0);
      ctx.lineTo(s * 0.16, s * 0.34);
      ctx.lineTo(0, s * 0.44);
      ctx.lineTo(-s * 0.16, s * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing power gem central slot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, s * 0.22, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Explorer Bandana
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + s * 0.1, finalCy - s * 0.12 + bodyOffsetY);
      ctx.fillStyle = bandanaGreen;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;

      // Bandana wrap
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.18, s * 0.05, Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bandana knots waving back
      ctx.rotate(Math.sin(t * 0.015) * 0.2 - 0.3);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, 0);
      ctx.lineTo(-s * 0.22, s * 0.15);
      ctx.lineTo(-s * 0.12, s * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Head in 3/4 right view
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + s * 0.15 + headOffsetX, finalCy - s * 0.35 + headOffsetY);

      // Ears (Rear ear and front ear in perspective)
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * s * 0.12 - s * 0.06, -s * 0.2);
        ctx.rotate(side * 0.12 - 0.06);
        ctx.fillStyle = baseOrange;
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, 0);
        ctx.quadraticCurveTo(-s * 0.15, -s * 0.38, 0, -s * 0.42);
        ctx.quadraticCurveTo(s * 0.15, -s * 0.38, s * 0.12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dark tip
        ctx.fillStyle = darkDetail;
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, -s * 0.25);
        ctx.quadraticCurveTo(-s * 0.08, -s * 0.38, 0, -s * 0.42);
        ctx.quadraticCurveTo(s * 0.08, -s * 0.38, s * 0.06, -s * 0.25);
        ctx.closePath();
        ctx.fill();

        // Inner Pink
        if (side === 1) { // Only front ear has visible inner pink in 3/4
          ctx.fillStyle = earPink;
          ctx.beginPath();
          ctx.moveTo(-s * 0.06, -s * 0.04);
          ctx.quadraticCurveTo(-s * 0.08, -s * 0.26, 0, -s * 0.3);
          ctx.quadraticCurveTo(s * 0.08, -s * 0.26, s * 0.06, -s * 0.04);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Cheek spike pointing left/back
      ctx.fillStyle = lightCream;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.1);
      ctx.quadraticCurveTo(-s * 0.45, s * 0.15, -s * 0.35, s * 0.26);
      ctx.quadraticCurveTo(-s * 0.15, s * 0.22, -s * 0.08, s * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main head dome
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Add Chaser headband armor:
      if (type === 'fox_chaser') {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.38, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Little forehead central spike
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(-2.5, -s * 0.38);
        ctx.lineTo(0, -s * 0.65);
        ctx.lineTo(2.5, -s * 0.38);
        ctx.closePath();
        ctx.fill();
      }

      // White cheek on right face
      ctx.fillStyle = lightCream;
      ctx.beginPath();
      ctx.ellipse(s * 0.16, s * 0.14, s * 0.18, s * 0.16, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Profile eye
      const drawProfileEye = (ex: number, ey: number) => {
        const isZombie = type === 'fox_zombie' || type === 'fox_zombie_spawn';
        if (plantingAnimTimer > 0) {
          ctx.strokeStyle = darkDetail;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.06, Math.PI, 0, false);
          ctx.stroke();
        } else if (isShocked) {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = lightCream;
          ctx.beginPath();
          ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.04, 0, Math.PI * 2);
          ctx.fill();
        } else if (isZombie) {
          // Glowing red zombie eye in profile
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.08, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a'; // yellow glint
          ctx.beginPath();
          ctx.arc(ex - s * 0.015, ey - s * 0.015, s * 0.02, 0, Math.PI * 2);
          ctx.fill();

          // Angry eyebrow pointing down-right
          ctx.strokeStyle = darkDetail;
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex + s * 0.1, ey - s * 0.08);
          ctx.lineTo(ex - s * 0.08, ey - s * 0.05);
          ctx.stroke();
        } else {
          // Predator/Wild sly fox eye (cunning vertical slit)
          ctx.fillStyle = baseOrange;
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.08, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = darkDetail;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Vertical slit/rasgada pupil
          ctx.fillStyle = darkDetail;
          ctx.beginPath();
          ctx.ellipse(ex, ey, s * 0.02, s * 0.07, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glint
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.018, ey - s * 0.018, s * 0.022, 0, Math.PI * 2);
          ctx.fill();

          // Eyebrow pointing down-right (determined)
          ctx.strokeStyle = darkDetail;
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex + s * 0.1, ey - s * 0.12);
          ctx.lineTo(ex - s * 0.08, ey - s * 0.08);
          ctx.stroke();
        }
      };

      drawProfileEye(s * 0.08, -s * 0.02);

      // Fox snout pointing right (elongated for canine/wild predator profile)
      ctx.fillStyle = baseOrange;
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.02);
      ctx.lineTo(s * 0.58, s * 0.12); // elongated snout tip
      ctx.lineTo(s * 0.22, s * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Black nose tip
      ctx.fillStyle = darkDetail;
      ctx.beginPath();
      ctx.arc(s * 0.58, s * 0.12, s * 0.045, 0, Math.PI * 2);
      ctx.fill();

      if (extra?.isHowling) {
        // Howling mouth (wide open circle)
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(s * 0.32, s * 0.18, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Mouth line (smirk) on the profile snout
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s * 0.2, s * 0.14);
        ctx.quadraticCurveTo(s * 0.3, s * 0.18, s * 0.38, s * 0.16);
        ctx.stroke();

        // White fang (colmillo) sticking out of the mouth
        ctx.fillStyle = lightCream;
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s * 0.32, s * 0.16);
        ctx.lineTo(s * 0.35, s * 0.23); // tip of tooth
        ctx.lineTo(s * 0.37, s * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Blush
      if (!isShocked) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.6)';
        ctx.beginPath();
        ctx.arc(-s * 0.05, s * 0.12, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  ctx.restore();
};
