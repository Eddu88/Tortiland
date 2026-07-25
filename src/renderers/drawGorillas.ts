/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position, EnemyType } from '../types';
import { TILE } from '../constants';

/**
 * Renders a powerful, aggressive hopping gorilla onto the Canvas context.
 * Features broad shoulders, long heavy arms with knuckles, short legs, and a silverback pattern.
 */
export const drawGorilla = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  _dir: Position,
  _frame: number,
  _type: EnemyType,
  t: number,
  extra?: { isJumping?: boolean; jumpProgress?: number }
) => {
  // Scale for Gorilla (large!)
  const s = TILE * 0.58;

  const isJumping = extra?.isJumping || false;
  const progress = extra?.jumpProgress || 0;

  // High leap during gameplay jump state, or tiny natural walking bobbing on the ground
  const jumpOffset = isJumping
    ? Math.sin(progress * Math.PI) * 48
    : Math.abs(Math.sin(t * 0.006)) * 2;
  const cy = py - jumpOffset;

  // Floor shadow (shrinks as gorilla jumps)
  const shadowScale = Math.max(0.4, 1 - (jumpOffset / 25));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(px, py + s * 0.52, s * 0.85 * shadowScale, s * 0.25 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  // Translate to center (px, cy) and apply body sway rotation
  const sway = Math.sin(t * 0.01) * 3;
  ctx.translate(px, cy);
  ctx.rotate(sway * Math.PI / 180);

  // 1. Legs (drawn behind the torso)
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2;
  
  // Left leg
  ctx.fillRect(-s * 0.35, s * 0.4, s * 0.18, s * 0.35);
  ctx.strokeRect(-s * 0.35, s * 0.4, s * 0.18, s * 0.35);

  // Right leg
  ctx.fillRect(s * 0.17, s * 0.4, s * 0.18, s * 0.35);
  ctx.strokeRect(s * 0.17, s * 0.4, s * 0.18, s * 0.35);

  // Feet
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.ellipse(-s * 0.26, s * 0.75, s * 0.11, s * 0.06, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.26, s * 0.75, s * 0.11, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Giant Arms & Knuckles (swing during movement)
  const armSwing = Math.sin(t * 0.012) * s * 0.12;

  // Left Arm
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-s * 0.75, s * 0.2 + armSwing, s * 0.30, s * 0.45, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Left Knuckle
  ctx.fillStyle = '#3f3f46';
  ctx.beginPath();
  ctx.arc(-s * 0.75 - s * 0.05, s * 0.55 + armSwing, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right Arm
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(s * 0.75, s * 0.2 - armSwing, s * 0.30, s * 0.45, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right Knuckle
  ctx.fillStyle = '#3f3f46';
  ctx.beginPath();
  ctx.arc(s * 0.75 + s * 0.05, s * 0.55 - armSwing, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Body Torso (broad shoulders, triangular shape)
  ctx.fillStyle = '#27272a';
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, s * 0.25);
  ctx.quadraticCurveTo(-s * 0.9, -s * 0.4, 0, -s * 0.55);
  ctx.quadraticCurveTo(s * 0.9, -s * 0.4, s * 0.7, s * 0.25);
  ctx.quadraticCurveTo(0, s * 0.9, -s * 0.7, s * 0.25);
  ctx.fill();
  ctx.stroke();

  // 4. Silverback (gray back highlight)
  ctx.fillStyle = '#71717a';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.05, s * 0.45, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chest Muscle detail
  ctx.fillStyle = '#3f3f46';
  ctx.beginPath();
  ctx.arc(-s * 0.2, s * 0.12, s * 0.22, 0, Math.PI * 2);
  ctx.arc(s * 0.2, s * 0.12, s * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 5. Head (square-ish & aggressive)
  ctx.fillStyle = '#27272a';
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.38, s * 0.42, s * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face Mask
  ctx.fillStyle = '#52525b';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.35, s * 0.32, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(-s * 0.05, -s * 0.31, s * 0.035, 0, Math.PI * 2);
  ctx.arc(s * 0.05, -s * 0.31, s * 0.035, 0, Math.PI * 2);
  ctx.fill();

  // Angry Eyebrows
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.18, -s * 0.41);
  ctx.lineTo(0, -s * 0.37);
  ctx.lineTo(s * 0.18, -s * 0.41);
  ctx.stroke();

  // Angry eyes
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(-s * 0.09, -s * 0.36, s * 0.045, 0, Math.PI * 2);
  ctx.arc(s * 0.09, -s * 0.36, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupils
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-s * 0.09, -s * 0.36, 1, 0, Math.PI * 2);
  ctx.arc(s * 0.09, -s * 0.36, 1, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, -s * 0.25);
  ctx.lineTo(s * 0.12, -s * 0.25);
  ctx.stroke();

  ctx.restore();
};
