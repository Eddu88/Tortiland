/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position, EnemyType } from '../types';
import { TILE } from '../constants';

/**
 * High-fidelity vector renderer for Slinky the Snake.
 * Implements 4-directional facing, stylized proportions (massive head, coiled spring base,
 * graphic cobra hood), gameplay expressions, springy squash-stretch, and royal crown/rattle details.
 */
export const drawSnake = (
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
  extra?: { isBurrowed?: boolean }
) => {
  if (extra?.isBurrowed) {
    return;
  }
  const isGolden = goldenBroccoliTimer > 0;
  ctx.save();

  let animScale = 1.0;
  let bodyOffsetY = 0;
  let headOffsetX = 0;
  let headOffsetY = 0;
  let springStretchY = 1.0; // Springy coil stretch

  // Active state flags
  let isShocked = false;
  let isTuckedDeath = false;
  let tuckProgress = 0;
  let deathFallY = 0;
  let deathJumpY = 0;
  let deathOpacity = 1.0;
  let shellRotation = 0;
  let limbsScale = 1.0;

  // Snake has a fast springy bobbing
  const bob = Math.sin(t * 0.012 + frame) * 2.2;
  let cy = py + bob;

  // 1. Death Animation
  if (deathAnimTimer > 0) {
    if (deathAnimTimer >= 2450) {
      isShocked = true;
      const tNorm = (3000 - deathAnimTimer) / 550;
      deathJumpY = -TILE * 1.0 * Math.sin(tNorm * Math.PI);
    } else if (deathAnimTimer >= 1850) {
      isShocked = true;
      tuckProgress = (2450 - deathAnimTimer) / 600;
      isTuckedDeath = tuckProgress >= 0.5;
      const shakeAngle = Math.sin(t * 0.35) * 0.12;
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

  // 2. Breaking Tiles / Spinning Dash (Spins like a circular spiral)
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
      shellRotation = (517 - breakingAnimTimer) * 0.052; // Fast spin!
      animScale = 1.15;
    } else {
      const progress = breakingAnimTimer / 276;
      animScale = 0.85 + (1 - progress) * 0.15;
    }
  }

  // 3. Planting / Stomp Impact (Snake compresses like a real spring!)
  if (plantingAnimTimer > 0) {
    if (plantingAnimTimer >= 517) {
      bodyOffsetY = TILE * 0.1;
      headOffsetY = TILE * 0.08;
      springStretchY = 0.65; // Highly compressed!
      animScale = 0.95;
    } else if (plantingAnimTimer >= 172) {
      if (plantingAnimTimer >= 344) {
        bodyOffsetY = -TILE * 0.3;
        headOffsetY = -TILE * 0.15;
        springStretchY = 1.45; // Super springy stretch in the air!
      } else {
        bodyOffsetY = TILE * 0.15;
        headOffsetY = TILE * 0.04;
        if (plantingAnimTimer <= 336 && plantingAnimTimer > 318) {
          animScale = 0.75; // squash down!
          springStretchY = 0.5;
        }
      }
    } else {
      const progress = plantingAnimTimer / 172;
      headOffsetX = Math.sin(t * 0.3) * 3 * progress;
    }
  }

  // Walk spring bobbing
  if (playerIsMoving && plantingAnimTimer === 0) {
    springStretchY = 1.0 + Math.sin(t * 0.02) * 0.15;
  }

  const s = TILE * 0.58 * animScale;
  const finalPx = px;
  const finalCy = cy;

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(finalPx, py + s * 0.56, s * 0.58, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color Palette (3-Tone Emerald Green & Cream Yellow System)
  let baseGreen = isGolden ? '#facc15' : '#10b981'; // Emerald Green / Gold Yellow
  let creamBelly = isGolden ? '#fffbeb' : '#f0fdf4'; // Light yellow / Mint white
  let darkOutline = isGolden ? '#78350f' : '#064e3b'; // Deep emerald green / Dark brown
  const crownColor = '#fbbf24'; // Golden crown
  const tongueRed = '#ef4444'; // Forked red tongue



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

  // Draw Coiled Spring Body (represented as a single elegant coiled body that winds/tapers, avoiding any "patas" look)
  const drawCoiledBody = (cx: number, cyOff: number, stretch: number) => {
    ctx.save();
    ctx.translate(cx, finalCy + s * 0.18 + bodyOffsetY + cyOff);
    ctx.scale(1.0, stretch);
    ctx.fillStyle = baseGreen;
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 2.2;

    // Una sola cola/cuerpo: nace ancha bajo la cabeza, se curva a un costado
    // y se afina en punta — silueta de serpiente, sin aros ni patas
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.15);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.05, -s * 0.42, s * 0.28);
    ctx.quadraticCurveTo(-s * 0.3, s * 0.42, -s * 0.05, s * 0.4);
    ctx.quadraticCurveTo(s * 0.05, s * 0.3, s * 0.28, s * 0.12);
    ctx.quadraticCurveTo(s * 0.15, -s * 0.05, s * 0.3, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Franja de vientre clara siguiendo la misma curva, más angosta
    ctx.fillStyle = creamBelly;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.08);
    ctx.quadraticCurveTo(-s * 0.38, s * 0.06, -s * 0.28, s * 0.24);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.32, s * 0.05, s * 0.28);
    ctx.quadraticCurveTo(s * 0.14, s * 0.14, s * 0.2, s * 0.02);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Draw a simple, elegant tapering snake tail that curves/tapers nicely (matches Slinky's cobra identity)
  const drawSnakeTail = (tx: number, ty: number, rotate: number) => {
    if (isTuckedDeath) return;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rotate + (playerIsMoving ? Math.sin(t * 0.15) * 0.22 : Math.sin(t * 0.05) * 0.05));
    ctx.fillStyle = baseGreen;
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 2.2;

    // Simple curved tail shape tapering to a tip
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.06);
    ctx.bezierCurveTo(-s * 0.15, -s * 0.08, -s * 0.3, s * 0.08, -s * 0.45, s * 0.05); // upper boundary dragging down-left
    ctx.bezierCurveTo(-s * 0.52, s * 0.03, -s * 0.45, s * 0.18, -s * 0.38, s * 0.14); // tip point
    ctx.bezierCurveTo(-s * 0.2, s * 0.08, -s * 0.1, s * 0.08, 0, s * 0.06); // lower boundary
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cream Belly accent highlight on the tip
    ctx.fillStyle = creamBelly;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.08);
    ctx.bezierCurveTo(-s * 0.38, s * 0.08, -s * 0.45, s * 0.05, -s * 0.45, s * 0.05);
    ctx.bezierCurveTo(-s * 0.42, s * 0.12, -s * 0.35, s * 0.1, -s * 0.3, s * 0.08);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Micro-detail: Golden Royal Crown
  const drawCrownOnHead = () => {
    if (isTuckedDeath) return;
    ctx.save();
    ctx.translate(-s * 0.05, -s * 0.42);
    ctx.rotate(0.12);
    ctx.fillStyle = crownColor;
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 1.8;

    // Little 3-point crown
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, 0);
    ctx.lineTo(-s * 0.18, -s * 0.15);
    ctx.lineTo(-s * 0.06, -s * 0.06);
    ctx.lineTo(0, -s * 0.22); // center high point
    ctx.lineTo(s * 0.06, -s * 0.06);
    ctx.lineTo(s * 0.18, -s * 0.15);
    ctx.lineTo(s * 0.15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Little jewel dots
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -s * 0.22, s * 0.025, 0, Math.PI * 2);
    ctx.arc(-s * 0.18, -s * 0.15, s * 0.02, 0, Math.PI * 2);
    ctx.arc(s * 0.18, -s * 0.15, s * 0.02, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // 4. RENDERING ACCORDING TO FACING DIRECTION

  // A. FACING UP (DE ESPALDAS)
  if (facing === 'up') {
    // 1. Large coiled body below
    drawCoiledBody(finalPx, s * 0.02, springStretchY);

    // Snake tail showing at side
    drawSnakeTail(finalPx - s * 0.35, finalCy + s * 0.22 + bodyOffsetY, -0.6);

    // 2. Back of massive cobra hood (shows abstract warning markings)
    ctx.save();
    ctx.translate(finalPx, finalCy - s * 0.1 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseGreen;
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 2.2;

    // Huge flat wing-like cobra hood
    ctx.beginPath();
    ctx.moveTo(-s * 0.65, -s * 0.22);
    ctx.quadraticCurveTo(-s * 0.72, s * 0.1, -s * 0.18, s * 0.38);
    ctx.lineTo(s * 0.18, s * 0.38);
    ctx.quadraticCurveTo(s * 0.72, s * 0.1, s * 0.65, -s * 0.22);
    ctx.quadraticCurveTo(0, -s * 0.42, -s * 0.65, -s * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hood back marking (abstract glasses or eyes motif)
    ctx.strokeStyle = darkOutline;
    ctx.fillStyle = creamBelly;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(-s * 0.22, s * 0.0, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.22, s * 0.0, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.02);
    ctx.quadraticCurveTo(0, s * 0.08, s * 0.1, s * 0.02);
    ctx.stroke();
    ctx.restore();

    // 3. Back of large head
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.28 + headOffsetY);
      ctx.fillStyle = baseGreen;
      ctx.strokeStyle = darkOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawCrownOnHead();
      ctx.restore();
    }
  }

  // B. FACING DOWN (HACIA CÁMARA)
  else if (facing === 'down') {
    // 1. Coiled spring base below
    drawCoiledBody(finalPx, s * 0.02, springStretchY);

    // Snake tail
    drawSnakeTail(finalPx - s * 0.35, finalCy + s * 0.25 + bodyOffsetY, -0.4);

    // 2. Giant graphic cobra hood framing head (Cream Inner/Emerald Outer)
    ctx.save();
    ctx.translate(finalPx, finalCy - s * 0.1 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseGreen;
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(-s * 0.62, -s * 0.22);
    ctx.quadraticCurveTo(-s * 0.72, s * 0.1, -s * 0.18, s * 0.38);
    ctx.lineTo(s * 0.18, s * 0.38);
    ctx.quadraticCurveTo(s * 0.72, s * 0.1, s * 0.65, -s * 0.22);
    ctx.quadraticCurveTo(0, -s * 0.42, -s * 0.65, -s * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Cream Hood Lining
    ctx.fillStyle = creamBelly;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.16);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.08, -s * 0.15, s * 0.3);
    ctx.lineTo(s * 0.15, s * 0.3);
    ctx.quadraticCurveTo(s * 0.55, s * 0.08, s * 0.5, -s * 0.16);
    ctx.quadraticCurveTo(0, -s * 0.32, -s * 0.5, -s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Large Head & Expressive Face
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.28 + headOffsetY);
      ctx.fillStyle = baseGreen;
      ctx.strokeStyle = darkOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Giant anime snake eyes
      const drawCuteSnakeEye = (ex: number, ey: number) => {
        if (plantingAnimTimer > 0) {
          // Happy closed squiggles
          ctx.strokeStyle = darkOutline;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.06, 0, Math.PI, true);
          ctx.stroke();
        } else if (isShocked) {
          // Giant shocked round pupils
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.09, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.015, ey - s * 0.015, s * 0.035, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Symmetrical giant adorable eyes
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.08, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.028, 0, Math.PI * 2);
          ctx.arc(ex + s * 0.02, ey + s * 0.02, s * 0.012, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      drawCuteSnakeEye(-s * 0.12, -s * 0.02);
      drawCuteEye(s * 0.12, -s * 0.02);

      function drawCuteEye(ex: number, ey: number) {
        drawCuteSnakeEye(ex, ey);
      }

      // Cheek blush
      if (!isShocked) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.6)';
        ctx.beginPath();
        ctx.arc(-s * 0.22, s * 0.08, s * 0.05, 0, Math.PI * 2);
        ctx.arc(s * 0.22, s * 0.08, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      // Red forked tongue (Lengua bífida)
      ctx.save();
      ctx.translate(0, s * 0.11);
      ctx.strokeStyle = tongueRed;
      ctx.fillStyle = tongueRed;
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (isShocked) {
        // Tied tongue / shocked knot
        ctx.arc(0, s * 0.05, s * 0.03, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Slinky's signature vibrating tongue
        const tongueLen = s * (playerIsMoving ? 0.18 + Math.sin(t * 0.08) * 0.05 : 0.16);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, tongueLen);
        // Fork left
        ctx.lineTo(-s * 0.06, tongueLen + s * 0.05);
        ctx.moveTo(0, tongueLen);
        // Fork right
        ctx.lineTo(s * 0.06, tongueLen + s * 0.05);
        ctx.stroke();
      }
      ctx.restore();

      // Golden royal crown
      drawCrownOnHead();

      ctx.restore();
    }
  }

  // C. PROFILE OR 3/4 (DEFAULT FACING - RIGHT / LEFT)
  else {
    // 1. Coiled body below
    drawCoiledBody(finalPx, s * 0.02, springStretchY);

    // Snake tail behind
    drawSnakeTail(finalPx - s * 0.35, finalCy + s * 0.22 + bodyOffsetY, -0.5);

    // 2. Cobra Hood in 3/4 view
    ctx.save();
    ctx.translate(finalPx, finalCy - s * 0.1 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseGreen;
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.2);
    ctx.quadraticCurveTo(-s * 0.52, s * 0.1, -s * 0.15, s * 0.35);
    ctx.lineTo(s * 0.18, s * 0.35);
    ctx.quadraticCurveTo(s * 0.65, s * 0.1, s * 0.58, -s * 0.2);
    ctx.quadraticCurveTo(0, -s * 0.35, -s * 0.45, -s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3/4 Inner lining
    ctx.fillStyle = creamBelly;
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.15);
    ctx.quadraticCurveTo(-s * 0.4, s * 0.08, -s * 0.12, s * 0.28);
    ctx.lineTo(s * 0.15, s * 0.28);
    ctx.quadraticCurveTo(s * 0.5, s * 0.08, s * 0.45, -s * 0.15);
    ctx.quadraticCurveTo(0, -s * 0.28, -s * 0.35, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Head in 3/4 view
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + s * 0.1 + headOffsetX, finalCy - s * 0.28 + headOffsetY);
      ctx.fillStyle = baseGreen;
      ctx.strokeStyle = darkOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Profile eye
      const drawProfileEye = (ex: number, ey: number) => {
        if (plantingAnimTimer > 0) {
          ctx.strokeStyle = darkOutline;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.06, 0, Math.PI, true);
          ctx.stroke();
        } else if (isShocked) {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.09, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.015, ey - s * 0.015, s * 0.03, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.028, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      drawProfileEye(s * 0.08, -s * 0.02);

      // Cheek blush
      if (!isShocked) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.6)';
        ctx.beginPath();
        ctx.arc(0, s * 0.08, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      // Red forked tongue (drawn sticking rightwards)
      ctx.save();
      ctx.translate(s * 0.12, s * 0.1);
      ctx.strokeStyle = tongueRed;
      ctx.fillStyle = tongueRed;
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (isShocked) {
        ctx.arc(s * 0.04, 0, s * 0.025, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const tongueLen = s * (playerIsMoving ? 0.15 + Math.sin(t * 0.08) * 0.04 : 0.13);
        ctx.moveTo(0, 0);
        ctx.lineTo(tongueLen, s * 0.03);
        // Fork up
        ctx.lineTo(tongueLen + s * 0.04, -s * 0.02);
        ctx.moveTo(tongueLen, s * 0.03);
        // Fork down
        ctx.lineTo(tongueLen + s * 0.04, s * 0.07);
        ctx.stroke();
      }
      ctx.restore();

      // Royal crown
      drawCrownOnHead();

      ctx.restore();
    }
  }

  ctx.restore();
};
