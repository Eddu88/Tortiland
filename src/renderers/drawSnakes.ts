/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position, EnemyType } from '../types';
import { TILE } from '../constants';

/**
 * Renders a stylized, coiled retro snake using smooth canvas vectors.
 * Features a dynamic flickering tongue, bobbing motion, and directional flipping.
 */
export const drawSnake = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: Position,
  frame: number,
  type: EnemyType,
  t: number
) => {
  // sway calculation: slight horizontal sway of the head
  const sway = Math.sin(t * 0.01);
  const headX = -5 + sway * 1.8;
  const headY = -8;

  ctx.save();
  ctx.translate(px, py);

  // Inversión horizontal si se mueve a la derecha (por defecto mira a la izquierda)
  const flipH = dir.x > 0;
  if (flipH) {
    ctx.scale(-1, 1);
  }

  // Paleta de colores retro pixel art (4 colores por tipo de enemigo)
  const isPatrol = type === 'snake_patrol';
  const highlight = isPatrol ? "#9BE04F" : "#FF9A3C";
  const base      = isPatrol ? "#5E9C36" : "#D25400";
  const shadow    = isPatrol ? "#35561D" : "#6E2200";
  const outline   = isPatrol ? "#1D2F12" : "#3B0E00";

  // Sombra base en el suelo (plana y retro)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(-14, 11, 28, 4);

  // 1. CUERPO ENROSCADO (espiral usando bloques redondeados roundRect)
  // Anillo exterior trasero (inferior)
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.roundRect(-16, 2, 32, 11, 3);
  ctx.fill();

  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.roundRect(-15, 3, 30, 9, 2);
  ctx.fill();

  // Anillo principal base (medio)
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.roundRect(-13, -3, 26, 10, 3);
  ctx.fill();

  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.roundRect(-12, -2, 24, 8, 2);
  ctx.fill();

  // Brillo del anillo
  ctx.fillStyle = highlight;
  ctx.fillRect(-10, -2, 20, 2);

  // Anillo interno trasero (da profundidad al centro de la espiral)
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.roundRect(-8, 1, 16, 6, 2);
  ctx.fill();

  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.roundRect(-7, 2, 14, 4, 1);
  ctx.fill();

  // 2. CUELLO ERGUIDO (Conexión geométrica con el cuerpo)
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.moveTo(-11, 2);
  ctx.lineTo(headX - 5, headY + 3);
  ctx.lineTo(headX + 5, headY + 3);
  ctx.lineTo(-2, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(headX - 3, headY + 3);
  ctx.lineTo(headX + 3, headY + 3);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();

  // Sombra del cuello (lateral derecho)
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(headX, headY + 3);
  ctx.lineTo(headX + 3, headY + 3);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();

  // 3. CABEZA DE VÍBORA (Silueta geométrica angulada)
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.moveTo(headX + 12, headY);
  ctx.lineTo(headX - 5, headY - 9);
  ctx.lineTo(headX - 14, headY);
  ctx.lineTo(headX - 5, headY + 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(headX + 10, headY);
  ctx.lineTo(headX - 5, headY - 7);
  ctx.lineTo(headX - 12, headY);
  ctx.lineTo(headX - 5, headY + 7);
  ctx.closePath();
  ctx.fill();

  // Sombreando la mitad inferior de la cabeza
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.moveTo(headX - 12, headY);
  ctx.lineTo(headX - 5, headY);
  ctx.lineTo(headX + 10, headY);
  ctx.lineTo(headX - 5, headY + 7);
  ctx.closePath();
  ctx.fill();

  // Brillo en la frente/hocico de la cabeza
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(headX - 12, headY);
  ctx.lineTo(headX - 5, headY - 7);
  ctx.lineTo(headX - 5, headY);
  ctx.closePath();
  ctx.fill();

  // 4. LENGUA BÍFIDA RECTA (#E53935)
  const showTongue = Math.floor(t / 120) % 3 !== 0;
  if (showTongue) {
    ctx.strokeStyle = "#E53935";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(headX - 12, headY);
    ctx.lineTo(headX - 17, headY);
    ctx.lineTo(headX - 21, headY - 2);
    ctx.moveTo(headX - 17, headY);
    ctx.lineTo(headX - 21, headY + 2);
    ctx.stroke();
  }

  // 5. OJO RETRO (Único ojo visible, fondo oscuro + punto amarillo)
  ctx.fillStyle = "#16233A";
  ctx.fillRect(headX - 6, headY - 4, 4, 4);

  ctx.fillStyle = "#FFD84D";
  ctx.fillRect(headX - 5, headY - 3, 2, 2);

  ctx.restore();
};
