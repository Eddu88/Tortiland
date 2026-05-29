/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Particle } from '../types';

/**
 * Pure rendering function that animates and draws active particles.
 * Mutates properties (coordinate shifts, life, gravity) and removes dead particles in-place.
 */
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // downward gravity pull
    p.life--;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;

    // Draw custom leaf shape for green leaf particles
    if (p.color === '#4caf50' || p.color === '#2e7d32') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 0.12); // satisfying organic rotation
      ctx.fillStyle = p.color;
      ctx.beginPath();
      // Leaf shape ellipse
      ctx.ellipse(0, 0, 4.5, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#051408';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    } else {
      // Standard retro square particle
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    }
  }
  ctx.globalAlpha = 1.0;
}
