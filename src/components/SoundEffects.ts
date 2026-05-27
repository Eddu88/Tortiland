/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      // Create context lazy on user interaction
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggle(state: boolean) {
    this.enabled = state;
    if (state) {
      this.init();
    }
  }

  private playTone(freqs: number[], duration: number, type: OscillatorType = 'sine', vol = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      gainNode.gain.setValueAtTime(vol, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Simple frequency sequencing or gliding
      if (freqs.length === 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
      } else if (freqs.length === 2) {
        osc.frequency.setValueAtTime(freqs[0], now);
        osc.frequency.exponentialRampToValueAtTime(freqs[1], now + duration);
      } else {
        // Sequenced arpeggio
        osc.frequency.setValueAtTime(freqs[0], now);
        const step = duration / freqs.length;
        for (let i = 1; i < freqs.length; i++) {
          osc.frequency.setValueAtTime(freqs[i], now + i * step);
        }
      }

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  public playCollect() {
    // Upward chiptune beep
    this.playTone([440, 880], 0.15, 'triangle', 0.12);
  }

  public playBuild() {
    // Solid synth sound
    this.playTone([220, 293, 349], 0.2, 'sawtooth', 0.08);
  }

  public playBreak() {
    // Low rumble crumble
    this.playTone([180, 80], 0.25, 'triangle', 0.15);
  }

  public playPowerUp() {
    // Shiny cascading arpeggio
    this.playTone([523.25, 659.25, 783.99, 1046.5], 0.4, 'triangle', 0.15);
  }

  public playHurt() {
    // Sad descending slide
    this.playTone([300, 100], 0.4, 'sawtooth', 0.15);
  }

  public playVictory() {
    // Rich cheerful major chord fanfare
    this.playTone([261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50], 0.7, 'triangle', 0.15);
  }

  public playGameOver() {
    // Melancholy descending minor phrase
    this.playTone([311.13, 293.66, 261.63, 196.00], 0.8, 'sawtooth', 0.1);
  }
}

export const SoundEffects = new SoundEffectsManager();
