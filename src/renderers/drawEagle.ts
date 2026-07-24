/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position } from '../types';
import { TILE } from '../constants';

/**
 * High-fidelity vector renderer for Aquila the Eagle.
 * Implements 4-directional facing, stylized proportions (large head, compact feathered body),
 * interactive gameplay expressions, impact squash-stretch, and personality micro-details.
 */
export const drawEagle = (
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
  extra?: { isStunned?: boolean; isDiving?: boolean; stunTimer?: number; isOverBush?: boolean }
) => {
  const isGolden = goldenBroccoliTimer > 0;
  ctx.save();

  let animScale = 1.0;
  let bodyOffsetY = 0;
  let headOffsetX = 0;
  let headOffsetY = 0;
  let wingScaleX = 1.0;
  let wingRotation = 0;

  if (extra?.isOverBush) {
    bodyOffsetY -= 12;
  }

  // Active state flags
  let isShocked = false;
  let isTuckedDeath = false;
  let tuckProgress = 0;
  let deathFallY = 0;
  let deathJumpY = 0;
  let deathOpacity = 1.0;
  let shellRotation = 0; // for spinning in break/death modes
  let limbsScale = 1.0;

  const flapCycle = Math.sin(t * 0.02 + frame);
  const flapAmplitude = 0.25;
  const bob = extra?.isStunned ? 0 : flapCycle * 2.5;
  let cy = py + bob;

  const wingScale = 1.0 - (extra?.isStunned ? 0 : flapCycle * 0.15);

  // 1. Death Animation Timeline
  if (deathAnimTimer > 0) {
    if (deathAnimTimer >= 2450) {
      isShocked = true;
      const tNorm = (3000 - deathAnimTimer) / 550;
      deathJumpY = -TILE * 0.95 * Math.sin(tNorm * Math.PI);
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
      shellRotation = progress * Math.PI * 4; // rolls backward!
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

  // 2. Breaking Tiles / Spinning Dash Animation Timeline
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
      shellRotation = (517 - breakingAnimTimer) * 0.05; // Fast spin!
      animScale = 1.1;
    } else {
      const progress = breakingAnimTimer / 276;
      animScale = 0.85 + (1 - progress) * 0.15;
    }
  }

  // 3. Planting / Stomp Impact Squash Timeline
  if (plantingAnimTimer > 0) {
    if (plantingAnimTimer >= 517) {
      bodyOffsetY = TILE * 0.08;
      headOffsetY = TILE * 0.06;
      animScale = 0.9;
    } else if (plantingAnimTimer >= 172) {
      if (plantingAnimTimer >= 344) {
        bodyOffsetY = -TILE * 0.25;
        headOffsetY = -TILE * 0.1;
      } else {
        bodyOffsetY = TILE * 0.15;
        headOffsetY = TILE * 0.04;
        if (plantingAnimTimer <= 336 && plantingAnimTimer > 318) {
          animScale = 0.8; // Heavy Squash!
        }
      }
    } else {
      const progress = plantingAnimTimer / 172;
      headOffsetX = Math.sin(t * 0.3) * 4 * progress;
    }
  }

  const s = TILE * 0.58 * animScale;
  const finalPx = px;
  const finalCy = cy;

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(finalPx, py + s * 0.58, s * 0.65, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color Palettes (3-Tone System: Base, Interior/Belly, Highlights/Outline)
  const baseFeathers = isGolden ? '#f59e0b' : '#5c3d2e'; // Rich eagle brown / Golden yellow
  const bellyFeathers = isGolden ? '#fef08a' : '#ece0d1'; // Light cream / Yellow cream
  const beakYellow = isGolden ? '#facc15' : '#fbbf24'; // Warm amber yellow
  const accentRed = '#ef4444'; // Cozy crimson pilot scarf
  const featherOutline = isGolden ? '#78350f' : '#2d1a12';
  const shadowColor = isGolden ? '#d97706' : '#3d251a';

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



  const walkCycle = playerIsMoving ? Math.sin(t * 0.015) * 0.22 : 0;

  // Draw Talons (large stylized accessories, not biological real claws)
  const drawClaw = (cx: number, cyOff: number, walkOff: number) => {
    if (isTuckedDeath || limbsScale === 0) return;
    ctx.save();
    ctx.translate(cx, finalCy + s * 0.45 + bodyOffsetY + walkOff * s * 0.2);
    ctx.fillStyle = beakYellow;
    ctx.strokeStyle = featherOutline;
    ctx.lineWidth = 1.8;

    // Draw three chunky curved fingers
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, 0);
    ctx.quadraticCurveTo(-s * 0.16, s * 0.15, -s * 0.08, s * 0.2);
    ctx.quadraticCurveTo(-s * 0.02, s * 0.1, 0, 0);

    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0, s * 0.18, s * 0.04, s * 0.22);
    ctx.quadraticCurveTo(s * 0.08, s * 0.1, s * 0.06, 0);

    ctx.moveTo(s * 0.06, 0);
    ctx.quadraticCurveTo(s * 0.16, s * 0.15, s * 0.14, s * 0.18);
    ctx.quadraticCurveTo(s * 0.08, s * 0.05, s * 0.1, -s * 0.02);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // 4. RENDERING ACCORDING TO FACING DIRECTION

  // A. FACING UP (DE ESPALDAS) - Back of body, feathers, wings folded behind
  if (facing === 'up') {
    // 1. Draw Tail Feathers (pointing down/back)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx, finalCy + s * 0.3 + bodyOffsetY);
      ctx.fillStyle = shadowColor;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, 0);
      ctx.lineTo(-s * 0.25, s * 0.35);
      ctx.lineTo(0, s * 0.42);
      ctx.lineTo(s * 0.25, s * 0.35);
      ctx.lineTo(s * 0.15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Back Torso (completely feather texture, no belly cream)
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.05 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseFeathers;
    ctx.strokeStyle = featherOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.45, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Feather layered textures
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 2.0;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * s * 0.15, -s * 0.1, s * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(i * s * 0.15, s * 0.1, s * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Claws behind body
    drawClaw(finalPx - s * 0.16, 0, walkCycle);
    drawClaw(finalPx + s * 0.16, 0, -walkCycle);

    // 4. Pilot Scarf Tails waving behind
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx - s * 0.15, finalCy - s * 0.2 + bodyOffsetY);
      ctx.rotate(Math.sin(t * 0.01) * 0.2 - 0.2);
      ctx.fillStyle = accentRed;
      ctx.fillRect(0, 0, -s * 0.35, s * 0.1);
      ctx.restore();
    }

    // 5. Back of Head (large rounded dome, white/brown depending on style)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.38 + headOffsetY);
      ctx.fillStyle = bellyFeathers; // Eagle crest is white!
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sharp Crest Feathers sticking up at back
      ctx.fillStyle = bellyFeathers;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.35);
      ctx.lineTo(0, -s * 0.58);
      ctx.lineTo(s * 0.2, -s * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // B. FACING DOWN (HACIA CÁMARA) - Symmetrical face, big beak centered, cute scarf
  else if (facing === 'down') {
    // 1. Draw Tail feathers
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx, finalCy + s * 0.25 + bodyOffsetY);
      ctx.fillStyle = shadowColor;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, 0);
      ctx.quadraticCurveTo(-s * 0.15, s * 0.25, 0, s * 0.35);
      ctx.quadraticCurveTo(s * 0.15, s * 0.25, s * 0.1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Left claw & Right claw
    drawClaw(finalPx - s * 0.18, 0, walkCycle);
    drawClaw(finalPx + s * 0.18, 0, -walkCycle);

    // 2. Torso with puffy chest feathers
    ctx.save();
    ctx.translate(finalPx, finalCy + s * 0.08 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseFeathers;
    ctx.strokeStyle = featherOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44, s * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Symmetrical Belly Feather Plaque (U-shaped)
    ctx.fillStyle = bellyFeathers;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.1, s * 0.28, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Wings at the sides
    if (!isTuckedDeath) {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(finalPx + side * s * 0.42, finalCy + s * 0.06 + bodyOffsetY);
        ctx.scale(side * wingScale, 1.0);
        ctx.rotate(flapCycle * flapAmplitude + wingRotation);
        ctx.fillStyle = baseFeathers;
        ctx.strokeStyle = featherOutline;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.14, s * 0.36, -Math.PI * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Crimson Pilot Scarf knotted around neck
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx, finalCy - s * 0.15 + bodyOffsetY);
      ctx.fillStyle = accentRed;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.0;
      // Scarf collar band
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-s * 0.28, -s * 0.05, s * 0.56, s * 0.12, s * 0.06);
      } else {
        ctx.rect(-s * 0.28, -s * 0.05, s * 0.56, s * 0.12);
      }
      ctx.fill();
      ctx.stroke();

      // Scarf knot & tails
      ctx.beginPath();
      ctx.arc(-s * 0.08, s * 0.08, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-s * 0.08, s * 0.08);
      ctx.quadraticCurveTo(-s * 0.18, s * 0.3, -s * 0.24, s * 0.35);
      ctx.lineTo(-s * 0.1, s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 4. Head, Big Beak and Face Expressions
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + headOffsetX, finalCy - s * 0.38 + headOffsetY);
      ctx.fillStyle = bellyFeathers; // white crown feathers
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fluffy crest spikes (symmetrical)
      ctx.fillStyle = bellyFeathers;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, -s * 0.4);
      ctx.quadraticCurveTo(0, -s * 0.58, 0, -s * 0.52);
      ctx.quadraticCurveTo(s * 0.15, -s * 0.4, 0, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eyes
      const drawEye = (ex: number, ey: number, lookLeft: boolean) => {
        const eyeRad = s * 0.085;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ex, ey, eyeRad, 0, Math.PI * 2);
        ctx.fill();

        // White reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - eyeRad * 0.3, ey - eyeRad * 0.3, eyeRad * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Determined eyebrows
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        if (lookLeft) {
          ctx.moveTo(ex - eyeRad * 1.3, ey - eyeRad * 1.4);
          ctx.lineTo(ex + eyeRad * 0.7, ey - eyeRad * 0.9);
        } else {
          ctx.moveTo(ex + eyeRad * 1.3, ey - eyeRad * 1.4);
          ctx.lineTo(ex - eyeRad * 0.7, ey - eyeRad * 0.9);
        }
        ctx.stroke();
      };

      // Planting/Active eyes
      if (plantingAnimTimer > 0) {
        // Starry eyes or closed effort eyes
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-s * 0.14, -s * 0.03, s * 0.08, Math.PI, 0, true);
        ctx.moveTo(s * 0.14, -s * 0.03);
        ctx.arc(s * 0.14, -s * 0.03, s * 0.08, Math.PI, 0, true);
        ctx.stroke();
      } else if (extra?.isStunned) {
        // Draw dizzy crosses for eyes
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        // Left eye cross
        ctx.beginPath();
        ctx.moveTo(-s * 0.20, -s * 0.08);
        ctx.lineTo(-s * 0.08, s * 0.02);
        ctx.moveTo(-s * 0.08, -s * 0.08);
        ctx.lineTo(-s * 0.20, s * 0.02);
        // Right eye cross
        ctx.moveTo(s * 0.08, -s * 0.08);
        ctx.lineTo(s * 0.20, s * 0.02);
        ctx.moveTo(s * 0.20, -s * 0.08);
        ctx.lineTo(s * 0.08, s * 0.02);
        ctx.stroke();
      } else if (isShocked) {
        // Big shock eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-s * 0.15, -s * 0.02, s * 0.12, 0, Math.PI * 2);
        ctx.arc(s * 0.15, -s * 0.02, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-s * 0.17, -s * 0.04, s * 0.04, 0, Math.PI * 2);
        ctx.arc(s * 0.13, -s * 0.04, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal eyes
        drawEye(-s * 0.14, -s * 0.03, true);
        drawEye(s * 0.14, -s * 0.03, false);
      }

      // 5. Giant stylized yellow Eagle Beak (centered pointing down)
      ctx.fillStyle = beakYellow;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.13, -s * 0.04);
      ctx.lineTo(s * 0.13, -s * 0.04);
      ctx.quadraticCurveTo(s * 0.15, s * 0.16, 0, s * 0.28); // hook down
      ctx.quadraticCurveTo(-s * 0.15, s * 0.16, -s * 0.13, -s * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cheek blush
      if (!isShocked) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.6)';
        ctx.beginPath();
        ctx.ellipse(-s * 0.25, s * 0.1, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
        ctx.ellipse(s * 0.25, s * 0.1, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // C. PROFILE OR 3/4 (DEFAULT FACING - RIGHT / LEFT)
  else {
    // 1. Draw Tail (pointing back/left)
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx - s * 0.35, finalCy + s * 0.24 + bodyOffsetY);
      ctx.fillStyle = shadowColor;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.3, s * 0.05, -s * 0.25, s * 0.3);
      ctx.lineTo(-s * 0.05, s * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Talons
    drawClaw(finalPx - s * 0.12, 0, walkCycle);
    drawClaw(finalPx + s * 0.15, 0, -walkCycle);

    // 2. Torso and Cream/Tan Chest feathers (pushed left/right in 3-4 view)
    ctx.save();
    ctx.translate(finalPx - s * 0.05, finalCy + s * 0.08 + bodyOffsetY);
    ctx.rotate(shellRotation);
    ctx.fillStyle = baseFeathers;
    ctx.strokeStyle = featherOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44, s * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3/4 Chest Plate
    ctx.fillStyle = bellyFeathers;
    ctx.beginPath();
    ctx.ellipse(s * 0.12, s * 0.05, s * 0.26, s * 0.35, Math.PI * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Scarf waving in profile
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + s * 0.05, finalCy - s * 0.16 + bodyOffsetY);
      ctx.fillStyle = accentRed;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.0;
      // Collar
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.22, s * 0.06, Math.PI * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Knot tail waving back
      ctx.rotate(Math.sin(t * 0.015) * 0.15 - 0.2);
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, 0);
      ctx.quadraticCurveTo(-s * 0.32, s * 0.12, -s * 0.4, s * 0.2);
      ctx.lineTo(-s * 0.25, s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Wings
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx - s * 0.18, finalCy + s * 0.06 + bodyOffsetY);
      ctx.scale(wingScale, 1.0);
      ctx.rotate(flapCycle * 0.8 * flapAmplitude - 0.1 + wingRotation);
      ctx.fillStyle = baseFeathers;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.15, s * 0.36, -Math.PI * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Neck
    if (!isTuckedDeath) {
      ctx.save();
      ctx.translate(finalPx + s * 0.12 + headOffsetX, finalCy - s * 0.20 + headOffsetY);
      ctx.fillStyle = bellyFeathers;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.16, s * 0.2, -Math.PI * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 4. Head and Beak facing right (mirrored for left)
    if (!isTuckedDeath) {
      const hx = finalPx + s * 0.16 + headOffsetX;
      const hy = finalCy - s * 0.38 + headOffsetY;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.fillStyle = bellyFeathers; // white crown feathers
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sharp crest feathers pointing backward (to the left)
      ctx.fillStyle = bellyFeathers;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, -s * 0.4);
      ctx.quadraticCurveTo(-s * 0.45, -s * 0.3, -s * 0.42, -s * 0.1);
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, -s * 0.15, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Single eye in profile
      const drawProfileEye = (ex: number, ey: number) => {
        const r = s * 0.09;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - r * 0.25, ey - r * 0.25, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Aggressive sharp eyebrow
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ex - r * 1.5, ey - r * 1.4);
        ctx.lineTo(ex + r * 1.2, ey - r * 0.6);
        ctx.stroke();
      };

      if (plantingAnimTimer > 0) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(s * 0.08, -s * 0.03, s * 0.08, Math.PI, 0, true);
        ctx.stroke();
      } else if (extra?.isStunned) {
        // Draw single cross for eye in profile
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(s * 0.02, -s * 0.08);
        ctx.lineTo(s * 0.14, s * 0.02);
        ctx.moveTo(s * 0.14, -s * 0.08);
        ctx.lineTo(s * 0.02, s * 0.02);
        ctx.stroke();
      } else if (isShocked) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(s * 0.08, -s * 0.03, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s * 0.05, -s * 0.05, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawProfileEye(s * 0.08, -s * 0.03);
      }

      // Beak (pointing right/hooked down)
      ctx.fillStyle = beakYellow;
      ctx.strokeStyle = featherOutline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(s * 0.24, -s * 0.05);
      ctx.lineTo(s * 0.48, s * 0.02);
      ctx.quadraticCurveTo(s * 0.52, s * 0.22, s * 0.38, s * 0.32); // beak hook curve
      ctx.quadraticCurveTo(s * 0.28, s * 0.15, s * 0.24, s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cheek blush
      if (!isShocked) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.6)';
        ctx.beginPath();
        ctx.ellipse(-s * 0.1, s * 0.12, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (extra?.isStunned) {
    ctx.save();
    // Render stars centered horizontally above the Eagle's head
    ctx.translate(finalPx, finalCy - s * 0.85 + bodyOffsetY);
    const starAngle = t * 0.005;
    ctx.fillStyle = '#fbbf24'; // Warm yellow stars
    for (let i = 0; i < 3; i++) {
      ctx.save();
      const a = starAngle + (i * Math.PI * 2) / 3;
      const sx = Math.cos(a) * s * 0.24;
      const sy = Math.sin(a) * s * 0.08; // squashed elliptical path
      ctx.translate(sx, sy);
      
      // Draw a cute 5-point star
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(
          Math.cos((j * Math.PI * 4) / 5 - Math.PI / 2) * s * 0.08,
          Math.sin((j * Math.PI * 4) / 5 - Math.PI / 2) * s * 0.08
        );
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
};
