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
  // Ajuste de escala para la serpiente
  const s = TILE * 0.55;

  // Animación de respiración / flotación (bobbing)
  const bobOffset = Math.sin(t * 0.007) * 4;
  const cy = py + bobOffset;

  // Sombra base en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(px, py + s * 0.6, s * 0.8, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(px, cy);

  // Inversión horizontal si se mueve a la derecha (por defecto mira a la izquierda)
  const flipH = dir.x > 0;
  if (flipH) {
    ctx.scale(-1, 1);
  }

  // Paleta de colores consistente con el estilo del gorila
  const isPatrol = type === 'snake_patrol';
  const cDark = isPatrol ? '#064e3b' : '#09090b';   // Contornos (Verde oscuro / Negro)
  const cBase = isPatrol ? '#059669' : '#27272a';   // Cuerpo base (Esmeralda / Gris oscuro)
  const cLight = isPatrol ? '#10b981' : '#f97316';  // Brillos/Detalles (Menta / Naranja)
  const cTongue = isPatrol ? '#ef4444' : '#dc2626'; // Lengua (Rojo vivo / Rojo profundo)

  ctx.strokeStyle = cDark;
  ctx.lineWidth = 2.5;

  // 1. CUERPO ENROSCADO (Anillos inferiores de la espiral)
  // Anillo exterior trasero
  ctx.fillStyle = cDark;
  ctx.beginPath();
  ctx.ellipse(s * 0.1, s * 0.4, s * 0.7, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Anillo principal base
  ctx.fillStyle = cBase;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.35, s * 0.65, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Brillo del anillo inferior
  ctx.fillStyle = cLight;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.42, s * 0.45, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Anillo interno (da el efecto de rosca/espiral)
  ctx.fillStyle = cDark;
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, s * 0.33, s * 0.3, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. COLA (Sobresale sutilmente por un lado)
  ctx.fillStyle = cBase;
  ctx.beginPath();
  ctx.arc(s * 0.55, s * 0.2, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. CUELLO (Sube erguido desde el centro de la rosca)
  ctx.fillStyle = cBase;
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, s * 0.3);
  ctx.quadraticCurveTo(-s * 0.4, -s * 0.1, -s * 0.2, -s * 0.2); // Curva S del cuello
  ctx.lineTo(s * 0.05, -s * 0.2);
  ctx.quadraticCurveTo(-s * 0.1, s * 0.1, -s * 0.02, s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. LENGUA BÍFIDA (Animación rápida de parpadeo)
  const showTongue = Math.floor(t / 100) % 3 !== 0;
  if (showTongue) {
    ctx.strokeStyle = cTongue;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Extensión de la lengua saliendo de la boca hacia la izquierda
    const tX = -s * 0.5;
    const tY = -s * 0.25;
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.25);
    ctx.lineTo(tX, tY);
    // Puntas bífidas
    ctx.moveTo(tX, tY);
    ctx.lineTo(tX - s * 0.12, tY - s * 0.08);
    ctx.moveTo(tX, tY);
    ctx.lineTo(tX - s * 0.12, tY + s * 0.08);
    ctx.stroke();
  }

  // 5. CABEZA (Forma de gota/triángulo redondeado)
  ctx.fillStyle = cBase;
  ctx.strokeStyle = cDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(-s * 0.15, -s * 0.28, s * 0.32, s * 0.24, -Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ceja agresiva
  ctx.strokeStyle = cDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, -s * 0.38);
  ctx.lineTo(-s * 0.1, -s * 0.32);
  ctx.stroke();

  // Ojo enfadado (Igual que el de tu gorila, usando amarillo brillante)
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(-s * 0.2, -s * 0.3, s * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Pupila (Línea vertical de reptil)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.33);
  ctx.lineTo(-s * 0.2, -s * 0.27);
  ctx.stroke();

  // Detalle de la fosa nasal
  ctx.fillStyle = cDark;
  ctx.beginPath();
  ctx.arc(-s * 0.38, -s * 0.26, s * 0.025, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};
