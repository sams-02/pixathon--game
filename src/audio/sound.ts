/**
 * Deep Space Audio, Vocalized Ambient Music & Astronaut Comms Engine for ChronoTile
 * - Generative choral/voice pad background music with human vocal formants.
 * - Radio-filtered astronaut voice transmissions (Commander Elena Vance).
 * - Pleasant, euphoric crystal key chimes & triumphant airlock victory fanfares.
 * - Magnetic EVA boot clanks with suit bone-conduction bass response.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;
  private isVoiceEnabled: boolean = true;
  private masterVolume: number = 0.45;

  // Background Choral/Voice Music nodes
  private musicGainNode: GainNode | null = null;
  private isMusicPlaying: boolean = false;
  private musicIntervalId: number | null = null;
  private currentChordIndex: number = 0;
  private activeMusicVoices: { stop: (t: number) => void }[] = [];

  // Astronaut voice throttle
  private lastStepVoiceTime: number = 0;

  constructor() {
    try {
      const savedMute = localStorage.getItem('chronotile_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';

      const savedMusic = localStorage.getItem('chronotile_music');
      if (savedMusic !== null) this.isMusicEnabled = savedMusic === 'true';

      const savedVoice = localStorage.getItem('chronotile_voice');
      if (savedVoice !== null) this.isVoiceEnabled = savedVoice === 'true';
    } catch {}
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('chronotile_muted', String(this.isMuted));
    } catch {}
    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else if (this.isMusicEnabled) {
      this.startBackgroundMusic();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMusic(): boolean {
    this.isMusicEnabled = !this.isMusicEnabled;
    try {
      localStorage.setItem('chronotile_music', String(this.isMusicEnabled));
    } catch {}
    if (this.isMusicEnabled && !this.isMuted) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
    return this.isMusicEnabled;
  }

  public getMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  public toggleVoice(): boolean {
    this.isVoiceEnabled = !this.isVoiceEnabled;
    try {
      localStorage.setItem('chronotile_voice', String(this.isVoiceEnabled));
    } catch {}
    return this.isVoiceEnabled;
  }

  public getVoiceEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  /**
   * PROCEDURAL VOCALIZED BACKGROUND MUSIC (Ethereal Celestial Choirs & Ambient Drone)
   * Uses vocal tract formant filters (vowel formants: "ah"/"oh" human voice sound)
   */
  public startBackgroundMusic() {
    if (this.isMusicPlaying || this.isMuted || !this.isMusicEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isMusicPlaying = true;

    // Ambient space chord progression (Deep space C minor / Ab maj7 / Eb / Bb)
    const chordProgressions = [
      [130.81, 196.0, 246.94, 311.13, 392.0], // C3, G3, B3, Eb4, G4 (C min / maj9)
      [103.83, 164.81, 207.65, 261.63, 329.63], // Ab2, E3, Ab3, C4, E4 (Ab maj7)
      [155.56, 196.0, 233.08, 311.13, 466.16], // Eb3, G3, Bb3, Eb4, Bb4 (Eb add9)
      [116.54, 174.61, 233.08, 293.66, 349.23], // Bb2, F3, Bb3, D4, F4 (Bb sus/maj)
    ];

    const playNextChord = () => {
      if (!this.ctx || !this.isMusicPlaying || this.isMuted || !this.isMusicEnabled) return;

      const chord = chordProgressions[this.currentChordIndex];
      this.currentChordIndex = (this.currentChordIndex + 1) % chordProgressions.length;

      const t = this.ctx.currentTime;
      const duration = 6.5;

      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Dual formant filters to shape waveform into a human voice vowel ("ah/oh")
        const formant1 = this.ctx.createBiquadFilter();
        const formant2 = this.ctx.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        // Vocal vibrato
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(4.2 + idx * 0.2, t);
        lfoGain.gain.setValueAtTime(freq * 0.008, t);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + duration);

        // Human vocal formant bandpass filters
        formant1.type = 'bandpass';
        formant1.frequency.setValueAtTime(650 + (idx % 2) * 150, t); // First vocal formant (F1)
        formant1.Q.setValueAtTime(4.0, t);

        formant2.type = 'bandpass';
        formant2.frequency.setValueAtTime(1250 + (idx % 2) * 200, t); // Second vocal formant (F2)
        formant2.Q.setValueAtTime(5.0, t);

        // Smooth swelling attack and gentle decay
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.05, t + 2.0);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(formant1);
        formant1.connect(formant2);
        formant2.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration);
      });
    };

    playNextChord();
    this.musicIntervalId = window.setInterval(playNextChord, 6000);
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  /**
   * Play radio mic click / roger beep
   */
  private playRadioClick() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.setValueAtTime(2400, t + 0.02);
    gain.gain.setValueAtTime(this.masterVolume * 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Real-time Astronaut Comms Voice Transmission (Commander Elena Vance)
   */
  public speakAstronaut(phrase: string, priority: boolean = false) {
    if (this.isMuted || !this.isVoiceEnabled) return;

    this.initCtx();
    this.playRadioClick();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (priority) {
          window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 1.08;
        utterance.pitch = 1.15; // Confident female astronaut pitch
        utterance.volume = Math.min(1.0, this.masterVolume * 1.5);

        // Prefer English voices
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural'))
        ) || voices.find((v) => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          this.playRadioClick();
        };

        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  }

  /**
   * Magnetic EVA Boot step + occasional voice feedback
   */
  public playMove() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Solid boot sole metallic contact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, t);

    gain.gain.setValueAtTime(this.masterVolume * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);

    // Magnetic latch click
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(880, t);
    snapOsc.frequency.exponentialRampToValueAtTime(320, t + 0.04);
    snapGain.gain.setValueAtTime(this.masterVolume * 0.18, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(t);
    snapOsc.stop(t + 0.06);

    // Occasional subtle astronaut voice pacing
    const now = performance.now();
    if (now - this.lastStepVoiceTime > 7500 && Math.random() > 0.65) {
      this.lastStepVoiceTime = now;
      const stepPhrases = [
        'Vector clear.',
        'Advancing.',
        'Interlock verified.',
        'Trajectory logged.',
        'Step confirmed.',
      ];
      const p = stepPhrases[Math.floor(Math.random() * stepPhrases.length)];
      this.speakAstronaut(p);
    }
  }

  /**
   * Tile Uncoupling: Cryogenic pressure depressurization hiss
   */
  public playCollapse() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);
    filter.Q.setValueAtTime(5.0, t);

    gain.gain.setValueAtTime(this.masterVolume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  /**
   * PLEASANT, EUPHORIC WINNING CHIME FOR COLLECTING A KEY
   * Sparkling high-pitch crystalline cascade + harmonic arpeggios + voice confirmation
   */
  public playKeyPickup() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Sparkling 6-note crystal harmonic arpeggio (C6, E6, G6, B6, D7, G7)
    const notes = [1046.5, 1318.5, 1567.98, 1975.53, 2349.32, 3135.96];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + i * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(this.masterVolume * 0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.38);
    });

    // Voice announcement
    setTimeout(() => {
      this.speakAstronaut('Quantum core secured. Forcefield down.');
    }, 150);
  }

  public playGateOpen() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(520, t);
    osc1.frequency.exponentialRampToValueAtTime(1040, t + 0.32);

    osc2.frequency.setValueAtTime(260, t);
    osc2.frequency.exponentialRampToValueAtTime(520, t + 0.32);

    gain.gain.setValueAtTime(this.masterVolume * 0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.4);
  }

  public playSwitch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);

    gain.gain.setValueAtTime(this.masterVolume * 0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);

    setTimeout(() => {
      this.speakAstronaut('Auxiliary power routed.');
    }, 180);
  }

  public playTeleport() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.38);

    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(30, t);
    lfoGain.gain.setValueAtTime(90, t);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(this.masterVolume * 0.48, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(t);
    osc.start(t);
    lfo.stop(t + 0.45);
    osc.stop(t + 0.45);
  }

  public playTrapped() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [370, 349.23, 329.63];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(this.masterVolume * 0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });

    setTimeout(() => {
      this.speakAstronaut('Warning: EVA lockout. Path obstructed.', true);
    }, 200);
  }

  public playUndo() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.15);

    gain.gain.setValueAtTime(this.masterVolume * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * PLEASANT CELEBRATORY WINNING SOUND & AIRLOCK INGRESS CUE
   * Ascending orchestral bell & brass chords + sub-bass bloom + celebratory astronaut voice
   */
  public playWinFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Grand harmonic celebratory chord progression
    const chord = [
      { f: 523.25, time: 0 },    // C5
      { f: 659.25, time: 0.12 }, // E5
      { f: 783.99, time: 0.24 }, // G5
      { f: 1046.5, time: 0.38 }, // C6
      { f: 1318.5, time: 0.52 }, // E6
      { f: 1567.98, time: 0.68 },// G6
      { f: 2093.0, time: 0.84 }, // C7 (celebratory summit)
    ];

    chord.forEach((item) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + item.time;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, t);

      gain.gain.setValueAtTime(this.masterVolume * 0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.9);
    });

    // Voice announcement
    setTimeout(() => {
      this.speakAstronaut('Airlock ingress confirmed! Atmospheric seal locked. Outstanding work, Commander.', true);
    }, 450);
  }

  public playQuantumBlink() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.35);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(35, t);
    lfoGain.gain.setValueAtTime(140, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
    filter.Q.setValueAtTime(4.0, t);

    gain.gain.setValueAtTime(this.masterVolume * 0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(t);
    osc.start(t);
    lfo.stop(t + 0.42);
    osc.stop(t + 0.42);

    setTimeout(() => {
      this.speakAstronaut('Quantum blink executed.');
    }, 180);
  }

  public playPhaseRestore() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const noteTime = t + idx * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(this.masterVolume * 0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.24);
    });

    setTimeout(() => {
      this.speakAstronaut('Hydraulics stabilized.');
    }, 180);
  }

  public playAbilityDenied() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.setValueAtTime(90, t + 0.06);
    gain.gain.setValueAtTime(this.masterVolume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }
}

export const sound = new SoundEngine();
