
class SoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("AudioContext failed to initialize", e);
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number, fadeOut = true) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume: number, lowPass = 1000) {
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowPass, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  private speak(text: string) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.7;
      utterance.rate = 1.1;
      utterance.volume = 0.5;
      window.speechSynthesis.speak(utterance);
    } catch(e) {}
  }

  playSpawn() { this.playTone(150, 'sine', 0.2, 0.1); }
  playCoin() { this.playTone(880, 'sine', 0.3, 0.05); }
  playHit() { this.playNoise(0.1, 0.1, 800); }

  playCommand(mode: 'attack' | 'defend' | 'garrison') {
    this.playTone(220, 'sawtooth', 0.6, 0.05);
    const msgs = { attack: "Attack!", defend: "Defend!", garrison: "Retreat!" };
    this.speak(msgs[mode]);
  }

  playWin() { this.speak("Victory!"); }
  playLose() { this.speak("Defeated."); }
  playSwing() { this.playNoise(0.1, 0.05, 2000); }
}

export const soundEngine = new SoundEngine();
