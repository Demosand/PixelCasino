/* =====================================================================
 *  PixelAudio — chiptune / 8-bit SFX engine (pure Web Audio, no files)
 *  Everything is synthesized live: square/triangle/noise voices + a tiny
 *  music sequencer for ambient lobby loops.
 * ===================================================================== */
(function (global) {
  'use strict';

  const PixelAudio = {
    ctx: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    muted: false,
    musicOn: true,
    _musicTimer: null,
    _started: false,
  };

  /* ---- lazy init (must be triggered by a user gesture) ---- */
  PixelAudio.init = function () {
    if (this.ctx) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    this.ctx = new AC();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.masterGain);
  };

  PixelAudio.resume = function () {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  };

  /* ---- low level: a single pixel tone ---- */
  PixelAudio.tone = function (opts) {
    if (!this.ctx || this.muted) return;
    const o = Object.assign(
      { freq: 440, type: 'square', dur: 0.12, vol: 0.35, attack: 0.005, decay: 0.08, slide: 0, dest: this.sfxGain },
      opts
    );
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freq + o.slide), t + o.dur);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.vol, t + o.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

    osc.connect(gain);
    gain.connect(o.dest);
    osc.start(t);
    osc.stop(t + o.dur + 0.02);
  };

  /* ---- white noise burst (clicks, coins, explosions) ---- */
  PixelAudio.noise = function (opts) {
    if (!this.ctx || this.muted) return;
    const o = Object.assign({ dur: 0.12, vol: 0.3, type: 'highpass', freq: 1000, dest: this.sfxGain }, opts);
    const t = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * o.dur);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = o.type;
    filter.frequency.value = o.freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(o.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(o.dest);
    src.start(t);
    src.stop(t + o.dur);
  };

  /* ================= named SFX library ================= */
  const A = PixelAudio;

  A.sfx = {
    click() {
      A.tone({ freq: 660, type: 'square', dur: 0.05, vol: 0.25, slide: 120 });
    },
    hover() {
      A.tone({ freq: 880, type: 'triangle', dur: 0.04, vol: 0.12 });
    },
    coin() {
      A.tone({ freq: 988, type: 'square', dur: 0.08, vol: 0.3 });
      setTimeout(() => A.tone({ freq: 1319, type: 'square', dur: 0.12, vol: 0.3 }), 70);
    },
    coinShower() {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          A.tone({ freq: 900 + Math.random() * 700, type: 'square', dur: 0.06, vol: 0.18 });
        }, i * 55);
      }
    },
    reelTick() {
      A.tone({ freq: 220 + Math.random() * 60, type: 'square', dur: 0.03, vol: 0.14, slide: -40 });
    },
    reelStop() {
      A.tone({ freq: 160, type: 'square', dur: 0.1, vol: 0.3, slide: -60 });
      A.noise({ dur: 0.05, vol: 0.12, freq: 2000 });
    },
    spin() {
      A.tone({ freq: 300, type: 'sawtooth', dur: 0.25, vol: 0.2, slide: 500 });
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => setTimeout(() => A.tone({ freq: f, type: 'square', dur: 0.14, vol: 0.32 }), i * 90));
    },
    bigWin() {
      const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
      seq.forEach((f, i) =>
        setTimeout(() => {
          A.tone({ freq: f, type: 'square', dur: 0.16, vol: 0.34 });
          A.tone({ freq: f / 2, type: 'triangle', dur: 0.16, vol: 0.18 });
        }, i * 110)
      );
    },
    jackpot() {
      const seq = [659, 784, 988, 1319, 1047, 1319, 1568, 2093, 1568, 2093];
      seq.forEach((f, i) =>
        setTimeout(() => {
          A.tone({ freq: f, type: 'square', dur: 0.15, vol: 0.35 });
          A.tone({ freq: f * 1.5, type: 'triangle', dur: 0.15, vol: 0.15 });
        }, i * 95)
      );
      for (let i = 0; i < 20; i++) setTimeout(() => A.sfx.coin(), 300 + i * 90);
    },
    lose() {
      A.tone({ freq: 311, type: 'square', dur: 0.18, vol: 0.28, slide: -120 });
      setTimeout(() => A.tone({ freq: 207, type: 'square', dur: 0.28, vol: 0.28, slide: -80 }), 150);
    },
    cardFlip() {
      A.noise({ dur: 0.06, vol: 0.18, type: 'bandpass', freq: 3000 });
      A.tone({ freq: 500, type: 'triangle', dur: 0.05, vol: 0.1 });
    },
    cardDeal() {
      A.noise({ dur: 0.05, vol: 0.14, type: 'highpass', freq: 4000 });
    },
    chip() {
      A.tone({ freq: 1200, type: 'square', dur: 0.04, vol: 0.2 });
      A.noise({ dur: 0.04, vol: 0.12, freq: 5000 });
    },
    rouletteRoll() {
      // handled live by the roulette module via reelTick
      A.tone({ freq: 400, type: 'sawtooth', dur: 0.2, vol: 0.16, slide: 200 });
    },
    diceRoll() {
      for (let i = 0; i < 6; i++)
        setTimeout(() => A.noise({ dur: 0.05, vol: 0.16, type: 'bandpass', freq: 800 + Math.random() * 1500 }), i * 60);
    },
    drop() {
      A.tone({ freq: 800, type: 'sine', dur: 0.06, vol: 0.18, slide: -400 });
    },
    peg() {
      A.tone({ freq: 1000 + Math.random() * 800, type: 'triangle', dur: 0.04, vol: 0.14 });
    },
    bet() {
      A.tone({ freq: 740, type: 'square', dur: 0.06, vol: 0.22, slide: 200 });
    },
    error() {
      A.tone({ freq: 180, type: 'square', dur: 0.16, vol: 0.3, slide: -40 });
    },
    tick() {
      A.tone({ freq: 1500, type: 'square', dur: 0.02, vol: 0.1 });
    },
    levelUp() {
      [392, 523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => A.tone({ freq: f, type: 'square', dur: 0.12, vol: 0.3 }), i * 70)
      );
    },
    cashout() {
      A.sfx.coinShower();
      setTimeout(() => A.sfx.win(), 200);
    },
    /* ---- added for the new games ---- */
    scratch() {
      A.noise({ dur: 0.18, vol: 0.16, type: 'bandpass', freq: 2200 });
    },
    reveal() {
      A.tone({ freq: 600, type: 'square', dur: 0.1, vol: 0.24, slide: 500 });
    },
    kenoDraw() {
      A.tone({ freq: 700 + Math.random() * 300, type: 'square', dur: 0.06, vol: 0.2 });
      A.noise({ dur: 0.03, vol: 0.08, freq: 4000 });
    },
    kenoHit() {
      A.tone({ freq: 880, type: 'square', dur: 0.07, vol: 0.26 });
      setTimeout(() => A.tone({ freq: 1175, type: 'square', dur: 0.09, vol: 0.26 }), 60);
    },
    climb() {
      A.tone({ freq: 440 + (A._climbStep = (A._climbStep || 0) + 1) * 20, type: 'square', dur: 0.08, vol: 0.24 });
      if (A._climbStep > 12) A._climbStep = 0;
    },
    resetClimb() {
      A._climbStep = 0;
    },
    fall() {
      A.tone({ freq: 400, type: 'sawtooth', dur: 0.4, vol: 0.3, slide: -340 });
      A.noise({ dur: 0.2, vol: 0.16, freq: 600 });
    },
    shuffle() {
      for (let i = 0; i < 5; i++)
        setTimeout(() => A.noise({ dur: 0.04, vol: 0.1, type: 'highpass', freq: 4000 }), i * 45);
    },
    deal() {
      A.noise({ dur: 0.05, vol: 0.14, type: 'highpass', freq: 4000 });
      A.tone({ freq: 520, type: 'triangle', dur: 0.04, vol: 0.08 });
    },
    rocketUp() {
      A.tone({ freq: 200, type: 'sawtooth', dur: 0.3, vol: 0.2, slide: 700 });
      A.noise({ dur: 0.3, vol: 0.1, freq: 800 });
    },
    pokerHold() {
      A.tone({ freq: 900, type: 'square', dur: 0.05, vol: 0.2 });
    },
    sevenSeg() {
      A.tone({ freq: 1400 + Math.random() * 400, type: 'square', dur: 0.02, vol: 0.08 });
    },
  };

  A.play = function (name) {
    if (this.sfx[name]) this.sfx[name]();
  };

  /* ================= ambient chiptune music ================= */
  // A simple looping bassline + arpeggio in A minor — relaxed lounge vibe.
  const SCALE = {
    A: [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 784],
  };

  A.startMusic = function () {
    if (!this.ctx || this._musicTimer || this.muted || !this.musicOn) return;
    const bassPattern = [110, 110, 164.81, 146.83, 130.81, 130.81, 98, 110];
    const arpPattern = [
      [440, 523.25, 659.25],
      [392, 493.88, 587.33],
      [349.23, 440, 523.25],
      [329.63, 392, 493.88],
    ];
    let step = 0;
    const bpm = 96;
    const beat = (60 / bpm) * 1000;

    const tickFn = () => {
      const bar = Math.floor(step / 8) % arpPattern.length;
      const within = step % 8;

      // bass on each step
      A.tone({
        freq: bassPattern[within],
        type: 'triangle',
        dur: beat / 1000 * 0.9,
        vol: 0.5,
        dest: A.musicGain,
      });
      // arpeggio
      const arp = arpPattern[bar];
      A.tone({
        freq: arp[within % arp.length] * (within % 2 ? 1 : 0.5),
        type: 'square',
        dur: beat / 1000 * 0.5,
        vol: 0.18,
        dest: A.musicGain,
      });
      // hi-hat-ish noise on offbeats
      if (within % 2 === 1) A.noise({ dur: 0.03, vol: 0.05, freq: 8000, dest: A.musicGain });

      step++;
    };

    tickFn();
    this._musicTimer = setInterval(tickFn, beat);
  };

  A.stopMusic = function () {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  };

  A.toggleMute = function () {
    this.muted = !this.muted;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : 0.9;
    return this.muted;
  };

  A.toggleMusic = function () {
    this.musicOn = !this.musicOn;
    if (this.musicOn) this.startMusic();
    else this.stopMusic();
    return this.musicOn;
  };

  global.PixelAudio = PixelAudio;
})(window);
