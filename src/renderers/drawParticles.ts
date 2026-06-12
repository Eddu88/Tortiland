/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Particle } from '../types';

/**
 * Rendering function that animates, updates, and draws active game particles.
 * 
 * Physics and Logic:
 * - Mutates properties (coordinate shifts by velocity vx/vy) in-place.
 * - Applies a downward gravity pull of 0.12px/frame to simulate realistic falling/decay.
 * - Filters out and splices dead particles (p.life <= 0) to avoid memory leaks.
 * 
 * Aesthetics:
 * - Modulates the canvas `globalAlpha` matching particle age (`life / maxLife`) for soft fades.
 * - Renders leaf green particles (`#4caf50`, `#2e7d32`) as custom rotated ellipses (using `Math.ellipse`)
 *   with dark contours to represent breaking foliage debris.
 * - Falls back to drawing retro square particles for standard hits/explosions.
 * 
 * @param ctx 2D Canvas rendering context.
 * @param particles Array of currently active particles in the scene.
 */
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // downward gravity pull
    p.life--;

    // Remove completed particles to free memory resources
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Alpha decay calculation based on life remaining
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;

    // Draw custom organic leaf shape for green leaf particles
    if (p.color === '#4caf50' || p.color === '#2e7d32') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 0.12); // satisfying organic leaf tumbling rotation
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#051408';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    } else {
      // Standard retro square particle (used for points and speed glows)
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    }
  }
  ctx.globalAlpha = 1.0;
}
