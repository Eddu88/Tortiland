/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position } from '../types';
import { TILE } from '../constants';

/**
 * High-fidelity vector renderer for Sting the Scorpion.
 * Implements 4-directional facing, cartoon stylized proportions (round body, boxing-glove pincers,
 * overhead loop tail), gameplay expressions, impact squash-stretch, and top-hat / monocle details.
 */
export const drawScorpion = (
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
  deathAnimTimer: number = 0
) => {
  const isGolden = goldenBroccoliTimer > 0;
  ctx.save();

  let animScale = 1.0;
  let bodyOffsetY = 0;
  let headOffsetX = 0;
  let headOffsetY = 0;
  let pincerRotation = 0;

  // Active state flags
  let isShocked = false;
  let isTuckedDeath = false;
  let tuckProgress = 0;
  let deathFallY = 0;
  let deathJumpY = 0;
  let deathOpacity = 1.0;
  let shellRotation = 0; // rotation for spinning in dash/death
  let limbsScale = 1.0;

  // Scorpion has a fast scuttling bobbing
  const bob = Math.sin(t * 0.016 + frame) * 1.5;
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
      const shakeAngle = Math.sin(t * 0.3) * 0.11;
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

  // Pincer scuttling motion
  if (playerIsMoving && plantingAnimTimer === 0) {
    pincerRotation = Math.sin(t * 0.02) * 0.25;
  }

  const s = TILE * 0.58 * animScale;
  const finalPx = px;
  const finalCy = cy;

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(finalPx, py + s * 0.54, s * 0.68, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color Palette (3-Tone System)
  const baseGold = isGolden ? '#facc15' : '#d97706'; // Scorpion rich gold amber / yellow
  const lightCream = isGolden ? '#fef08a' : '#fef3c7'; // Belly light cream / soft yellow
  const outlines = isGolden ? '#78350f' : '#451a03'; // Border dark brown
  const stingerCol = '#b91c1c'; // Venom red bulb

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

  const walkCycle = playerIsMoving ? Math.sin(t * 0.025) * 0.25 : 0;

  // Draw Segmented Stinger Tail (coils overhead like a big cartoon loop)
  const drawStingerTail = (tx: number, ty: number, rotate: number, pointDown: boolean) => {
    if (isTuckedDeath) return;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rotate + (playerIsMoving ? Math.sin(t * 0.06) * 0.12 : Math.sin(t * 0.02) * 0.03));
    ctx.fillStyle = baseGold;
    ctx.strokeStyle = outlines;
    ctx.lineWidth = 2.0;

    // Draw 4 circular/oval segments looping overhead
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const segSize = s * (0.16 - i * 0.025);
      const angle = (i / segs) * Math.PI * 0.85;
      const lx = Math.cos(angle - Math.PI * 0.4) * s * 0.42;
      const ly = Math.sin(angle - Math.PI * 0.4) * s * 0.42 - s * 0.22;

      ctx.beginPath();
      ctx.arc(lx, ly, segSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw the poison stinger bulb at the very tip of the loop
      if (i === segs - 1) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(pointDown ? Math.PI * 0.4 : -Math.PI * 0.25);
        ctx.fillStyle = stingerCol;
        ctx.beginPath();
        // Bulb bulbous teardrop shape
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s * 0.24); // sharp tip
        ctx.quadraticCurveTo(s * 0.12, -s * 0.12, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // Draw Pincers (boxing gloves / pincers)
  const drawBoxingPincer = (lx: number, lyOff: number, angleOff: number, side: number) => {
    if (isTuckedDeath || limbsScale === 0) return;
    ctx.save();
    ctx.translate(lx, finalCy + s * 0.2 + bodyOffsetY + lyOff);
    ctx.rotate(angleOff);
    ctx.fillStyle = baseGold;
    ctx.strokeStyle = outlines;
    ctx.lineWidth = 2.0;

    // Thin joint leg segment
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-side * s * 0.15, s * 0.1, -side * s * 0.2, s * 0.02);
    ctx.stroke();

    // Large circular Boxing Pincer bulb
    ctx.translate(-side * s * 0.22, s * 0.02);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Separate pincer claw claw-jaw
    ctx.fillStyle = stingerCol; // boxing glove glove glove
    ctx.beginPath();
    ctx.arc(-side * s * 0.08, -s * 0.06, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Micro-detail: Gentleman Micro-Details (Top hat & monocle)
  const drawGentlemanDetail = (eyX: number, eyY: number) => {
    if (isTuckedDeath) return;
    ctx.save();

    // 1. Sleek black top hat
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = outlines;
    ctx.lineWidth = 1.8;

    // Hat brim
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-s * 0.26, -s * 0.44, s * 0.52, s * 0.05, s * 0.02);
    } else {
      ctx.rect(-s * 0.26, -s * 0.44, s * 0.52, s * 0.05);
    }
    ctx.fill();
    ctx.stroke();

    // Hat dome cylinder
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, -s * 0.44);
    ctx.lineTo(-s * 0.18, -s * 0.72);
    ctx.lineTo(s * 0.18, -s * 0.72);
    ctx.lineTo(s * 0.18, -s * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red hat band ribbon
    ctx.fillStyle = stingerCol;
    ctx.fillRect(-s * 0.17, -s * 0.49, s * 0.34, s * 0.05);

    // 2. Gentleman Monocle over the right eye
    ctx.strokeStyle = '#facc15'; // Golden monocle rim
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(eyX, eyY, s * 0.10, 0, Math.PI * 2);
    ctx.stroke();

    // Monocle gold chain dangling down
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(eyX + s * 0.08, eyY + s * 0.06);
    ctx.quadraticCurveTo(eyX + s * 0.2, eyY + s * 0.3, eyX + s * 0.12, eyY + s * 0.34);
    ctx.stroke();

    ctx.restore();
  };

  // 4. RENDERING ACCORDING TO FACING DIRECTION

  // A. FACING UP (DE ESPALDAS)
  if (facing === 'up') {
    // 1. Loop stinger tail centered in back
    drawStingerTail(finalPx + headOffsetX, finalCy + s * 0.1 + bodyOffsetY, 0, true);

    // 2. Torso
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.12 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseGold;
    ctx.strokeStyle = outlines;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Pincers extended wide
    drawBoxingPincer(finalPx - s * 0.4, s * 0.05, -0.4 + pincerRotation, 1);
    drawBoxingPincer(finalPx + s * 0.4, s * 0.05, 0.4 - pincerRotation, -1);

    // 3. Head (plain back of head with hat brim visible)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.26 + headOffsetY);
      ctx.fillStyle = baseGold;
      ctx.strokeStyle = outlines;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top hat
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = outlines;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-s * 0.26, -s * 0.44, s * 0.52, s * 0.05, s * 0.02);
      } else {
        ctx.rect(-s * 0.26, -s * 0.44, s * 0.52, s * 0.05);
      }
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-s * 0.18, -s * 0.44);
      ctx.lineTo(-s * 0.18, -s * 0.72);
      ctx.lineTo(s * 0.18, -s * 0.72);
      ctx.lineTo(s * 0.18, -s * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = stingerCol;
      ctx.fillRect(-s * 0.17, -s * 0.49, s * 0.34, s * 0.05);

      ctx.restore();
    }
  }

  // B. FACING DOWN (HACIA CÁMARA)
  else if (facing === 'down') {
    // 1. Cola arqueada por detrás del hombro (no centrada sobre la cara)
    //    - origen desplazado a un costado (antes finalPx, centrado, causaba que
    //      el aguijón cruzara justo sobre el sombrero)
    //    - pointDown en false para que el aguijón no se curve hacia la cara
    drawStingerTail(finalPx - s * 0.3 + headOffsetX, finalCy - s * 0.1 + headOffsetY, -Math.PI * 0.35, false);

    // 2. Torso & Belly
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.12 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseGold;
    ctx.strokeStyle = outlines;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cream Belly Plate
    ctx.fillStyle = lightCream;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.3, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Symmetrical Boxing Pincers extended wide
    drawBoxingPincer(finalPx - s * 0.44, s * 0.04, -0.1 + pincerRotation, 1);
    drawBoxingPincer(finalPx + s * 0.44, s * 0.04, 0.1 - pincerRotation, -1);

    // 3. Round Head & Face
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.26 + headOffsetY);
      ctx.fillStyle = baseGold;
      ctx.strokeStyle = outlines;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Giant round bug eyes
      const drawBugEye = (ex: number, ey: number, hasMonocle: boolean) => {
        if (plantingAnimTimer > 0) {
          // Closed happy eye arcs
          ctx.strokeStyle = outlines;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.06, 0, Math.PI, true);
          ctx.stroke();
        } else if (isShocked) {
          // Shocked "X-X" or teary eyes
          ctx.strokeStyle = outlines;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ex - s * 0.06, ey - s * 0.06);
          ctx.lineTo(ex + s * 0.06, ey + s * 0.06);
          ctx.moveTo(ex + s * 0.06, ey - s * 0.06);
          ctx.lineTo(ex - s * 0.06, ey + s * 0.06);
          ctx.stroke();
        } else {
          // Large black round bug eyes with shiny double glints
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.08, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.03, 0, Math.PI * 2);
          ctx.arc(ex + s * 0.02, ey + s * 0.02, s * 0.015, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      drawBugEye(-s * 0.14, -s * 0.02, false);
      drawBugEye(s * 0.14, -s * 0.02, true);

      // Cheek blush
      if (!isShocked) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
        ctx.beginPath();
        ctx.ellipse(-s * 0.22, s * 0.1, s * 0.06, s * 0.04, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.22, s * 0.1, s * 0.06, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth with tiny cute fangs
      ctx.strokeStyle = outlines;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      if (isShocked) {
        ctx.fillStyle = outlines;
        ctx.arc(0, s * 0.12, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Happy smiling mouth
        ctx.arc(0, s * 0.05, s * 0.08, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();

        // Draw small white fangs at the corners
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, s * 0.11);
        ctx.lineTo(-s * 0.08, s * 0.16);
        ctx.lineTo(-s * 0.03, s * 0.12);
        ctx.closePath();
        ctx.moveTo(s * 0.06, s * 0.11);
        ctx.lineTo(s * 0.08, s * 0.16);
        ctx.lineTo(s * 0.03, s * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Draw Gentleman Micro-details (Top hat & monocle)
      drawGentlemanDetail(s * 0.14, -s * 0.02);

      ctx.restore();
    }
  }

  // C. PROFILE OR 3/4 (DEFAULT FACING - RIGHT / LEFT)
  else {
    // 1. Stinger tail loop leaning back (left)
    drawStingerTail(finalPx - s * 0.15, finalCy + s * 0.1 + bodyOffsetY, -Math.PI * 0.1, false);

    // 2. Torso
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.12 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseGold;
    ctx.strokeStyle = outlines;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3/4 Belly plate (pushed right)
    ctx.fillStyle = lightCream;
    ctx.beginPath();
    ctx.ellipse(s * 0.12, s * 0.05, s * 0.25, s * 0.26, Math.PI * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Pincers: Front (Right) is prominent, back (Left) is behind
    drawBoxingPincer(finalPx - s * 0.32, s * 0.02, -0.35 + pincerRotation, 1); // back
    drawBoxingPincer(finalPx + s * 0.42, s * 0.04, 0.1 - pincerRotation, -1); // front

    // 2.5 Neck segment (like Torti) to separate head from torso visually
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + s * 0.06 + headOffsetX, finalCy - s * 0.08 + headOffsetY);
      ctx.fillStyle = baseGold;
      ctx.strokeStyle = outlines;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.14, s * 0.22, -Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Head in profile
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + s * 0.12 + headOffsetX, finalCy - s * 0.24 + headOffsetY);
      ctx.fillStyle = baseGold;
      ctx.strokeStyle = outlines;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Single visible eye on the right side
      const draw34Eye = (ex: number, ey: number) => {
        if (plantingAnimTimer > 0) {
          ctx.strokeStyle = outlines;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.06, 0, Math.PI, true);
          ctx.stroke();
        } else if (isShocked) {
          ctx.strokeStyle = outlines;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ex - s * 0.05, ey - s * 0.05);
          ctx.lineTo(ex + s * 0.05, ey + s * 0.05);
          ctx.moveTo(ex + s * 0.05, ey - s * 0.05);
          ctx.lineTo(ex - s * 0.05, ey + s * 0.05);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, s * 0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.03, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      draw34Eye(s * 0.08, -s * 0.02);

      // Smiling mouth & single fang
      ctx.strokeStyle = outlines;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      if (isShocked) {
        ctx.fillStyle = outlines;
        ctx.arc(s * 0.02, s * 0.12, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.arc(s * 0.02, s * 0.06, s * 0.08, 0.1 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(s * 0.06, s * 0.12);
        ctx.lineTo(s * 0.08, s * 0.17);
        ctx.lineTo(s * 0.03, s * 0.13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Top hat & monocle
      drawGentlemanDetail(s * 0.08, -s * 0.02);

      ctx.restore();
    }
  }

  ctx.restore();
};
