/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SoundEffectsManager controls the creation, configuration, and playback
 * of retro chiptune audio synthesized entirely on-the-fly using the Web Audio API.
 * Avoids loading heavy audio assets and utilizes mathematical frequencies for sound design.
 */
class SoundEffectsManager {
  // Web Audio Context, lazily initialized on user interaction to comply with modern browser autoplay policies.
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  /**
   * Lazily instantiates or resumes the AudioContext context object.
   * Modern browsers require user action (mouse press, key down) before starting audio contexts.
   */
  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // Resume context if suspended by browser security state
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Global toggle switch to enable/disable all game sound effects.
   */
  public toggle(state: boolean) {
    this.enabled = state;
    if (state) {
      this.init();
    }
  }

  /**
   * Synthesizes and plays a custom frequency tone or slide.
   *
   * @param freqs Frequencies array in Hertz.
   *              - 1 item: Constant static pitch.
   *              - 2 items: Linear/exponential frequency sweep slide (glide).
   *              - 3+ items: Sequenced arpeggio notes.
   * @param duration Tone decay and stop timing in seconds.
   * @param type Oscillator waveform shape (sine, square, sawtooth, triangle).
   * @param vol Maximum target amplitude gain level.
   */
  private playTone(freqs: number[], duration: number, type: OscillatorType = 'sine', vol = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Create oscillator node (waveform generator) and gain node (volume envelope controller)
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination); // Connect output directly to speakers

      const now = this.ctx.currentTime;
      
      // Set volume envelope: start at full target volume, decay exponentially to near silence
      gainNode.gain.setValueAtTime(vol, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Pitch controls (Sequencing, slides, or glides)
      if (freqs.length === 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
      } else if (freqs.length === 2) {
        // Continuous frequency sweep slide
        osc.frequency.setValueAtTime(freqs[0], now);
        osc.frequency.exponentialRampToValueAtTime(freqs[1], now + duration);
      } else {
        // Staggered arpeggio loop sequence
        osc.frequency.setValueAtTime(freqs[0], now);
        const step = duration / freqs.length;
        for (let i = 1; i < freqs.length; i++) {
          osc.frequency.setValueAtTime(freqs[i], now + i * step);
        }
      }

      osc.start(now);
      osc.stop(now + duration); // Dispose oscillator nodes to prevent garbage leaks
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  /**
   * Upward chiptune beep sound for veggie collectibles pickup.
   */
  public playCollect() {
    this.playTone([440, 880], 0.15, 'triangle', 0.12);
  }

  /**
   * Staggered major chord arpeggio for planting/creating a bush block.
   */
  public playBuild() {
    this.playTone([220, 293, 349], 0.2, 'sawtooth', 0.08);
  }

  /**
   * Descending low rumble triangle wave representing organic soil breaking/crumbling.
   */
  public playBreak() {
    this.playTone([180, 80], 0.25, 'triangle', 0.15);
  }

  /**
   * Cascade arpeggio representing magic golden power item consumption.
   */
  public playPowerUp() {
    this.playTone([523.25, 659.25, 783.99, 1046.5], 0.4, 'triangle', 0.15);
  }

  /**
   * Harsh sawtooth descending wave when player collides with an enemy.
   */
  public playHurt() {
    this.playTone([300, 100], 0.4, 'sawtooth', 0.15);
  }

  /**
   * Upward pop pitch glide representing a heavy animal jump.
   */
  public playJump() {
    this.playTone([160, 420], 0.32, 'triangle', 0.14);
  }

  /**
   * Long cheerful major-7th fanfare arpeggio on level clearance.
   */
  public playVictory() {
    this.playTone([261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50], 0.7, 'triangle', 0.15);
  }

  /**
   * Descending minor chord sequence for game over screen.
   */
  public playGameOver() {
    this.playTone([311.13, 293.66, 261.63, 196.00], 0.8, 'sawtooth', 0.1);
  }
}

export const SoundEffects = new SoundEffectsManager();
