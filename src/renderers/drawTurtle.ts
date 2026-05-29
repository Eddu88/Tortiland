/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position } from '../types';
import { TILE } from '../constants';

export const drawGardenTurtle = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: Position,
  frame: number,
  t: number,
  isGolden: boolean,
  playerIsMoving: boolean,
  plantingAnimTimer: number = 0,
  breakingAnimTimer: number = 0,
  deathAnimTimer: number = 0
) => {
  ctx.save();

  // Scale factor: Torti is pleasantly robust, tall, and chunky.
  // Increased from 0.44 to 0.58 so Torti fills 70-80% of the tile block for higher visibility.
  let breakScale = 1.0;
  let breakOffsetX = 0;
  let breakOffsetY = 0;
  
  // Death animation properties (shock, hide, roll falling and ghost parpadeo)
  let deathJumpY = 0;
  let deathAngle = 0;
  let deathOpacity = 1.0;
  let isShocked = false;
  let isTuckedDeath = false;
  let tuckProgress = 0;
  let deathFallY = 0;

  // Shell transformations (independent of rest of Torti's body)
  let shellRotation = 0;
  let shellScaleX = 1.0;
  let shellScaleY = 1.0;

  let limbsScale = 1.0;
  let isNaked = false;
  let localOffsetX = 0;
  let localOffsetY = 0;

  const bob = Math.sin(t * 0.008 + frame) * 1.5;
  let cy = py + bob;

  if (deathAnimTimer > 0) {
    if (deathAnimTimer >= 147) {
      // Fase 1 — Shock / Surprise Jump (ticks 180-147, 34 frames)
      isShocked = true;
      const tNorm = (180 - deathAnimTimer) / 33;
      deathJumpY = -TILE * 0.9 * Math.sin(tNorm * Math.PI);
    } else if (deathAnimTimer >= 111) {
      // Fase 2 — Hide in shell & panic shake (ticks 146-111, 36 frames)
      isShocked = true;
      tuckProgress = (146 - deathAnimTimer) / 35; // smoothly tuck limbs and body
      isTuckedDeath = tuckProgress >= 0.5;
      
      const shakeAngle = Math.sin(t * 0.25) * 0.09;
      ctx.translate(px, cy);
      ctx.rotate(shakeAngle);
      ctx.translate(-px, -cy);
    } else {
      // Fase 3 — Shell falling, rolling and ghost fade out (ticks 110-1, 110 frames)
      isTuckedDeath = true;
      tuckProgress = 1.0; // fully tucked inside shell
      const progress = (110 - deathAnimTimer) / 109;
      deathFallY = progress * TILE * 0.6; // smoothly fall down Y
      shellRotation = progress * Math.PI * 4; // spin locally 2 full loops for perfect roll!
      deathOpacity = Math.max(0, 1.0 - progress);
    }
  }

  cy += deathJumpY + deathFallY;
  ctx.globalAlpha = ctx.globalAlpha * deathOpacity;

  if (breakingAnimTimer > 0) {
    if (breakingAnimTimer >= 60) {
      // Fase 1 — Ocultamiento (Ticks 72-60)
      limbsScale = 0;
      isNaked = false;
      breakScale = 0.9;
    } else if (breakingAnimTimer >= 32) {
      // Fase 2 — Lanzamiento e Impacto (Ticks 59-32)
      limbsScale = 1.0;
      isNaked = true;
      isShocked = true;

      let vueloOffset = 0;
      if (breakingAnimTimer >= 48) {
        const tVuelo = (59 - breakingAnimTimer) / 11;
        vueloOffset = tVuelo * TILE;
      } else {
        vueloOffset = TILE;
      }

      localOffsetX = Math.abs(dir.x) * vueloOffset;
      localOffsetY = dir.y * vueloOffset;

      shellRotation = (59 - breakingAnimTimer) * 0.38;

      if (breakingAnimTimer === 48 || breakingAnimTimer === 47) {
        shellScaleX = 0.8;
        shellScaleY = 1.15;
      } else {
        shellScaleX = 1.15;
        shellScaleY = 0.85;
      }
    } else if (breakingAnimTimer >= 16) {
      // Fase 3 — El Regreso (Ticks 31-16)
      limbsScale = 1.0;
      isNaked = true;
      isShocked = true;

      const tReturn = (breakingAnimTimer - 16) / 15;
      const vueloOffset = tReturn * TILE;

      localOffsetX = Math.abs(dir.x) * vueloOffset;
      localOffsetY = dir.y * vueloOffset;

      shellRotation = breakingAnimTimer * 0.18;
    } else {
      // Fase 4 — Reasentamiento (Ticks 15-1)
      limbsScale = 1.0;
      isNaked = false;
      const progress = breakingAnimTimer / 15;
      breakScale = 0.85 + (1 - progress) * 0.15;
    }
  }

  // Adjust breakScale before s calculation for stomp impact squash (ticks 39 and 38)
  if (plantingAnimTimer > 0) {
    if (plantingAnimTimer === 39 || plantingAnimTimer === 38) {
      breakScale = 0.85;
    }
  }

  const finalPx = px + breakOffsetX;
  const finalCy = cy + breakOffsetY;

  const s = TILE * 0.58 * breakScale;

  // Draw motion lines during impact frames (ticks 48 and 47 of breakingAnimTimer)
  if (breakingAnimTimer === 48 || breakingAnimTimer === 47) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const perpX = -dir.y;
    const perpY = dir.x;

    // Draw 3 wind lines along dir
    const offsets = [-12, 0, 12];
    offsets.forEach(off => {
      const startX = finalPx + perpX * off - dir.x * s * 0.2;
      const startY = finalCy + perpY * off - dir.y * s * 0.2;
      const endX = startX + dir.x * TILE * 0.9;
      const endY = startY + dir.y * TILE * 0.9;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
    ctx.restore();
  }

  const walkOffset = playerIsMoving ? Math.sin(t * 0.015) * 0.18 : 0;

  // Grounded oval shadow directly under the feet (doesn't bob)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(finalPx, py + s * 0.58, s * 0.68, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color palettes for the cute Torti
  const skinColor = isGolden ? '#ffd43b' : '#8bc34a'; // cute green skin
  const skinShadow = isGolden ? '#f59e0b' : '#689f38';
  const skinOutline = isGolden ? '#5c3e03' : '#2b4f0b';

  const shellBase = isGolden ? '#ff922b' : '#14b8a6'; // turquoise/teal shell
  const shellOutline = isGolden ? '#b53f00' : '#0f766e';
  const shellSpot = isGolden ? '#ffe8cc' : '#f0fdfa';

  const bellyColor = isGolden ? '#fff3bf' : '#ece5c8'; // cream/tan belly
  const bellyOutline = isGolden ? '#e67700' : '#4b3f2f';
  const letterColor = isGolden ? '#d9480f' : '#2d6a4f'; // forest green 'T' or orange 'T'

  const blushColor = '#fb7185'; // bright rosy blush cheeks
  const mouthColor = isGolden ? '#5c3e03' : '#1f3807';

  // Animation frames logic for planting/siembra (snappy 72-frame organic effect)
  const isPlanting = plantingAnimTimer > 0;
  let headOffsetX = 0;
  let headOffsetY = 0;
  let headScale = 1;
  let bodyScaleY = 1;
  let bodyOffsetY = 0;
  let legScaleY = 1;
  let legOffsetY = 0;
  let tailScale = 1.0;

  if (isPlanting) {
    if (plantingAnimTimer >= 60) {
      // Fase 1 — Agacharse para tomar impulso (cuerpo y cabeza bajan, patas se comprimen)
      bodyOffsetY = s * 0.1;
      legScaleY = 0.7;
      headOffsetY = s * 0.08;
      headScale = 1.0;
      tailScale = 1.0;
    } else if (plantingAnimTimer >= 20) {
      // Fase 2 — Lanzamiento y Salto (cuerpo sube y luego cae fuertemente)
      if (plantingAnimTimer >= 40) {
        // Levantamiento: cuerpo y cabeza suben visiblemente junto a las patas
        bodyOffsetY = -s * 0.4;
        headOffsetY = -s * 0.15;
        headScale = 1.0;
        legScaleY = 1.0;
      } else {
        // Caída e impacto
        bodyOffsetY = s * 0.15;
        headOffsetY = s * 0.05;
        headScale = 1.0;
        if (plantingAnimTimer === 39 || plantingAnimTimer === 38) {
          // breakScale ya se ajustó al inicio a 0.85
          bodyScaleY = 0.75; // Squash horizontal para el impacto
        }
      }
    } else {
      // Fase 3 — Retorno (Ticks 19-1)
      const progress = plantingAnimTimer / 19;
      headOffsetX = Math.sin(t * 0.3) * 3 * progress;
    }
  }

  // Hide limbs completely when tucked in shell during death
  if (isTuckedDeath) {
    headScale = 0;
    tailScale = 0;
    legScaleY = 0;
  }

  // If moving left, flip horizontally around Torti's center point
  if (dir.x < 0) {
    ctx.translate(finalPx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-finalPx, 0);
  }

  // Helper to draw chubby legs
  const drawChubbyLeg = (lx: number, ly: number, legWalkOffset: number, isFront: boolean) => {
    if (legScaleY === 0 || limbsScale === 0 || tuckProgress >= 1.0) return; // Skip drawing when tucked in shell
    
    ctx.save();
    let scaleY = legScaleY * (1 - tuckProgress);
    let scaleX = (1 - tuckProgress);
    let offY = legOffsetY;
    let offX = 0;

    if (isPlanting) {
      if (plantingAnimTimer >= 60) {
        scaleY = 0.7;
        offY = -s * 0.08;
      } else if (plantingAnimTimer >= 20) {
        // Fase 2 — Pisotón vertical en ambas patas (Ticks 59-20)
        if (plantingAnimTimer >= 40) {
          // Levantamiento
          offY = -s * 0.5;
        } else {
          // Golpe de impacto
          offY = s * 0.25;
          if (plantingAnimTimer === 39 || plantingAnimTimer === 38) {
            scaleY = 0.7;
            scaleX = 1.3;
          }
        }
      } else {
        // Fase 3 — Retorno
        const progress = plantingAnimTimer / 19;
        const pushAmount = s * 0.1 * progress;
        if (dir.x !== 0) {
          offX = pushAmount;
        } else {
          offY = dir.y * pushAmount;
        }
      }
      
      // Propagate bodyOffsetY for synchronized movement during the jump
      offY += bodyOffsetY;
    }

    ctx.translate(lx + offX, ly + offY + legWalkOffset * s * 0.3);
    ctx.scale(scaleX, scaleY);

    // Chubby round capsule leg
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = skinOutline;
    ctx.lineWidth = 2.0;
    ctx.beginPath();

    // Draw a rounded rectangle for leg
    if (ctx.roundRect) {
      ctx.roundRect(-s * 0.16, -s * 0.1, s * 0.32, s * 0.35, s * 0.12);
    } else {
      // Fallback for older canvas environments
      const rx = -s * 0.16, ry = -s * 0.1, rw = s * 0.32, rh = s * 0.35, rad = s * 0.12;
      ctx.moveTo(rx + rad, ry);
      ctx.lineTo(rx + rw - rad, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
      ctx.lineTo(rx + rw, ry + rh - rad);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
      ctx.lineTo(rx + rad, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
      ctx.lineTo(rx, ry + rad);
      ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
    }
    ctx.fill();
    ctx.stroke();

    // Shadow on back leg part
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.ellipse(-s * 0.04, s * 0.12, s * 0.08, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw Tail (cute tiny green tail)
  if (tailScale > 0 && limbsScale > 0 && tuckProgress < 1.0) {
    ctx.save();
    ctx.translate(finalPx - s * 0.65, finalCy + s * 0.28);
    ctx.scale(tailScale * limbsScale * (1 - tuckProgress), tailScale * limbsScale * (1 - tuckProgress));
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = skinOutline;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.23, s * 0.08, -s * 0.03, s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // If naked, draw the exposed pink/light-green textured back of Torti behind shell
  if (isNaked) {
    ctx.save();
    const nakedCx = finalPx - s * 0.32;
    const nakedCy = finalCy + s * 0.06 + bodyOffsetY;
    ctx.translate(nakedCx, nakedCy);

    // Draw the naked body oval
    ctx.fillStyle = '#e8a7a1'; // soft pink naked skin color
    ctx.strokeStyle = skinOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.35, s * 0.40, Math.PI * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw spine lines/wrinkles
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(0, s * 0.2);
    ctx.stroke();

    ctx.restore();
  }

  // Draw shell behind body (with independent translation, rotation, and squash/stretch scale)
  ctx.save();
  const currentShellOffset = - s * 0.32 * (1 - tuckProgress);
  const shellCx = finalPx + currentShellOffset + localOffsetX;
  const shellCy = finalCy + s * 0.06 + bodyOffsetY + localOffsetY;
  ctx.translate(shellCx, shellCy);
  ctx.rotate(shellRotation);
  ctx.scale(shellScaleX, shellScaleY);

  ctx.fillStyle = shellBase;
  ctx.strokeStyle = shellOutline;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.50, s * 0.55, Math.PI * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Add white spots/circles on shell relative to shell center (0, 0)
  ctx.fillStyle = shellSpot;
  ctx.beginPath();
  ctx.arc(-s * 0.16, -s * 0.30, s * 0.11, 0, Math.PI * 2);
  ctx.arc(-s * 0.22, -s * 0.04, s * 0.13, 0, Math.PI * 2);
  ctx.arc(-s * 0.10,  s * 0.20, s * 0.11, 0, Math.PI * 2);
  ctx.arc( s * 0.08, -s * 0.22, s * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Draw rear leg (left)
  drawChubbyLeg(finalPx - s * 0.20, finalCy + s * 0.40, walkOffset, false);

  // Draw torso and cream/tan belly (plastron)
  if (tuckProgress < 1.0) {
    ctx.save();
    const bellyScale = 1 - tuckProgress;
    ctx.translate(finalPx - s * 0.04, finalCy + s * 0.1 + bodyOffsetY);
    ctx.scale(bellyScale, bellyScale);
    ctx.translate(-(finalPx - s * 0.04), -(finalCy + s * 0.1 + bodyOffsetY));

    ctx.fillStyle = bellyColor;
    ctx.strokeStyle = bellyOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(finalPx - s * 0.04, finalCy + s * 0.1 + bodyOffsetY, s * 0.41, s * 0.45 * bodyScaleY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw the green letter 'T' centered on the chest
    if (!isTuckedDeath) {
      const bx = finalPx - s * 0.04;
      const by = finalCy + s * 0.1 + bodyOffsetY;
      ctx.fillStyle = letterColor;
      // Horizontal bar
      ctx.fillRect(bx - s * 0.14, by - s * 0.15 * bodyScaleY, s * 0.28, s * 0.08 * bodyScaleY);
      // Vertical bar
      ctx.fillRect(bx - s * 0.045, by - s * 0.15 * bodyScaleY, s * 0.09, s * 0.26 * bodyScaleY);
    }
    ctx.restore();
  }

  // Draw front leg (right)
  drawChubbyLeg(finalPx + s * 0.14, finalCy + s * 0.40, -walkOffset, true);

  // Draw cute stubby left arm (slightly visible at back)
  if (!isTuckedDeath && limbsScale > 0 && tuckProgress < 1.0) {
    ctx.save();
    let rArmScale = 1.0 * (1 - tuckProgress);
    if (plantingAnimTimer >= 60) {
      rArmScale = 0.5 * (1 - tuckProgress);
    }
    rArmScale *= limbsScale;
    ctx.translate(finalPx - s * 0.40, finalCy + s * 0.08 + bodyOffsetY);
    ctx.scale(rArmScale, rArmScale);
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = skinOutline;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.13, s * 0.20, Math.PI * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Draw neck
  if (headScale > 0 && limbsScale > 0 && tuckProgress < 1.0) {
    ctx.save();
    ctx.translate(finalPx + s * 0.08 + headOffsetX, finalCy - s * 0.18 + headOffsetY);
    ctx.scale(headScale * limbsScale * (1 - tuckProgress), headScale * limbsScale * (1 - tuckProgress));
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = skinOutline;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.15, s * 0.22, -Math.PI * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Draw head (big rounded cute green head)
  if (headScale > 0 && limbsScale > 0 && tuckProgress < 1.0) {
    const hx = finalPx + s * 0.12 + headOffsetX;
    const hy = finalCy - s * 0.35 + headOffsetY;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(headScale * limbsScale * (1 - tuckProgress), headScale * limbsScale * (1 - tuckProgress));
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = skinOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw big shiny anime eyes with detailed planting expressions
    const drawCuteEye = (ex: number, ey: number) => {
      // 1. Shock/Launch Expression: Large open shiny eyes (breakingAnimTimer > 0 or deathAnimTimer > 0)
      if (breakingAnimTimer > 0 || deathAnimTimer > 0) {
        const r = s * 0.12;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, Math.PI * 2);
        ctx.fill();

        // Two shiny white glint circles
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - r * 0.35, ey - r * 0.35, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex + r * 0.35, ey + r * 0.35, r * 0.20, 0, Math.PI * 2);
        ctx.fill();
      }
      // 2. Active Planting Expression (Concentration, Gold Star or Satisfaction)
      else if (isPlanting && plantingAnimTimer >= 20) {
        const r = s * 0.09;

        if (plantingAnimTimer >= 40) {
          // Ticks 72-40 — Concentración / Esfuerzo: semicírculo invertido
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ex, ey, r, Math.PI, 0, true);
          ctx.stroke();

          // Cejas (dos líneas cortas inclinadas hacia el centro)
          ctx.save();
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          if (ex < 0) {
            // Eyebrow left: slope down-right
            ctx.moveTo(ex - r * 1.2, ey - r * 1.5);
            ctx.lineTo(ex + r * 0.2, ey - r * 0.9);
          } else {
            // Eyebrow right: slope down-left
            ctx.moveTo(ex + r * 1.2, ey - r * 1.5);
            ctx.lineTo(ex - r * 0.2, ey - r * 0.9);
          }
          ctx.stroke();
          ctx.restore();
        } else if (plantingAnimTimer === 39 || plantingAnimTimer === 38) {
          // Ticks 39-38 — Estrella dorada con brillo
          ctx.save();
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ffd700';
          const len = s * 0.08;
          // 4 trazos en ángulos 0°, 45°, 90°, 135° (dibujados desde el centro hacia afuera)
          [[1,0],[-1,0],[0,1],[0,-1],[0.7,0.7],[-0.7,-0.7],[0.7,-0.7],[-0.7,0.7]].forEach(([dx,dy]) => {
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + dx * len, ey + dy * len);
            ctx.stroke();
          });
          ctx.restore();
        } else {
          // Ticks 37-20 — Satisfacción: arcos curvados hacia arriba (media luna feliz)
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ex, ey, r, Math.PI, 0, false);
          ctx.stroke();
        }
      }
      // 3. Normal cute anime eye (default state)
      else {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ex, ey, s * 0.09, 0, Math.PI * 2);
        ctx.fill();

        // Shiny reflection glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - s * 0.03, ey - s * 0.03, s * 0.032, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawCuteEye(-s * 0.08, -s * 0.02);
    drawCuteEye(s * 0.20, -s * 0.02);

    // Draw blush cheeks (only if not shocked)
    if (!isShocked) {
      ctx.fillStyle = blushColor;
      ctx.beginPath();
      ctx.ellipse(-s * 0.18, s * 0.1, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.25, s * 0.1, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw mouth
    ctx.strokeStyle = mouthColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (isShocked) {
      // Big shocked circle mouth!
      ctx.fillStyle = mouthColor;
      ctx.arc(s * 0.06, s * 0.12, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(s * 0.02, s * 0.08);
      ctx.lineTo(s * 0.06, s * 0.13);
      ctx.lineTo(s * 0.10, s * 0.08);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw chubby right arm (front arm, in foreground)
  if (!isTuckedDeath && limbsScale > 0 && tuckProgress < 1.0) {
    ctx.save();
    let fArmScale = 1.0 * (1 - tuckProgress);
    if (isPlanting) {
      if (plantingAnimTimer >= 60) {
        fArmScale = 0.5 * (1 - tuckProgress); // Carga
      } else if (plantingAnimTimer >= 20) {
        fArmScale = 0.8 * (1 - tuckProgress); // ligeramente retraído
      }
    }
    fArmScale *= limbsScale;
    ctx.translate(finalPx + s * 0.30, finalCy + s * 0.10 + bodyOffsetY);
    ctx.scale(fArmScale, fArmScale);
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = skinOutline;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.15, s * 0.22, -Math.PI * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
};
