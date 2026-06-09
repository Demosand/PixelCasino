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
    this.masterGain.gain.value = 0.85;

    // gentle master chain: soft low-pass takes the edge off, compressor glues it
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7500;
    lp.Q.value = 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    this.masterGain.connect(lp);
    lp.connect(comp);
    comp.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.2;
    this.musicGain.connect(this.masterGain);
  };

  /* ---- warm bell: sine fundamental + quiet sparkle partial, long tail ---- */
  PixelAudio.bell = function (freq, dur, vol, dest) {
    if (!this.ctx || this.muted) return;
    dur = dur || 0.5; vol = vol || 0.3; dest = dest || this.sfxGain;
    const t = this.ctx.currentTime;
    [[1, 1], [2.0, 0.28], [2.76, 0.12]].forEach(([ratio, amp]) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + dur + 0.05);
    });
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
      A.tone({ freq: 740, type: 'sine', dur: 0.06, vol: 0.2, slide: 90 });
      A.noise({ dur: 0.015, vol: 0.04, type: 'highpass', freq: 5500 });
    },
    hover() {
      A.tone({ freq: 1050, type: 'sine', dur: 0.045, vol: 0.06 });
    },
    coin() {
      A.bell(988, 0.3, 0.22);
      setTimeout(() => A.bell(1319, 0.45, 0.22), 75);
    },
    coinShower() {
      const ladder = [880, 988, 1175, 1319, 1480, 1568, 1760, 1976];
      ladder.forEach((f, i) => setTimeout(() => A.bell(f, 0.35, 0.13), i * 55));
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
      // bright major-pentatonic bell run — short and sweet
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => A.bell(f, 0.5, 0.26), i * 95));
    },
    bigWin() {
      const seq = [523, 659, 784, 1047, 1319, 1047, 1568];
      seq.forEach((f, i) =>
        setTimeout(() => {
          A.bell(f, 0.6, 0.28);
          A.tone({ freq: f / 2, type: 'triangle', dur: 0.3, vol: 0.1 });
        }, i * 115)
      );
    },
    jackpot() {
      // cascading bell fanfare over a warm sustained chord
      const seq = [659, 784, 1047, 1319, 1568, 1319, 1568, 2093, 1568, 2093];
      seq.forEach((f, i) => setTimeout(() => A.bell(f, 0.7, 0.28), i * 100));
      [262, 330, 392].forEach((f) => A.tone({ freq: f, type: 'triangle', dur: 1.6, vol: 0.09 }));
      for (let i = 0; i < 14; i++) setTimeout(() => A.sfx.coin(), 350 + i * 110);
    },
    lose() {
      // soft sympathetic descent, no harshness
      A.tone({ freq: 392, type: 'sine', dur: 0.22, vol: 0.2, slide: -90 });
      setTimeout(() => A.tone({ freq: 294, type: 'sine', dur: 0.34, vol: 0.18, slide: -60 }), 170);
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
      A.tone({ freq: 220, type: 'triangle', dur: 0.14, vol: 0.22, slide: -50 });
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
    /* ---- slot lever: satisfying mechanical ka-chunk ---- */
    lever() {
      A.tone({ freq: 320, type: 'square', dur: 0.09, vol: 0.3, slide: -180 });
      A.noise({ dur: 0.06, vol: 0.18, type: 'lowpass', freq: 1200 });
      setTimeout(() => {
        A.tone({ freq: 140, type: 'square', dur: 0.12, vol: 0.34, slide: -60 });
        A.noise({ dur: 0.05, vol: 0.16, freq: 600 });
      }, 110);
      setTimeout(() => A.tone({ freq: 900, type: 'triangle', dur: 0.08, vol: 0.16, slide: 300 }), 230);
    },
    leverReturn() {
      A.tone({ freq: 600, type: 'triangle', dur: 0.1, vol: 0.16, slide: 400 });
      A.noise({ dur: 0.04, vol: 0.08, freq: 3000 });
    },
    /* ratchet notch: like winding a wind-up toy. p = 0..1 (pitch rises) */
    ratchet(p) {
      if (typeof p !== 'number') p = 0;
      p = Math.max(0, Math.min(1, p));
      const f = 520 + p * 920; // higher the more you pull
      // bright music-box-ish pluck + tiny mechanical tick
      A.tone({ freq: f, type: 'triangle', dur: 0.05, vol: 0.2, decay: 0.04 });
      A.tone({ freq: f * 2, type: 'square', dur: 0.018, vol: 0.06 });
      A.noise({ dur: 0.012, vol: 0.05, type: 'highpass', freq: 6500 });
    },
    /* reverse ratchet: softer, lower click when the lever eases back up */
    ratchetBack(p) {
      if (typeof p !== 'number') p = 0;
      p = Math.max(0, Math.min(1, p));
      const f = 440 + p * 560;
      A.tone({ freq: f, type: 'triangle', dur: 0.045, vol: 0.13, slide: -70 });
      A.noise({ dur: 0.01, vol: 0.04, type: 'highpass', freq: 5000 });
    },
    /* ---- horse race ---- */
    hoof() {
      A.noise({ dur: 0.04, vol: 0.12, type: 'lowpass', freq: 500 });
      A.tone({ freq: 90 + Math.random() * 30, type: 'triangle', dur: 0.04, vol: 0.1 });
    },
    whistle() {
      A.tone({ freq: 1200, type: 'square', dur: 0.18, vol: 0.24, slide: 600 });
      setTimeout(() => A.tone({ freq: 1800, type: 'square', dur: 0.12, vol: 0.2 }), 120);
    },
    /* ---- cups / thimblerig ---- */
    swoosh() {
      A.noise({ dur: 0.14, vol: 0.16, type: 'bandpass', freq: 1400 });
    },
    cupDown() {
      A.tone({ freq: 200, type: 'sine', dur: 0.08, vol: 0.2, slide: -120 });
      A.noise({ dur: 0.04, vol: 0.1, freq: 900 });
    },
    /* ---- rock paper scissors ---- */
    rpsBeat() {
      A.tone({ freq: 440, type: 'square', dur: 0.06, vol: 0.2 });
    },
    rpsShow() {
      A.tone({ freq: 700, type: 'square', dur: 0.1, vol: 0.26, slide: 200 });
    },
    /* ---- double / color wheel ---- */
    doubleTick() {
      A.tone({ freq: 1100, type: 'square', dur: 0.025, vol: 0.12 });
    },
    suspense() {
      A.tone({ freq: 130, type: 'triangle', dur: 0.3, vol: 0.14, slide: 30 });
    },
  };

  A.play = function (name) {
    if (this.sfx[name]) this.sfx[name]();
  };

  /* quick ascending ratchet burst (used when the lever is pulled by a tap) */
  A.ratchetRamp = function (count, totalMs) {
    count = count || 10;
    totalMs = totalMs || 220;
    for (let i = 0; i < count; i++) {
      setTimeout(() => A.sfx.ratchet(i / (count - 1)), (totalMs / count) * i);
    }
  };

  /* ================= ambient chiptune music ================= */
  // A simple looping bassline + arpeggio in A minor — relaxed lounge vibe.
  const SCALE = {
    A: [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 784],
  };

  A.startMusic = function () {
    if (!this.ctx || this._musicTimer || this.muted || !this.musicOn) return;
    // warm lounge loop: slow chord pads + sparse bell melody, no harsh waves
    const chords = [
      [220, 277.18, 329.63],   // A
      [196, 246.94, 293.66],   // G
      [174.61, 220, 261.63],   // F
      [164.81, 207.65, 246.94],// E
    ];
    const melody = [880, 0, 659.25, 0, 783.99, 0, 0, 587.33, 659.25, 0, 0, 880, 0, 783.99, 0, 0];
    let step = 0;
    const bpm = 72;
    const beat = (60 / bpm) * 1000;

    const tickFn = () => {
      const bar = Math.floor(step / 4) % chords.length;
      const within = step % 4;

      if (within === 0) {
        // soft pad chord, swells over the bar
        chords[bar].forEach((f) =>
          A.tone({ freq: f, type: 'triangle', dur: (beat / 1000) * 3.6, vol: 0.16, attack: 0.4, dest: A.musicGain })
        );
        // gentle low root
        A.tone({ freq: chords[bar][0] / 2, type: 'sine', dur: (beat / 1000) * 3.2, vol: 0.26, attack: 0.05, dest: A.musicGain });
      }
      // sparse music-box melody on top
      const m = melody[step % melody.length];
      if (m) A.bell(m, 1.1, 0.07, A.musicGain);
      // brushed hat on offbeats, very quiet
      if (within === 2) A.noise({ dur: 0.05, vol: 0.018, freq: 9000, dest: A.musicGain });

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
