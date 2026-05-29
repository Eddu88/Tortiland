/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position } from '../types';
import { TILE } from '../constants';

export const drawFoxEnemy = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: Position,
  frame: number,
  type: 'patrol' | 'chaser' | 'ghost',
  t: number
) => {
  ctx.save();
  
  // Dynamic scale based on enemy type to differentiate mechanics and threat levels:
  let s = TILE * 0.42;
  if (type === 'patrol') {
    s = TILE * 0.48; // Red patrol lobos stay medium but clearly visible (up from 0.42)
  } else if (type === 'chaser') {
    s = TILE * 0.58; // Gray armored chaser rodent is huge, imposing, and terrifying!
  } else if (type === 'ghost') {
    s = TILE * 0.52; // Ghost spectral lobo is intermediate size
  }
  
  const abc = Math.sin(t * 0.009 + frame) * 1.5;
  const cy = py + abc;

  // Base floor shadow (placed firmly on ground, not affected by bobbing/jumping)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(px, py + s * 0.52, s * 0.76, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Adjust palettes naturally per lobo subtype
  let pCol = '#f97316'; // Red Lobo
  let iCol = '#ffffff'; // White fluff chest
  let dCol = '#1e293b'; // Charcoal tail details
  let sCol = '#7c2d12'; // Borders
  let eCol = '#3bf9a0'; // Eyes
  const tailSwing = Math.cos(t * 0.012 + frame) * 0.26;

  if (type === 'chaser') {
    pCol = '#64748b'; // Gray/Steel armored lobo
    iCol = '#f1f5f9';
    dCol = '#0f172a';
    sCol = '#334155';
    eCol = '#f43f5e'; // Red focused eyes
  } else if (type === 'ghost') {
    pCol = '#bfdbfe'; // Whimsical ghost-blue spectral lobo
    iCol = '#f0fdf4';
    dCol = '#3b82f6';
    sCol = '#1d4ed8';
    eCol = '#facc15'; // Glowing light eyes
  }

  // 1. Cozy fluffy Tail swiping at back
  ctx.save();
  ctx.translate(px, cy);
  const tailAngleOffset = Math.atan2(-dir.y, -dir.x);
  ctx.rotate(tailAngleOffset + tailSwing);

  ctx.fillStyle = pCol;
  ctx.strokeStyle = sCol;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.4, -s * 1.1, -s * 0.35, -s * 1.1, 0);
  ctx.bezierCurveTo(-s * 1.1, s * 0.35, -s * 0.5, s * 0.4, 0, 0);
  ctx.fill();
  ctx.stroke();

  // White bushy tail cap tip
  ctx.fillStyle = iCol;
  ctx.beginPath();
  ctx.moveTo(-s * 1.1, 0);
  ctx.bezierCurveTo(-s * 0.95, -s * 0.16, -s * 0.78, -s * 0.14, -s * 0.78, 0);
  ctx.bezierCurveTo(-s * 0.78, s * 0.14, -s * 0.95, s * 0.16, -s * 1.1, 0);
  ctx.fill();

  ctx.strokeStyle = sCol;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-s * 0.78, -s * 0.1);
  ctx.quadraticCurveTo(-s * 0.92, 0, -s * 0.78, s * 0.1);
  ctx.stroke();

  ctx.restore();

  // 2. Cute tiny feet paws
  ctx.fillStyle = dCol;
  ctx.beginPath();
  ctx.arc(px - s * 0.3, cy + s * 0.58, s * 0.14, 0, Math.PI * 2);
  ctx.arc(px + s * 0.3, cy + s * 0.58, s * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // 3. Lobo fluffy circular torso body
  ctx.fillStyle = pCol;
  ctx.strokeStyle = sCol;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(px, cy + s * 0.08, s * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // White chest fluff
  ctx.fillStyle = iCol;
  ctx.beginPath();
  ctx.ellipse(px, cy + s * 0.14, s * 0.36, s * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // If Chaser type, draw metal neck/pectoral chestplate
  if (type === 'chaser') {
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px - s * 0.22, cy);
    ctx.lineTo(px + s * 0.22, cy);
    ctx.lineTo(px + s * 0.16, cy + s * 0.34);
    ctx.lineTo(px, cy + s * 0.44);
    ctx.lineTo(px - s * 0.16, cy + s * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing power gem central slot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(px, cy + s * 0.22, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Lobo triangular face
  const fdX = px + dir.x * 2.5;
  const fdY = cy - s * 0.32;

  // Tall Pointy Left Ear
  ctx.fillStyle = pCol;
  ctx.strokeStyle = sCol;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fdX - s * 0.42, fdY - s * 0.15);
  ctx.lineTo(fdX - s * 0.52, fdY - s * 0.9);
  ctx.lineTo(fdX - s * 0.08, fdY - s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fecdd3'; // pink inner ear
  ctx.beginPath();
  ctx.moveTo(fdX - s * 0.38, fdY - fdY * 0.01 - s * 0.22);
  ctx.lineTo(fdX - s * 0.46, fdY - s * 0.78);
  ctx.lineTo(fdX - s * 0.15, fdY - s * 0.45);
  ctx.closePath();
  ctx.fill();

  // Tall Pointy Right Ear
  ctx.fillStyle = pCol;
  ctx.strokeStyle = sCol;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fdX + s * 0.42, fdY - s * 0.15);
  ctx.lineTo(fdX + s * 0.52, fdY - s * 0.9);
  ctx.lineTo(fdX + s * 0.08, fdY - s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fecdd3';
  ctx.beginPath();
  ctx.moveTo(fdX + s * 0.38, fdY - fdY * 0.01 - s * 0.22);
  ctx.lineTo(fdX + s * 0.46, fdY - s * 0.78);
  ctx.lineTo(fdX + s * 0.15, fdY - s * 0.45);
  ctx.closePath();
  ctx.fill();

  // Lobo Triangular snout face base
  ctx.fillStyle = pCol;
  ctx.strokeStyle = sCol;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(fdX - s * 0.56, fdY);
  ctx.quadraticCurveTo(fdX - s * 0.58, fdY + s * 0.36, fdX, fdY + s * 0.5);
  ctx.quadraticCurveTo(fdX + s * 0.56, fdY + s * 0.36, fdX + s * 0.56, fdY);
  ctx.quadraticCurveTo(fdX, fdY - s * 0.32, fdX - s * 0.56, fdY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left cheek fluff white
  ctx.fillStyle = iCol;
  ctx.beginPath();
  ctx.moveTo(fdX - s * 0.48, fdY + s * 0.08);
  ctx.quadraticCurveTo(fdX - s * 0.42, fdY + s * 0.4, fdX, fdY + s * 0.48);
  ctx.quadraticCurveTo(fdX - s * 0.1, fdY + s * 0.26, fdX - s * 0.48, fdY + s * 0.08);
  ctx.fill();

  // Right cheek fluff white
  ctx.beginPath();
  ctx.moveTo(fdX + s * 0.48, fdY + s * 0.08);
  ctx.quadraticCurveTo(fdX + s * 0.42, fdY + s * 0.4, fdX, fdY + s * 0.48);
  ctx.quadraticCurveTo(fdX + s * 0.1, fdY + s * 0.26, fdX + s * 0.48, fdY + s * 0.08);
  ctx.fill();

  // If Chaser type, draw dark iron headband armor
  if (type === 'chaser') {
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = sCol;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(fdX, fdY, s * 0.38, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Little forehead central spike
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(fdX - 2.5, fdY - s * 0.38);
    ctx.lineTo(fdX, fdY - s * 0.65);
    ctx.lineTo(fdX + 2.5, fdY - s * 0.38);
    ctx.closePath();
    ctx.fill();
  }

  // Gentle almond lobo eyes
  const eyeOffX = dir.x * 2.2;
  const eyeY = fdY + s * 0.05 + dir.y * 1;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(fdX - s * 0.18 + eyeOffX, eyeY, s * 0.11, s * 0.07, Math.PI / 12, 0, Math.PI * 2);
  ctx.ellipse(fdX + s * 0.18 + eyeOffX, eyeY, s * 0.11, s * 0.07, -Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();

  // Sharp bright iris
  ctx.fillStyle = eCol;
  ctx.beginPath();
  ctx.arc(fdX - s * 0.16 + eyeOffX + dir.x * 0.6, eyeY + dir.y * 0.6, s * 0.055, 0, Math.PI * 2);
  ctx.arc(fdX + s * 0.16 + eyeOffX + dir.x * 0.6, eyeY + dir.y * 0.6, s * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(fdX - s * 0.16 + eyeOffX + dir.x * 1, eyeY + dir.y * 0.6, 1.2, 0, Math.PI * 2);
  ctx.arc(fdX + s * 0.16 + eyeOffX + dir.x * 1, eyeY + dir.y * 0.6, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Nose tip of lobo snout
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(fdX, fdY + s * 0.46, 3, 0, Math.PI * 2);
  ctx.fill();

  // Shy cheeks
  ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.beginPath();
  ctx.arc(fdX - s * 0.34, fdY + s * 0.26, 2, 0, Math.PI * 2);
  ctx.arc(fdX + s * 0.34, fdY + s * 0.26, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};
